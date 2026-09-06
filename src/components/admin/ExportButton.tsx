// ==============================================================================
// File: src/components/admin/ExportButton.tsx
// Description: Export button for CSV and XLSX downloads with loading states
// ==============================================================================

import React from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  format: 'csv' | 'xlsx' | 'all';
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  format,
  onClick,
  loading = false,
  disabled = false,
  label
}) => {
  let defaultLabel = 'Export';
  let Icon = Download;
  let bg = '#FFFFFF';
  let color = '#192A56';
  let borderColor = '#E2DFD8';

  if (format === 'csv') {
    defaultLabel = 'Export CSV';
    Icon = FileText;
    bg = '#FFFFFF';
    color = '#192A56';
    borderColor = '#CBD5E0';
  } else if (format === 'xlsx') {
    defaultLabel = 'Export Excel';
    Icon = FileSpreadsheet;
    bg = 'linear-gradient(135deg, #F7D794 0%, #E6C47A 100%)';
    color = '#192A56';
    borderColor = 'rgba(212, 175, 55, 0.4)';
  } else if (format === 'all') {
    defaultLabel = 'Export All';
    Icon = Download;
    bg = '#192A56';
    color = '#FCFBFB';
    borderColor = '#192A56';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.55rem 1rem',
        borderRadius: '6px',
        background: bg,
        color: color,
        border: `1px solid ${borderColor}`,
        fontSize: '0.825rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        boxShadow: format === 'xlsx' ? '0 2px 6px rgba(247, 215, 148, 0.35)' : 'none',
        transition: 'all 0.15s ease'
      }}
    >
      {loading ? (
        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Icon size={15} />
      )}
      <span>{label || defaultLabel}</span>
    </button>
  );
};
