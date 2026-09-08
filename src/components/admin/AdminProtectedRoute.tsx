// ==============================================================================
// File: src/components/admin/AdminProtectedRoute.tsx
// Description: Multi-tier Route Protection Guard for Admin Panel
// Hierarchy:
//   1. Check if auth session is loading -> wait
//   2. Check if session exists -> if not, redirect to /admin/login
//   3. Check if admin profile is loading -> wait
//   4. Check if active admin verified -> if not, show Access Denied
//   5. Render protected admin routes
// ==============================================================================

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminProtectedRoute: React.FC = () => {
  const { adminState, user, signOut } = useAdminAuth();
  const location = useLocation();

  // 1. Loading state: wait while checking Supabase session and admin profile
  if (adminState === 'AUTH_LOADING') {
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
        <p style={{ fontSize: '0.95rem', color: '#94A3B8', letterSpacing: '0.05em', fontWeight: 600 }}>
          VERIFYING AUTHORIZATION...
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

  // 2. Unauthenticated -> redirect to /admin/login
  if (adminState === 'NOT_AUTHENTICATED') {
    return <Navigate to={ADMIN_ROUTES.login} state={{ from: location }} replace />;
  }

  // 3. Authenticated but Inactive Admin -> Explicit Denial Screen
  if (adminState === 'AUTHENTICATED_INACTIVE_ADMIN') {
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
          Access Denied — Account Inactive
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
          Your account is authenticated ({user?.email || 'authenticated user'}), but your administrator profile
          is currently marked inactive. Access to all administrative functionality is suspended.
        </p>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'rgba(252, 251, 251, 0.5)',
            maxWidth: '460px',
            margin: '0 0 2rem 0'
          }}
        >
          Please contact the Super Administrator to re-activate your administrator credentials.
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
          <span>Sign Out & Return</span>
        </button>
      </div>
    );
  }

  // 4. Authenticated Non-Admin -> Explicit Denial Screen
  if (adminState === 'AUTHENTICATED_NON_ADMIN') {
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
          Access Denied — Unauthorized User
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
          Your account ({user?.email || 'authenticated user'}) does not have administrator authorization.
          Access to this area requires an active administrative profile.
        </p>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'rgba(252, 251, 251, 0.5)',
            maxWidth: '460px',
            margin: '0 0 2rem 0'
          }}
        >
          Internal admin routes are strictly restricted to authorized Tiger Groups personnel.
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
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  // 5. Authorized Admin ONLY
  if (adminState === 'AUTHORIZED_ADMIN') {
    return <Outlet />;
  }

  // Fallback: Deny access
  return <Navigate to={ADMIN_ROUTES.login} replace />;
};
