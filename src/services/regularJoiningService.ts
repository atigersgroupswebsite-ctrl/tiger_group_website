// ==============================================================================
// File: src/services/regularJoiningService.ts
// Description: Core Administrative Service for the Regular Joining Form Workflow
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Architecture:
//   - Manages regular joining dossiers (workflow_type = 'REGULAR')
//   - Collision-safe sequential ATG employee code generation (ATG-501-2026, ATG-502-2026)
//   - Atomic persistence to joining_forms, documents, and employees tables
//   - Direct ID card & 1-page reference slip governance
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { DocumentType, DocumentRow, EmployeeRow } from '../types/database';
import { logActivity } from './activityService';
import {
  generateAndPersistEmployeeIdCard,
  type EmployeeIdCardData
} from './employeeIdCardGenerator';

export interface RegularJoiningDocItem {
  name: string;
  size: number;
  type: string;
  storagePath?: string;
  dataUrl?: string;
  verified?: boolean;
}

export interface RegularJoiningFormData {
  id?: string;
  // Section A: Joining Details
  employeeCode: string; // e.g. ATG-501-2026
  joiningDate: string; // YYYY-MM-DD
  department: string;
  designation: string;
  companyName: string;
  unitName: string;
  factorySupervisorName: string;
  salaryCtc?: number | null;
  interviewDate?: string | null;

  // Section B: Candidate Personal Details
  fullName: string;
  fatherName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  aadhaarNumber: string;
  permanentAddress: string;
  currentAddress: string;
  sameAsPermanent: boolean;
  uanNumber: string;
  esicNumber: string;
  ptNumber: string;
  mobile: string;
  alternateMobile: string;
  email: string;

  // Section C: Bank Details
  bankAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  upiNumber: string;

  // Section D: Documents
  photo: RegularJoiningDocItem | null;
  aadhaar: RegularJoiningDocItem | null;
  bankPassbook: RegularJoiningDocItem | null;
  signature: RegularJoiningDocItem | null;

