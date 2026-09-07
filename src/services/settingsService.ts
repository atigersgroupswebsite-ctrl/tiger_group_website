// ==============================================================================
// File: src/services/settingsService.ts
// Description: System Settings Service Layer (Persisted, Auditable, Role-Protected)
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SystemSettingRow, SystemSettingUpdate } from '../types/database';

/**
 * Fetches all persisted system settings from public.system_settings.
 * Requires active administrative authentication session.
 */
export async function getSystemSettings(): Promise<SystemSettingRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('[getSystemSettings] Error:', error.message);
      return [];
    }

    return data || [];
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
 */
export async function updateSystemSetting(
  key: string,
  value: any,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
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

    return { success: true };
  } catch (err: any) {
    console.error('[updateSystemSetting] Exception:', err);
    return { success: false, error: err?.message || 'Failed to update system setting.' };
  }
}
