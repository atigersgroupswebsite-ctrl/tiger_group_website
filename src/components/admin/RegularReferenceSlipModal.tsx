// ==============================================================================
// File: src/components/admin/RegularReferenceSlipModal.tsx
// Description: Official 1-Page Employee Reference Slip Preview & Print Modal
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Clean 1-page vector PDF preview via Blob URL
//   - Direct Browser Print action
//   - Instant PDF download
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileCheck2,
  Loader2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import type { RegularJoiningFormData } from '../../services/regularJoiningService';
import {
  buildRegularReferenceSlipPdf,
  downloadRegularReferenceSlipPdf
} from '../../services/regularReferenceSlipPdfGenerator';

interface RegularReferenceSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RegularJoiningFormData | null;
  companySignatureUrl?: string | null;
  companyStampUrl?: string | null;
  verifierName?: string;
}

export const RegularReferenceSlipModal: React.FC<RegularReferenceSlipModalProps> = ({
  isOpen,
  onClose,
  formData,
  companySignatureUrl,
  companyStampUrl,
  verifierName = 'Authorized Officer'
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    if (!isOpen || !formData) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setBlobUrl(null);
      }
      return;
    }

    const generatePdfBlob = async () => {
      setLoading(true);
      setError(null);
      try {
        const bytes = await buildRegularReferenceSlipPdf(formData, {
          companySignatureUrlOrData: companySignatureUrl,
          companyStampUrlOrData: companyStampUrl,
          verifierName
        });
        if (!active) return;
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = url;
        setBlobUrl(url);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to generate reference slip preview.');
      } finally {
        if (active) setLoading(false);
      }
    };

    generatePdfBlob();

    return () => {
      active = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [isOpen, formData, companySignatureUrl, companyStampUrl, verifierName]);

  if (!isOpen || !formData) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!formData) return;
    await downloadRegularReferenceSlipPdf(formData, {
      companySignatureUrlOrData: companySignatureUrl,
      companyStampUrlOrData: companyStampUrl,
      verifierName
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0F1B38',
            color: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileCheck2 size={24} style={{ color: '#C5A059' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                Employee Reference Slip (1-Page Master)
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Ref: {formData.employeeCode} • {formData.fullName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleDownload}
              className="btn btn-outline btn-sm"
              style={{
                color: '#FFFFFF',
                borderColor: '#334155',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Download PDF"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-outline btn-sm"
              style={{
                color: '#FFFFFF',
                borderColor: '#334155',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Print Reference Slip"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Viewer */}
        <div style={{ flex: 1, backgroundColor: '#F1F5F9', position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#0F1B38' }} />
              <p style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
                Synthesizing Official 1-Page Reference Slip PDF...
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                backgroundColor: '#FFFFFF',
                padding: '2rem',
                textAlign: 'center'
              }}
            >
              <div style={{ color: '#EF4444', fontWeight: 600 }}>{error}</div>
              <button onClick={onClose} className="btn btn-navy btn-sm">
                Close
              </button>
            </div>
          )}

          {blobUrl && !loading && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="Employee Reference Slip Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} style={{ color: '#10B981' }} />
            <span>Strict Single A4 Page • Section 3 Removed • No QR Code • Official Company Header</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => blobUrl && window.open(blobUrl, '_blank')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563EB',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: 600
              }}
            >
              <span>Open in New Tab</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
