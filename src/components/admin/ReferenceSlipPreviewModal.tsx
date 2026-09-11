// ==============================================================================
// File: src/components/admin/ReferenceSlipPreviewModal.tsx
// Description: Secure 2-Page Reference Slip & Consultancy Return Document Viewer
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Features:
//   - Displays 2-page PDF via authenticated pre-signed URL
//   - Print and Regenerate controls
//   - Page status indicators (Page 1: Reference Slip, Page 2: Consultancy Return)
// ==============================================================================

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  RotateCw,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Download,
  Mail
} from 'lucide-react';
import type { GeneratedFileRow } from '../../types/database';
import { supabase } from '../../lib/supabaseClient';

interface ReferenceSlipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  signedUrl?: string | null;
  referenceNumber: string;
  candidateName: string;
  sourceReference: string;
  referenceSlipId?: string;
  joiningFormId?: string;
  applicationId?: string;
  candidateEmail?: string;
  consultancyAccepted?: boolean;
  acceptedAt?: string | null;
  generatedFile?: GeneratedFileRow | null;
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
  canManage?: boolean;
}

export const ReferenceSlipPreviewModal: React.FC<ReferenceSlipPreviewModalProps> = ({
  isOpen,
  onClose,
  signedUrl,
  referenceNumber,
  candidateName,
  sourceReference,
  referenceSlipId,
  joiningFormId,
  applicationId,
  candidateEmail,
  consultancyAccepted,
  acceptedAt,
  generatedFile,
  onRegenerate,
  isRegenerating = false,
  canManage = false
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!signedUrl) return;
    try {
      const res = await fetch(signedUrl);
      const blob = await res.blob();
      const safeRef = sourceReference ? sourceReference.replace(/[^a-zA-Z0-9_-]/g, '_') : 'REFERENCE-SLIP';
      const filename = `${safeRef}-REFERENCE-SLIP.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(signedUrl, '_blank');
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/reference-slips/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          referenceSlipId: referenceSlipId || (generatedFile as any)?.reference_slip_id,
          joiningFormId: joiningFormId || generatedFile?.joining_form_id,
          applicationId: applicationId || generatedFile?.application_id
        })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setEmailStatus('Email sent successfully!');
      } else {
        setEmailStatus(`Failed: ${json.error || 'Delivery failed'}`);
      }
    } catch (err: any) {
      setEmailStatus(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        // Fallback: open in new tab to trigger print
        if (signedUrl) {
          const w = window.open(signedUrl, '_blank');
          w?.focus();
        }
      }
    } else if (signedUrl) {
      const w = window.open(signedUrl, '_blank');
      w?.focus();
    }
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
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {referenceNumber}
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    border: '1px solid #C7D2FE'
                  }}
                >
                  Version {generatedFile?.version || 1}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Candidate: <strong>{candidateName}</strong> • {sourceReference}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canManage && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                title="Regenerate Document with Latest Information"
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RotateCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              title="Download Official 2-Page Reference Slip PDF"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print only the 2-Page Reference Slip document"
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                title={candidateEmail ? `Send Reference Slip to ${candidateEmail}` : 'Send Reference Slip via Resend'}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isSendingEmail ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isSendingEmail ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Mail size={15} />
                )}
                <span>{isSendingEmail ? 'Sending...' : 'Send to Candidate'}</span>
              </button>
            )}

            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in new tab"
                style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ExternalLink size={16} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Subheader: Page Status Metadata */}
        <div
          style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: '#F1F5F9',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#475569'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="#10B981" />
              <strong>Page 1:</strong> Official Employee Reference Slip (A TIGER GLOBAL)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileCheck size={14} color="#6366F1" />
              <strong>Page 2:</strong> Consultancy Return Form (10 Statutory Terms)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Consultancy Acceptance:</span>
            {consultancyAccepted ? (
              <span
                style={{
                  fontWeight: 700,
                  color: '#065F46',
                  backgroundColor: '#D1FAE5',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <CheckCircle2 size={12} />
                ACCEPTED {acceptedAt ? `(${new Date(acceptedAt).toLocaleDateString('en-IN')})` : ''}
              </span>
            ) : (
              <span
                style={{
                  fontWeight: 700,
                  color: '#92400E',
                  backgroundColor: '#FEF3C7',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Clock size={12} />
                PENDING ACCEPTANCE
              </span>
            )}
          </div>
        </div>

        {/* Email Status Notification Banner */}
        {emailStatus && (
          <div
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: emailStatus.startsWith('Email sent') ? '#ECFDF5' : '#FEF2F2',
              color: emailStatus.startsWith('Email sent') ? '#065F46' : '#991B1B',
              borderBottom: '1px solid #E2E8F0',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{emailStatus}</span>
            <button
              type="button"
              onClick={() => setEmailStatus(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* PDF Viewer Container */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#525659' }}>
          {iframeLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F8FAFC',
                zIndex: 2
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#4F46E5" />
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
                Loading official 2-page document...
              </p>
            </div>
          )}

          {signedUrl ? (
            <iframe
              ref={iframeRef}
              src={`${signedUrl}#toolbar=0&navpanes=0`}
              title="Official Reference Slip & Consultancy Return"
              onLoad={() => setIframeLoading(false)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
          ) : (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 1rem' }} />
              <p>No document signed URL available. Please click Generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
