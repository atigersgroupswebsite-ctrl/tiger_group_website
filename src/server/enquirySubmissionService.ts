// ==============================================================================
// File: src/server/enquirySubmissionService.ts
// Description: Authoritative Server-Side Job Seeker Application Submission Service
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security: Server-only execution via getSupabaseServer(). Validates input strictly,
//           enforces server-controlled fields, prevents client tampering, and ensures
//           unauthenticated/authenticated public submissions succeed without RLS errors.
// ==============================================================================

import { getSupabaseServer } from './supabaseServer.js';

export interface JobSeekerEnquiryPayload {
  jobId?: string | null;
  fullName: string;
  fatherName: string;
  mobile: string;
  email: string;
  address: string;
  desiredCompany: string;
  designation: string;
  description?: string | null;
}

export interface JobSeekerEnquiryServerResult {
  status: number;
  data: {
    success: boolean;
    applicationId?: string;
    applicationNumber?: string;
    error?: string;
  };
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory submission lock for rapid duplicate submission protection
const activeSubmissions = new Set<string>();

/**
 * Normalizes Indian mobile number to 10 digits or +91 format.
 */
function extractTenDigitMobile(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Server-side authoritative handler for creating Job Seeker Applications.
 * Validates allowlisted fields, ignores client-supplied status or admin fields,
 * inserts using server privileges, and returns database-generated identifiers.
 */
export async function submitJobSeekerEnquiryServerHandler(
  payload: any
): Promise<JobSeekerEnquiryServerResult> {
  if (!payload || typeof payload !== 'object') {
    return {
      status: 400,
      data: { success: false, error: 'Invalid request body.' }
    };
  }

  // 1. Sanitize & validate inputs
  const trimmedName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const trimmedFatherName = typeof payload.fatherName === 'string' ? payload.fatherName.trim() : '';
  const rawMobile = typeof payload.mobile === 'string' ? payload.mobile.trim() : '';
  const tenDigitMobile = extractTenDigitMobile(rawMobile);
  const trimmedEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const trimmedAddress = typeof payload.address === 'string' ? payload.address.trim() : '';
  const trimmedCompany = typeof payload.desiredCompany === 'string' ? payload.desiredCompany.trim() : '';
  const trimmedDesignation = typeof payload.designation === 'string' ? payload.designation.trim() : '';
  const trimmedDescription = typeof payload.description === 'string' && payload.description.trim().length > 0
    ? payload.description.trim()
    : null;

  let validatedJobId: string | null = null;
  if (typeof payload.jobId === 'string' && payload.jobId.trim()) {
    const candidateJobId = payload.jobId.trim();
    if (UUID_REGEX.test(candidateJobId)) {
      validatedJobId = candidateJobId;
    }
  }

  // Validation checks
  if (!trimmedName || trimmedName.length < 2) {
    return {
      status: 400,
      data: { success: false, error: 'Full Name is required (minimum 2 characters).' }
    };
  }

  if (!trimmedFatherName || trimmedFatherName.length < 2) {
    return {
      status: 400,
      data: { success: false, error: "Father's Name is required (minimum 2 characters)." }
    };
  }

  if (!tenDigitMobile || !INDIAN_MOBILE_REGEX.test(tenDigitMobile)) {
    return {
      status: 400,
      data: { success: false, error: 'A valid 10-digit Indian mobile number is required (starting with 6, 7, 8, or 9).' }
    };
  }

  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    return {
      status: 400,
      data: { success: false, error: 'A valid email address is required for candidate registration.' }
    };
  }

  if (!trimmedAddress || trimmedAddress.length < 5) {
    return {
      status: 400,
      data: { success: false, error: 'Full residential address is required (minimum 5 characters).' }
    };
  }

  if (!trimmedCompany) {
    return {
      status: 400,
      data: { success: false, error: 'Please select a preferred company / organization.' }
    };
  }

  if (!trimmedDesignation || trimmedDesignation.length < 2) {
    return {
      status: 400,
      data: { success: false, error: 'Designation / job position is required.' }
    };
  }

  // 2. Concurrency / In-Flight Duplicate Locking
  const normalizedMobileWithPrefix = `+91${tenDigitMobile}`;
  const lockKey = `${trimmedEmail}:${tenDigitMobile}`;
  if (activeSubmissions.has(lockKey)) {
    return {
      status: 429,
      data: { success: false, error: 'An application submission is already in progress for this applicant. Please wait.' }
    };
  }
  activeSubmissions.add(lockKey);

  try {
    const supabaseServer = getSupabaseServer();

    // 3. Authoritative Insert
    // Status is strictly server-controlled: 'NEW_ENQUIRY'
    // joining_access_enabled is strictly server-controlled: false
    // application_number is strictly database-generated by trigger trg_applications_number
    const { data, error } = await supabaseServer
      .from('applications')
      .insert({
        job_id: validatedJobId,
        full_name: trimmedName,
        father_name: trimmedFatherName,
        mobile: normalizedMobileWithPrefix,
        email: trimmedEmail,
        address: trimmedAddress,
        desired_company: trimmedCompany,
        designation: trimmedDesignation,
        description: trimmedDescription,
        status: 'NEW_ENQUIRY',
        joining_access_enabled: false
      })
      .select('id, application_number')
      .single();

    if (error) {
      console.error('[submitJobSeekerEnquiryServerHandler] Supabase insert error:', error.message);
      return {
        status: 500,
        data: {
          success: false,
          error: error.message || 'Database error occurred while processing application.'
        }
      };
    }

    if (!data || !data.id || !data.application_number) {
      return {
        status: 500,
        data: {
          success: false,
          error: 'Application record was created but confirmation reference could not be retrieved.'
        }
      };
    }

    // 4. Return safe confirmation response
    return {
      status: 200,
      data: {
        success: true,
        applicationId: data.id,
        applicationNumber: data.application_number
      }
    };
  } catch (err: any) {
    console.error('[submitJobSeekerEnquiryServerHandler] Unexpected exception:', err);
    return {
      status: 500,
      data: {
        success: false,
        error: err?.message || 'Internal server error while submitting application.'
      }
    };
  } finally {
    activeSubmissions.delete(lockKey);
  }
}
