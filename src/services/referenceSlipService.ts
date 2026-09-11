// ==============================================================================
// File: src/services/referenceSlipService.ts
// Description: Core Administrative Service for Reference Slips & Consultancy Returns
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Architecture:
//   - Supports dual candidate sources: Application-based (INQ-...) and Standalone Joining (JOIN-...)
//   - Manages public.reference_slips and public.consultancy_returns
//   - Generates unique reference numbers: ATG/REF/YYYY/XXXXXX
//   - Full activity logging with entityType = 'REFERENCE_SLIP'
//   - RLS-safe data access with zero exposed KYC PII in directory lists
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  ReferenceSlipRow,
  ReferenceSlipInsert,
  ReferenceSlipUpdate,
  ConsultancyReturnRow,
  GeneratedFileRow,
  CompanyRow
} from '../types/database';
import { logActivity } from './activityService';
import { generateAndPersistReferenceSlipPdf } from './referenceSlipPdfGenerator';
import { getGeneratedDocumentSignedUrl } from './filePersistenceService';

export interface CandidateSourceInfo {
  sourceType: 'APPLICATION' | 'JOINING_FORM';
  sourceId: string;
  sourceReference: string; // INQ-YYYY-XXXXXX or JOIN-YYYY-XXXXXX
  fullName: string;
  fatherName: string;
  mobile: string;
  email: string;
  address: string;
  dob?: string | null;
  gender?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  positionApplied?: string | null;
  expectedJoiningDate?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
}

export interface ReferenceSlipListItem {
  id: string;
  referenceNumber: string;
  date: string;
  applicationId: string | null;
  joiningFormId: string | null;
  sourceType: 'APPLICATION' | 'JOINING_FORM';
  sourceReference: string;
  candidateName: string;
  candidateMobile: string;
  candidateEmail: string;
  companyId: string | null;
  companyName: string | null;
  interviewDate: string | null;
  reportingDate: string | null;
  reportingTime: string | null;
  department: string | null;
  designation: string | null;
  salaryCtc: number | null;
  interviewResult: string | null;
  selectedDesignation: string | null;
  joiningDate: string | null;
  remarks: string | null;
  consultancyAccepted: boolean;
  consultancyAcceptedAt: string | null;
  latestGeneratedFile?: GeneratedFileRow | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceSlipDetailData {
  slip: ReferenceSlipRow;
  candidate: CandidateSourceInfo;
  consultancyReturn: ConsultancyReturnRow | null;
  generatedFiles: GeneratedFileRow[];
  company: CompanyRow | null;
}

export interface ReferenceSlipFormData {
  companyId?: string | null;
  companyName?: string | null;
  interviewDate?: string | null;
  reportingDate?: string | null;
  reportingTime?: string | null;
  department?: string | null;
  designation?: string | null;
  salaryCtc?: number | null;
  interviewConductedBy?: string | null;
  interviewResult: 'SELECTED' | 'HOLD' | 'REJECTED' | string;
  selectedDesignation?: string | null;
  joiningDate?: string | null;
  remarks?: string | null;
}

export interface ReferenceSlipFilters {
  search?: string;
  result?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReferenceSlipKPIs {
  totalSlips: number;
  selectedCount: number;
  holdCount: number;
  rejectedCount: number;
  generatedPackets: number;
}

/**
 * Generates an authoritative Reference Number in the format: ATG/REF/YYYY/XXXXXX
 */
export async function generateReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  if (!isSupabaseConfigured) {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `ATG/REF/${year}/${random}`;
  }

