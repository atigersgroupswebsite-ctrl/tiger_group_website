// ==============================================================================
// File: src/pages/admin/AdminNotFoundPage.tsx
// Description: Admin 404 Fallback page rendered inside AdminLayout
// ==============================================================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminNotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DFD8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: '#192A56',
          boxShadow: '0 4px 12px rgba(25, 42, 86, 0.08)'
        }}
      >
        <FileQuestion size={36} color="#192A56" />
      </div>

      {/* 404 Label */}
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          color: '#8C6400',
          backgroundColor: '#FDF3DB',
          padding: '3px 10px',
          borderRadius: '4px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}
      >
        HTTP 404 — ROUTE NOT FOUND
      </div>

      <h1
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#192A56',
          letterSpacing: '-0.02em',
          margin: '0 0 0.5rem 0'
        }}
      >
        Admin Page Not Found
      </h1>

      <p
        style={{
          fontSize: '0.9rem',
          color: '#64748B',
          maxWidth: '460px',
          lineHeight: 1.6,
          margin: '0 0 1rem 0'
        }}
      >
        The internal administration path{' '}
        <code
          style={{
            backgroundColor: '#F1F5F9',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#192A56',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          {location.pathname}
        </code>{' '}
        does not match any registered administrative module.
      </p>

      <p
        style={{
          fontSize: '0.8rem',
          color: '#94A3B8',
          margin: '0 0 2rem 0'
        }}
      >
        All administrative routes remain isolated within the secure administration boundary.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-admin-secondary"
        >
          <ArrowLeft size={15} />
          <span>Go Back</span>
        </button>

        <Link to={ADMIN_ROUTES.dashboard} className="btn-admin-primary">
          <LayoutDashboard size={15} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
