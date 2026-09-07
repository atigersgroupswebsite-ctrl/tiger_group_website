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

export type AdminAuthErrorCode =
  | 'CONFIG_ERROR'
  | 'AUTH_ERROR'
  | 'PROFILE_MISSING'
  | 'PROFILE_INACTIVE'
  | 'ROLE_UNAUTHORIZED'
  | 'RLS_ERROR'
  | 'SESSION_ERROR'
  | 'NETWORK_ERROR';

export interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfileRow | null;
  role: AdminRole | null;
  isAdmin: boolean;
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  error: string | null;
  errorCode: AdminAuthErrorCode | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: AdminAuthErrorCode }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ALLOWED_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT'];

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
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AdminAuthErrorCode | null>(null);

  // Fetch admin profile for a given user ID with detailed error tracking and transient retry
  const fetchAdminProfile = useCallback(async (userId: string): Promise<ProfileFetchResult> => {
    try {
      const { data, error: queryError } = await supabase
        .from('admin_profiles')
        .select('*')
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
        .select('*')
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
  const authorizeUser = useCallback(async (currentUser: User | null): Promise<AuthorizationResult> => {
    if (!currentUser) {
      setProfile(null);
      return { authorized: false, profile: null };
    }

    const { profile: adminProfile, error: queryError } = await fetchAdminProfile(currentUser.id);

    if (queryError) {
      console.error('[AdminAuth] RLS or query error during authorization:', queryError);
      setProfile(null);
      return {
        authorized: false,
        profile: null,
        errorCode: 'RLS_ERROR',
        errorReason: `Database Error: Unable to query admin profile (${queryError.message}). Check RLS policies.`
      };
    }

    if (!adminProfile) {
      console.warn(`[AdminAuth] Access Denied: User (${currentUser.id}) has no record in public.admin_profiles.`);
      setProfile(null);
      return {
        authorized: false,
        profile: null,
        errorCode: 'PROFILE_MISSING',
        errorReason: 'Access Denied: Your account is authenticated, but no administrator profile was found in the database.'
      };
    }

    if (!adminProfile.active) {
      console.warn(`[AdminAuth] Access Denied: Admin profile (${adminProfile.id}) is inactive.`);
      setProfile(null);
      return {
        authorized: false,
        profile: null,
        errorCode: 'PROFILE_INACTIVE',
        errorReason: 'Access Denied: Your administrator profile is currently marked inactive. Please contact the Super Administrator.'
      };
    }

    if (!ALLOWED_ADMIN_ROLES.includes(adminProfile.role)) {
      console.warn(`[AdminAuth] Access Denied: Role '${adminProfile.role}' is not permitted.`);
      setProfile(null);
      return {
        authorized: false,
        profile: null,
        errorCode: 'ROLE_UNAUTHORIZED',
        errorReason: `Access Denied: Your role (${adminProfile.role}) does not have administrative dashboard access permissions.`
      };
    }

    setProfile(adminProfile);
    return { authorized: true, profile: adminProfile };
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
          if (mounted) {
            setAuthLoading(false);
          }
          return;
        }

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          setProfileLoading(true);
          const authResult = await authorizeUser(initialSession.user);
          if (mounted) {
            setProfile(authResult.profile);
            setProfileLoading(false);
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
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setAuthLoading(false);
        return;
      }

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        setProfileLoading(true);
        const authResult = await authorizeUser(newSession.user);
        if (mounted) {
          setProfile(authResult.profile);
          setProfileLoading(false);
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (signInError) {
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
      const authResult = await authorizeUser(data.user);

      if (!authResult.authorized || !authResult.profile) {
        // Revoke session if unauthorized
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setProfileLoading(false);
        setAuthLoading(false);

        const deniedMsg = authResult.errorReason || 'Access Denied: You do not have an active administrator profile.';
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
        : rawMsg;
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
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setError(null);
      setErrorCode(null);
      setProfileLoading(false);
      setAuthLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      setProfileLoading(true);
      const authResult = await authorizeUser(user);
      setProfile(authResult.profile);
      setProfileLoading(false);
    }
  };

  const isAdmin = useMemo(() => {
    return Boolean(profile && profile.active && ALLOWED_ADMIN_ROLES.includes(profile.role));
  }, [profile]);

  // Overall loading state is true if auth is loading, or if an authenticated user's profile is still being verified
  const loading = useMemo(() => {
    return authLoading || (Boolean(user) && profileLoading);
  }, [authLoading, user, profileLoading]);

  const value = useMemo<AdminAuthContextType>(() => ({
    user,
    session,
    profile,
    role: profile?.role ?? null,
    isAdmin,
    loading,
    authLoading,
    profileLoading,
    error,
    errorCode,
    signIn,
    signOut,
    refreshProfile
  }), [user, session, profile, isAdmin, loading, authLoading, profileLoading, error, errorCode, signIn, fetchAdminProfile, authorizeUser]);

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
