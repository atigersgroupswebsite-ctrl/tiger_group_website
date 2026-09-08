// ==============================================================================
// File: src/services/companyService.ts
// Description: Company & Job Listings Service Layer
// Brand: A Tiger Group's — Enterprise Ecosystem & Employer Partner Directory
// SECURITY: RLS enforced at PostgreSQL layer (SUPER_ADMIN / COORDINATOR for mutations)
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Database, CompanyType, CompanyRow, CompanyUpdate } from '../types/database';
import { logActivity } from './activityService';

export type { CompanyRow, CompanyUpdate };

export type JobRow = Database['public']['Tables']['jobs']['Row'];
export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
import type { JobWithCompany } from './jobService';

export interface CreateCompanyInput {
  name: string;
  company_type: CompanyType;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  active?: boolean;
}

export interface UpdateCompanyInput {
  name?: string;
  company_type?: CompanyType;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  active?: boolean;
}

export interface CompanyFilterParams {
  search?: string;
  type?: string;
  activeStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Validates company input fields before sending to PostgreSQL.
 */
function validateCompanyInput(input: CreateCompanyInput | UpdateCompanyInput, isUpdate: boolean = false): string | null {
  if (!isUpdate || input.name !== undefined) {
    if (!input.name || input.name.trim().length < 2) {
      return 'Company name is required (minimum 2 characters).';
    }
  }

  if (!isUpdate || input.company_type !== undefined) {
    const validTypes: CompanyType[] = ['GROUP_BUSINESS', 'EMPLOYER_PARTNER', 'OTHER'];
    if (!input.company_type || !validTypes.includes(input.company_type)) {
      return 'Invalid company type selected.';
    }
  }

  if (input.contact_email && input.contact_email.trim() !== '') {
    if (!EMAIL_REGEX.test(input.contact_email.trim())) {
      return 'Please provide a valid contact email address.';
    }
  }

  return null;
}

/**
 * Fetches all active companies (Group businesses & approved employer partners).
 * Used by candidate dossier assignment, public pages, and dropdowns.
 */
export async function getActiveCompanies(): Promise<CompanyRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[getActiveCompanies] Error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Fetches all companies with optional filtering (search query, company type, active status).
 * Accessible to all active administrators according to RLS.
 */
export async function getAllCompanies(
  filters?: CompanyFilterParams
): Promise<{ success: boolean; data?: CompanyRow[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    let query = supabase.from('companies').select('*');

    // Filter by active status
    if (filters?.activeStatus === 'ACTIVE') {
      query = query.eq('active', true);
    } else if (filters?.activeStatus === 'INACTIVE') {
      query = query.eq('active', false);
    }

    // Filter by company type
    if (filters?.type && filters.type !== 'ALL') {
      query = query.eq('company_type', filters.type as CompanyType);
    }

    // Filter by text search (name, address, email, phone)
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%,contact_email.ilike.%${q}%,contact_phone.ilike.%${q}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('[getAllCompanies] Query error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('[getAllCompanies] Exception:', err);
    return { success: false, error: err?.message || 'Failed to fetch companies.' };
  }
}

/**
 * Fetches a single company by UUID.
 */
export async function getCompanyById(
  id: string
): Promise<{ success: boolean; data?: CompanyRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[getCompanyById] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[getCompanyById] Exception:', err);
    return { success: false, error: err?.message || 'Failed to fetch company.' };
  }
}

/**
 * Creates a new company record in public.companies.
 * Authorized for SUPER_ADMIN and COORDINATOR via PostgreSQL RLS.
 */
export async function createCompany(
  input: CreateCompanyInput
): Promise<{ success: boolean; data?: CompanyRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  const validationError = validateCompanyInput(input, false);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const trimmedName = input.name.trim();
  const trimmedAddress = input.address?.trim() || null;
  const trimmedEmail = input.contact_email?.trim().toLowerCase() || null;
  const trimmedPhone = input.contact_phone?.trim() || null;
  const active = input.active !== undefined ? input.active : true;

  try {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: trimmedName,
        company_type: input.company_type,
        address: trimmedAddress,
        contact_email: trimmedEmail,
        contact_phone: trimmedPhone,
        active
      })
      .select('*')
      .single();

    if (error) {
      console.error('[createCompany] Insert error:', error.message);
      return { success: false, error: error.message };
    }

