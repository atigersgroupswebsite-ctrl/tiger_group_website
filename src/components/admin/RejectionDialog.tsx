// ==============================================================================
// File: src/components/admin/RejectionDialog.tsx
// Description: Mandatory Rejection Reason Dialog for Candidate Statutory Documents
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import type { DocumentRow } from '../../types/database';

interface RejectionDialogProps {
  document: DocumentRow | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const COMMON_REJECTION_REASONS = [
  'Blurry or unreadable document photo',
  'Document edges/corners cropped out',
  'Incorrect document uploaded for this category',
  'Document expired or invalid',
  'Information does not match application details',
  'Both sides required but only one side visible'
];

export const RejectionDialog: React.FC<RejectionDialogProps> = ({
  document,
  isOpen,
  isSubmitting,
  onConfirm,
  onClose
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const docTitle = `${document.document_type.replace(/_/g, ' ')}${
    document.document_side && document.document_side !== 'SINGLE' ? ` (${document.document_side})` : ''
  }`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a specific rejection reason so the candidate knows what to correct.');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #FEE2E2',
            backgroundColor: '#FEF2F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991B1B' }}>
                Reject Document
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#B91C1C' }}>
                {docTitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#9CA3AF'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.825rem', color: '#4B5563', lineHeight: 1.4 }}>
            Please state the exact reason for rejecting this document. The candidate will see this reason on their
            joining portal so they can re-upload a compliant copy.
          </p>

          {/* Quick suggestions */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Quick Templates
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {COMMON_REJECTION_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setError(null);
                  }}
                  style={{
                    fontSize: '0.725rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: reason === r ? '#EFF6FF' : '#F9FAFB',
                    color: reason === r ? '#1D4ED8' : '#4B5563',
                    cursor: 'pointer',
                    fontWeight: reason === r ? 700 : 500
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="rejectionReasonInput"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '0.35rem',
                textTransform: 'uppercase'
              }}
            >
              Rejection Reason <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              id="rejectionReasonInput"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Document image is blurred. Please upload a clear photo where all text and numbers are readable."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.75rem',
                border: error ? '1px solid #DC2626' : '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.85rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {error && (
              <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.3rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-admin-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="btn-admin-danger"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              {isSubmitting ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <AlertTriangle size={15} />
              )}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
