// ==============================================================================
// File: src/services/adminManagementService.ts
// Description: Client service for Super Admin Sub-Admin Management & RBAC Governance
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Security:
//   - Authenticates via Supabase Bearer token
//   - Never handles or exposes service role key on the client
//   - Never exposes plaintext passwords in state or logs
// ==============================================================================

import { supabase } from '../lib/supabaseClient';
import type { AdminRole } from '../types/database';
import {
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
  ROLE_TEMPLATES,
  type PermissionKey,
  type SubAdminUser,
  type AdminAuditLogEntry,
  type PermissionDefinition,
  type ModuleKey,
  type RoleTemplate
} from '../types/rbac';

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  totalActive?: number;
  totalInactive?: number;
}

/**
 * Retrieves the current authenticated user's JWT token.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('tiger_admin_token') : null);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Lists all admin and sub-admin accounts.
 */
export async function listSubAdmins(): Promise<ServiceResult<SubAdminUser[]>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to fetch admin accounts' };
    }

    return {
      success: true,
      data: json.admins || [],
      totalActive: json.totalActive,
      totalInactive: json.totalInactive
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching admin accounts' };
  }
}

/**
 * Provisions a new Sub-Admin account.
 */
export async function createSubAdmin(params: {
  fullName: string;
  email: string;
  initialPassword: string;
  confirmPassword: string;
  designation?: string;
  role?: AdminRole;
  active?: boolean;
  permissions: PermissionKey[];
}): Promise<ServiceResult<SubAdminUser>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/create-sub-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to create Sub-Admin account' };
    }

    return { success: true, data: json.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error creating Sub-Admin' };
  }
}

/**
 * Updates or revokes permissions for a Sub-Admin.
 */
export async function updateSubAdminPermissions(
  adminId: string,
  permissions: PermissionKey[]
): Promise<ServiceResult<PermissionKey[]>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/update-permissions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminId, permissions })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to update permissions' };
    }

    return { success: true, data: json.permissions };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating permissions' };
  }
}

/**
 * Resets a Sub-Admin's password.
 */
export async function resetSubAdminPassword(
  adminId: string,
  newPassword: string,
  confirmPassword: string
): Promise<ServiceResult<void>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminId, newPassword, confirmPassword })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to reset password' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error resetting password' };
  }
}

/**
 * Activates or deactivates an admin account.
 */
export async function toggleSubAdminStatus(
  adminId: string,
  active: boolean
): Promise<ServiceResult<void>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/toggle-status', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminId, active })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to update account status' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating account status' };
  }
}

/**
 * Permanently deletes a Sub-Admin account.
 */
export async function deleteSubAdmin(adminId: string): Promise<ServiceResult<void>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminId })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to delete Sub-Admin account' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting Sub-Admin' };
  }
}

/**
 * Fetches administrative audit logs.
 */
export async function fetchAdminAuditLogs(): Promise<ServiceResult<AdminAuditLogEntry[]>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/audit-logs', {
      method: 'GET',
      headers
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to fetch audit logs' };
    }

    return { success: true, data: json.logs || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching audit logs' };
  }
}

/**
 * Fetches the available permissions catalog.
 */
export async function fetchPermissionsCatalog(): Promise<{
  permissions: PermissionDefinition[];
  modules: ModuleKey[];
  roleTemplates: Record<string, RoleTemplate>;
}> {
  try {
    const res = await fetch('/api/admin/permissions', { method: 'GET' });
    const json = await res.json();
    if (json.success && json.permissions) {
      return {
        permissions: json.permissions,
        modules: json.modules,
        roleTemplates: json.roleTemplates
      };
    }
  } catch {
    // fallback
  }

  return {
    permissions: ALL_PERMISSIONS,
    modules: PERMISSION_MODULES,
    roleTemplates: ROLE_TEMPLATES
  };
}

/**
 * Fetches current authenticated user's permissions.
 */
export async function fetchMyPermissions(): Promise<{
  isSuperAdmin: boolean;
  role: AdminRole;
  permissions: PermissionKey[];
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users/me/permissions', {
      method: 'GET',
      headers
    });

    const json = await res.json();
    if (json.success) {
      return {
        isSuperAdmin: Boolean(json.isSuperAdmin),
        role: json.role,
        permissions: json.permissions || []
      };
    }
  } catch {
    // fallback
  }

  return {
    isSuperAdmin: false,
    role: 'COORDINATOR',
    permissions: []
  };
}