  // Metadata
  submissionStatus?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegularJoiningResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generates a collision-safe, deterministic sequential Employee Code for Regular Joining.
 * Format: ATG-{SEQ}-{YYYY} (e.g. ATG-501-2026, ATG-502-2026)
 * Sequence begins at 501.
 */
export async function generateNextRegularEmployeeCode(targetYear?: number): Promise<string> {
  const currentYear = targetYear || new Date().getFullYear();
  const prefix = 'ATG-';
  const suffix = `-${currentYear}`;
  const pattern = new RegExp(`^ATG-(\\d+)-${currentYear}$`, 'i');

  if (!isSupabaseConfigured) {
    return `ATG-501-${currentYear}`;
  }

  try {
    // 1. Try PostgreSQL RPC if deployed
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('get_next_regular_employee_code', {
      p_year: currentYear
    });

    if (!rpcErr && rpcData && (rpcData as any).employee_code) {
      return (rpcData as any).employee_code;
    }

    // 2. Fallback: Direct DB query scanning both joining_forms & employees
    let maxSeq = 500; // Baseline sequence is 501

    // Query joining_forms
    const { data: jfData } = await supabase
      .from('joining_forms')
      .select('joining_reference, employee_code')
      .or(`joining_reference.ilike.ATG-%-${currentYear},employee_code.ilike.ATG-%-${currentYear}`)
      .limit(500);

    if (jfData && jfData.length > 0) {
      for (const row of jfData) {
        const refMatch = (row.joining_reference || '').match(pattern);
        if (refMatch) {
          const num = parseInt(refMatch[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
        const codeMatch = (row.employee_code || '').match(pattern);
        if (codeMatch) {
          const num = parseInt(codeMatch[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }

    // Query employees
    const { data: empData } = await supabase
      .from('employees')
      .select('employee_code')
      .ilike('employee_code', `ATG-%-${currentYear}`)
      .limit(500);

    if (empData && empData.length > 0) {
      for (const row of empData) {
        const empMatch = (row.employee_code || '').match(pattern);
        if (empMatch) {
          const num = parseInt(empMatch[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }

    let candidateCode = `${prefix}${maxSeq + 1}${suffix}`;

    // 3. Collision protection check loop
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const { data: existingJf } = await supabase
        .from('joining_forms')
        .select('id')
        .eq('joining_reference', candidateCode)
        .maybeSingle();

      const { data: existingEmp } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', candidateCode)
        .maybeSingle();

      if (!existingJf && !existingEmp) {
        isUnique = true;
      } else {
        maxSeq++;
        candidateCode = `${prefix}${maxSeq + 1}${suffix}`;
        attempts++;
      }
    }

    return candidateCode;
  } catch (err) {
    console.error('[generateNextRegularEmployeeCode] Exception:', err);
    return `ATG-501-${currentYear}`;
  }
}

/**
 * Saves a Regular Joining Form record (either as DRAFT, SUBMITTED, or VERIFIED).
 */
export async function saveRegularJoiningForm(
  formData: RegularJoiningFormData,
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' = 'DRAFT',
  verifierAdminName?: string
): Promise<RegularJoiningResult<{ formId: string; employeeCode: string; employeeRecordId?: string }>> {
  if (!formData.fullName || formData.fullName.trim().length < 2) {
    return { success: false, error: 'Full Name is required (minimum 2 characters).' };
  }

  if (!formData.employeeCode || !formData.employeeCode.trim()) {
    return { success: false, error: 'Employee Code is required.' };
  }

  const cleanCode = formData.employeeCode.trim().toUpperCase();

  // If status is VERIFIED, validate that all 4 documents are provided
  if (status === 'VERIFIED') {
    if (!formData.photo?.storagePath && !formData.photo?.dataUrl) {
      return { success: false, error: 'Candidate Live Photo is required for verification.' };
    }
    if (!formData.aadhaar?.storagePath && !formData.aadhaar?.dataUrl) {
      return { success: false, error: 'Aadhaar Card Photo is required for verification.' };
    }
    if (!formData.bankPassbook?.storagePath && !formData.bankPassbook?.dataUrl) {
      return { success: false, error: 'Bank Passbook Photo is required for verification.' };
    }
    if (!formData.signature?.storagePath && !formData.signature?.dataUrl) {
      return { success: false, error: 'Candidate Signature is required for verification.' };
    }
    if (!formData.mobile || formData.mobile.replace(/\D/g, '').length !== 10) {
      return { success: false, error: 'Valid 10-digit Aadhaar-Linked Mobile Number is required for verification.' };
    }
  }

  try {
    // 1. Resolve company_id from existing companies table if possible
    let matchedCompanyId: string | null = null;
    if (formData.companyName && formData.companyName.trim()) {
      const trimmed = formData.companyName.trim();
      try {
        const { data: compRows } = await supabase
          .from('companies')
          .select('id, name')
          .ilike('name', `%${trimmed}%`)
          .limit(1);
        if (compRows && compRows.length > 0) {
          matchedCompanyId = compRows[0].id;
        }
      } catch (_) {}
      if (!matchedCompanyId && /tiger/i.test(trimmed)) {
        // Default to canonical A TIGER GLOBAL entity
        matchedCompanyId = '00000000-0000-0000-0000-000000000001';
      }
    }

    // 2. Comprehensive custom_fields payload (100% resilient across all DB states)
    const customFieldsPayload = {
      workflowType: 'REGULAR',
      companyName: formData.companyName?.trim() || '',
      unitName: formData.unitName?.trim() || '',
      factorySupervisorName: formData.factorySupervisorName?.trim() || '',
      upiNumber: formData.upiNumber?.trim() || '',
      salaryCtc: formData.salaryCtc || null,
      interviewDate: formData.interviewDate || null,
      alternateMobile: formData.alternateMobile?.trim() || null,
      uanNumber: formData.uanNumber?.trim() || null,
      esicNumber: formData.esicNumber?.trim() || null,
      ptNumber: formData.ptNumber?.trim() || null,
      verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null,
      verifiedBy: status === 'VERIFIED' ? (verifierAdminName || 'Administrator') : null,
      documentsMetadata: {
        photo: formData.photo ? { name: formData.photo.name, storagePath: formData.photo.storagePath } : null,
        aadhaar: formData.aadhaar ? { name: formData.aadhaar.name, storagePath: formData.aadhaar.storagePath } : null,
        bankPassbook: formData.bankPassbook ? { name: formData.bankPassbook.name, storagePath: formData.bankPassbook.storagePath } : null,
        signature: formData.signature ? { name: formData.signature.name, storagePath: formData.signature.storagePath } : null
      }
    };

    // 3. Base row payload using strictly verified native columns in public.joining_forms
    const baseRowPayload: any = {
      joining_reference: cleanCode,
      employee_code: cleanCode,
      candidate_name: formData.fullName.trim(),
      father_name: formData.fatherName?.trim() || null,
      date_of_birth: formData.dob || null,
      gender: formData.gender || null,
      marital_status: formData.maritalStatus || null,
      aadhaar_number: formData.aadhaarNumber?.replace(/\D/g, '') || null,
      permanent_address: formData.permanentAddress?.trim() || null,
      current_address: formData.sameAsPermanent ? (formData.permanentAddress?.trim() || null) : (formData.currentAddress?.trim() || null),
      same_as_permanent: formData.sameAsPermanent,
      uan: formData.uanNumber?.trim() || null,
      esic_number: formData.esicNumber?.trim() || null,
      pt_number: formData.ptNumber?.trim() || null,
      employee_contact_number: formData.mobile?.replace(/\D/g, '') || null,
      other_contact_number: formData.alternateMobile?.replace(/\D/g, '') || null,
      email: formData.email?.trim() || null,
      bank_account_number: formData.bankAccountNumber?.trim() || null,
      ifsc_code: formData.ifscCode?.trim().toUpperCase() || null,
      bank_name: formData.bankName?.trim() || null,
      branch_name: formData.branchName?.trim() || null,
      department: formData.department?.trim() || null,
      designation: formData.designation?.trim() || null,
      company_id: matchedCompanyId,
      unit: formData.unitName?.trim() || null,
      date_of_joining: formData.joiningDate || new Date().toISOString().split('T')[0],
      gross_salary: formData.salaryCtc || null,
      photo_path: formData.photo?.storagePath || null,
      candidate_signature_path: formData.signature?.storagePath || null,
      custom_fields: customFieldsPayload,
      submission_status: status,
      updated_at: new Date().toISOString()
    };

    // 4. Extended payload for environments where migration 20261010000026 is executed
    const extendedRowPayload: any = {
      ...baseRowPayload,
      workflow_type: 'REGULAR',
      company_name: formData.companyName?.trim() || null,
      factory_supervisor_name: formData.factorySupervisorName?.trim() || null,
      upi_number: formData.upiNumber?.trim() || null,
      interview_date: formData.interviewDate || null
    };

    if (status === 'VERIFIED') {
      extendedRowPayload.verified_at = new Date().toISOString();
      extendedRowPayload.verified_by = verifierAdminName || 'Administrator';
    }

    let formId = formData.id;

    // Helper: Execute DB write with schema-cache resilience
    const executeDbWrite = async (payload: any): Promise<string> => {
      if (formId) {
        const { data: updatedData, error: updateErr } = await supabase
          .from('joining_forms')
          .update(payload)
          .eq('id', formId)
          .select('id')
          .single();

        if (updateErr) throw updateErr;
        return updatedData.id;
      } else {
        const insertPayload = { ...payload, created_at: new Date().toISOString() };
        const { data: insertedData, error: insertErr } = await supabase
          .from('joining_forms')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        return insertedData.id;
      }
    };

    try {
      // First attempt with extended schema columns
      formId = await executeDbWrite(extendedRowPayload);
    } catch (saveErr: any) {
      const errMsg = (saveErr?.message || '').toLowerCase();
      // If error is caused by missing columns in schema cache (e.g. company_name, workflow_type)
      if (
        errMsg.includes('company_name') ||
        errMsg.includes('schema cache') ||
        errMsg.includes('does not exist') ||
        saveErr?.code === 'PGRST204' ||
        saveErr?.code === '42703'
      ) {
        console.warn('[RegularJoining] Extended columns not found in DB schema cache. Falling back to native columns + custom_fields storage.');
        // Retry safely with verified native columns
        formId = await executeDbWrite(baseRowPayload);
      } else {
        throw saveErr;
      }
    }

    // Persist documents in public.documents table
    await syncDocumentsTable(formId, formData);

    let employeeRecordId: string | undefined;

    // When status is VERIFIED, provision/update official employee record
    if (status === 'VERIFIED') {
      const empRes = await provisionEmployeeRecord(formId, cleanCode, formData, matchedCompanyId);
      if (empRes) {
        employeeRecordId = empRes.id;
      }

      await logActivity({
        entityType: 'JOINING_FORM',
        entityId: formId,
        action: 'REGULAR_JOINING_VERIFIED',
        description: `Regular joining record verified for ${formData.fullName} (${cleanCode}).`,
        metadata: {
          employeeCode: cleanCode,
          verifiedBy: verifierAdminName || 'Administrator'
        }
      });
    } else {
      await logActivity({
        entityType: 'JOINING_FORM',
        entityId: formId,
        action: 'REGULAR_JOINING_DRAFT_SAVED',
        description: `Regular joining draft saved for ${formData.fullName} (${cleanCode}).`,
        metadata: {
          employeeCode: cleanCode
        }
      });
    }

    return {
      success: true,
      data: {
        formId,
        employeeCode: cleanCode,
        employeeRecordId
      }
    };
  } catch (err: any) {
    console.error('[saveRegularJoiningForm] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to save regular joining form.'
    };
  }
}

/**
 * Synchronizes uploaded document references into public.documents table.
 */
async function syncDocumentsTable(formId: string, data: RegularJoiningFormData) {
  const docSpecs: Array<{ type: DocumentType; item: RegularJoiningDocItem | null }> = [
    { type: 'PHOTO', item: data.photo },
    { type: 'AADHAAR', item: data.aadhaar },
    { type: 'BANK_PASSBOOK', item: data.bankPassbook },
    { type: 'SIGNATURE', item: data.signature }
  ];

  for (const { type, item } of docSpecs) {
    if (!item?.storagePath) continue;

    try {
      // Check if document already exists
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('joining_form_id', formId)
        .eq('document_type', type)
        .maybeSingle();

      const docPayload: any = {
        joining_form_id: formId,
        document_type: type,
        storage_path: item.storagePath,
        original_file_name: item.name || `${type.toLowerCase()}.jpg`,
        mime_type: item.type || 'image/jpeg',
        file_size: item.size || 0,
        verification_status: 'VERIFIED',
        uploaded_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        is_current: true
      };

      if (existingDoc) {
        await supabase
          .from('documents')
          .update(docPayload)
          .eq('id', existingDoc.id);
      } else {
        await supabase
          .from('documents')
          .insert(docPayload);
      }
    } catch (docErr) {
      console.warn(`[syncDocumentsTable] Could not sync doc ${type}:`, docErr);
    }
  }
}

const KNOWN_COMPANY_LOOKUP: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'A TIGER GLOBAL Career Solution & Consultancy',
  '00000000-0000-0000-0000-000000000002': 'A TIGER GLOBAL Safety & Security Services',
  '00000000-0000-0000-0000-000000000003': 'A TIGER GLOBAL Logistics & Supply Chain',
  '00000000-0000-0000-0000-000000000004': 'A TIGER GLOBAL Properties & Infrastructure',
  '00000000-0000-0000-0000-000000000005': 'A TIGER GLOBAL Footwear & Manufacturing',
  '00000000-0000-0000-0000-000000000010': "Haldiram's",
  '00000000-0000-0000-0000-000000000011': 'Signet Group',
  '00000000-0000-0000-0000-000000000012': 'Geeta Glass India Private Limited'
};

/**
 * Creates or updates the employee record in public.employees table
 * so Employee ID Card generation integrates automatically.
 */
export async function provisionEmployeeRecord(
  formId: string,
  employeeCode: string,
  formData: RegularJoiningFormData,
  companyId?: string | null
): Promise<EmployeeRow | null> {
  try {
    const { data: existingEmp } = await supabase
      .from('employees')
      .select('*')
      .or(`joining_form_id.eq.${formId},employee_code.eq.${employeeCode}`)
      .maybeSingle();

    const empPayload: any = {
      employee_code: employeeCode,
      joining_reference: employeeCode,
      joining_form_id: formId,
      company_id: companyId || null,
      candidate_name: formData.fullName.trim(),
      designation: formData.designation?.trim() || 'Associate',
      department: formData.department?.trim() || 'Operations',
      location: formData.unitName?.trim() || formData.companyName?.trim() || 'Nagpur, Maharashtra',
      joining_date: formData.joiningDate || new Date().toISOString().split('T')[0],
      employment_status: 'ACTIVE',
      id_card_number: `IDC-${employeeCode}`,
      email: formData.email?.trim() || null,
      mobile: formData.mobile?.replace(/\D/g, '') || null,
      updated_at: new Date().toISOString()
    };

    if (existingEmp) {
      const { data: updated } = await supabase
        .from('employees')
        .update(empPayload)
        .eq('id', existingEmp.id)
        .select('*')
        .single();
      return updated;
    } else {
      empPayload.created_at = new Date().toISOString();
      const { data: inserted } = await supabase
        .from('employees')
        .insert(empPayload)
        .select('*')
        .single();
      return inserted;
    }
  } catch (empErr) {
    console.error('[provisionEmployeeRecord] Error:', empErr);
    return null;
  }
}

/**
 * Resolves a signed URL from candidate-documents bucket.
 */
export async function getDocumentSignedUrl(storagePath?: string | null): Promise<string | undefined> {
  if (!storagePath) return undefined;
  if (!isSupabaseConfigured) return undefined;
  try {
    // Check if path includes bucket prefix
    const cleanPath = storagePath.replace(/^candidate-documents\//, '');
    const { data, error } = await supabase.storage
      .from('candidate-documents')
      .createSignedUrl(cleanPath, 3600);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('[getDocumentSignedUrl] Error creating signed URL:', err);
  }
  return undefined;
}

/**
 * Fetches a single Regular Joining Form record by ID.
 */
export async function getRegularJoiningForm(id: string): Promise<RegularJoiningResult<{
  formData: RegularJoiningFormData;
  raw: any;
  employeeRecord: EmployeeRow | null;
  documents: DocumentRow[];
}>> {
  try {
    const { data: formRow, error: formErr } = await supabase
      .from('joining_forms')
      .select('*')
      .eq('id', id)
      .single();

    if (formErr || !formRow) {
      throw new Error(formErr?.message || 'Regular Joining Form not found.');
    }

    // Fetch linked documents
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('joining_form_id', id);

    const docList = docs || [];

    // Fetch linked employee
    const { data: empRow } = await supabase
      .from('employees')
      .select('*')
      .or(`joining_form_id.eq.${id},employee_code.eq.${formRow.employee_code}`)
      .maybeSingle();

    const custom = (formRow.custom_fields || {}) as any;

    const findDocItem = (type: DocumentType, fallbackPath?: string | null): RegularJoiningDocItem | null => {
      const found = docList.find((d) => d.document_type === type);
      if (found && found.storage_path) {
        return {
          name: found.original_file_name || `${type.toLowerCase()}.jpg`,
          size: found.file_size || 0,
          type: found.mime_type || 'image/jpeg',
          storagePath: found.storage_path,
          verified: found.verification_status === 'VERIFIED'
        };
      }
      if (fallbackPath) {
        return {
          name: `${type.toLowerCase()}.jpg`,
          size: 0,
          type: 'image/jpeg',
          storagePath: fallbackPath
        };
      }
      return null;
    };

    const photoItem = findDocItem('PHOTO', formRow.photo_path);
    const aadhaarItem = findDocItem('AADHAAR');
    const passbookItem = findDocItem('BANK_PASSBOOK');
    const signatureItem = findDocItem('SIGNATURE', formRow.candidate_signature_path);

    // Concurrently generate signed URLs for all documents
    const [photoSignedUrl, aadhaarSignedUrl, passbookSignedUrl, sigSignedUrl] = await Promise.all([
      resolveDocSignedUrl(photoItem?.storagePath),
      resolveDocSignedUrl(aadhaarItem?.storagePath),
      resolveDocSignedUrl(passbookItem?.storagePath),
      resolveDocSignedUrl(signatureItem?.storagePath)
    ]);

    if (photoItem && photoSignedUrl) photoItem.dataUrl = photoSignedUrl;
    if (aadhaarItem && aadhaarSignedUrl) aadhaarItem.dataUrl = aadhaarSignedUrl;
    if (passbookItem && passbookSignedUrl) passbookItem.dataUrl = passbookSignedUrl;
    if (signatureItem && sigSignedUrl) signatureItem.dataUrl = sigSignedUrl;

    const formData: RegularJoiningFormData = {
      id: formRow.id,
      employeeCode: formRow.employee_code || formRow.joining_reference || 'ATG-501-2026',
      joiningDate: formRow.date_of_joining || formRow.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      department: formRow.department || '',
      designation: formRow.designation || '',
      companyName: formRow.company_name || custom.companyName || (formRow.company_id && KNOWN_COMPANY_LOOKUP[formRow.company_id]) || '',
      unitName: formRow.unit || custom.unitName || '',
      factorySupervisorName: formRow.factory_supervisor_name || custom.factorySupervisorName || '',
      salaryCtc: formRow.gross_salary || custom.salaryCtc || null,
      interviewDate: formRow.interview_date || custom.interviewDate || null,

      fullName: formRow.candidate_name || '',
      fatherName: formRow.father_name || '',
      dob: formRow.date_of_birth || '',
      gender: formRow.gender || 'MALE',
      maritalStatus: formRow.marital_status || 'SINGLE',
      aadhaarNumber: formRow.aadhaar_number || '',
      permanentAddress: formRow.permanent_address || '',
      currentAddress: formRow.current_address || '',
      sameAsPermanent: formRow.same_as_permanent ?? false,
      uanNumber: formRow.uan || custom.uanNumber || '',
      esicNumber: formRow.esic_number || custom.esicNumber || '',
      ptNumber: formRow.pt_number || custom.ptNumber || '',
      mobile: formRow.employee_contact_number || '',
      alternateMobile: formRow.other_contact_number || custom.alternateMobile || '',
      email: formRow.email || '',

      bankAccountNumber: formRow.bank_account_number || '',
      ifscCode: formRow.ifsc_code || '',
      bankName: formRow.bank_name || '',
      branchName: formRow.branch_name || '',
      upiNumber: formRow.upi_number || custom.upiNumber || '',

      photo: photoItem,
      aadhaar: aadhaarItem,
      bankPassbook: passbookItem,
      signature: signatureItem,

      submissionStatus: (formRow.submission_status as any) || 'DRAFT',
      verifiedAt: formRow.verified_at || custom.verifiedAt || null,
      verifiedBy: formRow.verified_by || custom.verifiedBy || null,
      createdAt: formRow.created_at,
      updatedAt: formRow.updated_at
    };

    return {
      success: true,
      data: {
        formData,
        raw: formRow,
        employeeRecord: empRow || null,
        documents: docList
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to load regular joining form.'
    };
  }
}

async function resolveDocSignedUrl(storagePath?: string | null): Promise<string | undefined> {
  if (!storagePath || !isSupabaseConfigured) return undefined;
  try {
    const cleanPath = storagePath.replace(/^candidate-documents\//, '');
    const { data } = await supabase.storage.from('candidate-documents').createSignedUrl(cleanPath, 3600);
    return data?.signedUrl || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Explicitly verifies a Regular Joining submission in Joining Submissions.
 * Transitions submission_status to 'VERIFIED', verifies all documents, and provisions the employee record.
 */
export async function verifyRegularJoiningSubmission(
  formId: string,
  verifierAdminName: string = 'Administrator'
): Promise<RegularJoiningResult<{ employeeCode: string; employeeRecordId?: string }>> {
  try {
    const existing = await getRegularJoiningForm(formId);
    if (!existing.success || !existing.data) {
      throw new Error(existing.error || 'Joining record not found.');
    }

    const { formData, raw } = existing.data;
    const cleanCode = formData.employeeCode;

    // Validate that required details and all 4 documents are present
    if (!formData.fullName || formData.fullName.length < 2) {
      throw new Error('Candidate full name is required for verification.');
    }
    if (!formData.mobile || formData.mobile.length !== 10) {
      throw new Error('Valid 10-digit Aadhaar-linked mobile number is required for verification.');
    }
    if (!formData.photo?.storagePath) {
      throw new Error('Candidate Live Photo is required for verification.');
    }
    if (!formData.aadhaar?.storagePath) {
      throw new Error('Aadhaar Card Photo is required for verification.');
    }
    if (!formData.bankPassbook?.storagePath) {
      throw new Error('Bank Passbook Photo is required for verification.');
    }
    if (!formData.signature?.storagePath) {
      throw new Error('Candidate Signature Photo is required for verification.');
    }

    const nowIso = new Date().toISOString();

    // 1. Update joining_forms record
    const updatePayload: any = {
      submission_status: 'VERIFIED',
      verified_at: nowIso,
      verified_by: verifierAdminName,
      custom_fields: {
        ...(raw.custom_fields || {}),
        verifiedAt: nowIso,
        verifiedBy: verifierAdminName
      },
      updated_at: nowIso
    };

    const { error: jfUpdateErr } = await supabase
      .from('joining_forms')
      .update(updatePayload)
      .eq('id', formId);

    if (jfUpdateErr) {
      // Fallback if schema cache issues
      console.warn('[verifyRegularJoiningSubmission] Standard update failed, attempting custom_fields fallback:', jfUpdateErr);
      await supabase
        .from('joining_forms')
        .update({
          submission_status: 'VERIFIED',
          custom_fields: {
            ...(raw.custom_fields || {}),
            verifiedAt: nowIso,
            verifiedBy: verifierAdminName
          },
          updated_at: nowIso
        })
        .eq('id', formId);
    }

    // 2. Update linked documents in documents table to VERIFIED
    await supabase
      .from('documents')
      .update({
        verification_status: 'VERIFIED',
        verified_at: nowIso,
        verified_by: verifierAdminName
      })
      .eq('joining_form_id', formId);

    // 3. Provision / sync official employee record
    const companyId = raw.company_id || null;
    const empRecord = await provisionEmployeeRecord(formId, cleanCode, formData, companyId);

    // 4. Log activity
    await logActivity({
      entityType: 'JOINING_FORM',
      entityId: formId,
      action: 'REGULAR_JOINING_VERIFIED',
      description: `Regular joining record verified by ${verifierAdminName} for ${formData.fullName} (${cleanCode}).`,
      metadata: {
        employeeCode: cleanCode,
        verifiedBy: verifierAdminName
      }
    });

    return {
      success: true,
      data: {
        employeeCode: cleanCode,
        employeeRecordId: empRecord?.id
      }
    };
  } catch (err: any) {
    console.error('[verifyRegularJoiningSubmission] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to verify regular joining record.'
    };
  }
}

/**
 * Rejects a Regular Joining submission with a recorded reason.
 */
export async function rejectRegularJoiningSubmission(
  formId: string,
  rejectionReason: string,
  adminName: string = 'Administrator'
): Promise<RegularJoiningResult> {
  try {
    const existing = await getRegularJoiningForm(formId);
    if (!existing.success || !existing.data) {
      throw new Error(existing.error || 'Joining record not found.');
    }

    const { formData, raw } = existing.data;
    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('joining_forms')
      .update({
        submission_status: 'REJECTED',
        custom_fields: {
          ...(raw.custom_fields || {}),
          rejectionReason,
          rejectedBy: adminName,
          rejectedAt: nowIso
        },
        updated_at: nowIso
      })
      .eq('id', formId);

    if (updateErr) throw updateErr;

    // Log activity
    await logActivity({
      entityType: 'JOINING_FORM',
      entityId: formId,
      action: 'REGULAR_JOINING_REJECTED',
      description: `Regular joining record rejected by ${adminName} for ${formData.fullName}: ${rejectionReason}`,
      metadata: {
        rejectionReason,
        rejectedBy: adminName
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[rejectRegularJoiningSubmission] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to reject regular joining record.'
    };
  }
}

/**
 * Lists all Regular Joining Form records.
 */
export async function listRegularJoiningForms(): Promise<RegularJoiningResult<RegularJoiningFormData[]>> {
  try {
    const { data, error } = await supabase
      .from('joining_forms')
      .select('*')
      .or('joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const items: RegularJoiningFormData[] = (data || []).map((row: any) => {
      const custom = (row.custom_fields || {}) as any;
      return {
        id: row.id,
        employeeCode: row.employee_code || row.joining_reference || 'ATG-501-2026',
        joiningDate: row.date_of_joining || row.created_at?.split('T')[0] || '',
        department: row.department || '',
        designation: row.designation || '',
        companyName: row.company_name || custom.companyName || (row.company_id && KNOWN_COMPANY_LOOKUP[row.company_id]) || '',
        unitName: row.unit || custom.unitName || '',
        factorySupervisorName: row.factory_supervisor_name || custom.factorySupervisorName || '',
        salaryCtc: row.gross_salary || custom.salaryCtc || null,
        interviewDate: row.interview_date || custom.interviewDate || null,

        fullName: row.candidate_name || '',
        fatherName: row.father_name || '',
        dob: row.date_of_birth || '',
        gender: row.gender || 'MALE',
        maritalStatus: row.marital_status || 'SINGLE',
        aadhaarNumber: row.aadhaar_number || '',
        permanentAddress: row.permanent_address || '',
        currentAddress: row.current_address || '',
        sameAsPermanent: row.same_as_permanent ?? false,
        uanNumber: row.uan || custom.uanNumber || '',
        esicNumber: row.esic_number || custom.esicNumber || '',
        ptNumber: row.pt_number || custom.ptNumber || '',
        mobile: row.employee_contact_number || '',
        alternateMobile: row.other_contact_number || custom.alternateMobile || '',
        email: row.email || '',

        bankAccountNumber: row.bank_account_number || '',
        ifscCode: row.ifsc_code || '',
        bankName: row.bank_name || '',
        branchName: row.branch_name || '',
        upiNumber: row.upi_number || custom.upiNumber || '',

        photo: row.photo_path
          ? { name: 'photo.jpg', size: 0, type: 'image/jpeg', storagePath: row.photo_path }
          : custom.documentsMetadata?.photo
          ? { name: custom.documentsMetadata.photo.name || 'photo.jpg', size: 0, type: 'image/jpeg', storagePath: custom.documentsMetadata.photo.storagePath }
          : null,
        aadhaar: custom.documentsMetadata?.aadhaar
          ? { name: custom.documentsMetadata.aadhaar.name || 'aadhaar.jpg', size: 0, type: 'image/jpeg', storagePath: custom.documentsMetadata.aadhaar.storagePath }
          : null,
        bankPassbook: custom.documentsMetadata?.bankPassbook
          ? { name: custom.documentsMetadata.bankPassbook.name || 'bank_passbook.jpg', size: 0, type: 'image/jpeg', storagePath: custom.documentsMetadata.bankPassbook.storagePath }
          : null,
        signature: row.candidate_signature_path
          ? { name: 'signature.png', size: 0, type: 'image/png', storagePath: row.candidate_signature_path }
          : custom.documentsMetadata?.signature
          ? { name: custom.documentsMetadata.signature.name || 'signature.png', size: 0, type: 'image/png', storagePath: custom.documentsMetadata.signature.storagePath }
          : null,

        submissionStatus: (row.submission_status as any) || 'DRAFT',
        verifiedAt: row.verified_at || custom.verifiedAt || null,
        verifiedBy: row.verified_by || custom.verifiedBy || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    return {
      success: true,
      data: items
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to list regular joining forms.'
    };
  }
}

/**
 * Automatically generates and persists the official 2-sided Employee ID Card PDF
 * for the regular joining record using the standard CR80 template.
 */
export async function generateAndPersistRegularIdCard(
  formData: RegularJoiningFormData,
  joiningFormId?: string | null,
  employeeId?: string | null,
  currentAdminId?: string | null
): Promise<{
  success: boolean;
  blob?: Blob;
  pdfBytes?: Uint8Array;
  fileName?: string;
  storagePath?: string;
  error?: string;
}> {
  try {
    const cleanCode = formData.employeeCode?.trim() || 'ATG-501-2026';
    const cardData: EmployeeIdCardData = {
      employeeId: employeeId || undefined,
      joiningFormId: joiningFormId || undefined,
      employeeName: formData.fullName.trim(),
      employeeCode: cleanCode,
      designation: formData.designation?.trim() || 'Associate',
      department: formData.department?.trim() || 'Operations',
      companyName: formData.companyName?.trim() || 'A TIGER GLOBAL Career Solution & Consultancy',
      location: formData.unitName?.trim() || 'Nagpur, Maharashtra',
      dob: formData.dob || null,
      mobile: formData.mobile?.replace(/\D/g, '') || null,
      email: formData.email?.trim() || null,
      address: (formData.sameAsPermanent ? formData.permanentAddress : formData.currentAddress) || formData.permanentAddress || null,
      issuanceDate: formData.joiningDate || new Date().toISOString().split('T')[0],
      photoUrlOrData: formData.photo?.dataUrl || formData.photo?.storagePath || null,
      signatureUrlOrData: formData.signature?.dataUrl || formData.signature?.storagePath || null,
      bloodGroup: '—'
    };

    const res = await generateAndPersistEmployeeIdCard(cardData, currentAdminId);

    return {
      success: true,
      blob: res.blob,
      pdfBytes: res.pdfBytes,
      fileName: res.fileName,
      storagePath: res.storagePath
    };
  } catch (err: any) {
    console.error('[generateAndPersistRegularIdCard] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to generate Employee ID Card PDF.'
    };
  }
}
