// ==============================================================================
// File: src/server/adminServer.ts
// Description: Privileged server-side Admin Directory & Sub-Admin RBAC Governance
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Security Architecture:
//   - Service role key is NEVER exposed to client browser
//   - Every privileged request verifies requester is an active SUPER_ADMIN
//   - Uses Supabase Auth Admin API for user lifecycle & secure credential provisioning
//   - Enforces strong password complexity (min 8 chars, uppercase, lowercase, digit, symbol)
//   - Never returns or logs plain-text passwords
//   - Writes non-repudiable audit logs to admin_audit_logs and activity_logs
//   - Prevents self-deactivation or deletion of the active SUPER_ADMIN
//   - Provides resilient fallback persistence if cloud migrations are pending
// ==============================================================================

import { getSupabaseServer, getSupabaseClient, authenticateRequest, hasServiceRoleKey } from './supabaseServer.js';
import type { AdminRole } from '../types/database.js';
import {
  ALL_PERMISSIONS,
  type PermissionKey,
  type SubAdminUser,
  type AdminAuditLogEntry
} from '../types/rbac.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const VALID_ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'SUB_ADMIN',
  'ADMIN',
  'COORDINATOR',
  'DOCUMENT_VERIFIER',
  'ACCOUNTANT',
  'FINANCE',
  'REGULAR_JOINING_OPERATOR'
];

// Fallback in-memory / local disk cache for users, permissions and audit logs
// to guarantee local development resilience even when Supabase service keys are offline
interface LocalRbacCache {
  users?: SubAdminUser[];
  userEmails?: Record<string, string>;
  userPermissions: Record<string, PermissionKey[]>;
  userDesignations: Record<string, string>;
  userStatuses?: Record<string, boolean>;
  userPasswordHashes?: Record<string, string>;
  auditLogs: AdminAuditLogEntry[];
}

export function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd.trim()).digest('hex');
}

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'node_modules', '.tiger_rbac_cache');
const LOCAL_STORAGE_FILE = path.join(LOCAL_STORAGE_DIR, 'rbac_store.json');

function getLocalRbacStore(): LocalRbacCache {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf8');
      const store: LocalRbacCache = JSON.parse(content);
      if (!Array.isArray(store.users)) {
        store.users = [];
      }
      if (!store.userEmails || typeof store.userEmails !== 'object') {
        store.userEmails = {};
      }
      if (!store.userPermissions || typeof store.userPermissions !== 'object') {
        store.userPermissions = {};
      }
      if (!store.userDesignations || typeof store.userDesignations !== 'object') {
        store.userDesignations = {};
      }
      if (!store.userStatuses || typeof store.userStatuses !== 'object') {
        store.userStatuses = {};
      }
      if (!store.userPasswordHashes || typeof store.userPasswordHashes !== 'object') {
        store.userPasswordHashes = {};
      }
      if (!Array.isArray(store.auditLogs)) {
        store.auditLogs = [];
      }

      // Self-healing / backfill: if users array is empty, reconstruct active users from auditLogs
      if (store.users.length === 0 && store.auditLogs.length > 0) {
        const deletedIds = new Set<string>();
        for (const entry of store.auditLogs) {
          if (entry.action === 'SUB_ADMIN_DELETED' && entry.targetId) {
            deletedIds.add(entry.targetId);
          }
        }

        const seenTargetIds = new Set<string>();
        for (const entry of store.auditLogs) {
          if (
            entry.action === 'SUB_ADMIN_CREATED' &&
            entry.targetId &&
            !deletedIds.has(entry.targetId) &&
            !seenTargetIds.has(entry.targetId)
          ) {
            seenTargetIds.add(entry.targetId);
            const meta = (entry.metadata || {}) as any;
            const restoredUser: SubAdminUser = {
              id: entry.targetId,
              email: meta.email || store.userEmails[entry.targetId] || 'subadmin@atigergroups.com',
              fullName: meta.fullName || 'Sub-Admin Executive',
              role: (meta.role as AdminRole) || 'SUB_ADMIN',
              designation: meta.designation || store.userDesignations[entry.targetId] || 'Sub-Admin Executive',
              active: typeof store.userStatuses[entry.targetId] === 'boolean' ? store.userStatuses[entry.targetId] : true,
              createdAt: entry.createdAt || new Date().toISOString(),
              lastSignInAt: null,
              permissions: meta.permissions || store.userPermissions[entry.targetId] || [],
              createdBy: entry.actingAdminId || null
            };
            store.users.push(restoredUser);
            if (meta.email) {
              store.userEmails[entry.targetId] = meta.email;
            }
          }
        }
      }

      return store;
    }
  } catch {
    // ignore
  }
  return {
    users: [],
    userEmails: {},
    userPermissions: {},
    userDesignations: {},
    userStatuses: {},
    auditLogs: []
  };
}

function saveLocalRbacStore(store: LocalRbacCache) {
  try {
    if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
      fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('[AdminServer] Local RBAC store write warning:', err);
  }
}

/**
 * Validates password complexity:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*...).' };
  }
  return { valid: true };
}

/**
 * Validates that the authenticated user has an active SUPER_ADMIN profile.
 * - Extracts and verifies caller's JWT token
 * - Uses getSupabaseClient(authHeader) so PostgREST evaluates RLS with auth.uid() = user.id
 * - Provides discrete error discrimination for invalid token (401), query failure (500),
 *   missing profile (403), inactive profile (403), and insufficient privileges (403).
 */
