// ==============================================================================
// File: src/services/activityService.ts
// Description: Generalized Activity Logging Service Layer
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { ActivityLogRow } from '../types/database';

export type ActivityEntityType =
  | 'APPLICATION'
  | 'JOINING_FORM'
  | 'COMPANY'
  | 'JOB'
  | 'EMPLOYEE'
  | 'PAYMENT'
  | 'DOCUMENT'
  | 'GENERATED_FILE'
  | 'REFERENCE_SLIP'
  | 'SETTINGS'
  | 'ADMIN_USER'
  | 'EMPLOYER_ENQUIRY';

export interface LogActivityInput {
  entityType?: ActivityEntityType | string;
  entityId?: string | null;
  applicationId?: string | null;
  action: string;
  description?: string;
  metadata?: Record<string, any> | null;
}

/**
 * Logs an auditable governance action across any operational entity in the system.
 * Backward compatible with existing application-centric logs.
 */
export async function logActivity(input: LogActivityInput): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const userRes = await supabase.auth.getUser();
    const adminUserId = userRes.data.user?.id || null;

    const entityType = input.entityType || (input.applicationId ? 'APPLICATION' : 'SYSTEM');
    const entityId = input.entityId || input.applicationId || null;
    const applicationId = input.applicationId || (entityType === 'APPLICATION' ? entityId : null);

    const { error } = await supabase.from('activity_logs').insert({
      application_id: applicationId,
      entity_type: entityType,
      entity_id: entityId,
      admin_user_id: adminUserId,
      action: input.action,
      description: input.description || null,
      metadata: input.metadata || null
    });

    if (error) {
      console.error('[logActivity] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[logActivity] Exception:', err);
    return { success: false, error: err?.message || 'Failed to record activity log.' };
  }
}

/**
 * Fetches activity logs for a specific entity (e.g. COMPANY, JOB, EMPLOYEE, SETTINGS).
 */
export async function getEntityActivityLogs(
  entityType: string,
  entityId: string
): Promise<ActivityLogRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getEntityActivityLogs] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getEntityActivityLogs] Exception:', err);
    return [];
  }
}

/**
 * Fetches activity logs for a specific candidate application.
 */
export async function getApplicationActivityLogs(applicationId: string): Promise<ActivityLogRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .or(`application_id.eq.${applicationId},and(entity_type.eq.APPLICATION,entity_id.eq.${applicationId})`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getApplicationActivityLogs] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getApplicationActivityLogs] Exception:', err);
    return [];
  }
}
