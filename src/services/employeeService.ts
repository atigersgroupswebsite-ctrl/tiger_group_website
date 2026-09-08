// ==============================================================================
// File: src/services/employeeService.ts
// Description: Employee Administrative Foundation & ID Card Workflow Engine
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Architecture:
//   - Manages official employee records in public.employees
//   - Fully supports BOTH application-based employees (application_id)
//     AND standalone joining employees (joining_form_id)
//   - Coordinates Employee ID Card generation, persistence, printing, and email dispatch
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { EmployeeRow, EmploymentStatus, GeneratedFileRow } from '../types/database';
import {
  generateAndPersistEmployeeIdCard,
  type EmployeeIdCardData
} from './employeeIdCardGenerator';
import { logActivity } from './activityService';
import { normalizeIndianPhoneNumber } from '../utils/phoneUtils';

export interface CreateOrPromoteEmployeeInput {
  applicationId?: string | null;
  joiningFormId?: string | null;
  companyId?: string | null;
  employeeCode: string;
  candidateName: string;
  mobile?: string | null;
  email: string;
  joiningReference?: string | null;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  joiningDate?: string | null;
  employmentStatus?: EmploymentStatus;
  idCardNumber?: string | null;
}

/**
 * Retrieves an employee record by application_id
 */
export async function getEmployeeByApplicationId(
  applicationId: string
): Promise<EmployeeRow | null> {
  if (!isSupabaseConfigured || !applicationId) return null;

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (error) {
      console.warn('[getEmployeeByApplicationId] Error:', error.message);
      return null;
    }
    return data as EmployeeRow | null;
  } catch (err) {
    console.error('[getEmployeeByApplicationId] Exception:', err);
    return null;
  }
}

/**
 * Retrieves an employee record by joining_form_id (standalone joining candidates)
 */
export async function getEmployeeByJoiningFormId(
  joiningFormId: string
): Promise<EmployeeRow | null> {
  if (!isSupabaseConfigured || !joiningFormId) return null;

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('joining_form_id', joiningFormId)
      .maybeSingle();

    if (error) {
      console.warn('[getEmployeeByJoiningFormId] Error:', error.message);
      return null;
    }
    return data as EmployeeRow | null;
  } catch (err) {
    console.error('[getEmployeeByJoiningFormId] Exception:', err);
    return null;
  }
}

/**
 * Retrieves an employee record by its primary key id
 */
export async function getEmployeeById(
  employeeId: string
): Promise<EmployeeRow | null> {
  if (!isSupabaseConfigured || !employeeId) return null;

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (error) {
      console.warn('[getEmployeeById] Error:', error.message);
      return null;
    }
    return data as EmployeeRow | null;
  } catch (err) {
    console.error('[getEmployeeById] Exception:', err);
    return null;
  }
}

/**
 * Creates or updates an official employee record.
 * Supports both application-based and standalone joining candidates.
 */
