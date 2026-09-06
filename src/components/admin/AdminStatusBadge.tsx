// ==============================================================================
// File: src/components/admin/AdminStatusBadge.tsx
// Description: Unified status badge adhering to A TIGER GROUPS brand color system
// ==============================================================================

import React from 'react';

interface AdminStatusBadgeProps {
  status: string;
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({ status }) => {
  const normalized = status ? status.toUpperCase() : 'UNKNOWN';

  let bg = '#F5F3EF';
  let color = '#192A56';
  let border = '#E2DFD8';

  if (normalized.includes('NEW') || normalized === 'PENDING') {
    // Champagne / Warning attention
    bg = '#FDF3DB';
    color = '#8C6400';
    border = '#F7D794';
  } else if (
    normalized.includes('ACTIVE') ||
    normalized.includes('SUBMITTED') ||
    normalized.includes('VERIFIED') ||
    normalized === 'SUCCESS' ||
    normalized === 'SELECTED' ||
    normalized === 'CONTRACTED'
  ) {
    // Verified / Active
    bg = '#E8F5E9';
    color = '#2E7D32';
    border = '#A5D6A7';
  } else if (normalized.includes('REJECT') || normalized.includes('FAILED') || normalized === 'CLOSED') {
    // Dusty Rose accent
    bg = '#FBF0EF';
    color = '#C9726F';
    border = '#EDA6A3';
  } else if (normalized.includes('IN_PROGRESS') || normalized.includes('SCREENING') || normalized === 'CONTACTED') {
    // Soft Midnight accent
    bg = 'rgba(25, 42, 86, 0.08)';
    color = '#192A56';
    border = 'rgba(25, 42, 86, 0.2)';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '0.725rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {normalized.replace(/_/g, ' ')}
    </span>
  );
};