  try {
    const { count, error } = await supabase
      .from('reference_slips')
      .select('id', { count: 'exact', head: true });

    const seq = error || count === null ? Math.floor(1000 + Math.random() * 9000) : (count + 1);
    const padded = String(seq).padStart(6, '0');
    return `ATG/REF/${year}/${padded}`;
  } catch (err) {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `ATG/REF/${year}/${random}`;
  }
}

/**
 * Resolves candidate demographic and document details from an Application or Joining Form
 */
export async function resolveCandidateSource(
  applicationId?: string | null,
  joiningFormId?: string | null
): Promise<CandidateSourceInfo | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    // 1. If joiningFormId is provided, query joining_forms
    if (joiningFormId) {
      const { data: jf, error: jfErr } = await supabase
        .from('joining_forms')
        .select('*')
        .eq('id', joiningFormId)
        .maybeSingle();

      if (jf && !jfErr) {
        return {
          sourceType: 'JOINING_FORM',
          sourceId: jf.id,
          sourceReference: jf.joining_reference || `JOIN-${new Date().getFullYear()}-000000`,
          fullName: jf.candidate_name || '—',
          fatherName: jf.father_name || jf.mother_or_husband_name || '—',
          mobile: jf.employee_contact_number || '—',
          email: jf.email || '—',
          address: [jf.permanent_address, jf.permanent_city, jf.permanent_district, jf.permanent_state, jf.permanent_pin_code]
            .filter(Boolean)
            .join(', ') || '—',
          dob: jf.date_of_birth,
          gender: jf.gender,
          aadhaarNumber: jf.aadhaar_number,
          panNumber: jf.pan_number,
          positionApplied: jf.designation,
          expectedJoiningDate: jf.date_of_joining,
          photoUrl: jf.photo_path,
          signatureUrl: jf.candidate_signature_path
        };
      }
    }

