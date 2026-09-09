// ==============================================================================
// File: src/components/admin/DocumentCard.tsx
// Description: Individual Candidate Document Card with Status, Actions, and Auditing
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React from 'react';
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  UserCheck
} from 'lucide-react';
import type { DocumentRow } from '../../types/database';

interface DocumentCardProps {
  document: DocumentRow;
  isProcessing: boolean;
  canVerify: boolean;
  onView: (doc: DocumentRow) => void;
  onVerify: (doc: DocumentRow) => void;
  onReject: (doc: DocumentRow) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  isProcessing,
  canVerify,
  onView,
  onVerify,
  onReject
}) => {
  const sideLabel = document.document_side && document.document_side !== 'SINGLE' ? ` (${document.document_side})` : '';
  const displayTitle = `${document.document_type.replace(/_/g, ' ')}${sideLabel}`;

  const isVerified = document.verification_status === 'VERIFIED';
  const isRejected = document.verification_status === 'REJECTED';
  const isPending = (document.verification_status as string) === 'PENDING' || (document.verification_status as string) === 'UPLOADED';

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="admin-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: isVerified
          ? '1px solid #A5D6A7'
          : isRejected
          ? '1px solid #FCA5A5'
          : '1px solid #E2E8F0',
        backgroundColor: isVerified
          ? '#FAFCFA'
          : isRejected
          ? '#FFF8F8'
          : '#FFFFFF',
        transition: 'box-shadow 0.2s ease',
        minHeight: '220px',
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* Card Header */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            width: '100%',
            minWidth: 0
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              minWidth: 0,
              flex: '1 1 auto'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isVerified
                  ? '#E8F5E9'
                  : isRejected
                  ? '#FEE2E2'
                  : '#EFF6FF',
                color: isVerified
                  ? '#2E7D32'
                  : isRejected
                  ? '#DC2626'
                  : '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={18} />
            </div>
            <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#192A56',
                  wordBreak: 'break-word',
                  lineHeight: 1.25
                }}
              >
                {displayTitle}
              </h4>
              <div
                title={document.original_file_name || undefined}
                style={{
                  fontSize: '0.725rem',
                  color: '#64748B',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                {document.original_file_name || 'candidate_document'}
                {document.file_size ? ` • ${formatFileSize(document.file_size)}` : ''}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: isVerified
                ? '#DCFCE7'
                : isRejected
                ? '#FEE2E2'
                : '#FEF3C7',
              color: isVerified
                ? '#166534'
                : isRejected
                ? '#991B1B'
                : '#92400E',
              border: isVerified
                ? '1px solid #86EFAC'
                : isRejected
                ? '1px solid #FCA5A5'
                : '1px solid #FDE68A',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            {isVerified && <CheckCircle size={12} />}
            {isRejected && <XCircle size={12} />}
            {isPending && <Clock size={12} />}
            <span>{document.verification_status}</span>
          </span>
        </div>

        {/* Upload Date & Audit */}
        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
          <Calendar size={13} />
          <span>
            Uploaded on {new Date(document.uploaded_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>

        {/* Rejection Notice Callout */}
        {isRejected && document.rejection_reason && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              marginBottom: '1rem',
              fontSize: '0.775rem',
              color: '#991B1B',
              lineHeight: 1.35
            }}
          >
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2px' }}>
              <AlertTriangle size={13} color="#DC2626" />
              <span>Rejection Reason:</span>
            </div>
            <div>{document.rejection_reason}</div>
          </div>
        )}

        {/* Verification Notice Callout */}
        {isVerified && document.verified_at && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              marginBottom: '1rem',
              fontSize: '0.725rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <UserCheck size={13} />
            <span>Verified on {new Date(document.verified_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #F1F5F9',
          flexWrap: 'wrap'
        }}
      >
        {/* View Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onView(document);
          }}
          disabled={isProcessing}
          className="btn-admin-secondary"
          style={{
            padding: '0.45rem 0.85rem',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Eye size={14} />
          <span>View Document</span>
        </button>

        {/* Verification Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Verify Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVerify(document);
            }}
            disabled={!canVerify || isProcessing || isVerified}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: isVerified ? '1px solid #A5D6A7' : '1px solid #16A34A',
              backgroundColor: isVerified ? '#DCFCE7' : '#16A34A',
              color: isVerified ? '#166534' : '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: !canVerify || isProcessing || isVerified ? 'not-allowed' : 'pointer',
              opacity: !canVerify || isProcessing ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {isProcessing ? (
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <CheckCircle size={13} />
            )}
            <span>{isVerified ? 'Verified' : 'Verify'}</span>
          </button>

          {/* Reject Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReject(document);
            }}
            disabled={!canVerify || isProcessing}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #DC2626',
              backgroundColor: isRejected ? '#FEE2E2' : '#FFFFFF',
              color: '#DC2626',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: !canVerify || isProcessing ? 'not-allowed' : 'pointer',
              opacity: !canVerify || isProcessing ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <XCircle size={13} />
            <span>{isRejected ? 'Edit Reason' : 'Reject'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