export async function createOrUpdateEmployeeRecord(
  input: CreateOrPromoteEmployeeInput,
  currentAdminId?: string | null
): Promise<{ success: boolean; employee?: EmployeeRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  if (!input.applicationId && !input.joiningFormId) {
    return { success: false, error: 'Either applicationId or joiningFormId is required.' };
  }

  if (!input.employeeCode || !input.employeeCode.trim()) {
    return { success: false, error: 'Employee Code is required.' };
  }

  if (!input.candidateName || !input.candidateName.trim()) {
    return { success: false, error: 'Candidate name is required.' };
  }

  try {
    // Check if an existing employee record matches
    let existingQuery = supabase.from('employees').select('*');
    if (input.joiningFormId) {
      existingQuery = existingQuery.eq('joining_form_id', input.joiningFormId);
    } else {
      existingQuery = existingQuery.eq('application_id', input.applicationId!);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    const canonicalMobile = input.mobile
      ? (normalizeIndianPhoneNumber(input.mobile).isValid
          ? normalizeIndianPhoneNumber(input.mobile).normalized
          : input.mobile.trim())
      : null;

    if (existing) {
      // Update existing record
      const { data: updated, error: updateErr } = await supabase
        .from('employees')
        .update({
          employee_code: input.employeeCode.trim(),
          candidate_name: input.candidateName.trim(),
          mobile: canonicalMobile || existing.mobile,
          email: input.email?.trim() || existing.email,
          designation: input.designation || existing.designation,
          department: input.department || existing.department,
          location: input.location || existing.location,
          joining_date: input.joiningDate || existing.joining_date,
          employment_status: input.employmentStatus || existing.employment_status,
          id_card_number: input.idCardNumber || existing.id_card_number,
          company_id: input.companyId || existing.company_id,
          joining_reference: input.joiningReference || existing.joining_reference
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      await logActivity({
        entityType: 'EMPLOYEE',
        entityId: existing.id,
        applicationId: input.applicationId || null,
        action: 'EMPLOYEE_RECORD_UPDATED',
        description: `Updated employee record for ${input.employeeCode}`,
        metadata: { employeeCode: input.employeeCode, updatedBy: currentAdminId }
      });

      return { success: true, employee: updated as EmployeeRow };
    }

    // Insert new employee record
    const { data: inserted, error: insertErr } = await supabase
      .from('employees')
      .insert({
        application_id: input.applicationId || null,
        joining_form_id: input.joiningFormId || null,
        company_id: input.companyId || null,
        employee_code: input.employeeCode.trim(),
        candidate_name: input.candidateName.trim(),
        mobile: canonicalMobile || null,
        email: input.email?.trim() || null,
        joining_reference: input.joiningReference || null,
        designation: input.designation || 'Associate',
        department: input.department || 'Operations',
        location: input.location || 'Nagpur, Maharashtra',
        joining_date: input.joiningDate || new Date().toISOString().split('T')[0],
        employment_status: input.employmentStatus || 'ACTIVE',
        id_card_number: input.idCardNumber || `IDC-${input.employeeCode.trim()}`
      })
      .select('*')
      .single();

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    await logActivity({
      entityType: 'EMPLOYEE',
      entityId: inserted.id,
      applicationId: input.applicationId || null,
      action: 'EMPLOYEE_PROMOTED',
      description: `Promoted candidate to official Employee record (${input.employeeCode})`,
      metadata: {
        employeeId: inserted.id,
        employeeCode: input.employeeCode,
        applicationId: input.applicationId,
        joiningFormId: input.joiningFormId,
        promotedBy: currentAdminId
      }
    });

    return { success: true, employee: inserted as EmployeeRow };
  } catch (err: any) {
    console.error('[createOrUpdateEmployeeRecord] Error:', err);
    return { success: false, error: err?.message || 'Failed to save employee record.' };
  }
}

/**
 * Retrieves the latest generated ID Card for an employee from generated_files
 */
export async function getLatestGeneratedIdCard(params: {
  applicationId?: string | null;
  joiningFormId?: string | null;
}): Promise<GeneratedFileRow | null> {
  if (!isSupabaseConfigured) return null;

  try {
    let query = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'ID_CARD_PDF')
      .order('created_at', { ascending: false })
      .limit(1);

    if (params.joiningFormId) {
      query = query.eq('joining_form_id', params.joiningFormId);
    } else if (params.applicationId) {
      query = query.eq('application_id', params.applicationId);
    } else {
      return null;
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('[getLatestGeneratedIdCard] Error:', error.message);
      return null;
    }
    return data as GeneratedFileRow | null;
  } catch (err) {
    console.error('[getLatestGeneratedIdCard] Exception:', err);
    return null;
  }
}

/**
 * Administrative action: Generates and persists an ID Card for an employee
 */
export async function processEmployeeIdCardGeneration(
  employee: EmployeeRow,
  contextData: {
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    photoUrl?: string | null;
    signatureUrl?: string | null;
  },
  currentAdminId?: string | null
): Promise<{
  success: boolean;
  fileId?: string;
  storagePath?: string;
  blob?: Blob;
  pdfBytes?: Uint8Array;
  error?: string;
}> {
  try {
    const cardData: EmployeeIdCardData = {
      employeeId: employee.id,
      applicationId: employee.application_id,
      joiningFormId: employee.joining_form_id,
      employeeName: employee.candidate_name || 'Employee',
      employeeCode: employee.employee_code,
      designation: employee.designation,
      department: employee.department,
      location: employee.location,
      bloodGroup: contextData.bloodGroup || '—',
      emergencyContactName: contextData.emergencyContactName,
      emergencyContactPhone: contextData.emergencyContactPhone,
      emergencyContactRelation: contextData.emergencyContactRelation,
      issuanceDate: employee.joining_date || new Date().toLocaleDateString('en-GB'),
      photoUrlOrData: contextData.photoUrl,
      signatureUrlOrData: contextData.signatureUrl
    };

    const result = await generateAndPersistEmployeeIdCard(cardData, currentAdminId);

    // Also update employee's id_card_number if empty
    if (!employee.id_card_number) {
      await supabase
        .from('employees')
        .update({ id_card_number: `IDC-${employee.employee_code}` })
        .eq('id', employee.id);
    }

    return {
      success: true,
      fileId: result.fileId,
      storagePath: result.storagePath,
      blob: result.blob,
      pdfBytes: result.pdfBytes
    };
  } catch (err: any) {
    console.error('[processEmployeeIdCardGeneration] Error:', err);
    return { success: false, error: err?.message || 'Failed to generate Employee ID Card.' };
  }
}

/**
 * Administrative action: "Send ID Card to Employee"
 * Validates authoritative email, generates/loads PDF, and dispatches via server-side email service.
 */
export async function dispatchEmployeeIdCardToEmail(
  employee: EmployeeRow,
  contextData: {
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    photoUrl?: string | null;
    signatureUrl?: string | null;
  }
): Promise<{
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}> {
  // 1. Authoritative Recipient Validation
  if (!employee.email || !employee.email.trim()) {
    return {
      success: false,
      error: `Employee ${employee.employee_code} has no authoritative email address on record.`
    };
  }

  try {
    // 2. Generate or retrieve the ID Card PDF bytes
    const cardData: EmployeeIdCardData = {
      employeeId: employee.id,
      applicationId: employee.application_id,
      joiningFormId: employee.joining_form_id,
      employeeName: employee.candidate_name || 'Employee',
      employeeCode: employee.employee_code,
      designation: employee.designation,
      department: employee.department,
      location: employee.location,
      bloodGroup: contextData.bloodGroup || '—',
      emergencyContactName: contextData.emergencyContactName,
      emergencyContactPhone: contextData.emergencyContactPhone,
      emergencyContactRelation: contextData.emergencyContactRelation,
      issuanceDate: employee.joining_date || new Date().toLocaleDateString('en-GB'),
      photoUrlOrData: contextData.photoUrl,
      signatureUrlOrData: contextData.signatureUrl
    };

    // Ensure ID Card is generated and persisted to archive
    await generateAndPersistEmployeeIdCard(cardData);

    // 3. Dispatch via secure server-side endpoint
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/admin/employees/send-id-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        employeeId: employee.id
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Failed to dispatch Employee ID Card email via server.'
      };
    }

    return {
      success: true,
      messageId: json.messageId
    };
  } catch (err: any) {
    console.error('[dispatchEmployeeIdCardToEmail] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch Employee ID Card email.'
    };
  }
}
