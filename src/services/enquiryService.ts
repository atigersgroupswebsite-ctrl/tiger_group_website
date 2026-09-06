// ==============================================================================
// File: src/services/enquiryService.ts
// Description: Public Enquiry Service Layer for Job Seekers & Employers
// SECURITY: Client-safe operations obeying RLS insert policies
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface CreateJobSeekerInput {
  fullName: string;
  fatherName: string;
  mobile: string;
  email?: string;
  address: string;
  desiredCompany: string;
  designation: string;
  description?: string;
}

export interface CreateJobSeekerResult {
  success: boolean;
  applicationId?: string;
  applicationNumber?: string;
  error?: string;
}

export interface CreateEmployerEnquiryInput {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  state: string;
  employeesRequired: number;
  jobRole: string;
  description?: string;
}

export interface CreateEmployerEnquiryResult {
  success: boolean;
  enquiryId?: string;
  error?: string;
}

/**
 * Validates and submits a new Candidate Job Seeker Application.
 * Application number is strictly database-generated (INQ-YYYY-000001).
 */
export async function createJobSeekerApplication(
  input: CreateJobSeekerInput
): Promise<CreateJobSeekerResult> {
  const trimmedName = input.fullName?.trim();
  const trimmedFatherName = input.fatherName?.trim();
  const trimmedMobile = input.mobile?.trim();
  const cleanMobile = trimmedMobile?.replace(/\D/g, '') || '';
  const trimmedEmail = input.email?.trim().toLowerCase() || `${cleanMobile}@applicant.atigergroups.com`;
  const trimmedAddress = input.address?.trim();
  const trimmedCompany = input.desiredCompany?.trim();
  const trimmedDesignation = input.designation?.trim();

  // Server/Service-side validation
  if (!trimmedName) {
    return { success: false, error: 'Full name is required.' };
  }
  if (!trimmedFatherName) {
    return { success: false, error: "Father's name is required." };
  }
  if (!cleanMobile || cleanMobile.length < 10) {
    return { success: false, error: 'A valid 10-digit Indian mobile number is required.' };
  }
  if (!trimmedEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmedEmail)) {
    return { success: false, error: 'A valid email address is required.' };
  }
  if (!trimmedAddress) {
    return { success: false, error: 'Address is required.' };
  }
  if (!trimmedCompany) {
    return { success: false, error: 'Desired company selection is required.' };
  }
  if (!trimmedDesignation) {
    return { success: false, error: 'Designation is required.' };
  }

  // If Supabase is not configured in local development, provide a mock success response
  if (!isSupabaseConfigured) {
    const mockId = `app-demo-${Date.now()}`;
    const mockNumber = `INQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      success: true,
      applicationId: mockId,
      applicationNumber: mockNumber
    };
  }

  try {
    // Insert without providing application_number; database trigger assigns format INQ-YYYY-000001
    const { data, error } = await (supabase
      .from('applications')
      .insert({
        full_name: trimmedName,
        father_name: trimmedFatherName,
        mobile: trimmedMobile,
        email: trimmedEmail,
        address: trimmedAddress,
        desired_company: trimmedCompany,
        designation: trimmedDesignation,
        description: input.description?.trim() || null,
        status: 'NEW_ENQUIRY',
        joining_access_enabled: false
      } as any)
      .select('id, application_number')
      .single() as any);

    if (error) {
      console.error('[createJobSeekerApplication] Database error:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      applicationId: data.id,
      applicationNumber: data.application_number
    };
  } catch (err: any) {
    console.error('[createJobSeekerApplication] Unexpected exception:', err);
    return { success: false, error: err.message || 'Failed to submit application.' };
  }
}

/**
 * Validates and submits an Employer Recruitment Requirement Enquiry.
 */
export async function createEmployerEnquiry(
  input: CreateEmployerEnquiryInput
): Promise<CreateEmployerEnquiryResult> {
  const trimmedCompany = input.companyName?.trim();
  const trimmedEmail = input.email?.trim().toLowerCase();
  const trimmedPhone = input.phone?.trim();
  const trimmedAddress = input.address?.trim();
  const trimmedDistrict = input.district?.trim();
  const trimmedState = input.state?.trim();
  const employeesRequired = Number(input.employeesRequired);
  const trimmedRole = input.jobRole?.trim();

  // Validation
  if (!trimmedCompany) return { success: false, error: 'Company name is required.' };
  if (!trimmedEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmedEmail)) {
    return { success: false, error: 'Valid business email is required.' };
  }
  if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 10) {
    return { success: false, error: 'Valid contact phone number is required.' };
  }
  if (!trimmedAddress) return { success: false, error: 'Plant/Office address is required.' };
  if (!trimmedDistrict) return { success: false, error: 'District is required.' };
  if (!trimmedState) return { success: false, error: 'State is required.' };
  if (!employeesRequired || employeesRequired <= 0) {
    return { success: false, error: 'Employees required must be greater than 0.' };
  }
  if (!trimmedRole) return { success: false, error: 'Job role or department is required.' };

  if (!isSupabaseConfigured) {
    return {
      success: true,
      enquiryId: `enq-demo-${Date.now()}`
    };
  }

  try {
    const { data, error } = await (supabase
      .from('employer_enquiries')
      .insert({
        company_name: trimmedCompany,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        district: trimmedDistrict,
        state: trimmedState,
        employees_required: employeesRequired,
        job_role: trimmedRole,
        description: input.description?.trim() || null,
        status: 'NEW'
      } as any)
      .select('id')
      .single() as any);

    if (error) {
      console.error('[createEmployerEnquiry] Database error:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      enquiryId: data.id
    };
  } catch (err: any) {
    console.error('[createEmployerEnquiry] Unexpected exception:', err);
    return { success: false, error: err.message || 'Failed to submit employer enquiry.' };
  }
}
