// ==============================================================================
// File: src/services/jobService.ts
// Description: Comprehensive Operational Jobs Service Layer & Public Jobs Data Integration
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strictly uses public.jobs as database source of truth
//   - Enforces valid company assignment from public.companies
//   - Emits structured activity logs on all mutations
//   - Safe operational projection for applicant summaries (PII protected)
//   - Zero fallback to SAMPLE_JOBS in production builds
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  JobRow,
  JobInsert,
  JobUpdate,
  JobStatus,
  CompanyRow
} from '../types/database';
import type { Job, ServiceCategory, RegionState, EmploymentType } from '../types';
import { logActivity } from './activityService';

export type JobWithCompany = JobRow & {
  company: CompanyRow | null;
};

export interface JobFilters {
  search?: string;
  status?: JobStatus | 'ALL';
  companyId?: string | 'ALL';
  employmentType?: string | 'ALL';
}

export interface CreateJobInput {
  title: string;
  company_id: string;
  location: string;
  employment_type: string;
  department?: string;
  salary_range?: string;
  vacancies: number;
  experience_level?: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  status?: JobStatus;
}

export interface UpdateJobInput {
  title?: string;
  company_id?: string;
  location?: string;
  employment_type?: string;
  department?: string;
  salary_range?: string;
  vacancies?: number;
  experience_level?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  status?: JobStatus;
}

export interface JobApplicationSummary {
  id: string;
  application_number: string;
  full_name: string;
  mobile: string;
  status: string;
  created_at: string;
}

/**
 * Maps a database job row into the frontend Job presentation model for public display.
 */
export function mapDatabaseJobToFrontend(row: JobWithCompany): Job {
  const locLower = (row.location || '').toLowerCase();
  let state: RegionState = 'Maharashtra';
  if (
    locLower.includes('madhya pradesh') ||
    locLower.includes('bhopal') ||
    locLower.includes('indore') ||
    locLower.includes('dhar') ||
    locLower.includes('pithampur')
  ) {
    state = 'Madhya Pradesh';
  } else if (
    locLower.includes('chhattisgarh') ||
    locLower.includes('raipur') ||
    locLower.includes('bilaspur')
  ) {
    state = 'Chhattisgarh';
  }

  const deptLower = (row.department || '').toLowerCase();
  const titleLower = (row.title || '').toLowerCase();
  let serviceCategory: ServiceCategory = 'Job Placement';
  if (deptLower.includes('security') || titleLower.includes('guard') || titleLower.includes('security')) {
    serviceCategory = 'Security Services';
  } else if (
    deptLower.includes('labour') ||
    deptLower.includes('manufacturing') ||
    titleLower.includes('helper') ||
    titleLower.includes('operator')
  ) {
    serviceCategory = 'Labour Supply';
  }

  let employmentType: EmploymentType = 'Full Time';
  const typeLower = (row.employment_type || '').toLowerCase();
  if (typeLower.includes('contract')) {
    employmentType = 'Contract';
  } else if (typeLower.includes('rotational')) {
    employmentType = 'Rotational Shift';
  } else if (typeLower.includes('temp')) {
    employmentType = 'Temporary';
  }

  const splitItems = (text: string | null): string[] => {
    if (!text) return [];
    return text
      .split(/\r?\n|•|-|\*/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
  };

  const responsibilities = splitItems(row.responsibilities);
  const requirements = splitItems(row.requirements);

  const slug =
    (row.title || 'job')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + `-${row.id.slice(0, 8)}`;

  return {
    id: row.id,
    slug,
    title: row.title,
    department: row.department || 'Operations',
    serviceCategory,
    location: row.location,
    state,
    employmentType,
    experienceLevel: row.experience_level || '0 - 2 Years',
    openings: row.vacancies || 1,
    salaryRange: row.salary_range || undefined,
    overview:
      row.description ||
      `${row.title} role at ${row.company?.name || "A TIGER GROUP'S client facility"}.`,
    responsibilities:
      responsibilities.length > 0
        ? responsibilities
        : [
            'Perform daily assigned operational and facility duties',
            'Follow plant safety regulations and standard operating procedures',
            'Report shift progress to department supervisors'
          ],
    requirements:
      requirements.length > 0
        ? requirements
        : [
            'Sound physical fitness and punctuality',
            'Valid KYC documents (Aadhaar / Bank details)',
            'Basic communication and adherence to discipline'
          ],
    facilitiesProvided: ['ESIC & PF Benefits', 'On-site Duty Guidance', 'Overtime Allowance'],
    isFeatured: true,
    postedDate: 'Actively Hiring'
  };
}

// ==============================================================================
// PUBLIC JOBS API (NO SAMPLE DATA FALLBACK IN PRODUCTION)
// ==============================================================================

/**
 * Fetches all active jobs from public.jobs with company details.
 * In production, returns empty array if no active jobs exist.
 * Throws explicit error if Supabase query fails so UI can show error/retry state.
 */
export async function getPublicJobs(): Promise<Job[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('jobs')
    .select('*, company:companies(*)')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPublicJobs] Database error fetching active jobs:', error.message);
    throw new Error(`Failed to load job listings: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as unknown as JobWithCompany[]).map(mapDatabaseJobToFrontend);
}

/**
 * Finds a single active job for candidate public viewing by either slug or UUID.
 * Ensures non-active jobs (PAUSED, CLOSED, ARCHIVED) are not presented as active vacancies.
 */
export async function getPublicJobBySlugOrId(identifier: string): Promise<Job | null> {
  if (!isSupabaseConfigured || !identifier) {
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  try {
    if (isUuid) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, company:companies(*)')
        .eq('id', identifier)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error || !data) return null;
      return mapDatabaseJobToFrontend(data as unknown as JobWithCompany);
    }

    // Match slug ending with -[8 hex chars]
    const match = identifier.match(/-([0-9a-f]{8})$/i);
    const idPrefix = match ? match[1] : null;

    // Query active jobs
    const { data: allActive, error } = await supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error || !allActive) return null;

    const mapped = (allActive as unknown as JobWithCompany[]).map(mapDatabaseJobToFrontend);

    // Exact slug match or ID prefix match
    const found = mapped.find(
      (j) =>
        j.slug === identifier ||
        j.id === identifier ||
        (idPrefix && j.id.toLowerCase().startsWith(idPrefix.toLowerCase()))
    );

    return found || null;
  } catch (err) {
    console.error('[getPublicJobBySlugOrId] Error looking up job:', err);
    return null;
  }
}

// ==============================================================================
// ADMINISTRATIVE JOBS MANAGEMENT (CRUD & STATUS)
// ==============================================================================

/**
 * Fetches all jobs for the Admin directory with company details and flexible filtering.
 */
export async function getAllJobs(
  filters?: JobFilters
): Promise<{ success: boolean; data?: JobWithCompany[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    let query = supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    if (filters?.companyId && filters.companyId !== 'ALL') {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.employmentType && filters.employmentType !== 'ALL') {
      query = query.ilike('employment_type', `%${filters.employmentType}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    let results = (data || []) as unknown as JobWithCompany[];

    // Client-side search filtering across title, department, location, company name
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter((job) => {
        const titleMatch = job.title?.toLowerCase().includes(q);
        const deptMatch = job.department?.toLowerCase().includes(q);
        const locMatch = job.location?.toLowerCase().includes(q);
        const compMatch = job.company?.name?.toLowerCase().includes(q);
        return Boolean(titleMatch || deptMatch || locMatch || compMatch);
      });
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

/**
 * Retrieves a single job by UUID with associated company record for Admin view.
 */
export async function getJobById(
  id: string
): Promise<{ success: boolean; data?: JobWithCompany; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as JobWithCompany };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch job record.' };
  }
}