    // Audit log
    await logActivity({
      entityType: 'COMPANY',
      entityId: data.id,
      action: 'COMPANY_CREATED',
      description: `Created new ${data.company_type.replace(/_/g, ' ')}: "${data.name}".`,
      metadata: {
        company_id: data.id,
        name: data.name,
        company_type: data.company_type,
        active: data.active
      }
    });

    return { success: true, data };
  } catch (err: any) {
    console.error('[createCompany] Exception:', err);
    return { success: false, error: err?.message || 'Failed to create company.' };
  }
}

/**
 * Updates an existing company.
 * Authorized for SUPER_ADMIN and COORDINATOR via PostgreSQL RLS.
 */
export async function updateCompany(
  id: string,
  input: UpdateCompanyInput
): Promise<{ success: boolean; data?: CompanyRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  const validationError = validateCompanyInput(input, true);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const payload: CompanyUpdate = {
    updated_at: new Date().toISOString()
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.company_type !== undefined) payload.company_type = input.company_type;
  if (input.address !== undefined) payload.address = input.address ? input.address.trim() : null;
  if (input.contact_email !== undefined) payload.contact_email = input.contact_email ? input.contact_email.trim().toLowerCase() : null;
  if (input.contact_phone !== undefined) payload.contact_phone = input.contact_phone ? input.contact_phone.trim() : null;
  if (input.active !== undefined) payload.active = input.active;

  try {
    const { data, error } = await supabase
      .from('companies')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[updateCompany] Update error:', error.message);
      return { success: false, error: error.message };
    }

    // Audit log
    await logActivity({
      entityType: 'COMPANY',
      entityId: id,
      action: 'COMPANY_UPDATED',
      description: `Updated company details for "${data.name}".`,
      metadata: {
        company_id: id,
        changes: payload
      }
    });

    return { success: true, data };
  } catch (err: any) {
    console.error('[updateCompany] Exception:', err);
    return { success: false, error: err?.message || 'Failed to update company.' };
  }
}

/**
 * Toggles a company's active status (Activate / Deactivate).
 */
export async function setCompanyActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; data?: CompanyRow; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .update({
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[setCompanyActive] Error:', error.message);
      return { success: false, error: error.message };
    }

    // Audit log
    await logActivity({
      entityType: 'COMPANY',
      entityId: id,
      action: active ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
      description: `${active ? 'Activated' : 'Deactivated'} company: "${data.name}".`,
      metadata: {
        company_id: id,
        active
      }
    });

    return { success: true, data };
  } catch (err: any) {
    console.error('[setCompanyActive] Exception:', err);
    return { success: false, error: err?.message || 'Failed to update company status.' };
  }
}

/**
 * Fetches all jobs linked to a specific company.
 */
export async function getCompanyJobs(
  companyId: string
): Promise<{ success: boolean; data?: JobRow[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getCompanyJobs] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('[getCompanyJobs] Exception:', err);
    return { success: false, error: err?.message || 'Failed to fetch company jobs.' };
  }
}

/**
 * Fetches all employees deployed at/associated with a specific company.
 * Only selects safe operational fields without exposing candidate personal KYC/financial details.
 */
export async function getCompanyEmployees(
  companyId: string
): Promise<{ success: boolean; data?: EmployeeRow[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, candidate_name, designation, department, location, joining_date, employment_status, id_card_number, created_at, updated_at, company_id, application_id, joining_form_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getCompanyEmployees] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as unknown as EmployeeRow[]) || [] };
  } catch (err: any) {
    console.error('[getCompanyEmployees] Exception:', err);
    return { success: false, error: err?.message || 'Failed to fetch company employees.' };
  }
}

/**
 * Fetches all active job openings along with company details.
 * Retained for backwards compatibility.
 */
export async function getActiveJobs(): Promise<JobWithCompany[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('jobs')
    .select('*, company:companies(*)')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getActiveJobs] Error:', error.message);
    return [];
  }

  return (data as any) || [];
}

/**
 * Permanently deletes a corporate facility from the database.
 * Restricted to SUPER_ADMIN.
 * Prevents deletion and returns a descriptive error if operational dependencies
 * (jobs, employees, joining forms, reference slips) exist.
 * Records an operational audit log in public.activity_logs upon successful deletion.
 */
export async function deleteCompanyPermanently(
  companyId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase.rpc('delete_company_permanently', {
      target_company_id: companyId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete company permanently.' };
  }
}

