// ==============================================================================
// File: src/services/employeeService.ts
// Description: Employee Master Directory & Identity Card Workflow Engine
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Architecture:
//   - Manages official employee records in public.employees
//   - Dual Origin Support:
//       Origin A: Application-based employees (employees.application_id -> applications.id)
//       Origin B: Standalone joining employees (employees.joining_form_id -> joining_forms.id)
//   - Never creates fake applications for standalone joining candidates
//   - Reliable, collision-safe Employee Code generation & persistence
//   - Non-destructive status transitions (ACTIVE, PROBATION, RESIGNED, TERMINATED, ON_LEAVE)
//   - Coordinates Employee ID Card generation, persistence, printing, and email dispatch
//   - Audits all actions via src/services/activityService.ts
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { EmployeeRow, EmploymentStatus, GeneratedFileRow } from '../types/database';
import {
  generateAndPersistEmployeeIdCard,
  type EmployeeIdCardData
} from './employeeIdCardGenerator';
import { logActivity } from './activityService';
import { normalizeIndianPhoneNumber } from '../utils/phoneUtils';

export interface EmployeeFilters {
  search?: string;
  companyId?: string;
  status?: EmploymentStatus | 'ALL';
  department?: string;
  location?: string;
}

export interface EmployeeWithRelations extends EmployeeRow {
  company?: {
    id: string;
    name: string;
    company_type?: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  application?: {
    id: string;
    application_number: string;
    full_name: string;
    mobile: string;
    email: string;
    status: string;
    desired_company?: string | null;
    designation?: string | null;
    address?: string | null;
  } | null;
  joining_form?: {
    id: string;
    joining_reference: string | null;
    candidate_name: string | null;
    employee_contact_number?: string | null;
    email?: string | null;
    submission_status: string;
  } | null;
}

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

export interface UpdateEmployeeInput {
  employeeCode?: string;
  candidateName?: string;
  mobile?: string | null;
  email?: string;
  companyId?: string | null;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  joiningDate?: string | null;
  employmentStatus?: EmploymentStatus;
  idCardNumber?: string | null;
}

export interface EligiblePromotionCandidates {
  standaloneJoiningCandidates: Array<{
    id: string;
    joining_reference: string;
    employee_name: string;
    email: string;
    mobile: string;
    designation: string;
    department: string;
    submission_status: string;
  }>;
  applicationCandidates: Array<{
    id: string;
    application_number: string;
    full_name: string;
    email: string;
    mobile: string;
    designation: string;
    desired_company: string;
    status: string;
  }>;
}

/**
 * Generates a collision-safe, deterministic sequential Employee Code.
 * Format: ATG-EMP-YYYY-XXXX (e.g. ATG-EMP-2026-0001)
 */
export async function generateNextEmployeeCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `ATG-EMP-${currentYear}-`;

  if (!isSupabaseConfigured) {
    return `${prefix}0001`;
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('employee_code')
      .ilike('employee_code', `${prefix}%`)
      .order('employee_code', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[generateNextEmployeeCode] Query error:', error.message);
    }

    let maxSeq = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        const parts = (row.employee_code || '').split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let candidateCode = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;

    // Verify candidateCode does not collide with existing DB records
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', candidateCode)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        maxSeq++;
        candidateCode = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
        attempts++;
      }
    }

    return candidateCode;
  } catch (err) {
    console.error('[generateNextEmployeeCode] Exception:', err);
    return `${prefix}0001`;
  }
}

/**
 * Retrieves all employees with joined company, application, and joining form.
 * Supports safe administrative search & filters.
 * Excludes sensitive KYC details (Aadhaar, PAN, Bank account, IFSC).
 */
export async function getAllEmployees(
  filters: EmployeeFilters = {}
): Promise<{ success: boolean; data: EmployeeWithRelations[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, data: [], error: 'Database is not configured.' };
  }

  try {
    let query = supabase
      .from('employees')
      .select(`
        *,
        company:companies(id, name, company_type, address),
        application:applications(id, application_number, full_name, mobile, email, status),
        joining_form:joining_forms(id, joining_reference, candidate_name, employee_contact_number, email, submission_status)
      `)
      .order('created_at', { ascending: false });

    if (filters.companyId && filters.companyId !== 'ALL') {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('employment_status', filters.status);
    }

    if (filters.department && filters.department !== 'ALL') {
      query = query.ilike('department', `%${filters.department}%`);
    }

    if (filters.location && filters.location !== 'ALL') {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAllEmployees] Error:', error.message);
      return { success: false, data: [], error: error.message };
    }

    let records = (data as unknown as EmployeeWithRelations[]) || [];

    // Safe Administrative Search across safe non-KYC operational fields:
    // employee_code, candidate_name, company name, designation, department, location
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      records = records.filter((emp) => {
        const code = (emp.employee_code || '').toLowerCase();
        const name = (emp.candidate_name || '').toLowerCase();
        const companyName = (emp.company?.name || '').toLowerCase();
        const desig = (emp.designation || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const loc = (emp.location || '').toLowerCase();
        const ref = (emp.joining_reference || '').toLowerCase();

        return (
          code.includes(q) ||
          name.includes(q) ||
          companyName.includes(q) ||
          desig.includes(q) ||
          dept.includes(q) ||
          loc.includes(q) ||
          ref.includes(q)
        );
      });
    }

    return { success: true, data: records };
  } catch (err: any) {
    console.error('[getAllEmployees] Exception:', err);
    return { success: false, data: [], error: err.message || 'Failed to retrieve employees' };
  }
}

