// ==============================================================================
// File: src/pages/admin/AdminPlaceholderPage.tsx
// Description: Shell placeholder for upcoming Stage 3 admin modules
// ==============================================================================

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

export const AdminPlaceholderPage: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname.replace('/admin/', '').toUpperCase().replace('-', ' ');

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
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: '#F59E0B'
        }}
      >
        <Construction size={36} />
      </div>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#F8FAFC',
          marginBottom: '0.5rem'
        }}
      >
        {pathName || 'MANAGEMENT MODULE'}
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: '#94A3B8',
          maxWidth: '500px',
          lineHeight: 1.6,
          marginBottom: '1.75rem'
        }}
      >
        This module is scheduled for Stage 3 implementation (Candidate Access, Private Storage,
        Razorpay Integration, and Automated Document Generation).
      </p>

      <Link
        to="/admin"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#1E293B',
          color: '#F59E0B',
          padding: '0.65rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textDecoration: 'none',
          border: '1px solid #334155',
          transition: 'all 0.15s ease'
        }}
      >
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
