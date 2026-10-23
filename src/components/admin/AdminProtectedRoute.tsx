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
  const { adminState, user, signOut, role, isJoiningOperator, isSuperAdmin, hasPermission } = useAdminAuth();
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

  // 5. Authorized Admin / Operator / Sub-Admin Check
  if (adminState === 'AUTHORIZED_ADMIN') {
    const isOperator = isJoiningOperator || role === 'REGULAR_JOINING_OPERATOR';
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/admin';

    // A. Operators logic (Restricted to Joining Forms)
    if (isOperator) {
      if (cleanPath === '/admin') {
        return <Navigate to={ADMIN_ROUTES.regularJoiningList} replace />;
      }

      const isAllowed =
        cleanPath === '/admin/regular-joining' ||
        cleanPath.startsWith('/admin/regular-joining/') ||
        cleanPath === '/admin/regular-joining-list' ||
        (cleanPath.startsWith('/admin/joining/') && cleanPath !== '/admin/joining');

      if (!isAllowed) {
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
                backgroundColor: 'rgba(247, 215, 148, 0.15)',
                border: '1px solid #F7D794',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                color: '#F7D794'
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
              Access Restricted — Joining Workflow Only
            </h1>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(252, 251, 251, 0.8)',
                maxWidth: '520px',
                lineHeight: 1.6,
                margin: '0 0 1rem 0'
              }}
            >
              Your account ({user?.email || 'operator'}) is authorized as a <strong>Regular Joining Operator</strong>. You have permissions restricted exclusively to the candidate Regular Joining Form workflow, submission register, and document generation.
            </p>

            <p
              style={{
                fontSize: '0.8rem',
                color: 'rgba(252, 251, 251, 0.55)',
                maxWidth: '480px',
                margin: '0 0 2rem 0'
              }}
            >
              Administrative modules (Dashboard, Applications, Enquiries, Financials, Directory, Settings) are strictly protected.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  window.location.href = ADMIN_ROUTES.regularJoiningList;
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
                <span>Return to Joining Submissions</span>
              </button>

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
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FCFBFB',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        );
      }
    }

    // B. Sub-Admin & Non-Super-Admin Granular RBAC Route Verification
    if (!isSuperAdmin) {
      // Find fallback accessible landing route if user visits /admin without dashboard.view
      const getAccessibleLandingRoute = (): string | null => {
        if (hasPermission('dashboard.view')) {
          return ADMIN_ROUTES.dashboard;
        }
        if (
          hasPermission('regular_joining.submissions') ||
          hasPermission('regular_joining.view') ||
          hasPermission('regular_joining.verify') ||
          hasPermission('regular_joining.candidate_details') ||
          hasPermission('regular_joining.generate_slip') ||
          hasPermission('regular_joining.generate_id_card') ||
          hasPermission('regular_joining.download_docs') ||
          hasPermission('regular_joining.export_excel') ||
          hasPermission('regular_joining.edit')
        ) {
          if (hasPermission('regular_joining.submissions')) {
            return ADMIN_ROUTES.regularJoiningList;
          }
          if (hasPermission('regular_joining.view')) {
            return ADMIN_ROUTES.regularJoining;
          }
          return ADMIN_ROUTES.regularJoiningList;
        }
        if (hasPermission('employees.view')) {
          return ADMIN_ROUTES.employees;
        }
        if (hasPermission('documents.view')) {
          return ADMIN_ROUTES.documents;
        }
        if (hasPermission('reports.view') || hasPermission('reports.export')) {
          return ADMIN_ROUTES.exports;
        }
        if (hasPermission('website.view')) {
          return ADMIN_ROUTES.jobs;
        }
        if (hasPermission('settings.view')) {
          return ADMIN_ROUTES.settings;
        }
        if (hasPermission('admin_management.view')) {
          return ADMIN_ROUTES.adminUsers;
        }
        return null;
      };

      if (cleanPath === '/admin' && !hasPermission('dashboard.view')) {
        const landing = getAccessibleLandingRoute();
        if (landing) {
          return <Navigate to={landing} replace />;
        }
      }

      // Check required permission by path
      let requiredPerm: string | null = null;
      let moduleName = 'This Section';

      if (cleanPath === '/admin') {
        requiredPerm = 'dashboard.view';
        moduleName = 'Dashboard Overview';
      } else if (cleanPath === '/admin/admin-users' || cleanPath === '/admin/sub-admins' || cleanPath === '/admin/admin-management') {
        requiredPerm = 'admin_management.view';
        moduleName = 'Admin Management';
      } else if (cleanPath === '/admin/regular-joining-list') {
        requiredPerm = 'regular_joining.submissions';
        moduleName = 'Regular Joining Submissions';
      } else if (cleanPath === '/admin/regular-joining' || cleanPath.startsWith('/admin/regular-joining/')) {
        requiredPerm = 'regular_joining.view';
        moduleName = 'Regular Joining Form';
      } else if (cleanPath === '/admin/joining' || cleanPath.startsWith('/admin/joining/')) {
        requiredPerm = 'regular_joining.submissions';
        moduleName = 'Joining Dossiers';
      } else if (cleanPath === '/admin/employees' || cleanPath.startsWith('/admin/employees/')) {
        requiredPerm = 'employees.view';
        moduleName = 'Employee Management';
      } else if (cleanPath === '/admin/documents' || cleanPath.startsWith('/admin/documents/')) {
        requiredPerm = 'documents.view';
        moduleName = 'Document Management';
      } else if (cleanPath === '/admin/exports') {
        requiredPerm = 'reports.view';
        moduleName = 'Reports and Exports';
      } else if (cleanPath === '/admin/reference-slips' || cleanPath.startsWith('/admin/reference-slips/')) {
        requiredPerm = 'regular_joining.generate_slip';
        moduleName = 'Reference Slips';
      } else if (cleanPath === '/admin/settings' || cleanPath === '/admin/joining-form-settings') {
        requiredPerm = 'settings.view';
        moduleName = 'System Settings';
      } else if (cleanPath === '/admin/jobs' || cleanPath === '/admin/companies' || cleanPath.startsWith('/admin/jobs/') || cleanPath.startsWith('/admin/companies/')) {
        requiredPerm = 'website.view';
        moduleName = 'Website and Content Management';
      } else if (cleanPath === '/admin/activity') {
        requiredPerm = 'admin_management.view';
        moduleName = 'Audit Activity Logs';
      }

      if (requiredPerm && !hasPermission(requiredPerm)) {
        const fallbackRoute = getAccessibleLandingRoute();
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
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                color: '#EF4444'
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
              Access Restricted — Insufficient Permissions
            </h1>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(252, 251, 251, 0.8)',
                maxWidth: '520px',
                lineHeight: 1.6,
                margin: '0 0 0.75rem 0'
              }}
            >
              Your Sub-Admin account ({user?.email}) does not possess the requisite authorization to access <strong>{moduleName}</strong>.
            </p>

            <p
              style={{
                fontSize: '0.8rem',
                color: '#F7D794',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(247, 215, 148, 0.1)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                marginBottom: '1.75rem'
              }}
            >
              Required Permission: {requiredPerm}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Boolean(fallbackRoute) && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = fallbackRoute!;
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
                  <span>Go to Authorized Workspace</span>
                </button>
              )}

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
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FCFBFB',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        );
      }
    }

    return <Outlet />;
  }

  // Fallback: Deny access
  return <Navigate to={ADMIN_ROUTES.login} replace />;
};
