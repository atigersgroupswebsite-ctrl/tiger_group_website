// ==============================================================================
// File: src/components/admin/AdminEmptyState.tsx
// Description: Empty state display for admin tables and views
// ==============================================================================

import React from 'react';
import { Inbox } from 'lucide-react';

interface AdminEmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title = 'No Records Found',
  message = 'There are no records matching your current filter or search criteria.',
  icon: Icon = Inbox,
  action
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        color: '#64748B',
        backgroundColor: '#FFFFFF'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '12px',
          backgroundColor: 'rgba(25, 42, 86, 0.05)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#192A56',
          marginBottom: '1rem'
        }}
      >
        <Icon size={26} />
      </div>

      <h3
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#192A56',
          margin: '0 0 0.35rem 0'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.85rem',
          color: '#64748B',
          maxWidth: '420px',
          margin: '0 auto 1.25rem auto',
          lineHeight: 1.5
        }}
      >
        {message}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};
