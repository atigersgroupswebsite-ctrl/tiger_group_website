import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { RegistrationItem } from '../../types/compliance';

interface RegistrationModalProps {
  item: RegistrationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape key & focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <div
          className="compliance-modal-overlay"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            ref={modalRef}
            className="compliance-modal-container"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="compliance-modal-header">
              <div>
                <span className="compliance-card-number">
                  RECORD 0{item.cardNumber} • STATUTORY REGISTRATION
                </span>
                <h3 id="modal-title" className="compliance-card-title" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                  {item.title}
                </h3>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="compliance-modal-close-btn"
                onClick={onClose}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="compliance-modal-body">
              {/* Registered Entity */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">{item.entityLabel}</span>
                <span className="compliance-detail-value" style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                  {item.entityName}
                </span>
              </div>

              {/* Public Registration Number / Identifier */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">{item.referenceLabel}</span>
                <span className="compliance-detail-value compliance-code-pill">
                  {item.registrationReference}
                </span>
              </div>

              {/* Issuing Authority */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Issuing Authority</span>
                <span className="compliance-detail-value">{item.authority}</span>
              </div>

              {/* Registration Type */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Registration Type</span>
                <span className="compliance-detail-value">{item.documentType}</span>
              </div>

              {/* Business Activity if available */}
              {item.businessActivity && (
                <div className="compliance-detail-row">
                  <span className="compliance-detail-label">Business Activity</span>
                  <span className="compliance-detail-value">{item.businessActivity}</span>
                </div>
              )}

              {/* Jurisdiction */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Jurisdiction</span>
                <span className="compliance-detail-value">{item.jurisdiction}</span>
              </div>

              {/* Statutory Scope */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Statutory Scope</span>
                <span className="compliance-detail-value" style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  {item.legalScope}
                </span>
              </div>

              {/* Record Status */}
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Record Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <CheckCircle2 size={15} style={{ color: 'var(--color-midnight-navy)' }} />
                  <span className="compliance-detail-value">{item.validityStatus || 'Active'}</span>
                </div>
              </div>

              {/* Statutory Privacy & Verification Notice */}
              <div className="compliance-notice-pill">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--color-midnight-navy)', marginBottom: '0.2rem' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span>Statutory Record & Data Security Notice</span>
                </div>
                In accordance with statutory guidelines, original registration documents and proprietor personal records are maintained in secure archival. Public information is limited to verified statutory identifiers. Official documentation is produced during formal client agreements and compliance audits.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
