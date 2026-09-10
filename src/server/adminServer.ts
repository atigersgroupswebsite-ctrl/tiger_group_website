// ==============================================================================
// File: src/server/adminServer.ts
// Description: Privileged server-side Admin Directory operations
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Security:
//   - Service role key is NEVER exposed to client browser
//   - Every request verifies requester is an active SUPER_ADMIN
//   - Uses Supabase Auth Admin API for invites and user lifecycle
//   - Prevents self-deactivation of the active SUPER_ADMIN
// ==============================================================================

import { getSupabaseServer, authenticateRequest } from './paymentServer';
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

const VALID_ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'COORDINATOR',
  'DOCUMENT_VERIFIER',
  'ACCOUNTANT'
];

/**
 * Validates that the authenticated user has an active SUPER_ADMIN profile.
 */
async function verifySuperAdmin(authHeader: string | undefined | null) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { authorized: false, status: 401, error: auth.error || 'Unauthorized' };
  }

  const supabase = getSupabaseServer();
  const { data: profile, error } = await supabase
    .from('admin_profiles')
    .select('id, role, active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error || !profile) {
    return { authorized: false, status: 403, error: 'Access denied: Admin profile not found' };
  }

  if (!profile.active) {
    return { authorized: false, status: 403, error: 'Access denied: Admin profile is inactive' };
  }

  if (profile.role !== 'SUPER_ADMIN') {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Only SUPER_ADMIN users can access the Admin Directory'
    };
  }

  return { authorized: true, user: auth.user, profile };
}

/**
 * Handler: GET /api/admin/users
 * Returns list of all admin users with roles, activation status, and auth metadata.
 */
export async function listAdminUsersHandler(authHeader: string | undefined | null) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const supabase = getSupabaseServer();

  try {
    // 1. Fetch all admin profiles
    const { data: profiles, error: profileErr } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileErr) {
      return { status: 500, data: { success: false, error: profileErr.message } };
    }

    // 2. Fetch auth users from Auth Admin API to enrich with email and last_sign_in_at
    const { data: authUsersData, error: authErr } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    const authUsersMap = new Map<string, { email?: string; last_sign_in_at?: string }>();
    if (!authErr && authUsersData?.users) {
      for (const u of authUsersData.users) {
        authUsersMap.set(u.id, {
          email: u.email,
          last_sign_in_at: u.last_sign_in_at
        });
      }
    }

    const adminList: AdminDirectoryUser[] = (profiles || []).map((p: any) => {
      const authInfo = authUsersMap.get(p.id);
      return {
        id: p.id,
        email: authInfo?.email || 'N/A',
        fullName: p.full_name || 'Admin User',
        role: p.role,
        active: !!p.active,
        createdAt: p.created_at,
        lastSignInAt: authInfo?.last_sign_in_at || null
      };
    });

    return {
      status: 200,
      data: {
        success: true,
        admins: adminList
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal error' } };
  }
}

/**
 * Handler: POST /api/admin/users/invite
 * Invites or registers a new admin user through Supabase Auth and creates their admin_profile.
 */
export async function inviteAdminUserHandler(
  body: { email?: string; fullName?: string; role?: AdminRole },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { email, fullName, role } = body;

  if (!email || !email.includes('@')) {
    return { status: 400, data: { success: false, error: 'A valid email address is required.' } };
  }

  if (!fullName || !fullName.trim()) {
    return { status: 400, data: { success: false, error: 'Full Name is required.' } };
  }

  if (!role || !VALID_ADMIN_ROLES.includes(role)) {
    return {
      status: 400,
      data: {
        success: false,
        error: `Invalid role. Must be one of: ${VALID_ADMIN_ROLES.join(', ')}`
      }
    };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = fullName.trim();
  const supabase = getSupabaseServer();

  try {
    // 1. Check if an auth user with this email already exists
    const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    let targetUserId: string | null = null;

    if (!listErr && existingUsers?.users) {
      const matched = existingUsers.users.find(
        (u: any) => u.email?.toLowerCase().trim() === normalizedEmail
      );
      if (matched) {
        targetUserId = matched.id;
      }
    }

    // 2. If not existing, invite or create auth user
    if (!targetUserId) {
      // Try inviteUserByEmail first
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: { full_name: trimmedName }
        }
      );

      if (!inviteErr && inviteData?.user) {
        targetUserId = inviteData.user.id;
      } else {
        // Fallback to createUser if invite service is unconfigured or rate-limited
        const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: { full_name: trimmedName }
        });

        if (createErr || !createData?.user) {
          return {
            status: 500,
            data: {
              success: false,
              error: createErr?.message || inviteErr?.message || 'Failed to create auth user.'
            }
          };
        }
        targetUserId = createData.user.id;
      }
    }

    // 3. Upsert admin_profiles row
    const { error: upsertErr } = await supabase
      .from('admin_profiles')
      .upsert({
        id: targetUserId,
        full_name: trimmedName,
        role,
        active: true
      }, { onConflict: 'id' });

    if (upsertErr) {
      return {
        status: 500,
        data: { success: false, error: `Auth created, but profile assignment failed: ${upsertErr.message}` }
      };
    }

    // 4. Log governance security event to activity_logs
    try {
      await supabase.from('activity_logs').insert({
        admin_user_id: authCheck.user!.id,
        action: 'ADMIN_CREATED',
        entity_type: 'ADMIN_USER',
        entity_id: targetUserId,
        description: `Admin profile created for ${normalizedEmail} with role ${role}`,
        metadata: { email: normalizedEmail, role, active: true }
      });
    } catch (logErr) {
      console.warn('[AdminServer] Failed to write activity log:', logErr);
    }

    return {
      status: 200,
      data: {
        success: true,
        message: `Admin user ${normalizedEmail} successfully authorized with role ${role}.`,
        user: {
          id: targetUserId,
          email: normalizedEmail,
          fullName: trimmedName,
          role,
          active: true
        }
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal server error' } };
  }
}

/**
 * Handler: POST /api/admin/users/toggle-status
 * Activates or deactivates an admin user's profile.
 */
export async function toggleAdminStatusHandler(
  body: { adminId?: string; active?: boolean },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { adminId, active } = body;

  if (!adminId) {
    return { status: 400, data: { success: false, error: 'Admin ID is required.' } };
  }

  if (typeof active !== 'boolean') {
    return { status: 400, data: { success: false, error: 'Active status must be boolean.' } };
  }

  // Prevent self-deactivation
  if (adminId === authCheck.user!.id && !active) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Security Constraint: You cannot deactivate your own active SUPER_ADMIN account.'
      }
    };
  }

  const supabase = getSupabaseServer();

  try {
    const { error: updateErr } = await supabase
      .from('admin_profiles')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    if (updateErr) {
      return { status: 500, data: { success: false, error: updateErr.message } };
    }

    // Log governance event
    try {
      await supabase.from('activity_logs').insert({
        admin_user_id: authCheck.user!.id,
        action: active ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
        entity_type: 'ADMIN_USER',
        entity_id: adminId,
        description: `Admin profile ${adminId} status changed to ${active ? 'ACTIVE' : 'INACTIVE'}`,
        metadata: { adminId, active }
      });
    } catch (logErr) {
      console.warn('[AdminServer] Failed to write activity log:', logErr);
    }

    return {
      status: 200,
      data: {
        success: true,
        message: `Admin profile status updated to ${active ? 'ACTIVE' : 'INACTIVE'}.`
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal server error' } };
  }
}