    // 2. If applicationId is provided, query applications
    if (applicationId) {
      const { data: app, error: appErr } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

      if (app && !appErr) {
        // Also check if candidate has a linked joining form for extra KYC / photo info
        const { data: linkedJf } = await supabase
          .from('joining_forms')
          .select('*')
          .eq('application_id', applicationId)
          .maybeSingle();

        // Check for candidate photo in documents table
        const { data: photoDoc } = await supabase
          .from('documents')
          .select('storage_path')
          .eq('application_id', applicationId)
          .eq('document_type', 'PHOTO')
          .maybeSingle();

        const { data: sigDoc } = await supabase
          .from('documents')
          .select('storage_path')
          .eq('application_id', applicationId)
          .eq('document_type', 'SIGNATURE')
          .maybeSingle();

        return {
          sourceType: 'APPLICATION',
          sourceId: app.id,
          sourceReference: app.application_number,
          fullName: app.full_name,
          fatherName: app.father_name,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          dob: linkedJf?.date_of_birth || null,
          gender: linkedJf?.gender || null,
          aadhaarNumber: linkedJf?.aadhaar_number || null,
          panNumber: linkedJf?.pan_number || null,
          positionApplied: app.designation || linkedJf?.designation || null,
          expectedJoiningDate: linkedJf?.date_of_joining || null,
          photoUrl: linkedJf?.photo_path || photoDoc?.storage_path || null,
          signatureUrl: linkedJf?.candidate_signature_path || sigDoc?.storage_path || null
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[resolveCandidateSource] Error:', err);
    return null;
  }
}

/**
 * Fetches the central directory of Reference Slips with search and filters
 */
export async function getReferenceSlips(
  filters: ReferenceSlipFilters = {}
): Promise<{ data: ReferenceSlipListItem[]; kpis: ReferenceSlipKPIs }> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      kpis: {
        totalSlips: 0,
        selectedCount: 0,
        holdCount: 0,
        rejectedCount: 0,
        generatedPackets: 0
      }
    };
  }

  try {
    let query = supabase
      .from('reference_slips')
      .select(`
        *,
        applications (
          id,
          application_number,
          full_name,
          mobile,
          email
        ),
        joining_forms (
          id,
          joining_reference,
          candidate_name,
          employee_contact_number,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.result && filters.result !== 'ALL') {
      query = query.ilike('interview_result', filters.result);
    }

    if (filters.companyId && filters.companyId !== 'ALL') {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error('[getReferenceSlips] DB query error:', error.message);
      return { data: [], kpis: { totalSlips: 0, selectedCount: 0, holdCount: 0, rejectedCount: 0, generatedPackets: 0 } };
    }

    // Fetch latest generated files for all reference slips
    const { data: genFiles } = await supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'REFERENCE_SLIP_PDF')
      .order('version', { ascending: false });

    // Fetch consultancy returns
    const { data: retRows } = await supabase
      .from('consultancy_returns')
      .select('*');

    const consultancyMap = new Map<string, ConsultancyReturnRow>();
    if (retRows) {
      retRows.forEach((r) => {
        if (r.application_id) consultancyMap.set(`app_${r.application_id}`, r);
        if (r.joining_form_id) consultancyMap.set(`jf_${r.joining_form_id}`, r);
      });
    }

    const genFileMap = new Map<string, GeneratedFileRow>();
    if (genFiles) {
      genFiles.forEach((f) => {
        const key = f.application_id ? `app_${f.application_id}` : `jf_${f.joining_form_id}`;
        if (!genFileMap.has(key)) {
          genFileMap.set(key, f);
        }
      });
    }

    const items: ReferenceSlipListItem[] = (rows || []).map((row: any) => {
      const isApp = Boolean(row.application_id);
      const app = row.applications;
      const jf = row.joining_forms;

      const candidateName = isApp
        ? app?.full_name || 'Candidate'
        : jf?.candidate_name || 'Candidate';

      const candidateMobile = isApp
        ? app?.mobile || '—'
        : jf?.employee_contact_number || '—';

      const candidateEmail = isApp
        ? app?.email || '—'
        : jf?.email || '—';

      const sourceReference = isApp
        ? app?.application_number || 'INQ-PENDING'
        : jf?.joining_reference || 'JOIN-PENDING';

      const returnKey = isApp ? `app_${row.application_id}` : `jf_${row.joining_form_id}`;
      const cReturn = consultancyMap.get(returnKey);
      const genFile = genFileMap.get(returnKey);

      return {
        id: row.id,
        referenceNumber: row.reference_number,
        date: row.date,
        applicationId: row.application_id,
        joiningFormId: row.joining_form_id,
        sourceType: isApp ? 'APPLICATION' : 'JOINING_FORM',
        sourceReference,
        candidateName,
        candidateMobile,
        candidateEmail,
        companyId: row.company_id,
        companyName: row.company_name,
        interviewDate: row.interview_date,
        reportingDate: row.reporting_date,
        reportingTime: row.reporting_time,
        department: row.department,
        designation: row.designation,
        salaryCtc: row.salary_ctc,
        interviewResult: row.interview_result,
        selectedDesignation: row.selected_designation,
        joiningDate: row.joining_date,
        remarks: row.remarks,
        consultancyAccepted: Boolean(cReturn?.candidate_acceptance),
        consultancyAcceptedAt: cReturn?.accepted_at || null,
        latestGeneratedFile: genFile || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    // Client-side text search if provided
    let filtered = items;
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = items.filter(
        (it) =>
          it.referenceNumber.toLowerCase().includes(q) ||
          it.candidateName.toLowerCase().includes(q) ||
          it.sourceReference.toLowerCase().includes(q) ||
          (it.companyName && it.companyName.toLowerCase().includes(q))
      );
    }

    // Derive KPIs
    const kpis: ReferenceSlipKPIs = {
      totalSlips: items.length,
      selectedCount: items.filter((it) => it.interviewResult?.toUpperCase() === 'SELECTED').length,
      holdCount: items.filter((it) => it.interviewResult?.toUpperCase() === 'HOLD').length,
      rejectedCount: items.filter((it) => it.interviewResult?.toUpperCase() === 'REJECTED').length,
      generatedPackets: items.filter((it) => Boolean(it.latestGeneratedFile)).length
    };

    return { data: filtered, kpis };
  } catch (err) {
    console.error('[getReferenceSlips] Unexpected error:', err);
    return { data: [], kpis: { totalSlips: 0, selectedCount: 0, holdCount: 0, rejectedCount: 0, generatedPackets: 0 } };
  }
}

/**
 * Retrieves a single Reference Slip by ID with full candidate and consultancy return detail
 */
export async function getReferenceSlipById(
  id: string
): Promise<{ success: boolean; data?: ReferenceSlipDetailData; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database connection is not configured.' };
  }

  try {
    const { data: slip, error: slipErr } = await supabase
      .from('reference_slips')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (slipErr || !slip) {
      return { success: false, error: slipErr?.message || 'Reference Slip record not found.' };
    }

    // Resolve candidate
    const candidate = await resolveCandidateSource(slip.application_id, slip.joining_form_id);
    if (!candidate) {
      return { success: false, error: 'Could not resolve candidate source records.' };
    }

    // Resolve Consultancy Return
    let retQuery = supabase.from('consultancy_returns').select('*');
    if (slip.joining_form_id) {
      retQuery = retQuery.eq('joining_form_id', slip.joining_form_id);
    } else if (slip.application_id) {
      retQuery = retQuery.eq('application_id', slip.application_id);
    }
    const { data: cReturn } = await retQuery.maybeSingle();

    // Resolve Company if company_id is present
    let company: CompanyRow | null = null;
    if (slip.company_id) {
      const { data: comp } = await supabase
        .from('companies')
        .select('*')
        .eq('id', slip.company_id)
        .maybeSingle();
      company = comp;
    }

    // Resolve Generated Files ledger
    let genQuery = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'REFERENCE_SLIP_PDF');
    if (slip.joining_form_id) {
      genQuery = genQuery.eq('joining_form_id', slip.joining_form_id);
    } else if (slip.application_id) {
      genQuery = genQuery.eq('application_id', slip.application_id);
    }
    const { data: genFiles } = await genQuery.order('version', { ascending: false });

    return {
      success: true,
      data: {
        slip,
        candidate,
        consultancyReturn: cReturn || null,
        generatedFiles: genFiles || [],
        company
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve Reference Slip details.' };
  }
}

/**
 * Retrieves the Reference Slip for an Application or Standalone Joining Form
 */
export async function getReferenceSlipForEntity(params: {
  applicationId?: string;
  joiningFormId?: string;
}): Promise<{ success: boolean; data?: ReferenceSlipDetailData | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, data: null };
  }

  try {
    let query = supabase.from('reference_slips').select('*');
    if (params.joiningFormId) {
      query = query.eq('joining_form_id', params.joiningFormId);
    } else if (params.applicationId) {
      query = query.eq('application_id', params.applicationId);
    } else {
      return { success: false, error: 'Entity identifier is required.' };
    }

    const { data: slip, error } = await query.maybeSingle();
    if (error) {
      return { success: false, error: error.message };
    }
    if (!slip) {
      return { success: true, data: null };
    }

    return await getReferenceSlipById(slip.id);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching reference slip for entity.' };
  }
}

/**
 * Creates or updates an administrative Reference Slip
 */
export async function saveReferenceSlip(params: {
  applicationId?: string | null;
  joiningFormId?: string | null;
  slipId?: string | null;
  formData: ReferenceSlipFormData;
  adminUser?: { id: string; name?: string; role?: string };
}): Promise<{ success: boolean; data?: ReferenceSlipRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        id: params.slipId || 'mock-slip-id',
        application_id: params.applicationId || null,
        joining_form_id: params.joiningFormId || null,
        company_id: params.formData.companyId || null,
        company_name: params.formData.companyName || null,
        reference_number: 'ATG/REF/2026/000101',
        date: new Date().toISOString().split('T')[0],
        interview_date: params.formData.interviewDate || null,
        reporting_date: params.formData.reportingDate || null,
        reporting_time: params.formData.reportingTime || null,
        department: params.formData.department || null,
        designation: params.formData.designation || null,
        salary_ctc: params.formData.salaryCtc || null,
        interview_conducted_by: params.formData.interviewConductedBy || null,
        interview_result: params.formData.interviewResult,
        selected_designation: params.formData.selectedDesignation || null,
        joining_date: params.formData.joiningDate || null,
        remarks: params.formData.remarks || null,
        candidate_signature_path: null,
        authorized_signature_path: null,
        company_signature_path: null,
        company_seal_path: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  }

  if (!params.applicationId && !params.joiningFormId) {
    return { success: false, error: 'Either applicationId or joiningFormId is required.' };
  }

  try {
    let existingSlip: ReferenceSlipRow | null = null;
    if (params.slipId) {
      const { data } = await supabase
        .from('reference_slips')
        .select('*')
        .eq('id', params.slipId)
        .maybeSingle();
      existingSlip = data;
    } else {
      let query = supabase.from('reference_slips').select('*');
      if (params.joiningFormId) {
        query = query.eq('joining_form_id', params.joiningFormId);
      } else if (params.applicationId) {
        query = query.eq('application_id', params.applicationId);
      }
      const { data } = await query.maybeSingle();
      existingSlip = data;
    }

    if (existingSlip) {
      // UPDATE
      const updatePayload: ReferenceSlipUpdate = {
        company_id: params.formData.companyId || null,
        company_name: params.formData.companyName || null,
        interview_date: params.formData.interviewDate || null,
        reporting_date: params.formData.reportingDate || null,
        reporting_time: params.formData.reportingTime || null,
        department: params.formData.department || null,
        designation: params.formData.designation || null,
        salary_ctc: params.formData.salaryCtc || null,
        interview_conducted_by: params.formData.interviewConductedBy || null,
        interview_result: params.formData.interviewResult,
        selected_designation: params.formData.selectedDesignation || null,
        joining_date: params.formData.joiningDate || null,
        remarks: params.formData.remarks || null,
        updated_at: new Date().toISOString()
      };

      const { data: updated, error: updErr } = await supabase
        .from('reference_slips')
        .update(updatePayload)
        .eq('id', existingSlip.id)
        .select('*')
        .single();

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      await logActivity({
        applicationId: params.applicationId || undefined,
        entityType: 'REFERENCE_SLIP',
        entityId: existingSlip.id,
        action: 'REFERENCE_SLIP_UPDATED',
        metadata: {
          referenceNumber: existingSlip.reference_number,
          result: params.formData.interviewResult,
          company: params.formData.companyName,
          updatedBy: params.adminUser?.name || 'Admin'
        }
      });

      return { success: true, data: updated };
    } else {
      // INSERT NEW
      const refNumber = await generateReferenceNumber();
      const insertPayload: ReferenceSlipInsert = {
        application_id: params.applicationId || null,
        joining_form_id: params.joiningFormId || null,
        reference_number: refNumber,
        date: new Date().toISOString().split('T')[0],
        company_id: params.formData.companyId || null,
        company_name: params.formData.companyName || null,
        interview_date: params.formData.interviewDate || null,
        reporting_date: params.formData.reportingDate || null,
        reporting_time: params.formData.reportingTime || null,
        department: params.formData.department || null,
        designation: params.formData.designation || null,
        salary_ctc: params.formData.salaryCtc || null,
        interview_conducted_by: params.formData.interviewConductedBy || null,
        interview_result: params.formData.interviewResult,
        selected_designation: params.formData.selectedDesignation || null,
        joining_date: params.formData.joiningDate || null,
        remarks: params.formData.remarks || null
      };

      const { data: inserted, error: insErr } = await supabase
        .from('reference_slips')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insErr) {
        return { success: false, error: insErr.message };
      }

      // Also ensure a corresponding consultancy_returns row is initialized if not present
      let retQuery = supabase.from('consultancy_returns').select('id');
      if (params.joiningFormId) {
        retQuery = retQuery.eq('joining_form_id', params.joiningFormId);
      } else if (params.applicationId) {
        retQuery = retQuery.eq('application_id', params.applicationId);
      }
      const { data: existingReturn } = await retQuery.maybeSingle();

      if (!existingReturn) {
        await supabase.from('consultancy_returns').insert({
          application_id: params.applicationId || null,
          joining_form_id: params.joiningFormId || null,
          candidate_acceptance: false
        });
      }

      await logActivity({
        applicationId: params.applicationId || undefined,
        entityType: 'REFERENCE_SLIP',
        entityId: inserted.id,
        action: 'REFERENCE_SLIP_CREATED',
        metadata: {
          referenceNumber: inserted.reference_number,
          result: params.formData.interviewResult,
          company: params.formData.companyName,
          createdBy: params.adminUser?.name || 'Admin'
        }
      });

      return { success: true, data: inserted };
    }
  } catch (err: any) {
    console.error('[saveReferenceSlip] Error:', err);
    return { success: false, error: err?.message || 'Failed to save Reference Slip.' };
  }
}

/**
 * Records candidate acceptance of Consultancy Return Policy & Terms
 */
export async function updateConsultancyReturnAcceptance(params: {
  applicationId?: string | null;
  joiningFormId?: string | null;
  acceptance: boolean;
  signaturePath?: string | null;
  adminUserName?: string;
}): Promise<{ success: boolean; data?: ConsultancyReturnRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    let query = supabase.from('consultancy_returns').select('*');
    if (params.joiningFormId) {
      query = query.eq('joining_form_id', params.joiningFormId);
    } else if (params.applicationId) {
      query = query.eq('application_id', params.applicationId);
    } else {
      return { success: false, error: 'Entity identifier required.' };
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('consultancy_returns')
        .update({
          candidate_acceptance: params.acceptance,
          candidate_signature_path: params.signaturePath !== undefined ? params.signaturePath : existing.candidate_signature_path,
          accepted_at: params.acceptance ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) return { success: false, error: error.message };

      if (params.acceptance) {
        await logActivity({
          applicationId: params.applicationId || undefined,
          entityType: 'REFERENCE_SLIP',
          entityId: existing.id,
          action: 'CONSULTANCY_RETURN_ACCEPTED',
          metadata: {
            acceptance: true,
            acceptedAt: new Date().toISOString(),
            recordedBy: params.adminUserName || 'Candidate Action'
          }
        });
      }

      return { success: true, data: updated };
    } else {
      const { data: inserted, error } = await supabase
        .from('consultancy_returns')
        .insert({
          application_id: params.applicationId || null,
          joining_form_id: params.joiningFormId || null,
          candidate_acceptance: params.acceptance,
          candidate_signature_path: params.signaturePath || null,
          accepted_at: params.acceptance ? new Date().toISOString() : null
        })
        .select('*')
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: inserted };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update Consultancy Return.' };
  }
}

/**
 * Lists candidates (from Applications and Standalone Joining Forms) who can have reference slips generated
 */
export async function getCandidatesForReferenceSlip(): Promise<Array<{
  type: 'APPLICATION' | 'JOINING_FORM';
  id: string;
  reference: string;
  candidateName: string;
  mobile: string;
  email: string;
  hasSlip: boolean;
}>> {
  if (!isSupabaseConfigured) {
    return [
      {
        type: 'APPLICATION',
        id: 'mock-app-1',
        reference: 'INQ-2026-000101',
        candidateName: 'Rahul Sharma',
        mobile: '+91 9876543210',
        email: 'rahul.sharma@example.com',
        hasSlip: false
      }
    ];
  }

  try {
    // 1. Applications
    const { data: apps } = await supabase
      .from('applications')
      .select('id, application_number, full_name, mobile, email')
      .order('created_at', { ascending: false })
      .limit(50);

    // 2. Standalone Joining Forms
    const { data: joinings } = await supabase
      .from('joining_forms')
      .select('id, joining_reference, candidate_name, employee_contact_number, email, application_id')
      .is('application_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    // 3. Existing reference slips to know which ones already have slips
    const { data: existingSlips } = await supabase
      .from('reference_slips')
      .select('application_id, joining_form_id');

    const appSlipSet = new Set((existingSlips || []).map((s) => s.application_id).filter(Boolean));
    const jfSlipSet = new Set((existingSlips || []).map((s) => s.joining_form_id).filter(Boolean));

    const result: Array<{
      type: 'APPLICATION' | 'JOINING_FORM';
      id: string;
      reference: string;
      candidateName: string;
      mobile: string;
      email: string;
      hasSlip: boolean;
    }> = [];

    (apps || []).forEach((app) => {
      result.push({
        type: 'APPLICATION',
        id: app.id,
        reference: app.application_number,
        candidateName: app.full_name,
        mobile: app.mobile,
        email: app.email,
        hasSlip: appSlipSet.has(app.id)
      });
    });

    (joinings || []).forEach((jf) => {
      result.push({
        type: 'JOINING_FORM',
        id: jf.id,
        reference: jf.joining_reference || 'JOIN-STANDALONE',
        candidateName: jf.candidate_name || 'Joining Candidate',
        mobile: jf.employee_contact_number || '—',
        email: jf.email || '—',
        hasSlip: jfSlipSet.has(jf.id)
      });
    });

    return result;
  } catch (err) {
    console.error('[getCandidatesForReferenceSlip] Error:', err);
    return [];
  }
}

/**
 * Idempotently retrieves or creates a Reference Slip and its persisted 2-page vector PDF.
 * Never creates duplicate reference slips or duplicate generated files.
 */
export async function getOrCreateReferenceSlipForEntity(params: {
  applicationId?: string | null;
  joiningFormId?: string | null;
  adminUserId?: string | null;
  forceRegenerate?: boolean;
}): Promise<{
  success: boolean;
  data?: ReferenceSlipDetailData;
  file?: GeneratedFileRow;
  signedUrl?: string;
  pdfBytes?: Uint8Array;
  error?: string;
}> {
  if (!params.applicationId && !params.joiningFormId) {
    return { success: false, error: 'Either applicationId or joiningFormId is required.' };
  }

  // 1. Fetch existing reference slip or create one if absent
  let detailRes = await getReferenceSlipForEntity({
    applicationId: params.applicationId || undefined,
    joiningFormId: params.joiningFormId || undefined
  });

  if (!detailRes.success) {
    return { success: false, error: detailRes.error };
  }

  let detail = detailRes.data;

  // If no reference slip exists yet, create one
  if (!detail) {
    const candidate = await resolveCandidateSource(params.applicationId, params.joiningFormId);
    if (!candidate) {
      return { success: false, error: 'Could not resolve candidate source records.' };
    }

    const saveRes = await saveReferenceSlip({
      applicationId: params.applicationId,
      joiningFormId: params.joiningFormId,
      formData: {
        interviewResult: 'SELECTED',
        designation: candidate.positionApplied || 'Consultant / Executive',
        remarks: 'Auto-generated official reference slip upon verified payment completion.'
      },
      adminUser: { id: params.adminUserId || 'system', name: 'Automated Payment Verification' }
    });

    if (!saveRes.success || !saveRes.data) {
      return { success: false, error: saveRes.error || 'Failed to initialize reference slip record.' };
    }

    detailRes = await getReferenceSlipById(saveRes.data.id);
    if (!detailRes.success || !detailRes.data) {
      return { success: false, error: detailRes.error || 'Failed to load created reference slip.' };
    }
    detail = detailRes.data;
  }

  // 2. Check if a generated 2-page PDF already exists
  const existingPdfFile = detail.generatedFiles.find((f) => f.file_type === 'REFERENCE_SLIP_PDF');

  if (existingPdfFile && !params.forceRegenerate) {
    // Reuse existing generated PDF
    const { url: signedUrl } = await getGeneratedDocumentSignedUrl(existingPdfFile.storage_path, 3600);
    return {
      success: true,
      data: detail,
      file: existingPdfFile,
      signedUrl: signedUrl || undefined
    };
  }

  // 3. Generate and persist new official 2-page vector PDF
  const genRes = await generateAndPersistReferenceSlipPdf(detail, params.adminUserId);
  if (!genRes.success) {
    return { success: false, error: genRes.error, data: detail };
  }

  // Re-fetch detail to reflect new generated file record
  const refreshedDetailRes = await getReferenceSlipById(detail.slip.id);
  const refreshedDetail = refreshedDetailRes.data || detail;
  const newFile = refreshedDetail.generatedFiles.find((f) => f.id === genRes.fileId) || refreshedDetail.generatedFiles[0];

  return {
    success: true,
    data: refreshedDetail,
    file: newFile,
    signedUrl: genRes.signedUrl,
    pdfBytes: genRes.pdfBytes
  };
}

/**
 * Idempotently generates or fetches the Reference Slip associated with a verified payment.
 * Resolves candidate's authoritative email and reference numbers.
 */
export async function getOrCreateReferenceSlipForPayment(paymentId: string): Promise<{
  success: boolean;
  data?: ReferenceSlipDetailData;
  file?: GeneratedFileRow;
  signedUrl?: string;
  pdfBytes?: Uint8Array;
  candidateEmail?: string;
  candidateName?: string;
  referenceNumber?: string;
  sourceReference?: string;
  error?: string;
}> {
  if (!paymentId) {
    return { success: false, error: 'Payment ID is required' };
  }

  try {
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('id, application_id, joining_form_id, status, purpose')
      .eq('id', paymentId)
      .maybeSingle();

    if (pErr || !payment) {
      return { success: false, error: pErr?.message || `Payment record ${paymentId} not found.` };
    }

    let applicationId = payment.application_id;
    let joiningFormId = payment.joining_form_id;

    // If joiningFormId is missing but applicationId is present, check if joining_forms has it
    if (!joiningFormId && applicationId) {
      const { data: linkedJf } = await supabase
        .from('joining_forms')
        .select('id')
        .eq('application_id', applicationId)
        .maybeSingle();
      if (linkedJf) {
        joiningFormId = linkedJf.id;
      }
    }

    // If applicationId is missing but joiningFormId is present, check if joining_forms has application_id
    if (!applicationId && joiningFormId) {
      const { data: linkedJf } = await supabase
        .from('joining_forms')
        .select('application_id')
        .eq('id', joiningFormId)
        .maybeSingle();
      if (linkedJf?.application_id) {
        applicationId = linkedJf.application_id;
      }
    }

    if (!joiningFormId && !applicationId) {
      return { success: false, error: 'Payment is not linked to an Application or Joining Form.' };
    }

    const res = await getOrCreateReferenceSlipForEntity({
      applicationId,
      joiningFormId
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Failed to get or create reference slip for payment.' };
    }

    return {
      success: true,
      data: res.data,
      file: res.file,
      signedUrl: res.signedUrl,
      pdfBytes: res.pdfBytes,
      candidateEmail: res.data.candidate.email,
      candidateName: res.data.candidate.fullName,
      referenceNumber: res.data.slip.reference_number,
      sourceReference: res.data.candidate.sourceReference
    };
  } catch (err: any) {
    console.error('[getOrCreateReferenceSlipForPayment] Error:', err);
    return { success: false, error: err?.message || 'Error processing payment reference slip.' };
  }
}

