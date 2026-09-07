import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Reset page and zoom when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIndex(0);
      setZoomLevel(1);
    }
  }, [isOpen, item]);

  // Keyboard accessibility: Escape key & focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (item && item.pages && currentPageIndex < item.pages.length - 1) {
          setCurrentPageIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentPageIndex > 0) {
          setCurrentPageIndex((prev) => prev - 1);
        }
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
  }, [isOpen, onClose, item, currentPageIndex]);

  if (!item) return null;

  const pages = item.pages && item.pages.length > 0 ? item.pages : [];
  const totalPages = pages.length;
  const currentImageSrc = pages[currentPageIndex] || '';

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="compliance-modal-overlay"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <motion.div
            ref={modalRef}
            className="compliance-modal-container"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              border: '1px solid rgba(25, 42, 86, 0.15)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#F7D794',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    RECORD 0{item.cardNumber} • ORIGINAL STATUTORY CERTIFICATE
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      backgroundColor: 'rgba(52, 211, 153, 0.2)',
                      color: '#34D399',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}
                  >
                    VERIFIED
                  </span>
                </div>
                <h3
                  id="modal-title"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    margin: '0.15rem 0 0',
                    color: '#FFFFFF',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {item.title}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Close Button */}
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close certificate viewer"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.6rem 1.5rem',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '0.8rem',
                color: '#475569'
              }}
            >
              <div>
                <strong style={{ color: '#0F1B38' }}>{item.referenceLabel}: </strong>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    color: '#0F1B38'
                  }}
                >
                  {item.registrationReference}
                </span>
              </div>

              <div>
                <strong style={{ color: '#0F1B38' }}>Issuing Authority: </strong>
                <span>{item.authority}</span>
              </div>

              {/* Viewer Controls: Zoom & Page navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {totalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginRight: '0.5rem',
                      borderRight: '1px solid #CBD5E1',
                      paddingRight: '0.75rem'
                    }}
                  >
                    <button
                      type="button"
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                      style={{
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        padding: '3px 6px',
                        cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentPageIndex === 0 ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span style={{ fontWeight: 700, fontSize: '0.75rem', minWidth: '70px', textAlign: 'center' }}>
                      PAGE {currentPageIndex + 1} OF {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentPageIndex === totalPages - 1}
                      onClick={() => setCurrentPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                      style={{
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        padding: '3px 6px',
                        cursor: currentPageIndex === totalPages - 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPageIndex === totalPages - 1 ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Zoom controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      background: '#FFFFFF',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '42px', textAlign: 'center' }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      background: '#FFFFFF',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Zoom In"
                  >
                    <ZoomIn size={15} />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={handleZoomReset}
                      style={{
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        padding: '3px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Reset Zoom"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Certificate Page Display Canvas (Strictly Viewing Only — No Download Action) */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#334155',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '1.5rem',
                minHeight: '400px',
                userSelect: 'none'
              }}
            >
              {currentImageSrc ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '4px',
                    maxWidth: '100%'
                  }}
                >
                  <img
                    src={currentImageSrc}
                    alt={`${item.title} - Page ${currentPageIndex + 1}`}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      height: 'auto',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <div style={{ color: '#FFFFFF', padding: '3rem', textAlign: 'center' }}>
                  Certificate document on file at registered headquarters.
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#F1F5F9',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: '#64748B'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} style={{ color: '#B45309' }} />
                <span>
                  Official Government Registration Record — A TIGER GLOBAL Career Solution & Consultancy
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
                <span style={{ fontWeight: 600, color: '#16A34A' }}>Verified Public Certificate Scan</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
