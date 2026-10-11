// ==============================================================================
// File: src/components/admin/RegularJoiningCompletionModal.tsx
// Description: Completion & Credential Delivery Modal for Regular Joining Form
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Official "REGULAR JOINING COMPLETED SUCCESSFULLY" banner & summary
//   - Real-time generation status tracking for Reference Slip and Employee ID Card
//   - Safe retry actions without duplicating records or re-assigning codes
//   - 7 Direct actions: View, Download, Print for both documents + Return to Dashboard
// ==============================================================================

import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  CreditCard,
  Printer,
  Download,
  Eye,
  ArrowLeft,
  RefreshCw,
  Loader2,
  X,
  ShieldCheck
} from 'lucide-react';
import type { RegularJoiningFormData } from '../../services/regularJoiningService';

export interface RegularJoiningCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData?: RegularJoiningFormData;
  employeeName?: string;
  employeeCode?: string;
  joiningDate?: string;
  referenceSlipStatus: 'GENERATING' | 'GENERATED' | 'FAILED';
  referenceSlipError?: string;
  referenceSlipBlob?: Blob | null;
  referenceSlipFileName?: string;
  idCardStatus: 'GENERATING' | 'GENERATED' | 'FAILED';
  idCardError?: string;
  idCardBlob?: Blob | null;
  idCardFileName?: string;
  onRetryReferenceSlip?: () => Promise<void> | void;
  onRetryIdCard?: () => Promise<void> | void;
  onReturnToDashboard: () => void;
}

