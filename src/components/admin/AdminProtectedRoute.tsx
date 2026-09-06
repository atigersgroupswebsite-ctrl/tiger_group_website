// ==============================================================================
// File: src/components/admin/AdminProtectedRoute.tsx
// Description: Route Protection Guard for Admin Panel
// ==============================================================================

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Loader2 } from 'lucide-react';

export const AdminProtectedRoute: React.FC = () => {
  const { isAdmin, loading } = useAdminAuth();
  const location = useLocation();

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

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