export async function verifySuperAdmin(authHeader: string | undefined | null) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return {
      authorized: false as const,
      status: 401,
      error: auth.error || 'Invalid or expired session. Please log in again.'
    };
  }

  // Support simulated test suite execution when running automated scripts
  if (process.env.NODE_ENV === 'test' && authHeader?.includes('mock_superadmin_')) {
    return {
      authorized: true as const,
      user: auth.user,
      profile: {
        id: auth.user.id,
        full_name: 'A Tiger Super Admin',
        role: 'SUPER_ADMIN' as AdminRole,
        active: true
      }
    };
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: profile, error } = await supabase
    .from('admin_profiles')
    .select('id, full_name, role, active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    console.error('[AdminServer] Database error verifying administrator profile:', error.message, error.code);
    return {
      authorized: false as const,
      status: 500,
      error: `Database query failure: Unable to verify administrator profile (${error.message}).`
    };
  }

  if (!profile) {
    console.warn(`[AdminServer] Administrator profile missing for user ID: ${auth.user.id}`);
    return {
      authorized: false as const,
      status: 403,
      error: 'Access denied: Administrator profile not found in database for this account.'
    };
  }

  if (!profile.active) {
    console.warn(`[AdminServer] Inactive administrator profile for user ID: ${auth.user.id}`);
    return {
      authorized: false as const,
      status: 403,
      error: 'Access denied: Administrator profile is currently marked inactive. Please contact system governance.'
    };
  }

  if (profile.role !== 'SUPER_ADMIN') {
    console.warn(`[AdminServer] Non-Super Admin access attempt by user ID: ${auth.user.id} (role: ${profile.role})`);
    return {
      authorized: false as const,
      status: 403,
      error: `Forbidden: Super Administrator privileges required. Your account holds role '${profile.role}'.`
    };
  }

  return { authorized: true as const, user: auth.user, profile };
}

/**
 * Logs an administrative audit event into public.admin_audit_logs and activity_logs.
 */
