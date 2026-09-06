// ==============================================================================
// File: src/components/admin/AdminProtectedRoute.tsx
// Description: Multi-tier Route Protection Guard for Admin Panel
// Hierarchy: Check Supabase Auth -> Check admin_profiles -> Verify active === true
// ==============================================================================

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminProtectedRoute: React.FC = () => {
  const { user, profile, isAdmin, loading, signOut } = useAdminAuth();
  const location = useLocation();

  // 1. Loading state while checking Supabase session & admin_profiles
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0F19',
          color: '#E2E8F0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <Loader2
          size={36}
          style={{
            color: '#F59E0B',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}
        />
        <p style={{ fontSize: '0.95rem', color: '#94A3B8', letterSpacing: '0.05em' }}>
          VERIFYING ADMIN CREDENTIALS...
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. If unauthenticated in Supabase Auth -> redirect to /admin/login
  if (!user) {
    return <Navigate to={ADMIN_ROUTES.login} state={{ from: location }} replace />;
  }

  // 3. If authenticated but not an authorized/active administrator -> DENY ACCESS
  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1B38',
          color: '#FCFBFB',
          fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(237, 166, 163, 0.15)',
            border: '1px solid #EDA6A3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            color: '#EDA6A3'
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#FCFBFB',
            margin: '0 0 0.5rem 0'
          }}
        >
          Access Denied — Unauthorized Profile
        </h1>

        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(252, 251, 251, 0.75)',
            maxWidth: '500px',
            lineHeight: 1.6,
            margin: '0 0 1rem 0'
          }}
        >
          You are authenticated as{' '}
          <strong style={{ color: '#F7D794' }}>{user.email}</strong>, but your account
          does not possess an active administrator profile ({profile?.role || 'NO_ROLE'}, active:{' '}
          {profile?.active ? 'true' : 'false'}).
        </p>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'rgba(252, 251, 251, 0.5)',
            maxWidth: '460px',
            margin: '0 0 2rem 0'
          }}
        >
          Internal admin routes are strictly guarded. Contact the Super Administrator if
          you believe your permissions should be elevated.
        </p>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            window.location.href = ADMIN_ROUTES.login;
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#F7D794',
            color: '#192A56',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
          <span>Sign Out & Switch Account</span>
        </button>
      </div>
    );
  }

  // 4. Authorized -> Render protected AdminLayout and child routes
  return <Outlet />;
};
