// ==============================================================================
// File: src/components/admin/AdminPagination.tsx
// Description: Reusable pagination controls for admin data tables
// ==============================================================================

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  loading = false
}) => {
  const from = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2DFD8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.825rem'
      }}
    >
      <div style={{ color: '#64748B' }}>
        Showing <strong style={{ color: '#192A56' }}>{from}</strong> to{' '}
        <strong style={{ color: '#192A56' }}>{to}</strong> of{' '}
        <strong style={{ color: '#192A56' }}>{totalCount}</strong> records
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1 || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2DFD8',
            color: currentPage <= 1 ? '#A0AEC0' : '#192A56',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        <span
          style={{
            padding: '0.4rem 0.75rem',
            color: '#192A56',
            fontWeight: 700,
            fontSize: '0.8rem'
          }}
        >
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2DFD8',
            color: currentPage >= totalPages ? '#A0AEC0' : '#192A56',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