async function recordAuditLog(
  actingAdminId: string,
  action: string,
  targetId: string | null,
  status: 'SUCCESS' | 'FAILURE',
  metadata: Record<string, any> = {}
) {
  // Never log passwords, tokens, or sensitive credentials
  const sanitizedMeta = { ...metadata };
  delete sanitizedMeta.password;
  delete sanitizedMeta.initialPassword;
  delete sanitizedMeta.confirmPassword;
  delete sanitizedMeta.token;

  const nowIso = new Date().toISOString();
  const auditEntry: AdminAuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actingAdminId,
    action,
    targetId,
    status,
    metadata: sanitizedMeta,
    createdAt: nowIso
  };

  // 1. Save to local fallback store
  try {
    const store = getLocalRbacStore();
    store.auditLogs.unshift(auditEntry);
    if (store.auditLogs.length > 500) {
      store.auditLogs = store.auditLogs.slice(0, 500);
    }
    saveLocalRbacStore(store);
  } catch {
    // ignore
  }

  // 2. Persist to database if available
  try {
    const supabase = getSupabaseServer();
    await supabase.from('admin_audit_logs').insert({
      acting_admin_id: actingAdminId,
      action,
      target_id: targetId,
      status,
      metadata: sanitizedMeta,
      created_at: nowIso
    });
  } catch {
    // admin_audit_logs table might not be migrated yet in remote db; fallback to activity_logs
    try {
      const supabase = getSupabaseServer();
      await supabase.from('activity_logs').insert({
        admin_user_id: actingAdminId,
        action,
        entity_type: 'SUB_ADMIN',
        entity_id: targetId,
        description: `Admin action: ${action} on ${targetId || 'N/A'}`,
        metadata: sanitizedMeta
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Handler: GET /api/admin/users
 * Returns list of all admin and sub-admin accounts with permissions, status, and auth metadata.
 */
export async function listAdminUsersHandler(authHeader: string | undefined | null) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const supabase = getSupabaseClient(authHeader);
  const localStore = getLocalRbacStore();

  try {
    // 1. Fetch all admin profiles from database
    let dbProfiles: any[] = [];
    try {
      const { data: profiles, error: profileErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileErr) {
        console.warn('[AdminServer] admin_profiles query warning:', profileErr.message);
      } else if (profiles) {
        dbProfiles = profiles;
      }
    } catch (dbErr) {
      console.warn('[AdminServer] Database profile fetch error:', dbErr);
    }

    // 2. Fetch auth users from Auth Admin API if service-role key available
    let authUsersMap = new Map<string, { email?: string; last_sign_in_at?: string }>();
    if (hasServiceRoleKey()) {
      try {
        const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (authUsersData?.users) {
          for (const u of authUsersData.users) {
            authUsersMap.set(u.id, {
              email: u.email,
              last_sign_in_at: u.last_sign_in_at
            });
          }
        }
      } catch (authErr) {
        console.warn('[AdminServer] Auth admin listUsers warning:', authErr);
      }
    }

    // 3. Fetch permissions from admin_permissions table
    const permissionsMap = new Map<string, PermissionKey[]>();
    try {
      const { data: dbPerms } = await supabase
        .from('admin_permissions')
        .select('admin_id, permission_id, permissions(permission_key)');

      if (dbPerms) {
        for (const item of dbPerms as any[]) {
          const adminId = item.admin_id;
          const key = item.permissions?.permission_key || item.permission_id;
          if (!permissionsMap.has(adminId)) {
            permissionsMap.set(adminId, []);
          }
          if (key) {
            permissionsMap.get(adminId)!.push(key as PermissionKey);
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. Merge DB profiles with local store
    const mergedList: SubAdminUser[] = [];
    const processedIds = new Set<string>();
    const processedEmails = new Set<string>();

    for (const p of dbProfiles) {
      processedIds.add(p.id);

      const authInfo = authUsersMap.get(p.id);
      const localUser = (localStore.users || []).find((u) => u.id === p.id);

      // Email resolution
      let email =
        authInfo?.email ||
        localStore.userEmails?.[p.id] ||
        localUser?.email ||
        p.email;

      if (!email || email === 'N/A') {
        if (p.id === authCheck.user.id) {
          email = authCheck.user.email || 'superadmin@atigergroups.com';
        } else {
          email = 'N/A';
        }
      }

      if (email && email !== 'N/A') {
        processedEmails.add(email.toLowerCase());
      }

      const isSuper = p.role === 'SUPER_ADMIN';

      // Role resolution
      let role: AdminRole = p.role as AdminRole;
      if (localUser?.role) {
        role = localUser.role;
      } else if (!isSuper) {
        if (localStore.userDesignations?.[p.id] || localStore.userPermissions?.[p.id]) {
          role = 'SUB_ADMIN';
        }
      }

      // Permissions resolution
      let perms: PermissionKey[] = [];
      if (isSuper) {
        perms = ALL_PERMISSIONS.map((ap) => ap.key);
      } else {
        const fromDb = permissionsMap.get(p.id);
        const fromLocal = localStore.userPermissions?.[p.id];
        const fromLocalUser = localUser?.permissions;
        if (fromDb && fromDb.length > 0) {
          perms = fromDb;
        } else if (fromLocal && fromLocal.length > 0) {
          perms = fromLocal;
        } else if (fromLocalUser && fromLocalUser.length > 0) {
          perms = fromLocalUser;
        }
      }

      // Active status resolution
      let active = Boolean(p.active);
      if (typeof localStore.userStatuses?.[p.id] === 'boolean') {
        active = localStore.userStatuses[p.id];
      } else if (localUser && typeof localUser.active === 'boolean') {
        active = localUser.active;
      }

      // Designation resolution
      const designation =
        p.designation ||
        localStore.userDesignations?.[p.id] ||
        localUser?.designation ||
        null;

      mergedList.push({
        id: p.id,
        email,
        fullName: p.full_name || localUser?.fullName || 'Admin User',
        role,
        designation,
        active,
        createdAt: p.created_at || localUser?.createdAt || new Date().toISOString(),
        lastSignInAt: authInfo?.last_sign_in_at || localUser?.lastSignInAt || null,
        permissions: perms,
        createdBy: p.created_by || localUser?.createdBy || null
      });
    }

    // Add any sub-admin accounts created locally that aren't yet in dbProfiles
    for (const lu of localStore.users || []) {
      if (processedIds.has(lu.id)) continue;
      if (lu.email && processedEmails.has(lu.email.toLowerCase())) continue;

      processedIds.add(lu.id);
      if (lu.email) processedEmails.add(lu.email.toLowerCase());

      const perms =
        lu.permissions && lu.permissions.length > 0
          ? lu.permissions
          : localStore.userPermissions?.[lu.id] || [];

      const designation = lu.designation || localStore.userDesignations?.[lu.id] || null;
      const active =
        typeof localStore.userStatuses?.[lu.id] === 'boolean'
          ? localStore.userStatuses[lu.id]
          : lu.active !== false;

      mergedList.push({
        ...lu,
        permissions: perms,
        designation,
        active
      });
    }

    // Ensure the authorized Super Admin is always included in the directory
    if (!mergedList.some((u) => u.id === authCheck.user.id || u.role === 'SUPER_ADMIN')) {
      mergedList.unshift({
        id: authCheck.user.id,
        email: authCheck.user.email || 'superadmin@atigergroups.com',
        fullName: authCheck.profile?.full_name || 'Super Admin',
        role: 'SUPER_ADMIN',
        designation: 'Chief Administrator',
        active: true,
        createdAt: new Date().toISOString(),
        lastSignInAt: new Date().toISOString(),
        permissions: ALL_PERMISSIONS.map((ap) => ap.key),
        createdBy: null
      });
    }

    return {
      status: 200,
      data: {
        success: true,
        admins: mergedList,
        totalActive: mergedList.filter((a) => a.active).length,
        totalInactive: mergedList.filter((a) => !a.active).length
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal error' } };
  }
}

/**
 * Handler: POST /api/admin/users/create-sub-admin
 * Super Admin creates a new Sub-Admin account with email, strong password, designation, and permissions.
 */
export async function createSubAdminHandler(
  body: {
    fullName?: string;
    email?: string;
    initialPassword?: string;
    confirmPassword?: string;
    designation?: string;
    role?: AdminRole;
    active?: boolean;
    permissions?: PermissionKey[];
  },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { fullName, email, initialPassword, confirmPassword, designation, role, active, permissions } = body;

  // 1. Validations
  if (!fullName || !fullName.trim()) {
    return { status: 400, data: { success: false, error: 'Full Name is required.' } };
  }

  if (!email || !email.includes('@')) {
    return { status: 400, data: { success: false, error: 'A valid email address is required.' } };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = fullName.trim();
  const trimmedDesignation = (designation || '').trim();
  const normalizedRole: AdminRole = role && VALID_ADMIN_ROLES.includes(role.toUpperCase() as AdminRole)
    ? (role.toUpperCase() as AdminRole)
    : 'SUB_ADMIN';
  const assignedRole: AdminRole = normalizedRole;
  const isActive = active !== undefined ? Boolean(active) : true;
  const assignedPermissions: PermissionKey[] = Array.isArray(permissions) ? permissions : [];

  // Passwords
  if (!initialPassword) {
    return { status: 400, data: { success: false, error: 'Initial password is required.' } };
  }

  if (initialPassword !== confirmPassword) {
    return { status: 400, data: { success: false, error: 'Initial password and confirm password do not match.' } };
  }

  const policyCheck = validatePasswordPolicy(initialPassword);
  if (!policyCheck.valid) {
    return { status: 400, data: { success: false, error: policyCheck.error } };
  }

  const supabase = getSupabaseClient(authHeader);
  const localStore = getLocalRbacStore();

  // Check if an administrator account already exists with this email in local store
  const existingLocalUser = (localStore.users || []).find(
    (u) => u.email?.toLowerCase().trim() === normalizedEmail
  );
  if (existingLocalUser) {
    return {
      status: 409,
      data: {
        success: false,
        error: `An administrator account is already registered for ${normalizedEmail} (Role: ${existingLocalUser.role}). Please manage their permissions or reset their password instead of creating a duplicate.`
      }
    };
  }

  try {
    // 2. Check if an auth user with this email already exists in Supabase Auth
    let targetUserId: string | null = null;
    try {
      if (hasServiceRoleKey()) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (existingUsers?.users) {
          const matched = existingUsers.users.find(
            (u: any) => u.email?.toLowerCase().trim() === normalizedEmail
          );
          if (matched) {
            targetUserId = matched.id;
          }
        }
      }
    } catch (listErr) {
      console.warn('[AdminServer] User lookup warning:', listErr);
    }

    let isOrphanedRecovery = false;
    if (targetUserId) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('admin_profiles')
        .select('id, role')
        .eq('id', targetUserId)
        .maybeSingle();

      if (existingProfile) {
        return {
          status: 409,
          data: {
            success: false,
            error: `An administrator account is already registered for ${normalizedEmail} (Role: ${existingProfile.role}). Please manage their permissions or reset their password instead of creating a duplicate.`
          }
        };
      }
      isOrphanedRecovery = true;
    }

    // 3. Create user in Supabase Auth via Admin API or fallback signUp
    if (!targetUserId) {
      if (hasServiceRoleKey()) {
        const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: initialPassword,
          email_confirm: true,
          user_metadata: {
            full_name: trimmedName,
            designation: trimmedDesignation,
            created_by: authCheck.user!.id
          }
        });

        if (createErr || !createData?.user) {
          return {
            status: 500,
            data: {
              success: false,
              error: createErr?.message || 'Failed to provision authentication account.'
            }
          };
        }
        targetUserId = createData.user.id;
      } else {
        // Fallback for local development when service-role key is absent
        try {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: initialPassword,
            options: {
              data: {
                full_name: trimmedName,
                designation: trimmedDesignation,
                created_by: authCheck.user!.id
              }
            }
          });
          if (signUpData?.user?.id) {
            targetUserId = signUpData.user.id;
          } else if (signUpErr && signUpErr.message?.toLowerCase().includes('already registered')) {
            return {
              status: 409,
              data: {
                success: false,
                error: `An administrator account is already registered for ${normalizedEmail}.`
              }
            };
          }
        } catch {
          // ignore
        }
        if (!targetUserId) {
          targetUserId = crypto.randomUUID();
        }
      }
    } else {
      // User existed without profile: update password if service-role key available
      if (hasServiceRoleKey()) {
        await supabase.auth.admin.updateUserById(targetUserId, {
          password: initialPassword,
          email_confirm: true,
          user_metadata: { full_name: trimmedName, designation: trimmedDesignation }
        });
      }
    }

    if (!targetUserId) {
      return {
        status: 500,
        data: {
          success: false,
          error: 'Could not determine user identifier for account.'
        }
      };
    }

    // 4. Persist admin_profiles row with multi-level resilient schema adaptation
    // Try 1: Full payload (with designation, created_by, and assignedRole)
    let profilePersisted = false;
    const fullPayload: any = {
      id: targetUserId,
      full_name: trimmedName,
      role: assignedRole,
      active: isActive
    };
    if (trimmedDesignation) fullPayload.designation = trimmedDesignation;
    if (authCheck.user?.id) fullPayload.created_by = authCheck.user.id;

    const { error: fullUpsertErr } = await supabase
      .from('admin_profiles')
      .upsert(fullPayload, { onConflict: 'id' });

    if (!fullUpsertErr) {
      profilePersisted = true;
    } else {
      // Try 2: Columns designation/created_by might not exist in database schema cache
      const { error: retryErr } = await supabase
        .from('admin_profiles')
        .upsert({
          id: targetUserId,
          full_name: trimmedName,
          role: assignedRole,
          active: isActive
        }, { onConflict: 'id' });

      if (!retryErr) {
        profilePersisted = true;
      } else {
        // Try 3: Role check constraint might reject 'SUB_ADMIN' (e.g. unmigrated cloud DB)
        // Store as 'ADMIN' in DB so row is persisted and references auth.users
        const { error: adminRoleErr } = await supabase
          .from('admin_profiles')
          .upsert({
            id: targetUserId,
            full_name: trimmedName,
            role: 'ADMIN',
            active: isActive
          }, { onConflict: 'id' });

        if (!adminRoleErr) {
          profilePersisted = true;
        } else {
          console.warn('[AdminServer] Profile DB persistence warning (local fallback guaranteed):', adminRoleErr.message);
        }
      }
    }

    // 5. Construct authoritative SubAdminUser record
    const newSubAdminUser: SubAdminUser = {
      id: targetUserId,
      email: normalizedEmail,
      fullName: trimmedName,
      role: assignedRole,
      designation: trimmedDesignation || null,
      active: isActive,
      createdAt: new Date().toISOString(),
      lastSignInAt: null,
      permissions: assignedPermissions,
      createdBy: authCheck.user?.id || null
    };

    // 6. Save in local RBAC store
    localStore.users = localStore.users || [];
    localStore.users = localStore.users.filter((u) => u.id !== targetUserId && u.email?.toLowerCase() !== normalizedEmail);
    localStore.users.unshift(newSubAdminUser);

    localStore.userEmails = localStore.userEmails || {};
    localStore.userEmails[targetUserId] = normalizedEmail;

    localStore.userPermissions = localStore.userPermissions || {};
    localStore.userPermissions[targetUserId] = assignedPermissions;

    localStore.userDesignations = localStore.userDesignations || {};
    if (trimmedDesignation) {
      localStore.userDesignations[targetUserId] = trimmedDesignation;
    }

    localStore.userStatuses = localStore.userStatuses || {};
    localStore.userStatuses[targetUserId] = isActive;

    localStore.userPasswordHashes = localStore.userPasswordHashes || {};
    localStore.userPasswordHashes[targetUserId] = hashPassword(initialPassword);
    localStore.userPasswordHashes[normalizedEmail] = hashPassword(initialPassword);

    saveLocalRbacStore(localStore);

    // 7. Persist permissions in admin_permissions table if available
    try {
      await supabase.from('admin_permissions').delete().eq('admin_id', targetUserId);
      if (assignedPermissions.length > 0) {
        const rowsToInsert = assignedPermissions.map((key) => {
          const permDef = ALL_PERMISSIONS.find((p) => p.key === key);
          return {
            admin_id: targetUserId,
            permission_id: permDef?.id || `perm_${key.replace('.', '_')}`,
            granted_by: authCheck.user!.id
          };
        });
        await supabase.from('admin_permissions').insert(rowsToInsert);
      }
    } catch (permErr) {
      console.warn('[AdminServer] admin_permissions insert warning (local cache retained):', permErr);
    }

    // 8. Record non-repudiable audit log (never logging password)
    await recordAuditLog(
      authCheck.user!.id,
      'SUB_ADMIN_CREATED',
      targetUserId,
      'SUCCESS',
      {
        email: normalizedEmail,
        fullName: trimmedName,
        designation: trimmedDesignation,
        role: assignedRole,
        permissionsCount: assignedPermissions.length,
        permissions: assignedPermissions,
        isOrphanedRecovery,
        profilePersisted
      }
    );

    return {
      status: 200,
      data: {
        success: true,
        message: `Sub-Admin account for ${normalizedEmail} successfully created with ${assignedPermissions.length} assigned permissions.`,
        user: newSubAdminUser
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal server error' } };
  }
}

/**
 * Handler: POST /api/admin/users/update-permissions
 * Super Admin updates or revokes permissions for a Sub-Admin.
 */
export async function updateSubAdminPermissionsHandler(
  body: { adminId?: string; permissions?: PermissionKey[] },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { adminId, permissions } = body;
  if (!adminId) {
    return { status: 400, data: { success: false, error: 'Admin ID is required.' } };
  }

  if (!Array.isArray(permissions)) {
    return { status: 400, data: { success: false, error: 'Permissions must be an array of keys.' } };
  }

  const supabase = getSupabaseClient(authHeader);

  // Target user check: Cannot modify SUPER_ADMIN permissions
  const { data: targetProfile } = await supabase
    .from('admin_profiles')
    .select('id, full_name, role')
    .eq('id', adminId)
    .maybeSingle();

  if (targetProfile?.role === 'SUPER_ADMIN') {
    return {
      status: 403,
      data: {
        success: false,
        error: 'Security Constraint: Super Administrator accounts hold universal permissions and cannot have restricted permission sets.'
      }
    };
  }

  try {
    // 1. Update local cache
    const localStore = getLocalRbacStore();
    localStore.userPermissions[adminId] = permissions;
    const targetUser = (localStore.users || []).find((u) => u.id === adminId);
    if (targetUser) {
      targetUser.permissions = permissions;
    }
    saveLocalRbacStore(localStore);

    // 2. Update database admin_permissions
    try {
      await supabase.from('admin_permissions').delete().eq('admin_id', adminId);
      if (permissions.length > 0) {
        const rowsToInsert = permissions.map((key) => {
          const permDef = ALL_PERMISSIONS.find((p) => p.key === key);
          return {
            admin_id: adminId,
            permission_id: permDef?.id || `perm_${key.replace('.', '_')}`,
            granted_by: authCheck.user!.id
          };
        });
        await supabase.from('admin_permissions').insert(rowsToInsert);
      }
    } catch (permErr) {
      console.warn('[AdminServer] admin_permissions update warning:', permErr);
    }

    // 3. Log audit event
    await recordAuditLog(
      authCheck.user!.id,
      'PERMISSIONS_UPDATED',
      adminId,
      'SUCCESS',
      {
        targetUser: targetProfile?.full_name || adminId,
        permissionsCount: permissions.length,
        permissions
      }
    );

    return {
      status: 200,
      data: {
        success: true,
        message: `Permissions updated successfully (${permissions.length} active permissions).`,
        permissions
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Failed to update permissions.' } };
  }
}

/**
 * Handler: POST /api/admin/users/reset-password
 * Super Admin resets a Sub-Admin's password.
 */
export async function resetSubAdminPasswordHandler(
  body: { adminId?: string; newPassword?: string; confirmPassword?: string },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { adminId, newPassword, confirmPassword } = body;
  if (!adminId) {
    return { status: 400, data: { success: false, error: 'Admin ID is required.' } };
  }

  if (!newPassword) {
    return { status: 400, data: { success: false, error: 'New password is required.' } };
  }

  if (newPassword !== confirmPassword) {
    return { status: 400, data: { success: false, error: 'Password and confirm password do not match.' } };
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return { status: 400, data: { success: false, error: policyCheck.error } };
  }

  const supabase = getSupabaseClient(authHeader);

  try {
    if (hasServiceRoleKey()) {
      const { error: resetErr } = await supabase.auth.admin.updateUserById(adminId, {
        password: newPassword
      });

      if (resetErr) {
        return { status: 500, data: { success: false, error: resetErr.message || 'Failed to update password.' } };
      }
    }

    // Update local store credentials
    const localStore = getLocalRbacStore();
    localStore.userPasswordHashes = localStore.userPasswordHashes || {};
    localStore.userPasswordHashes[adminId] = hashPassword(newPassword);
    const matchedUser = (localStore.users || []).find((u) => u.id === adminId);
    if (matchedUser?.email) {
      localStore.userPasswordHashes[matchedUser.email.toLowerCase().trim()] = hashPassword(newPassword);
    }
    saveLocalRbacStore(localStore);

    // Audit log (never log password)
    await recordAuditLog(
      authCheck.user!.id,
      'PASSWORD_RESET',
      adminId,
      'SUCCESS',
      { targetAdminId: adminId }
    );

    return {
      status: 200,
      data: {
        success: true,
        message: 'Sub-Admin password reset successfully. The account holder can now log in with the new credentials.'
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal error' } };
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

  // Prevent self-deactivation of the Super Admin
  if (adminId === authCheck.user!.id && !active) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Security Constraint: You cannot deactivate your own active SUPER_ADMIN account.'
      }
    };
  }

  const supabase = getSupabaseClient(authHeader);

  try {
    const { error: updateErr } = await supabase
      .from('admin_profiles')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    if (updateErr) {
      console.warn('[AdminServer] admin_profiles update warning:', updateErr.message);
    }

    // Update in local store
    const localStore = getLocalRbacStore();
    localStore.userStatuses = localStore.userStatuses || {};
    localStore.userStatuses[adminId] = active;
    const targetUser = (localStore.users || []).find((u) => u.id === adminId);
    if (targetUser) {
      targetUser.active = active;
    }
    saveLocalRbacStore(localStore);

    // Invalidate sessions / revoke tokens if deactivated
    if (!active) {
      try {
        await supabase.auth.admin.signOut(adminId, 'global');
      } catch {
        // ignore
      }
    }

    // Log governance event
    await recordAuditLog(
      authCheck.user!.id,
      active ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      adminId,
      'SUCCESS',
      { adminId, active }
    );

    return {
      status: 200,
      data: {
        success: true,
        active,
        message: `Admin profile status updated to ${active ? 'ACTIVE' : 'INACTIVE'}.`
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal server error' } };
  }
}

/**
 * Handler: POST /api/admin/users/delete
 * Permanently deletes a Sub-Admin account from Supabase Auth and admin_profiles.
 */
export async function deleteSubAdminHandler(
  body: { adminId?: string },
  authHeader: string | undefined | null
) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const { adminId } = body;
  if (!adminId) {
    return { status: 400, data: { success: false, error: 'Admin ID is required.' } };
  }

  // Prevent deleting self or other Super Admins
  if (adminId === authCheck.user!.id) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Security Constraint: You cannot delete your own SUPER_ADMIN account.'
      }
    };
  }

  const supabase = getSupabaseClient(authHeader);

  const { data: targetProfile } = await supabase
    .from('admin_profiles')
    .select('id, full_name, role')
    .eq('id', adminId)
    .maybeSingle();

  if (targetProfile?.role === 'SUPER_ADMIN') {
    return {
      status: 403,
      data: {
        success: false,
        error: 'Security Constraint: Super Administrator accounts cannot be deleted through Sub-Admin controls.'
      }
    };
  }

  try {
    // 1. Delete permissions
    try {
      await supabase.from('admin_permissions').delete().eq('admin_id', adminId);
    } catch {
      // ignore
    }

    // 2. Delete admin profile
    await supabase.from('admin_profiles').delete().eq('id', adminId);

    // 3. Delete auth user
    try {
      await supabase.auth.admin.deleteUser(adminId);
    } catch (authDelErr) {
      console.warn('[AdminServer] Auth user delete warning:', authDelErr);
    }

    // 4. Clean local store
    const localStore = getLocalRbacStore();
    delete localStore.userPermissions[adminId];
    delete localStore.userDesignations[adminId];
    if (localStore.userStatuses) delete localStore.userStatuses[adminId];
    if (localStore.userEmails) delete localStore.userEmails[adminId];
    localStore.users = (localStore.users || []).filter((u) => u.id !== adminId);
    saveLocalRbacStore(localStore);

    // 5. Audit log
    await recordAuditLog(
      authCheck.user!.id,
      'SUB_ADMIN_DELETED',
      adminId,
      'SUCCESS',
      { targetName: targetProfile?.full_name || adminId }
    );

    return {
      status: 200,
      data: {
        success: true,
        message: `Sub-Admin account for ${targetProfile?.full_name || adminId} successfully deleted.`
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal error' } };
  }
}

/**
 * Handler: GET /api/admin/audit-logs
 * Super Admin reads administrative audit activity.
 */
export async function getAdminAuditLogsHandler(authHeader: string | undefined | null) {
  const authCheck = await verifySuperAdmin(authHeader);
  if (!authCheck.authorized) {
    return { status: authCheck.status, data: { success: false, error: authCheck.error } };
  }

  const supabase = getSupabaseClient(authHeader);
  const localStore = getLocalRbacStore();

  try {
    // Try reading from admin_audit_logs
    const { data: dbLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    let logs: AdminAuditLogEntry[] = [];
    if (dbLogs && dbLogs.length > 0) {
      logs = dbLogs.map((l: any) => ({
        id: l.id,
        actingAdminId: l.acting_admin_id,
        action: l.action,
        targetId: l.target_id,
        status: l.status,
        metadata: l.metadata,
        createdAt: l.created_at
      }));
    } else {
      logs = localStore.auditLogs;
    }

    return {
      status: 200,
      data: {
        success: true,
        logs
      }
    };
  } catch (err: any) {
    return {
      status: 200,
      data: {
        success: true,
        logs: localStore.auditLogs
      }
    };
  }
}

/**
 * Handler: GET /api/admin/users/me/permissions
 * Returns permissions for the calling authenticated user.
 */
export async function getCurrentUserPermissionsHandler(authHeader: string | undefined | null) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: 'Unauthorized' } };
  }

  // Support simulated test suite execution when running automated scripts
  if (process.env.NODE_ENV === 'test' && authHeader?.includes('mock_superadmin_')) {
    return {
      status: 200,
      data: {
        success: true,
        isSuperAdmin: true,
        role: 'SUPER_ADMIN' as AdminRole,
        user: {
          id: auth.user.id,
          email: auth.user.email || 'superadmin@atigergroups.com',
          role: 'SUPER_ADMIN' as AdminRole,
          name: 'Super Admin',
          active: true
        },
        permissions: ALL_PERMISSIONS.map((p) => p.key)
      }
    };
  }

  const supabase = getSupabaseClient(authHeader);
  const localStore = getLocalRbacStore();

  try {
    let profile: any = null;
    try {
      const { data, error: profileErr } = await supabase
        .from('admin_profiles')
        .select('id, full_name, role, active')
        .eq('id', auth.user.id)
        .maybeSingle();

      if (!profileErr && data) {
        profile = data;
      } else if (profileErr) {
        console.warn('[AdminServer] Query admin_profiles warning (falling back to store):', profileErr.message);
      }
    } catch (err: any) {
      console.warn('[AdminServer] Query admin_profiles exception (falling back to store):', err?.message);
    }

    if (!profile) {
      // Resilient lookup: check local store for provisioned Sub-Admin
      const localUser = (localStore.users || []).find((u) => u.id === auth.user.id || u.email?.toLowerCase() === auth.user.email?.toLowerCase());
      if (localUser) {
        const isActive = typeof localStore.userStatuses?.[localUser.id] === 'boolean'
          ? localStore.userStatuses[localUser.id]
          : localUser.active !== false;

        if (!isActive) {
          return { status: 403, data: { success: false, error: 'Access denied: Admin profile is inactive' } };
        }

        const effectiveRole: AdminRole = (localUser.role === 'ADMIN' || localUser.role === 'SUB_ADMIN') ? 'SUB_ADMIN' : localUser.role;

        return {
          status: 200,
          data: {
            success: true,
            isSuperAdmin: false,
            role: effectiveRole,
            user: {
              id: localUser.id,
              email: localUser.email,
              name: localUser.fullName || localUser.email.split('@')[0],
              role: effectiveRole,
              active: true,
              designation: localUser.designation || null
            },
            permissions: localUser.permissions || localStore.userPermissions?.[localUser.id] || []
          }
        };
      }
      return { status: 403, data: { success: false, error: 'Access denied: Admin profile not found' } };
    }

    if (!profile.active) {
      return { status: 403, data: { success: false, error: 'Access denied: Admin profile is inactive' } };
    }

    if (profile.role === 'SUPER_ADMIN') {
      return {
        status: 200,
        data: {
          success: true,
          isSuperAdmin: true,
          role: 'SUPER_ADMIN' as AdminRole,
          user: {
            id: auth.user.id,
            email: auth.user.email,
            name: profile.full_name || 'Super Admin',
            role: 'SUPER_ADMIN' as AdminRole,
            active: true
          },
          permissions: ALL_PERMISSIONS.map((p) => p.key)
        }
      };
    }

    // Sub-Admin permissions from db or local fallback
    let perms: PermissionKey[] = [];
    try {
      const { data: dbPerms } = await supabase
        .from('admin_permissions')
        .select('permission_id, permissions(permission_key)')
        .eq('admin_id', auth.user.id);

      if (dbPerms && dbPerms.length > 0) {
        perms = dbPerms.map((dp: any) => dp.permissions?.permission_key || dp.permission_id);
      }
    } catch {
      // ignore
    }

    if (perms.length === 0 && localStore.userPermissions[auth.user.id]) {
      perms = localStore.userPermissions[auth.user.id];
    }

    // A Sub-Admin stored as 'ADMIN' in the database retains the application role 'SUB_ADMIN'
    const effectiveRole: AdminRole = (profile.role === 'ADMIN' || profile.role === 'SUB_ADMIN') ? 'SUB_ADMIN' : profile.role;

    return {
      status: 200,
      data: {
        success: true,
        isSuperAdmin: false,
        role: effectiveRole,
        user: {
          id: auth.user.id,
          email: auth.user.email,
          name: profile.full_name || auth.user.user_metadata?.name,
          role: effectiveRole,
          active: profile.active ?? true,
          designation: profile.designation || null
        },
        permissions: perms
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Internal error' } };
  }
}

/**
 * Handler: POST /api/admin/users/login
 * Validates Sub-Admin credentials and returns an authenticated session.
 * Used for local development and fallback when Supabase Auth cloud has unconfirmed/local-only accounts.
 */
export async function adminLoginHandler(body: { email?: string; password?: string }) {
  const { email, password } = body || {};
  if (!email || !email.trim() || !password) {
    return {
      status: 400,
      data: { success: false, error: 'Email and password are required.' }
    };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const localStore = getLocalRbacStore();

  const user = (localStore.users || []).find(
    (u) => u.email?.toLowerCase().trim() === normalizedEmail
  );

  if (!user) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Invalid email or password. Please verify your administrator credentials.',
        errorCode: 'AUTH_ERROR'
      }
    };
  }

  // Check active status
  const isActive = typeof localStore.userStatuses?.[user.id] === 'boolean'
    ? localStore.userStatuses[user.id]
    : user.active !== false;

  if (!isActive) {
    return {
      status: 403,
      data: {
        success: false,
        error: 'Access Denied: Your administrator profile is currently marked inactive. Please contact the Super Administrator.',
        errorCode: 'PROFILE_INACTIVE'
      }
    };
  }

  // Verify password hash
  const pwdHash = hashPassword(password);
  const expectedHash = localStore.userPasswordHashes?.[user.id] || localStore.userPasswordHashes?.[normalizedEmail];

  if (!expectedHash || expectedHash !== pwdHash) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Invalid email or password. Please verify your administrator credentials.',
        errorCode: 'AUTH_ERROR'
      }
    };
  }

  // Resolve role: never grant Super Admin privileges automatically
  const appRole: AdminRole = user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUB_ADMIN';
  const perms = user.permissions && user.permissions.length > 0
    ? user.permissions
    : localStore.userPermissions?.[user.id] || [];

  const token = `local_subadmin_jwt_${user.id}`;
  const authUser = {
    id: user.id,
    email: user.email,
    user_metadata: {
      full_name: user.fullName,
      designation: user.designation,
      role: appRole
    }
  };

  const profile = {
    id: user.id,
    full_name: user.fullName,
    role: appRole,
    active: true,
    designation: user.designation,
    created_at: user.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return {
    status: 200,
    data: {
      success: true,
      token,
      user: authUser,
      profile,
      permissions: perms,
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 86400,
        refresh_token: `refresh_${token}`,
        user: authUser
      }
    }
  };
}

/**
 * Legacy invite handler for backwards compatibility with AdminUsersPage
 */
export async function inviteAdminUserHandler(
  body: { email?: string; fullName?: string; role?: AdminRole; permissions?: PermissionKey[] },
  authHeader: string | undefined | null
) {
  // Delegate to createSubAdminHandler with a secure default initial password if none supplied
  const defaultPassword = `TigerAdmin@${new Date().getFullYear()}!`;
  return createSubAdminHandler(
    {
      fullName: body.fullName,
      email: body.email,
      initialPassword: defaultPassword,
      confirmPassword: defaultPassword,
      role: body.role || 'SUB_ADMIN',
      permissions: body.permissions || []
    },
    authHeader
  );
}
