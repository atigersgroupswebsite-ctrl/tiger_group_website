import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Download, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RegistrationItem } from '../../types/compliance';
import { Button } from '../common/Button';

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
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

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
      // Focus close button on mount
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      setNoticeMessage(null);
    };
  }, [isOpen, onClose]);

  const handleDocumentAction = () => {
    if (item?.documentAsset) {
      window.open(item.documentAsset, '_blank', 'noopener,noreferrer');
    } else {
      setNoticeMessage(
        'The official physical document is on record at our registered Nagpur headquarters and is furnished to verified enterprise clients during statutory compliance onboarding.'
      );
    }
  };

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
              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Issuing Authority</span>
                <span className="compliance-detail-value">{item.authority}</span>
              </div>

              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Registration Type</span>
                <span className="compliance-detail-value">{item.documentType}</span>
              </div>

              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Registration / Reference</span>
                <span className="compliance-detail-value" style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {item.registrationReference}
                </span>
              </div>

              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Jurisdiction</span>
                <span className="compliance-detail-value">{item.jurisdiction}</span>
              </div>

              <div className="compliance-detail-row">
                <span className="compliance-detail-label">Scope & Recorded Activity</span>
                <span className="compliance-detail-value" style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  {item.legalScope}
                </span>
              </div>

              {item.issueDate && (
                <div className="compliance-detail-row">
                  <span className="compliance-detail-label">Record Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-midnight-navy)' }} />
                    <span className="compliance-detail-value">{item.validityStatus || 'Active'}</span>
                  </div>
                </div>
              )}

              {/* Notice Pill / Privacy Note */}
              <div className="compliance-notice-pill">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--color-midnight-navy)', marginBottom: '0.2rem' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span>Statutory Privacy & Verification Policy</span>
                </div>
                In accordance with regulatory guidelines, proprietary identifiers are masked for public security. Complete original certificates are provided during formal client agreements and compliance audits.
              </div>

              {noticeMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(247, 215, 148, 0.25)',
                    border: '1px solid var(--color-champagne-dark)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-midnight-navy)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    lineHeight: 1.5
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-midnight-navy)' }} />
                  <span>{noticeMessage}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="compliance-modal-actions">
                <Button
                  onClick={handleDocumentAction}
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                >
                  VIEW CERTIFICATE
                </Button>
                <Button
                  onClick={handleDocumentAction}
                  variant="outline"
                  size="sm"
                  icon={<Download size={14} />}
                >
                  DOWNLOAD CERTIFICATE
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