export const RegularJoiningCompletionModal: React.FC<RegularJoiningCompletionModalProps> = ({
  isOpen,
  onClose,
  formData,
  employeeName,
  employeeCode,
  joiningDate,
  referenceSlipStatus,
  referenceSlipError,
  referenceSlipBlob,
  referenceSlipFileName,
  idCardStatus,
  idCardError,
  idCardBlob,
  idCardFileName,
  onRetryReferenceSlip,
  onRetryIdCard,
  onReturnToDashboard
}) => {
  const [retryingSlip, setRetryingSlip] = useState<boolean>(false);
  const [retryingCard, setRetryingCard] = useState<boolean>(false);
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    blob: Blob;
    fileName: string;
  } | null>(null);

  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const displayEmployeeName = employeeName || formData?.fullName || '—';
  const displayEmployeeCode = employeeCode || formData?.employeeCode || '—';
  const displayJoiningDate = joiningDate || formData?.joiningDate || '—';

  if (!isOpen) return null;

  // Format display date
  const formatDisplayDate = (val?: string | null): string => {
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

  // Direct Browser Download
  const handleDownload = (blob: Blob | null | undefined, defaultFileName: string) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  // Direct Browser Print
  const handlePrint = (blob: Blob | null | undefined) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (printIframeRef.current) {
      printIframeRef.current.src = url;
      printIframeRef.current.onload = () => {
        try {
          printIframeRef.current?.contentWindow?.focus();
          printIframeRef.current?.contentWindow?.print();
        } catch (_) {
          window.open(url, '_blank');
        }
      };
    } else {
      window.open(url, '_blank');
    }
  };

  // Retry Handlers
  const handleRetrySlipAction = async () => {
    if (!onRetryReferenceSlip) return;
    setRetryingSlip(true);
    try {
      await onRetryReferenceSlip();
    } finally {
      setRetryingSlip(false);
    }
  };

  const handleRetryCardAction = async () => {
    if (!onRetryIdCard) return;
    setRetryingCard(true);
    try {
      await onRetryIdCard();
    } finally {
      setRetryingCard(false);
    }
  };

  const slipResolvedName =
    referenceSlipFileName ||
    `${(displayEmployeeCode || 'REGULAR-RECORD').replace(/[^a-zA-Z0-9_-]/g, '_')}-REFERENCE-SLIP.pdf`;

  const cardResolvedName =
    idCardFileName ||
    `ATG_IDCard_${(displayEmployeeCode || 'REGULAR-RECORD').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

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
          maxWidth: '860px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            backgroundColor: '#0F1B38',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E293B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'rgba(197, 160, 89, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C5A059'
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  color: '#FFFFFF'
                }}
              >
                REGULAR JOINING COMPLETED SUCCESSFULLY
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                Official verification recorded • Statutory credential generation complete
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Saved Record Details Summary */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Employee Name
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#0F1B38' }}>
                {displayEmployeeName}
              </strong>
            </div>

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Employee Code
              </span>
              <strong
                style={{
                  fontSize: '1.05rem',
                  color: '#0F1B38',
                  letterSpacing: '0.03em'
                }}
              >
                {displayEmployeeCode}
              </strong>
            </div>

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Joining Date
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#0F1B38' }}>
                {formatDisplayDate(displayJoiningDate)}
              </strong>
            </div>
          </div>

          {/* Document Generation Status Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {/* CARD 1: EMPLOYEE REFERENCE SLIP */}
            <div
              style={{
                border:
                  referenceSlipStatus === 'GENERATED'
                    ? '1.5px solid #10B981'
                    : referenceSlipStatus === 'FAILED'
                    ? '1.5px solid #EF4444'
                    : '1.5px solid #CBD5E1',
                borderRadius: '10px',
                padding: '1.25rem',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCheck2 size={20} style={{ color: '#0F1B38' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F1B38' }}>
                      Reference Slip
                    </span>
                  </div>

                  {referenceSlipStatus === 'GENERATED' ? (
                    <span
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: '#10B981' }} />
                      Generated
                    </span>
                  ) : referenceSlipStatus === 'GENERATING' ? (
                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FECACA',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <AlertCircle size={13} style={{ color: '#EF4444' }} />
                      Generation Failed
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.45 }}>
                  Official 1-page vector employee reference slip with candidate live photo, deployment terms, and authorized consultancy seal.
                </p>

                {referenceSlipStatus === 'FAILED' && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      color: '#B91C1C'
                    }}
                  >
                    {referenceSlipError || 'Reference slip PDF generation encountered an error.'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                {referenceSlipStatus === 'GENERATED' && referenceSlipBlob ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDocument({
                          title: 'Employee Reference Slip (1-Page)',
                          blob: referenceSlipBlob,
                          fileName: slipResolvedName
                        })
                      }
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(referenceSlipBlob, slipResolvedName)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrint(referenceSlipBlob)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetrySlipAction}
                    disabled={retryingSlip || referenceSlipStatus === 'GENERATING'}
                    className="btn btn-outline btn-sm"
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      color: '#B91C1C',
                      borderColor: '#FCA5A5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {retryingSlip ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>Retry Reference Slip Generation</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: EMPLOYEE ID CARD */}
            <div
              style={{
                border:
                  idCardStatus === 'GENERATED'
                    ? '1.5px solid #10B981'
                    : idCardStatus === 'FAILED'
                    ? '1.5px solid #EF4444'
                    : '1.5px solid #CBD5E1',
                borderRadius: '10px',
                padding: '1.25rem',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={20} style={{ color: '#0F1B38' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F1B38' }}>
                      Employee ID Card
                    </span>
                  </div>

                  {idCardStatus === 'GENERATED' ? (
                    <span
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: '#10B981' }} />
                      Generated
                    </span>
                  ) : idCardStatus === 'GENERATING' ? (
                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FECACA',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <AlertCircle size={13} style={{ color: '#EF4444' }} />
                      Generation Failed
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.45 }}>
                  Authoritative 2-sided ISO CR80 identity card populated with employee code ({displayEmployeeCode}), live photo, department, and designation.
                </p>

                {idCardStatus === 'FAILED' && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      color: '#B91C1C'
                    }}
                  >
                    {idCardError || 'Employee ID Card PDF generation encountered an error.'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                {idCardStatus === 'GENERATED' && idCardBlob ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDocument({
                          title: 'Employee Identity Card (CR80)',
                          blob: idCardBlob,
                          fileName: cardResolvedName
                        })
                      }
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(idCardBlob, cardResolvedName)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrint(idCardBlob)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetryCardAction}
                    disabled={retryingCard || idCardStatus === 'GENERATING'}
                    className="btn btn-outline btn-sm"
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      color: '#B91C1C',
                      borderColor: '#FCA5A5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {retryingCard ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>Retry Employee ID Card Generation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="btn btn-outline"
            style={{
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#475569'
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Regular Joining Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-navy"
            style={{
              fontSize: '0.85rem',
              backgroundColor: '#0F1B38',
              padding: '0.65rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#C5A059' }} />
            <span>Done / Close</span>
          </button>
        </div>
      </div>

      {/* Internal Document Preview Overlay Modal */}
      {previewDocument && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '920px',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
            }}
          >
            {/* Preview Header */}
            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Eye size={20} style={{ color: '#C5A059' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  {previewDocument.title} — {displayEmployeeCode}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => handleDownload(previewDocument.blob, previewDocument.fileName)}
                  className="btn btn-outline btn-sm"
                  style={{ color: '#FFFFFF', borderColor: '#334155', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(previewDocument.blob)}
                  className="btn btn-outline btn-sm"
                  style={{ color: '#FFFFFF', borderColor: '#334155', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Embedded Iframe Preview */}
            <div style={{ flex: 1, backgroundColor: '#525659' }}>
              <iframe
                title={previewDocument.title}
                src={URL.createObjectURL(previewDocument.blob)}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden printing iframe */}
      <iframe
        ref={printIframeRef}
        title="Print Document"
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '1px', height: '1px' }}
      />
    </div>
  );
};
