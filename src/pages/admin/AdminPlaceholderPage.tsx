// ==============================================================================
// File: src/pages/admin/AdminPlaceholderPage.tsx
// Description: Branded placeholder for upcoming Stage 3 operational modules
// ==============================================================================

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft, Download, Clock } from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminPlaceholderPage: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname.replace('/admin/', '').toUpperCase().replace(/-/g, ' ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '55vh',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DFD8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          color: '#192A56',
          boxShadow: '0 4px 12px rgba(25, 42, 86, 0.08)'
        }}
      >
        <Construction size={32} />
      </div>

      {/* Status Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          fontWeight: 800,
          color: '#8C6400',
          backgroundColor: '#FDF3DB',
          padding: '3px 10px',
          borderRadius: '4px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}
      >
        <Clock size={12} />
        <span>Status: Coming in next implementation stage</span>
      </div>

      <h1
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: '1.6rem',
          fontWeight: 800,
          color: '#192A56',
          marginBottom: '0.5rem'
        }}
      >
        {pathName || 'OPERATIONS MODULE'}
      </h1>

      <p
        style={{
          fontSize: '0.9rem',
          color: '#64748B',
          maxWidth: '520px',
          lineHeight: 1.6,
          marginBottom: '1.75rem'
        }}
      >
        Candidate, corporate records, and lifecycle operations for this module will appear here in the
        upcoming administrative update. All data access remains strictly guarded within internal administration.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to={ADMIN_ROUTES.dashboard} className="btn-admin-secondary">
          <ArrowLeft size={15} />
          <span>Dashboard</span>
        </Link>
        <Link to={ADMIN_ROUTES.applications} className="btn-admin-secondary">
          <span>Applications</span>
        </Link>
        <Link to={ADMIN_ROUTES.exports} className="btn-admin-primary">
          <Download size={14} />
          <span>Go to Exports</span>
        </Link>
      </div>
    </div>
  );
};
