// ==============================================================================
// File: src/components/admin/RegularJoiningSubmittedModal.tsx
// Description: Confirmation modal displayed upon successful Regular Joining Form submission
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Confirms submission with assigned Employee Code (e.g. ATG-501-2026)
//   - Displays "Pending Verification" statutory status
//   - Guides administrator to verify candidate & documents in Joining Submissions
//   - Direct navigation buttons: "Go to Joining Submissions", "Open Submission Dossier", "Submit Another Candidate"
// ==============================================================================

import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck2,
  PlusCircle,
  ShieldCheck,
  X
} from 'lucide-react';

interface RegularJoiningSubmittedModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId?: string;
  employeeCode: string;
  candidateName: string;
  joiningDate?: string;
  onGoToJoiningSubmissions: () => void;
  onViewDossier: () => void;
  onCreateAnother: () => void;
}

export const RegularJoiningSubmittedModal: React.FC<RegularJoiningSubmittedModalProps> = ({
  isOpen,
  onClose,
  formId,
  employeeCode,
  candidateName,
  joiningDate,
  onGoToJoiningSubmissions,
  onViewDossier,
  onCreateAnother
}) => {
  if (!isOpen) return null;

  const formatDate = (val?: string | null) => {
    if (!val) return '—';
    try {
      const parts = val.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return val;
    } catch {
      return val;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          border: '1px solid #CBD5E1',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#0F1B38',
            color: '#FFFFFF',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '1rem',
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>

          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '2px solid #22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto'
            }}
          >
            <CheckCircle2 size={32} style={{ color: '#22C55E' }} />
          </div>

          <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
            Regular Joining Form Submitted!
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#CBD5E1' }}>
            Candidate record saved successfully and registered for verification.
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Candidate & Reference Box */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 600 }}>
                  Assigned Employee Code / Ref:
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38' }}>
                  {employeeCode}
                </span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                <Clock size={13} />
                <span>Pending Verification</span>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Candidate Full Name:</span>
                <strong style={{ color: '#0F1B38' }}>{candidateName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Joining Date:</span>
                <strong style={{ color: '#0F1B38' }}>{formatDate(joiningDate)}</strong>
              </div>
            </div>
          </div>

          {/* Workflow Next Steps Info */}
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.82rem',
              color: '#166534',
              lineHeight: 1.45
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={16} />
              <span>Next Required Workflow Step:</span>
            </div>
            <span>
              This record is now available in <strong>Joining Submissions</strong>. The administrator must review candidate details, inspect all 4 statutory documents, and confirm verification before generating the Employee Reference Slip and Employee ID Card.
            </span>
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={onGoToJoiningSubmissions}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(15, 27, 56, 0.2)'
              }}
            >
              <FileCheck2 size={18} style={{ color: '#C5A059' }} />
              <span>Go to Joining Submissions</span>
              <ArrowRight size={16} />
            </button>

            {formId && (
              <button
                type="button"
                onClick={onViewDossier}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  backgroundColor: '#FFFFFF',
                  color: '#0F1B38',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>Open Submission Dossier for Verification</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCreateAnother}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                backgroundColor: 'transparent',
                color: '#64748B',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <PlusCircle size={15} />
              <span>Submit Another Candidate Form</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
