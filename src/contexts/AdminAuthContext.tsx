// ==============================================================================
// File: src/contexts/AdminAuthContext.tsx
// Description: Authentication & Authorization Context for A TIGER GLOBAL Admin Panel
// Features: Supabase Auth integration, multi-stage loading, discrete error
//           discrimination (CONFIG, AUTH, PROFILE_MISSING, PROFILE_INACTIVE, RLS),
//           and session persistence.
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseDiagnostics } from '../lib/supabaseClient';
import type { AdminProfileRow, AdminRole } from '../types/database';
import { getAuthRedirectUrl } from '../utils/authRedirect';
import { ALL_PERMISSIONS, normalizePermissionKey, normalizePermissionKeys, type PermissionKey, type ModuleKey } from '../types/rbac';

export type AdminAuthErrorCode =
  | 'CONFIG_ERROR'
  | 'AUTH_ERROR'
  | 'PROFILE_MISSING'
  | 'PROFILE_INACTIVE'
  | 'ROLE_UNAUTHORIZED'
  | 'RLS_ERROR'
  | 'SESSION_ERROR'
  | 'NETWORK_ERROR';

export type AdminAuthState =
  | 'AUTH_LOADING'
  | 'NOT_AUTHENTICATED'
  | 'AUTHENTICATED_NON_ADMIN'
  | 'AUTHENTICATED_INACTIVE_ADMIN'
  | 'AUTHORIZED_ADMIN';

export interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfileRow | null;
  role: AdminRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
  isJoiningOperator: boolean;
  permissions: PermissionKey[];
  hasPermission: (key: PermissionKey | string) => boolean;
  hasAnyPermission: (keys: (PermissionKey | string)[]) => boolean;
  hasModuleAccess: (moduleName: ModuleKey | string) => boolean;
  adminState: AdminAuthState;
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  permissionsLoading: boolean;
  error: string | null;
  errorCode: AdminAuthErrorCode | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: AdminAuthErrorCode }>;
  sendSignInLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ALLOWED_ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'SUB_ADMIN',
  'ADMIN',
  'COORDINATOR',
  'DOCUMENT_VERIFIER',
  'ACCOUNTANT',
  'FINANCE',
  'REGULAR_JOINING_OPERATOR'
];

interface ProfileFetchResult {
  profile: AdminProfileRow | null;
  error?: { message: string; code?: string };
}

interface AuthorizationResult {
  authorized: boolean;
  profile: AdminProfileRow | null;
  errorCode?: AdminAuthErrorCode;
  errorReason?: string;
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AdminAuthErrorCode | null>(null);

  // Fetch admin profile for a given user ID with detailed error tracking and transient retry
  const fetchAdminProfile = useCallback(async (userId: string): Promise<ProfileFetchResult> => {
    try {
      const { data, error: queryError } = await supabase
        .from('admin_profiles')
        .select('id, full_name, role, active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (!queryError) {
        return { profile: data as AdminProfileRow | null };
      }

      // If initial attempt failed, perform a brief fallback retry (500ms) for transient connection/token latency
      console.warn('[AdminAuth] Retrying admin profile fetch after initial failure:', queryError.message);
      await new Promise((res) => setTimeout(res, 500));

      const { data: retryData, error: retryError } = await supabase
        .from('admin_profiles')
        .select('id, full_name, role, active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (retryError) {
        console.error('[AdminAuth] Error querying admin_profiles after retry:', retryError.message, retryError.code);
        return { profile: null, error: { message: retryError.message, code: retryError.code } };
      }

      return { profile: retryData as AdminProfileRow | null };
    } catch (err: any) {
      console.error('[AdminAuth] Unexpected error querying admin_profiles:', err);
      return { profile: null, error: { message: err?.message || 'Unexpected query error' } };
    }
  }, []);

