// ==============================================================================
// File: src/components/admin/ExportCard.tsx
// Description: Structured card container for data export sections
// ==============================================================================

import React from 'react';

interface ExportCardProps {
  title: string;
  description: string;
  recordCountText?: string;
  icon: React.ElementType;
  filtersSlot?: React.ReactNode;
  actionsSlot: React.ReactNode;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  title,
  description,
  recordCountText,
  icon: Icon,
  filtersSlot,
  actionsSlot
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2DFD8',
        borderRadius: '12px',
        padding: '1.75rem',
        boxShadow: '0 1px 3px rgba(25, 42, 86, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'rgba(25, 42, 86, 0.06)',
                color: '#192A56',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0,
                  letterSpacing: '0.02em'
                }}
              >
                {title}
              </h2>
              {recordCountText && (
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                  {recordCountText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: '0.85rem',
            color: '#4A5568',
            lineHeight: 1.5,
            margin: '0 0 1.25rem 0'
          }}
        >
          {description}
        </p>

        {/* Filters if any */}
        {filtersSlot && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F8F9FA',
              borderRadius: '8px',
              border: '1px solid #E2DFD8',
              marginBottom: '1.25rem'
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}
            >
              Export Scope & Filters
            </div>
            {filtersSlot}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingTop: '1rem',
          borderTop: '1px solid #F0ECE4'
        }}
      >
        {actionsSlot}
      </div>
    </div>
  );
};
