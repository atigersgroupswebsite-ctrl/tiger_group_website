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

/**
 * Enriched activity log item containing joined relational references.
 */
export interface EnrichedActivityLog extends ActivityLogRow {
  actorName?: string;
  actorRole?: string;
  applicationNumber?: string;
  candidateName?: string;
  joiningReference?: string;
  resourceLink?: string;
  sanitizedMetadata?: Record<string, any> | null;
}

export interface ActivityFilterOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  dateRange?: 'ALL' | 'TODAY' | '7D' | '30D';
}

export interface ActivityLogsResult {
  logs: EnrichedActivityLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityStats {
  totalCount: number;
  todayCount: number;
  activeActorsCount: number;
  distinctEntitiesCount: number;
}

/**
 * Sanitizes JSON metadata to ensure sensitive credentials, tokens, or PII never leak into the UI.
 */
export function sanitizeLogMetadata(metadata: any): Record<string, any> | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const sensitiveKeyRegex = /(password|token|secret|jwt|auth|service_role|aadhaar|pan|bank|ifsc|account_num|credential)/i;
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyRegex.test(key)) {
      sanitized[key] = '[CONFIDENTIAL / MASKED]';
      continue;
    }

    if (typeof value === 'string') {
      // Mask full 12-digit Aadhaar
      if (/^\d{12}$/.test(value.replace(/\s/g, ''))) {
        sanitized[key] = '•••• •••• ' + value.replace(/\s/g, '').slice(-4);
      }
      // Mask 10-char PAN
      else if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value.trim())) {
        sanitized[key] = '••••••' + value.trim().slice(-4).toUpperCase();
      }
      // Mask signed URLs with signatures
      else if (value.includes('token=') || value.includes('Signature=')) {
        sanitized[key] = '[PROTECTED_SIGNED_URL]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Resolves safe direct administrative links to entities with valid detail routes.
 */
function resolveResourceLink(log: ActivityLogRow, metadata: any): string | undefined {
  const entityType = log.entity_type;
  const entityId = log.entity_id;

  if (entityType === 'APPLICATION' && entityId) {
    return `/admin/applications/${entityId}`;
  }
  if (entityType === 'JOINING_FORM' && entityId) {
    return `/admin/joining/${entityId}`;
  }
  if (entityType === 'COMPANY' && entityId) {
    return `/admin/companies/${entityId}`;
  }
  if (entityType === 'JOB' && entityId) {
    return `/admin/jobs/${entityId}`;
  }
  if (entityType === 'EMPLOYEE' && entityId) {
    return `/admin/employees/${entityId}`;
  }
  if (entityType === 'REFERENCE_SLIP' && entityId) {
    return `/admin/reference-slips/${entityId}`;
  }
  if (entityType === 'PAYMENT' && entityId) {
    return `/admin/payments/${entityId}`;
  }
  if (entityType === 'GENERATED_FILE' && entityId) {
    return `/admin/files/${entityId}`;
  }
  if (entityType === 'ADMIN_USER') {
    return `/admin/admin-users`;
  }
  if (entityType === 'SETTINGS') {
    return `/admin/settings`;
  }
  if (entityType === 'EMPLOYER_ENQUIRY' || metadata?.enquiry_id) {
    const enquiryId = entityId || metadata?.enquiry_id;
    // Don't link if permanently deleted
    if (log.action.includes('PERMANENT_DELETE')) {
      return undefined;
    }
    return enquiryId ? `/admin/employer-enquiries/${enquiryId}` : undefined;
  }
  if (log.application_id) {
    return `/admin/applications/${log.application_id}`;
  }

  return undefined;
}

/**
 * Fetches centralized, paginated, filtered activity logs for the global audit ledger.
 */
export async function getActivityLogs(options: ActivityFilterOptions = {}): Promise<ActivityLogsResult> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(10, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!isSupabaseConfigured) {
    return {
      logs: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }

  try {
    // 1. Fetch admin profiles map for actor resolution
    const { data: profiles } = await supabase
      .from('admin_profiles')
      .select('id, full_name, role');
    const adminMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 2. Build Base Query with joins and count
    let query = supabase
      .from('activity_logs')
      .select('*, applications(id, application_number, full_name)', { count: 'exact' });

    // Filter: Entity Type
    if (options.entityType && options.entityType !== 'ALL') {
      query = query.eq('entity_type', options.entityType);
    }

    // Filter: Action
    if (options.action && options.action !== 'ALL') {
      query = query.eq('action', options.action);
    }

    // Filter: Actor
    if (options.actorId && options.actorId !== 'ALL') {
      if (options.actorId === 'SYSTEM') {
        query = query.is('admin_user_id', null);
      } else {
        query = query.eq('admin_user_id', options.actorId);
      }
    }

    // Filter: Date Range
    if (options.dateRange && options.dateRange !== 'ALL') {
      const now = new Date();
      if (options.dateRange === 'TODAY') {
        now.setHours(0, 0, 0, 0);
        query = query.gte('created_at', now.toISOString());
      } else if (options.dateRange === '7D') {
        now.setDate(now.getDate() - 7);
        query = query.gte('created_at', now.toISOString());
      } else if (options.dateRange === '30D') {
        now.setDate(now.getDate() - 30);
        query = query.gte('created_at', now.toISOString());
      }
    }

    // Filter: Search Query (searches description, action, or entity_id)
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();
      query = query.or(`action.ilike.%${q}%,description.ilike.%${q}%,entity_id.ilike.%${q}%`);
    }

    // Ordering: strictly newest first
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: rawLogs, count, error } = await query;

    if (error) {
      console.error('[getActivityLogs] Database query error:', error.message);
      return { logs: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // 3. Batch resolve joining form references for items in current page
    const joiningIds = (rawLogs || [])
      .filter((l: any) => l.entity_type === 'JOINING_FORM' && l.entity_id)
      .map((l: any) => l.entity_id);

    let joiningMap = new Map<string, { joining_reference?: string; candidate_name?: string }>();
    if (joiningIds.length > 0) {
      const { data: jData } = await supabase
        .from('joining_forms')
        .select('id, joining_reference, candidate_name')
        .in('id', joiningIds);
      if (jData) {
        joiningMap = new Map(jData.map((j: any) => [j.id, j]));
      }
    }

    // 4. Enrich logs
    const logs: EnrichedActivityLog[] = (rawLogs || []).map((log: any) => {
      const admin = log.admin_user_id ? adminMap.get(log.admin_user_id) : null;
      const app = log.applications;
      const join = log.entity_type === 'JOINING_FORM' ? joiningMap.get(log.entity_id) : null;

      let actorName = 'System / Candidate';
      let actorRole = 'SYSTEM';
      if (admin) {
        actorName = admin.full_name || 'Admin User';
        actorRole = admin.role || 'ADMIN';
      } else if (log.admin_user_id) {
        actorName = `Admin (${log.admin_user_id.slice(0, 8)})`;
        actorRole = 'ADMIN';
      }

      const resourceLink = resolveResourceLink(log, log.metadata);
      const sanitized = sanitizeLogMetadata(log.metadata);

      return {
        ...log,
        actorName,
        actorRole,
        applicationNumber: app?.application_number || null,
        candidateName: app?.full_name || join?.candidate_name || null,
        joiningReference: join?.joining_reference || null,
        resourceLink,
        sanitizedMetadata: sanitized
      };
    });

    return {
      logs,
      totalCount,
      page,
      pageSize,
      totalPages
    };
  } catch (err: any) {
    console.error('[getActivityLogs] Exception:', err);
    return { logs: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
}

/**
 * Fetches organization-wide activity statistics for KPI cards.
 */
export async function getActivityStats(): Promise<ActivityStats> {
  if (!isSupabaseConfigured) {
    return { totalCount: 0, todayCount: 0, activeActorsCount: 0, distinctEntitiesCount: 0 };
  }

  try {
    // 1. Total Count
    const { count: totalCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true });

    // 2. Today Count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString());

    // 3. Distinct counts from recent 500 records
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('entity_type, admin_user_id')
      .order('created_at', { ascending: false })
      .limit(500);

    const adminIds = new Set((logs || []).map((l: any) => l.admin_user_id).filter(Boolean));
    const entities = new Set((logs || []).map((l: any) => l.entity_type || 'APPLICATION'));

    return {
      totalCount: totalCount || 0,
      todayCount: todayCount || 0,
      activeActorsCount: adminIds.size,
      distinctEntitiesCount: entities.size
    };
  } catch (err) {
    console.error('[getActivityStats] Exception:', err);
    return { totalCount: 0, todayCount: 0, activeActorsCount: 0, distinctEntitiesCount: 0 };
  }
}

/**
 * Fetches distinct filter values present in the system to power dynamic filter dropdowns.
 */
export async function getAvailableActivityFilterOptions(): Promise<{
  entityTypes: string[];
  actions: string[];
  actors: { id: string; name: string; role?: string }[];
}> {
  if (!isSupabaseConfigured) {
    return { entityTypes: [], actions: [], actors: [] };
  }

  try {
    // 1. Admin profiles for actors
    const { data: profiles } = await supabase
      .from('admin_profiles')
      .select('id, full_name, role');

    const actors = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.full_name || 'Admin User',
      role: p.role
    }));

    // 2. Distinct entity types and actions from recent activity records
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('entity_type, action')
      .order('created_at', { ascending: false })
      .limit(1000);

    const entityTypesSet = new Set<string>();
    const actionsSet = new Set<string>();

    // Seed with core known entity types
    [
      'APPLICATION',
      'JOINING_FORM',
      'COMPANY',
      'JOB',
      'EMPLOYEE',
      'REFERENCE_SLIP',
      'PAYMENT',
      'GENERATED_FILE',
      'EMPLOYER_ENQUIRY',
      'ADMIN_USER',
      'SETTINGS'
    ].forEach((et) => entityTypesSet.add(et));

    (logs || []).forEach((l: any) => {
      if (l.entity_type) entityTypesSet.add(l.entity_type);
      if (l.action) actionsSet.add(l.action);
    });

    return {
      entityTypes: Array.from(entityTypesSet),
      actions: Array.from(actionsSet).sort(),
      actors
    };
  } catch (err) {
    console.error('[getAvailableActivityFilterOptions] Exception:', err);
    return { entityTypes: [], actions: [], actors: [] };
  }
}