  // Check and authorize user against admin_profiles with exact failure discrimination
  const authorizeUser = useCallback(async (currentUser: User | null, sessionToken?: string | null): Promise<AuthorizationResult> => {
    if (!currentUser) {
      setProfile(null);
      setPermissions([]);
      setProfileLoading(false);
      setPermissionsLoading(false);
      return { authorized: false, profile: null };
    }

    setProfileLoading(true);
    setPermissionsLoading(true);

    try {
      const { profile: adminProfile, error: queryError } = await fetchAdminProfile(currentUser.id);

      let resolvedProfile: AdminProfileRow | null = adminProfile;
      let userPermissions: PermissionKey[] = [];

      // Determine authorization token to query server permissions endpoint
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('tiger_admin_token') : null;
      let authToken = sessionToken || localToken;
      if (!authToken) {
        try {
          const { data: { session: curSession } } = await supabase.auth.getSession();
          authToken = curSession?.access_token || null;
        } catch {}
      }

      // Always query server endpoint /api/admin/users/me/permissions to ensure complete synchronization:
      // - Associates Gmail auth user with sub-admin record if IDs differ
      // - Returns normalized permissions from database and local fallback
      // - Resolves profile if missing from client-side direct table query
      if (authToken) {
        try {
          const res = await fetch('/api/admin/users/me/permissions', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            }
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              if (json.user && !resolvedProfile) {
                resolvedProfile = {
                  id: json.user.id,
                  full_name: json.user.name || json.user.fullName || null,
                  role: json.user.role === 'ADMIN' ? 'SUB_ADMIN' : json.user.role,
                  active: json.user.active ?? true,
                  designation: json.user.designation || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
              }
              if (Array.isArray(json.permissions) && json.permissions.length > 0) {
                userPermissions = normalizePermissionKeys(json.permissions);
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[AdminAuth] Server permissions endpoint error:', fetchErr);
        }
      }

      if (!resolvedProfile) {
        if (queryError) {
          console.error('[AdminAuth] RLS or query error during authorization:', queryError);
          setProfile(null);
          setPermissions([]);
          return {
            authorized: false,
            profile: null,
            errorCode: 'RLS_ERROR',
            errorReason: `Database Error: Unable to query admin profile (${queryError.message}). Check RLS policies.`
          };
        }

        console.warn(`[AdminAuth] Access Denied: User (${currentUser.id}) has no record in public.admin_profiles.`);
        setProfile(null);
        setPermissions([]);
        return {
          authorized: false,
          profile: null,
          errorCode: 'PROFILE_MISSING',
          errorReason: 'Access Denied: Your account is authenticated, but no administrator profile was found in the database.'
        };
      }

      if (!resolvedProfile.active) {
        console.warn(`[AdminAuth] Access Denied: Admin profile (${resolvedProfile.id}) is inactive.`);
        setProfile(null);
        setPermissions([]);
        return {
          authorized: false,
          profile: null,
          errorCode: 'PROFILE_INACTIVE',
          errorReason: 'Access Denied: Your administrator profile is currently marked inactive. Please contact the Super Administrator.'
        };
      }

      const normalizedRole = ((resolvedProfile.role || '').toUpperCase()) as AdminRole;
      if (ALLOWED_ADMIN_ROLES.includes(normalizedRole)) {
        resolvedProfile.role = normalizedRole === 'ADMIN' ? 'SUB_ADMIN' : normalizedRole;
      }

      if (!ALLOWED_ADMIN_ROLES.includes(resolvedProfile.role)) {
        console.warn(`[AdminAuth] Access Denied: Role '${resolvedProfile.role}' is not permitted.`);
        setProfile(null);
        setPermissions([]);
        return {
          authorized: false,
          profile: null,
          errorCode: 'ROLE_UNAUTHORIZED',
          errorReason: `Access Denied: Your role (${resolvedProfile.role}) does not have administrative dashboard access permissions.`
        };
      }

      // If Super Admin, grant all permissions
      if (resolvedProfile.role === 'SUPER_ADMIN') {
        userPermissions = ALL_PERMISSIONS.map((p) => p.key);
      } else {
        // If userPermissions still empty, check cached permissions
        if (userPermissions.length === 0 && typeof window !== 'undefined') {
          const cached = localStorage.getItem('tiger_admin_permissions');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                userPermissions = normalizePermissionKeys(parsed);
              }
            } catch {}
          }
        }

        // Standard role fallback defaults if no explicit permissions in database
        if (userPermissions.length === 0) {
          if (resolvedProfile.role === 'REGULAR_JOINING_OPERATOR') {
            userPermissions = [
              'dashboard.view',
              'regular_joining.view',
              'regular_joining.submissions',
              'regular_joining.candidate_details',
              'regular_joining.edit',
              'regular_joining.verify',
              'regular_joining.generate_slip',
              'regular_joining.generate_id_card',
              'regular_joining.download_docs',
              'regular_joining.export_excel'
            ];
          } else if (resolvedProfile.role === 'DOCUMENT_VERIFIER') {
            userPermissions = [
              'dashboard.view',
              'regular_joining.view',
              'regular_joining.submissions',
              'regular_joining.candidate_details',
              'regular_joining.verify',
              'documents.view',
              'documents.download'
            ];
          }
        }
      }

      // Persist latest verified permissions to client storage cache for resilient offline/reload access
      if (typeof window !== 'undefined' && userPermissions.length > 0) {
        localStorage.setItem('tiger_admin_permissions', JSON.stringify(userPermissions));
      }

      setProfile(resolvedProfile);
      setPermissions(userPermissions);

      return { authorized: true, profile: resolvedProfile };
    } finally {
      setProfileLoading(false);
      setPermissionsLoading(false);
    }
  }, [fetchAdminProfile]);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setAuthLoading(true);

        if (!isSupabaseConfigured) {
          console.warn('[AdminAuth] Supabase client is not configured with valid credentials.');
          if (mounted) {
            setAuthLoading(false);
          }
          return;
        }

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AdminAuth] Session retrieval error:', sessionError.message);
        }

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          setProfileLoading(true);
          setPermissionsLoading(true);
          const authResult = await authorizeUser(initialSession.user, initialSession.access_token);
          if (mounted) {
            setProfile(authResult.profile);
            setProfileLoading(false);
            setPermissionsLoading(false);
          }
        } else if (mounted) {
          // Check for restored local admin session
          const localToken = typeof window !== 'undefined' ? localStorage.getItem('tiger_admin_token') : null;
          if (localToken) {
            try {
              const res = await fetch('/api/admin/users/me/permissions', {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localToken}`
                }
              });
              if (res.ok) {
                const json = await res.json();
                if (json.success && json.user) {
                  const restoredProfile: AdminProfileRow = {
                    id: json.user.id,
                    full_name: json.user.name || json.user.fullName || null,
                    role: json.user.role === 'ADMIN' ? 'SUB_ADMIN' : json.user.role,
                    active: json.user.active ?? true,
                    designation: json.user.designation || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };

                  const restoredUser: User = {
                    id: json.user.id,
                    app_metadata: {},
                    user_metadata: { name: json.user.name },
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                    email: json.user.email
                  };

                  const restoredSession: Session = {
                    access_token: localToken,
                    token_type: 'bearer',
                    expires_in: 86400,
                    expires_at: Math.floor(Date.now() / 1000) + 86400,
                    refresh_token: 'local_subadmin_refresh_token',
                    user: restoredUser
                  };

                  if (!restoredProfile.active) {
                    setError('Access Denied: Your administrator profile is currently marked inactive. Please contact the Super Administrator.');
                    setErrorCode('PROFILE_INACTIVE');
                    setProfile(null);
                    setUser(null);
                    setSession(null);
                    setPermissions([]);
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('tiger_admin_token');
                      localStorage.removeItem('tiger_admin_user');
                      localStorage.removeItem('tiger_admin_profile');
                      localStorage.removeItem('tiger_admin_permissions');
                    }
                  } else {
                    setUser(restoredUser);
                    setSession(restoredSession);
                    setProfile(restoredProfile);
                    setPermissions(normalizePermissionKeys(json.permissions || []));
                  }
                } else {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('tiger_admin_token');
                    localStorage.removeItem('tiger_admin_user');
                    localStorage.removeItem('tiger_admin_profile');
                    localStorage.removeItem('tiger_admin_permissions');
                  }
                }
              }
            } catch (restoreErr) {
              console.warn('[AdminAuth] Local session restoration error:', restoreErr);
            }
          }
        }
      } catch (err) {
        console.error('[AdminAuth] Initialization error:', err);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        // If local token exists, don't clear on unrelated Supabase SIGNED_OUT
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('tiger_admin_token') : null;
        if (!localToken) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
          setAuthLoading(false);
        }
        return;
      }

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        setProfileLoading(true);
        setPermissionsLoading(true);
        const authResult = await authorizeUser(newSession.user, newSession.access_token);
        if (mounted) {
          setProfile(authResult.profile);
          setProfileLoading(false);
          setPermissionsLoading(false);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authorizeUser]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; errorCode?: AdminAuthErrorCode }> => {
    setError(null);
    setErrorCode(null);

    // 1. Check client configuration
    if (!isSupabaseConfigured) {
      const configMsg =
        'Supabase configuration is missing from the production environment. ' +
        'Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) ' +
        'are configured in your Vercel Project Settings and trigger a redeploy.';
      setError(configMsg);
      setErrorCode('CONFIG_ERROR');
      return { success: false, error: configMsg, errorCode: 'CONFIG_ERROR' };
    }

    setAuthLoading(true);

    try {
      // 2. Perform Supabase authentication
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (signInError) {
        // Fallback: Check backend admin login endpoint (/api/admin/users/login)
        try {
          const res = await fetch('/api/admin/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password })
          });
          if (res.ok) {
            const result = await res.json();
            if (result.success && result.session && result.user) {
              const localSession = result.session;
              const localUser = result.user;
              const localProfile = result.profile;
              const localPermissions = result.permissions || [];

              if (typeof window !== 'undefined') {
                localStorage.setItem('tiger_admin_token', localSession.access_token);
                localStorage.setItem('tiger_admin_user', JSON.stringify(localUser));
                localStorage.setItem('tiger_admin_profile', JSON.stringify(localProfile));
                localStorage.setItem('tiger_admin_permissions', JSON.stringify(localPermissions));
              }

              setUser(localUser);
              setSession(localSession);
              setProfile(localProfile);
              setPermissions(localPermissions);
              setAuthLoading(false);
              setProfileLoading(false);
              setError(null);
              setErrorCode(null);
              return { success: true };
            } else if (result.error && result.error.toLowerCase().includes('inactive')) {
              setError(result.error);
              setErrorCode('PROFILE_INACTIVE');
              setAuthLoading(false);
              return { success: false, error: result.error, errorCode: 'PROFILE_INACTIVE' };
            }
          }
        } catch (fallbackErr) {
          console.warn('[AdminAuth] Server admin login fallback error:', fallbackErr);
        }

        let userMessage = signInError.message;
        let code: AdminAuthErrorCode = 'AUTH_ERROR';

        if (signInError.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please verify your administrator credentials.';
        } else if (signInError.message.includes('Email not confirmed')) {
          userMessage = 'Email address has not been confirmed. Please confirm your account email in Supabase.';
        } else if (signInError.message.includes('Failed to fetch') || signInError.message.includes('NetworkError')) {
          userMessage = `Unable to connect to Supabase host (${supabaseDiagnostics.urlHost}). Please verify network connectivity and VITE_SUPABASE_URL.`;
          code = 'NETWORK_ERROR';
        }

        setError(userMessage);
        setErrorCode(code);
        setAuthLoading(false);
        return { success: false, error: userMessage, errorCode: code };
      }

      if (!data.user || !data.session) {
        const msg = 'Authentication failed: No active session returned by auth server.';
        setError(msg);
        setErrorCode('SESSION_ERROR');
        setAuthLoading(false);
        return { success: false, error: msg, errorCode: 'SESSION_ERROR' };
      }

      // 3. Verify session was established in client storage
      const { data: verifiedSession } = await supabase.auth.getSession();
      const currentSession = verifiedSession?.session || data.session;

      // 4. Verify admin profile authorization
      setProfileLoading(true);
      setPermissionsLoading(true);
      const authResult = await authorizeUser(data.user, currentSession?.access_token);

      if (!authResult.authorized || !authResult.profile) {
        // Revoke session if unauthorized
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setPermissions([]);
        setProfileLoading(false);
        setPermissionsLoading(false);
        setAuthLoading(false);

        const deniedMsg = authResult.errorReason || 'Invalid administrator credentials or unauthorized account.';
        const code = authResult.errorCode || 'PROFILE_MISSING';
        setError(deniedMsg);
        setErrorCode(code);
        return { success: false, error: deniedMsg, errorCode: code };
      }

      // 5. Success: Commit authenticated admin state
      setUser(data.user);
      setSession(currentSession);
      setProfile(authResult.profile);
      setProfileLoading(false);
      setAuthLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      const isNetwork = rawMsg.includes('fetch') || rawMsg.includes('Network');
      const errorMsg = isNetwork
        ? `Network connection error: Unable to communicate with Supabase (${supabaseDiagnostics.urlHost}).`
        : 'Authentication failed. Please check your credentials.';
      const code: AdminAuthErrorCode = isNetwork ? 'NETWORK_ERROR' : 'AUTH_ERROR';

      setError(errorMsg);
      setErrorCode(code);
      setAuthLoading(false);
      setProfileLoading(false);
      return { success: false, error: errorMsg, errorCode: code };
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tiger_admin_token');
        localStorage.removeItem('tiger_admin_user');
        localStorage.removeItem('tiger_admin_profile');
        localStorage.removeItem('tiger_admin_permissions');
      }
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setPermissions([]);
      setError(null);
      setErrorCode(null);
      setProfileLoading(false);
      setPermissionsLoading(false);
      setAuthLoading(false);
    }
  };

  const sendSignInLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      const configMsg =
        'Supabase configuration error: Environment variables missing. ' +
        'Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.';
      setError(configMsg);
      setErrorCode('CONFIG_ERROR');
      return { success: false, error: configMsg };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      let redirectUrl: string | undefined;
      try {
        redirectUrl = getAuthRedirectUrl('/admin');
      } catch {
        redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=%2Fadmin` : undefined;
      }

      // shouldCreateUser: false ensures only accounts created by Super Admin in the Admin Directory can receive sign-in links
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false
        }
      });

      if (magicLinkError) {
        let userMessage = magicLinkError.message;
        if (
          magicLinkError.message.toLowerCase().includes('signups not allowed') ||
          magicLinkError.message.toLowerCase().includes('user not found')
        ) {
          userMessage = 'Access denied: No authorized employee or administrator account exists for this email.';
        }
        setError(userMessage);
        return { success: false, error: userMessage };
      }

      setError(null);
      setErrorCode(null);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send sign-in link.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      setProfileLoading(true);
      setPermissionsLoading(true);
      const authResult = await authorizeUser(user, session?.access_token);
      setProfile(authResult.profile);
      setProfileLoading(false);
      setPermissionsLoading(false);
    }
  };

  // Compute discrete 5-stage authorization state
  const adminState = useMemo<AdminAuthState>(() => {
    if (authLoading || (Boolean(user) && (profileLoading || permissionsLoading))) {
      return 'AUTH_LOADING';
    }
    if (!user) {
      return 'NOT_AUTHENTICATED';
    }
    if (!profile) {
      return 'AUTHENTICATED_NON_ADMIN';
    }
    if (!profile.active) {
      return 'AUTHENTICATED_INACTIVE_ADMIN';
    }
    const currentRole = ((profile.role || '').toUpperCase()) as AdminRole;
    if (!ALLOWED_ADMIN_ROLES.includes(currentRole)) {
      return 'AUTHENTICATED_NON_ADMIN';
    }
    return 'AUTHORIZED_ADMIN';
  }, [authLoading, user, profileLoading, permissionsLoading, profile]);

  const isAdmin = useMemo(() => {
    return adminState === 'AUTHORIZED_ADMIN';
  }, [adminState]);

  const currentRole = useMemo<AdminRole | null>(() => {
    if (!profile?.role) return null;
    const r = ((profile.role || '').toUpperCase()) as AdminRole;
    if (r === 'ADMIN') return 'SUB_ADMIN';
    return r;
  }, [profile]);

  const isSuperAdmin = useMemo(() => currentRole === 'SUPER_ADMIN', [currentRole]);
  const isSubAdmin = useMemo(() => currentRole === 'SUB_ADMIN', [currentRole]);
  const isJoiningOperator = useMemo(() => currentRole === 'REGULAR_JOINING_OPERATOR', [currentRole]);

  // Overall loading state is true only while authorization is still resolving
  const loading = useMemo(() => {
    return adminState === 'AUTH_LOADING';
  }, [adminState]);

  // Granular RBAC Check Helpers
  const hasPermission = useCallback((key: PermissionKey | string): boolean => {
    if (isSuperAdmin) return true;
    if (!profile?.active) return false;
    const targetKey = normalizePermissionKey(key);
    return permissions.some((p) => normalizePermissionKey(p) === targetKey);
  }, [isSuperAdmin, profile, permissions]);

  const hasAnyPermission = useCallback((keys: (PermissionKey | string)[]): boolean => {
    if (isSuperAdmin) return true;
    if (!profile?.active) return false;
    return keys.some((k) => hasPermission(k));
  }, [isSuperAdmin, profile, hasPermission]);

  const hasModuleAccess = useCallback((moduleName: ModuleKey | string): boolean => {
    if (isSuperAdmin) return true;
    if (!profile?.active) return false;
    const cleanMod = moduleName.toLowerCase().trim();
    // Find all permissions under this module
    const modulePerms = ALL_PERMISSIONS.filter(
      (p) => p.module.toLowerCase() === cleanMod
    );
    if (modulePerms.length === 0) {
      // Fallback: key prefix check
      const prefix = cleanMod.replace(/\s+/g, '_');
      return permissions.some((k) => {
        const norm = normalizePermissionKey(k);
        return norm.startsWith(prefix);
      });
    }
    return modulePerms.some((p) => hasPermission(p.key));
  }, [isSuperAdmin, profile, permissions, hasPermission]);

  const value = useMemo<AdminAuthContextType>(() => ({
    user,
    session,
    profile,
    role: currentRole,
    isAdmin,
    isSuperAdmin,
    isSubAdmin,
    isJoiningOperator,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasModuleAccess,
    adminState,
    loading,
    authLoading,
    profileLoading,
    permissionsLoading,
    error,
    errorCode,
    signIn,
    sendSignInLink,
    signOut,
    refreshProfile
  }), [
    user,
    session,
    profile,
    currentRole,
    isAdmin,
    isSuperAdmin,
    isSubAdmin,
    isJoiningOperator,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasModuleAccess,
    adminState,
    loading,
    authLoading,
    profileLoading,
    permissionsLoading,
    error,
    errorCode,
    signIn,
    sendSignInLink,
    fetchAdminProfile,
    authorizeUser
  ]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
