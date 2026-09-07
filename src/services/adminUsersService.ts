// ==============================================================================
// File: src/services/adminUsersService.ts
// Description: Client service for privileged Admin Directory operations
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Security:
//   - Calls server-side /api/admin/users endpoints with Supabase Bearer token
//   - Never handles or exposes service role key on the client
// ==============================================================================

import { supabase } from '../lib/supabaseClient';
import type { AdminRole } from '../types/database';

export interface AdminDirectoryUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface AdminUsersServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves the current authenticated user's JWT token.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Lists all admin users (SUPER_ADMIN only).
 */
export async function listAdminUsers(): Promise<AdminUsersServiceResult<AdminDirectoryUser[]>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to fetch admin users' };
    }

    return { success: true, data: json.admins };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching admin users' };
  }
}

/**
 * Invites or authorizes a new admin user (SUPER_ADMIN only).
 */
export async function inviteAdminUser(params: {
  email: string;
  fullName: string;
  role: AdminRole;
}): Promise<AdminUsersServiceResult<{ id: string; email: string; fullName: string; role: AdminRole }>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to invite admin user' };
    }

    return { success: true, data: json.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error inviting admin user' };
  }
}

/**
 * Activates or deactivates an admin user profile (SUPER_ADMIN only).
 */
export async function toggleAdminStatus(
  adminId: string,
  active: boolean
): Promise<AdminUsersServiceResult<void>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/toggle-status', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminId, active })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to update admin activation status' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating admin status' };
  }
}
