// ==============================================================================
// File: src/components/admin/AdminSensitiveRevealModal.tsx
// Description: Secure Confirmation Dialog for SUPER_ADMIN Unmasking of Candidate PII
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React from 'react';
import { ShieldAlert, X, Eye, Lock } from 'lucide-react';

interface AdminSensitiveRevealModalProps {
  isOpen: boolean;
  isRevealed: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const AdminSensitiveRevealModal: React.FC<AdminSensitiveRevealModalProps> = ({
  isOpen,
  isRevealed,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

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
          maxWidth: '500px',
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
            borderBottom: '1px solid #FEF3C7',
            backgroundColor: '#FFFBEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E' }}>
                {isRevealed ? 'Hide Sensitive Information' : 'Confirm PII Data Access'}
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                SUPER_ADMIN Compliance Protocol
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {isRevealed ? (
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.4 }}>
              Clicking below will re-mask all candidate statutory numbers (Aadhaar, PAN, and Bank Account) on your screen.
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.4 }}>
                You are requesting unmasked access to candidate statutory numbers (Aadhaar, PAN, and Bank Account).
              </p>
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  fontSize: '0.775rem',
                  color: '#92400E',
                  lineHeight: 1.4,
                  marginBottom: '1.25rem'
                }}
              >
                <strong>Security Audit Notice:</strong> This action will be permanently recorded in the system audit
                activity logs with your administrator ID, timestamp, and IP reference.
              </div>
            </>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-admin-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="btn-admin-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              {isRevealed ? <Lock size={15} /> : <Eye size={15} />}
              <span>{isRevealed ? 'Re-mask Data' : 'Reveal Sensitive Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
