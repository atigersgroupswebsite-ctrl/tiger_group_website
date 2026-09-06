// ==============================================================================
// File: src/components/admin/AdminTableToolbar.tsx
// Description: Search, filters, and action toolbar for admin data tables
// ==============================================================================

import React from 'react';

interface AdminTableToolbarProps {
  children: React.ReactNode;
}

export const AdminTableToolbar: React.FC<AdminTableToolbarProps> = ({ children }) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2DFD8',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(25, 42, 86, 0.04)'
      }}
    >
      {children}
    </div>
  );
};
