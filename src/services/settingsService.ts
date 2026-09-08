// ==============================================================================
// File: src/services/settingsService.ts
// Description: System Settings Service Layer (Persisted, Auditable, Role-Protected)
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SystemSettingRow, SystemSettingUpdate } from '../types/database';
import { logActivity } from './activityService';

export interface EnrichedSystemSetting extends SystemSettingRow {
  updaterName?: string | null;
  updaterRole?: string | null;
}

/**
 * Validates setting values according to domain constraints.
 */
export function validateSystemSettingValue(key: string, value: any): { valid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Setting value cannot be empty.' };
  }

  switch (key) {
    case 'notification_sound_enabled': {
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Notification sound setting must be a boolean (true/false).' };
      }
      return { valid: true };
    }

    case 'default_registration_fee':
    case 'default_consultancy_fee': {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return { valid: false, error: 'Fee setting must be a valid non-negative number.' };
      }
      return { valid: true };
    }

    case 'platform_helpline': {
      if (typeof value !== 'object' || !value.phone || !value.email) {
        return { valid: false, error: 'Platform helpline requires both phone and email fields.' };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.email.trim())) {
        return { valid: false, error: 'Please enter a valid support email address.' };
      }
      if (value.phone.trim().length < 6) {
        return { valid: false, error: 'Please enter a valid helpline phone number.' };
      }
      return { valid: true };
    }

    case 'office_timings': {
      if (typeof value !== 'object' || !value.days || !value.hours) {
        return { valid: false, error: 'Office timings requires both days and hours fields.' };
      }
      if (value.days.trim().length === 0 || value.hours.trim().length === 0) {
        return { valid: false, error: 'Days and hours cannot be blank.' };
      }
      return { valid: true };
    }

    case 'company_defaults': {
      if (typeof value !== 'object' || !value.city || !value.state || !value.country) {
        return { valid: false, error: 'Company defaults requires city, state, and country fields.' };
      }
      if (value.city.trim().length === 0 || value.state.trim().length === 0 || value.country.trim().length === 0) {
        return { valid: false, error: 'City, state, and country cannot be blank.' };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Fetches all persisted system settings from public.system_settings,
 * relationally enriched with administrator profile names.
 * Requires active administrative authentication session.
 */
export async function getSystemSettings(): Promise<EnrichedSystemSetting[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    // 1. Fetch admin profiles map for updater resolution
    const { data: profiles } = await supabase
      .from('admin_profiles')
      .select('id, full_name, role');
    const adminMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 2. Fetch system settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('[getSystemSettings] Error:', error.message);
      return [];
    }

    return (data || []).map((s: any) => {
      const updater = s.updated_by ? adminMap.get(s.updated_by) : null;
      return {
        ...s,
        updaterName: updater ? updater.full_name : (s.updated_by ? 'Administrator' : null),
        updaterRole: updater ? updater.role : null
      };
    });
  } catch (err) {
    console.error('[getSystemSettings] Exception:', err);
    return [];
  }
}

/**
 * Retrieves a specific system setting value by key, with typed fallback.
 */
export async function getSystemSettingValue<T>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) {
      return fallback;
    }

    return data.value as unknown as T;
  } catch {
    return fallback;
  }
}

/**
 * Updates or sets a system setting.
 * RLS enforces that only SUPER_ADMIN or COORDINATOR can execute updates.
 * Automatically logs audit event in public.activity_logs upon success.
 */
export async function updateSystemSetting(
  key: string,
  value: any,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  // 1. Domain validation
  const validation = validateSystemSettingValue(key, value);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid setting value.' };
  }

  try {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id || null;

    const updatePayload: SystemSettingUpdate = {
      value,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updatePayload.description = description;
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updatePayload as any)
      .eq('key', key);

    if (error) {
      console.error('[updateSystemSetting] Error:', error.message);
      return { success: false, error: error.message };
    }

    // 2. Audit logging in public.activity_logs
    await logActivity({
      entityType: 'SETTINGS',
      entityId: key,
      action: 'SETTINGS_UPDATED',
      description: `System setting '${key}' successfully updated by administrator.`,
      metadata: {
        setting_key: key,
        updated_at: new Date().toISOString()
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[updateSystemSetting] Exception:', err);
    return { success: false, error: err?.message || 'Failed to update system setting.' };
  }
}