/**
 * Creates a new job record in public.jobs.
 * Validates company ID, title, vacancies, and sanitized text inputs.
 */
export async function createJob(
  input: CreateJobInput
): Promise<{ success: boolean; data?: JobRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  // 1. Validation
  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: 'Job title is required.' };
  }

  const companyId = input.company_id?.trim();
  if (!companyId) {
    return { success: false, error: 'A valid company must be selected.' };
  }

  const location = input.location?.trim();
  if (!location) {
    return { success: false, error: 'Job location is required.' };
  }

  const employmentType = input.employment_type?.trim() || 'Full-Time';
  const vacancies = Number(input.vacancies);
  if (isNaN(vacancies) || vacancies < 1) {
    return { success: false, error: 'Vacancies must be a positive number.' };
  }

  const description = input.description?.trim();
  if (!description) {
    return { success: false, error: 'Job description is required.' };
  }

  const validStatuses: JobStatus[] = ['ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED'];
  const status: JobStatus = input.status && validStatuses.includes(input.status) ? input.status : 'ACTIVE';

  try {
    // 2. Verify company exists
    const { data: comp, error: compErr } = await supabase
      .from('companies')
      .select('id, name, active')
      .eq('id', companyId)
      .single();

    if (compErr || !comp) {
      return { success: false, error: 'Selected company does not exist in the database.' };
    }

    // 3. Insert payload
    const payload: JobInsert = {
      title,
      company_id: companyId,
      location,
      employment_type: employmentType,
      department: input.department?.trim() || null,
      salary_range: input.salary_range?.trim() || null,
      vacancies,
      experience_level: input.experience_level?.trim() || null,
      description,
      responsibilities: input.responsibilities?.trim() || null,
      requirements: input.requirements?.trim() || null,
      status
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const created = data as JobRow;

    // 4. Log audit activity
    await logActivity({
      entityType: 'JOB',
      entityId: created.id,
      action: 'JOB_CREATED',
      description: `Created new job "${created.title}" at company "${comp.name}" with status ${created.status}.`,
      metadata: {
        job_id: created.id,
        title: created.title,
        company_id: comp.id,
        company_name: comp.name,
        vacancies: created.vacancies,
        status: created.status
      }
    });

    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create job.' };
  }
}

