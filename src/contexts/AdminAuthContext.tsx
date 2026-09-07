// ==============================================================================
// File: src/contexts/AdminAuthContext.tsx
// Description: Authentication Context for A TIGER GLOBAL Admin Panel
// Features: Supabase Auth integration, admin_profiles authorization check,
//           session persistence, and role-based route protection.
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { AdminProfileRow, AdminRole } from '../types/database';

export interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfileRow | null;
  role: AdminRole | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ALLOWED_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT'];

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin profile for a given user ID
  const fetchAdminProfile = async (userId: string): Promise<AdminProfileRow | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[AdminAuth] Error fetching admin profile:', profileError.message);
        return null;
      }

      return data as AdminProfileRow | null;
    } catch (err) {
      console.error('[AdminAuth] Unexpected error fetching profile:', err);
      return null;
    }
  };

  // Check and authorize user against admin_profiles
  const authorizeUser = async (currentUser: User | null): Promise<AdminProfileRow | null> => {
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    const adminProfile = await fetchAdminProfile(currentUser.id);

    if (!adminProfile) {
      console.warn('[AdminAuth] Access denied: User has no admin_profiles record.');
      return null;
    }

    if (!adminProfile.active) {
      console.warn('[AdminAuth] Access denied: Admin profile is inactive.');
      return null;
    }

    if (!ALLOWED_ADMIN_ROLES.includes(adminProfile.role)) {
      console.warn(`[AdminAuth] Access denied: Role ${adminProfile.role} is not permitted for admin management.`);
      return null;
    }

    setProfile(adminProfile);
    return adminProfile;
  };

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AdminAuth] Session retrieval error:', sessionError.message);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          await authorizeUser(initialSession.user);
        }
      } catch (err) {
        console.error('[AdminAuth] Initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await authorizeUser(newSession.user);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return { success: false, error: signInError.message };
      }

      if (!data.user) {
        const msg = 'Authentication failed: No user returned.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Check admin profile authorization
      const adminProfile = await authorizeUser(data.user);

      if (!adminProfile) {
        // Revoke session immediately
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        const deniedMsg = 'Access Denied: You do not have an active administrator profile.';
        setError(deniedMsg);
        setLoading(false);
        return { success: false, error: deniedMsg };
      }

      setUser(data.user);
      setSession(data.session);
      setProfile(adminProfile);
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await authorizeUser(user);
    }
  };

  const isAdmin = useMemo(() => {
    return Boolean(profile && profile.active && ALLOWED_ADMIN_ROLES.includes(profile.role));
  }, [profile]);

  const value = useMemo<AdminAuthContextType>(() => ({
    user,
    session,
    profile,
    role: profile?.role ?? null,
    isAdmin,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile
  }), [user, session, profile, isAdmin, loading, error]);

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