/**
 * Retrieves an employee record by primary key with relations.
 */
export async function getEmployeeById(
  employeeId: string
): Promise<{ success: boolean; employee: EmployeeWithRelations | null; error?: string }> {
  if (!isSupabaseConfigured || !employeeId) {
    return { success: false, employee: null, error: 'Invalid employee ID or DB not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        company:companies(id, name, company_type, address, email, phone),
        application:applications(id, application_number, full_name, mobile, email, status, desired_company, designation, address),
        joining_form:joining_forms(id, joining_reference, candidate_name, employee_contact_number, email, submission_status)
      `)
      .eq('id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('[getEmployeeById] Error:', error.message);
      return { success: false, employee: null, error: error.message };
    }

    return { success: true, employee: (data as unknown as EmployeeWithRelations) || null };
  } catch (err: any) {
    console.error('[getEmployeeById] Exception:', err);
    return { success: false, employee: null, error: err.message };
  }
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
        action: 'EMPLOYEE_UPDATED',
        description: `Updated employee record for ${input.employeeCode} (${input.candidateName})`,
        metadata: { employeeCode: input.employeeCode, updatedBy: currentAdminId }
      });

      return { success: true, employee: updated as EmployeeRow };
    }

    // Insert new employee record
    const code = input.employeeCode.trim();
    const idCardNumber = input.idCardNumber || `IDC-${code}`;

    const { data: inserted, error: insertErr } = await supabase
      .from('employees')
      .insert({
        application_id: input.applicationId || null,
        joining_form_id: input.joiningFormId || null,
        company_id: input.companyId || null,
        employee_code: code,
        candidate_name: input.candidateName.trim(),
        mobile: canonicalMobile || null,
        email: input.email?.trim() || null,
        joining_reference: input.joiningReference || null,
        designation: input.designation || 'Associate',
        department: input.department || 'Operations',
        location: input.location || 'Nagpur, Maharashtra',
        joining_date: input.joiningDate || new Date().toISOString().split('T')[0],
        employment_status: input.employmentStatus || 'ACTIVE',
        id_card_number: idCardNumber
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
      action: 'EMPLOYEE_CREATED',
      description: `Promoted candidate to official Employee record (${code})`,
      metadata: {
        employeeId: inserted.id,
        employeeCode: code,
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

// Alias for semantic clarity
export const createOrPromoteEmployee = createOrUpdateEmployeeRecord;

/**
 * Updates operational employee details.
 */
export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
  currentAdminId?: string | null
): Promise<{ success: boolean; employee?: EmployeeRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data: existing, error: existErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (existErr || !existing) {
      return { success: false, error: 'Employee record not found.' };
    }

    const updates: Partial<EmployeeRow> = {};
    if (input.employeeCode !== undefined) updates.employee_code = input.employeeCode.trim();
    if (input.candidateName !== undefined) updates.candidate_name = input.candidateName.trim();
    if (input.email !== undefined) updates.email = input.email.trim();
    if (input.mobile !== undefined) {
      updates.mobile = input.mobile
        ? (normalizeIndianPhoneNumber(input.mobile).isValid
            ? normalizeIndianPhoneNumber(input.mobile).normalized
            : input.mobile.trim())
        : null;
    }
    if (input.companyId !== undefined) updates.company_id = input.companyId || null;
    if (input.designation !== undefined) updates.designation = input.designation;
    if (input.department !== undefined) updates.department = input.department;
    if (input.location !== undefined) updates.location = input.location;
    if (input.joiningDate !== undefined) updates.joining_date = input.joiningDate;
    if (input.employmentStatus !== undefined) updates.employment_status = input.employmentStatus;
    if (input.idCardNumber !== undefined) updates.id_card_number = input.idCardNumber;

    const { data: updated, error: updErr } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .select('*')
      .single();

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    const isStatusChange =
      input.employmentStatus && input.employmentStatus !== existing.employment_status;

    await logActivity({
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      applicationId: existing.application_id || null,
      action: isStatusChange ? 'EMPLOYEE_STATUS_CHANGED' : 'EMPLOYEE_UPDATED',
      description: isStatusChange
        ? `Changed employment status for ${updated.employee_code} from ${existing.employment_status} to ${input.employmentStatus}`
        : `Updated employee record for ${updated.employee_code} (${updated.candidate_name})`,
      metadata: {
        employeeId,
        employeeCode: updated.employee_code,
        previousStatus: isStatusChange ? existing.employment_status : undefined,
        newStatus: isStatusChange ? input.employmentStatus : undefined,
        changes: updates,
        updatedBy: currentAdminId
      }
    });

    return { success: true, employee: updated as EmployeeRow };
  } catch (err: any) {
    console.error('[updateEmployee] Error:', err);
    return { success: false, error: err.message || 'Failed to update employee.' };
  }
}

/**
 * Non-destructive status change (ACTIVE, PROBATION, RESIGNED, TERMINATED, ON_LEAVE).
 * Never deletes the employee.
 */
export async function updateEmploymentStatus(
  employeeId: string,
  newStatus: EmploymentStatus,
  reason?: string,
  currentAdminId?: string | null
): Promise<{ success: boolean; employee?: EmployeeRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data: current, error: curErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (curErr || !current) {
      return { success: false, error: 'Employee not found.' };
    }

    const previousStatus = current.employment_status;

    const { data: updated, error: updErr } = await supabase
      .from('employees')
      .update({ employment_status: newStatus })
      .eq('id', employeeId)
      .select('*')
      .single();

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    await logActivity({
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      applicationId: current.application_id || null,
      action: 'EMPLOYEE_STATUS_CHANGED',
      description: `Changed employment status for ${current.employee_code} from ${previousStatus} to ${newStatus}${
        reason ? `: ${reason}` : ''
      }`,
      metadata: {
        employeeId,
        employeeCode: current.employee_code,
        previousStatus,
        newStatus,
        reason: reason || null,
        updatedBy: currentAdminId
      }
    });

    return { success: true, employee: updated as EmployeeRow };
  } catch (err: any) {
    console.error('[updateEmploymentStatus] Error:', err);
    return { success: false, error: err.message || 'Failed to update employment status.' };
  }
}

/**
 * Discovers candidates eligible for promotion to official Employee:
 * - Standalone candidates with submitted/verified joining forms
 * - Application-based candidates with verified joining or active status
 * Filters out candidates who already have an employee record.
 */
export async function getEligibleCandidatesForPromotion(): Promise<EligiblePromotionCandidates> {
  if (!isSupabaseConfigured) {
    return { standaloneJoiningCandidates: [], applicationCandidates: [] };
  }

  try {
    // 1. Get existing employee references
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('application_id, joining_form_id');

    const existingAppIds = new Set(
      (existingEmployees || []).map((e) => e.application_id).filter(Boolean)
    );
    const existingJoiningIds = new Set(
      (existingEmployees || []).map((e) => e.joining_form_id).filter(Boolean)
    );

    // 2. Get submitted / verified standalone joining forms
    const { data: joiningForms } = await supabase
      .from('joining_forms')
      .select('id, joining_reference, candidate_name, email, employee_contact_number, submission_status')
      .in('submission_status', ['SUBMITTED', 'VERIFIED'])
      .order('submitted_at', { ascending: false })
      .limit(100);

    const filteredJoining = (joiningForms || [])
      .filter((jf) => !existingJoiningIds.has(jf.id))
      .map((jf) => ({
        id: jf.id,
        joining_reference: jf.joining_reference || 'JOIN-REF',
        employee_name: jf.candidate_name || 'Candidate',
        email: jf.email || '',
        mobile: jf.employee_contact_number || '',
        designation: 'Associate',
        department: 'Operations',
        submission_status: jf.submission_status
      }));

    // 3. Get ready applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id, application_number, full_name, email, mobile, designation, desired_company, status')
      .in('status', [
        'JOINING_SUBMITTED',
        'DOCUMENT_VERIFIED',
        'PAYMENT_SUCCESSFUL',
        'VERIFIED_ACTIVE',
        'JOINING_ACCESS_GRANTED'
      ])
      .order('created_at', { ascending: false })
      .limit(100);

    const filteredApps = (applications || [])
      .filter((app) => !existingAppIds.has(app.id))
      .map((app) => ({
        id: app.id,
        application_number: app.application_number,
        full_name: app.full_name,
        email: app.email,
        mobile: app.mobile,
        designation: app.designation || 'Associate',
        desired_company: app.desired_company,
        status: app.status
      }));

    return {
      standaloneJoiningCandidates: filteredJoining,
      applicationCandidates: filteredApps
    };
  } catch (err) {
    console.error('[getEligibleCandidatesForPromotion] Error:', err);
    return { standaloneJoiningCandidates: [], applicationCandidates: [] };
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
 * Administrative action: Generates and persists an ID Card for an employee.
 * Versioning is handled automatically inside generateAndPersistEmployeeIdCard.
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

    // Update employee's id_card_number if empty
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
 * Validates authoritative recipient email, generates/loads PDF, and dispatches via server-side endpoint.
 * Strictly avoids importing Nodemailer into browser bundle.
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
    // 2. Generate or retrieve the ID Card PDF
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

    // Ensure ID Card is persisted before email dispatch
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
