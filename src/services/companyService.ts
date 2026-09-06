// ==============================================================================
// File: src/services/companyService.ts
// Description: Company & Job Listings Service Layer
// SECURITY: Public read for active entities only
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Database } from '../types/database';

export type CompanyRow = Database['public']['Tables']['companies']['Row'];
export type JobRow = Database['public']['Tables']['jobs']['Row'];

export interface JobWithCompany extends JobRow {
  company?: CompanyRow | null;
}

/**
 * Fetches all active companies (Group businesses & approved employer partners).
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
 * Fetches all active job openings along with company details.
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
