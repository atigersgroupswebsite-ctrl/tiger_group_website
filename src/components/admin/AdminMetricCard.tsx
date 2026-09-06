// ==============================================================================
// File: src/components/admin/AdminMetricCard.tsx
// Description: Metric card component styled with Pearl White canvas and Midnight Navy
// ==============================================================================

import React from 'react';

interface AdminMetricCardProps {
  label: string;
  count: number | null;
  description: string;
  icon: React.ElementType;
  loading?: boolean;
}

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  label,
  count,
  description,
  icon: Icon,
  loading = false
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2DFD8',
        borderRadius: '10px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(25, 42, 86, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Accent Stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #192A56 0%, #F7D794 100%)'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '6px',
            backgroundColor: 'rgba(25, 42, 86, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#192A56'
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#192A56',
            lineHeight: 1.1,
            marginBottom: '0.35rem'
          }}
        >
          {loading || count === null ? '—' : count.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
          {description}
        </div>
      </div>
    </div>
  );
};
