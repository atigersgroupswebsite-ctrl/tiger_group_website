// ==============================================================================
// File: src/components/admin/DocumentSummary.tsx
// Description: Document Verification Summary Banner & Readiness Indicators
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import type { DocumentVerificationStats } from '../../services/adminDocumentService';

interface DocumentSummaryProps {
  stats: DocumentVerificationStats;
  totalDocumentsCount: number;
}

export const DocumentSummary: React.FC<DocumentSummaryProps> = ({ stats, totalDocumentsCount }) => {
  const percentComplete =
    stats.totalRequired > 0
      ? Math.min(100, Math.round((stats.verifiedCount / stats.totalRequired) * 100))
      : 0;

  return (
    <div
      className="admin-card"
      style={{
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        border: stats.allRequiredVerified
          ? '1px solid #A5D6A7'
          : stats.hasRejections
          ? '1px solid #FCA5A5'
          : '1px solid #E2E8F0',
        backgroundColor: stats.allRequiredVerified
          ? '#F0FDF4'
          : stats.hasRejections
          ? '#FFF8F8'
          : '#FFFFFF'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: stats.allRequiredVerified
                  ? '#DCFCE7'
                  : stats.hasRejections
                  ? '#FEE2E2'
                  : '#EFF6FF',
                color: stats.allRequiredVerified
                  ? '#16A34A'
                  : stats.hasRejections
                  ? '#DC2626'
                  : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {stats.allRequiredVerified ? (
                <ShieldCheck size={18} />
              ) : stats.hasRejections ? (
                <AlertCircle size={18} />
              ) : (
                <Clock size={18} />
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#192A56' }}>
              DOCUMENT VERIFICATION STATUS
            </h2>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: stats.allRequiredVerified
                  ? '#DCFCE7'
                  : stats.hasRejections
                  ? '#FEE2E2'
                  : '#FEF3C7',
                color: stats.allRequiredVerified
                  ? '#166534'
                  : stats.hasRejections
                  ? '#991B1B'
                  : '#92400E',
                border: stats.allRequiredVerified
                  ? '1px solid #86EFAC'
                  : stats.hasRejections
                  ? '1px solid #FCA5A5'
                  : '1px solid #FDE68A'
              }}
            >
              {stats.readinessLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.825rem', color: '#64748B' }}>
            Statutory Verification Progress:{' '}
            <strong style={{ color: '#192A56' }}>
              {stats.verifiedCount} of {stats.totalRequired}
            </strong>{' '}
            mandatory documents verified ({totalDocumentsCount} files in application dossier)
          </div>
        </div>

        {/* Next Stage Readiness Pill */}
        {stats.allRequiredVerified ? (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              border: '1px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#166534'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Ready for Candidate Registration Fee & Payment Stage</span>
          </div>
        ) : stats.hasRejections ? (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#991B1B'
            }}
          >
            <AlertCircle size={16} />
            <span>Candidate action required on {stats.rejectedCount} rejected document(s)</span>
          </div>
        ) : (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#475569'
            }}
          >
            <Clock size={16} />
            <span>Awaiting Coordinator & Document Verifier Review</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div
          style={{
            height: '100%',
            width: `${percentComplete}%`,
            backgroundColor: stats.allRequiredVerified
              ? '#16A34A'
              : stats.hasRejections
              ? '#F59E0B'
              : '#2563EB',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #E2E8F0'
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
            Mandatory Required
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
            {stats.totalRequired}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
            Uploaded
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563EB' }}>
            {stats.uploadedCount} / {stats.totalRequired}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
            Verified
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16A34A' }}>
            {stats.verifiedCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
            Rejected
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stats.rejectedCount > 0 ? '#DC2626' : '#64748B' }}>
            {stats.rejectedCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending Review
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#D97706' }}>
            {stats.pendingCount}
          </div>
        </div>
      </div>
    </div>
  );
};