/**
 * Updates an existing job in public.jobs.
 */
export async function updateJob(
  id: string,
  input: UpdateJobInput
): Promise<{ success: boolean; data?: JobRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  if (!id) {
    return { success: false, error: 'Job ID is required.' };
  }

  try {
    // 1. Fetch current job
    const { data: existing, error: fetchErr } = await supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: 'Job not found.' };
    }

    const currentJob = existing as unknown as JobWithCompany;

    // 2. Validate company if changed
    if (input.company_id && input.company_id !== currentJob.company_id) {
      const { data: comp, error: compErr } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', input.company_id)
        .single();

      if (compErr || !comp) {
        return { success: false, error: 'Selected company does not exist.' };
      }
    }

    // 3. Prepare sanitized payload
    const payload: JobUpdate = {
      updated_at: new Date().toISOString()
    };

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) return { success: false, error: 'Job title cannot be empty.' };
      payload.title = trimmed;
    }

    if (input.company_id !== undefined) payload.company_id = input.company_id;
    if (input.location !== undefined) {
      const trimmed = input.location.trim();
      if (!trimmed) return { success: false, error: 'Location cannot be empty.' };
      payload.location = trimmed;
    }

    if (input.employment_type !== undefined) payload.employment_type = input.employment_type.trim();
    if (input.department !== undefined) payload.department = input.department.trim() || null;
    if (input.salary_range !== undefined) payload.salary_range = input.salary_range.trim() || null;

    if (input.vacancies !== undefined) {
      const v = Number(input.vacancies);
      if (isNaN(v) || v < 1) return { success: false, error: 'Vacancies must be at least 1.' };
      payload.vacancies = v;
    }

    if (input.experience_level !== undefined) payload.experience_level = input.experience_level.trim() || null;
    if (input.description !== undefined) {
      const trimmed = input.description.trim();
      if (!trimmed) return { success: false, error: 'Description cannot be empty.' };
      payload.description = trimmed;
    }

    if (input.responsibilities !== undefined) payload.responsibilities = input.responsibilities.trim() || null;
    if (input.requirements !== undefined) payload.requirements = input.requirements.trim() || null;

    if (input.status !== undefined) {
      const validStatuses: JobStatus[] = ['ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED'];
      if (!validStatuses.includes(input.status)) {
        return { success: false, error: `Invalid status: ${input.status}` };
      }
      payload.status = input.status;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('jobs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    const updatedRow = updated as JobRow;

    // 4. Log audit activity
    const statusChanged = input.status && input.status !== currentJob.status;
    const action = statusChanged ? `JOB_${input.status}` : 'JOB_UPDATED';

    await logActivity({
      entityType: 'JOB',
      entityId: id,
      action,
      description: statusChanged
        ? `Changed job "${updatedRow.title}" status from ${currentJob.status} to ${updatedRow.status}.`
        : `Updated job details for "${updatedRow.title}".`,
      metadata: {
        job_id: id,
        previous_status: currentJob.status,
        new_status: updatedRow.status,
        changes: Object.keys(payload)
      }
    });

    return { success: true, data: updatedRow };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update job.' };
  }
}

/**
 * Changes job status (ACTIVE, PAUSED, CLOSED, ARCHIVED).
 * Avoids destructive deletion so linked applications retain their historical job relation.
 */
export async function setJobStatus(
  id: string,
  status: JobStatus
): Promise<{ success: boolean; data?: JobRow; error?: string }> {
  return updateJob(id, { status });
}

/**
 * Fetches applications associated with this job (via public.applications.job_id).
 * Strictly omits sensitive candidate PII (Aadhaar, PAN, Bank details).
 */
export async function getJobApplications(
  jobId: string
): Promise<{ success: boolean; data?: JobApplicationSummary[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('id, application_number, full_name, mobile, status, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((app: any) => ({
        id: app.id,
        application_number: app.application_number,
        full_name: app.full_name,
        mobile: app.mobile,
        status: app.status,
        created_at: app.created_at
      }))
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch job applications.' };
  }
}

/**
 * Permanently deletes a job posting from the database.
 * Restricted to SUPER_ADMIN. Safely decouples applications (setting applications.job_id = NULL)
 * and records an operational audit log in public.activity_logs.
 */
export async function deleteJobPermanently(
  jobId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase.rpc('delete_job_permanently', {
      target_job_id: jobId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete job permanently.' };
  }
}

