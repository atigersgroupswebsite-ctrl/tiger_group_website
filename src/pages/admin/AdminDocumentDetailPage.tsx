// ==============================================================================
// File: src/pages/admin/AdminDocumentDetailPage.tsx
// Description: Detailed Document Inspection Workspace & Transactional Verification
// Brand: A Tiger Group's — Operational Admin Panel
// Security:
//   - Strictly uses temporary authenticated signed URLs
//   - Candidate statutory numbers (Aadhaar/PAN/Bank) are never logged
//   - Role-gated verification/rejection via PostgreSQL RPCs
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getDocumentById,
  verifyCandidateDocument,
  rejectCandidateDocument,
  getDocumentSignedUrl,
  type DocumentQueueItem
} from '../../services/adminDocumentService';
import { getEntityActivityLogs } from '../../services/activityService';
import type { ActivityLogRow, DocumentVerificationStatus } from '../../types/database';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { RejectionDialog } from '../../components/admin/RejectionDialog';
import { SecureDocumentViewer } from '../../components/admin/SecureDocumentViewer';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  Calendar,
  Check,
  Activity,
  Maximize2
} from 'lucide-react';

const STATUS_BADGES: Record<
  DocumentVerificationStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  VERIFIED: {
    label: 'Verified & Approved',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0'
  },
  UPLOADED: {
    label: 'Pending Review',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A'
  },
  PENDING: {
    label: 'Pending Review',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A'
  },
  REJECTED: {
    label: 'Rejected / Action Required',
    color: '#B91C1C',
    bg: '#FEF2F2',
    border: '#FCA5A5'
  }
};

const DOC_TYPE_LABELS: Record<string, string> = {
  PHOTO: 'Passport Photograph',
  SIGNATURE: 'Candidate Signature',
  AADHAAR: 'Aadhaar Identity Card',
  PAN: 'Income Tax PAN Card',
  BANK_PASSBOOK: 'Bank Passbook / Cancelled Cheque',
  EDUCATION_CERTIFICATE: 'Highest Education Certificate',
  ADDRESS_PROOF: 'Address Verification Proof',
  EXPERIENCE_CERTIFICATE: 'Prior Experience Certificate',
  OTHER: 'Supplementary Operational Document'
};

export const AdminDocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAdminAuth();
  const canVerify =
    role === 'SUPER_ADMIN' || role === 'COORDINATOR' || role === 'DOCUMENT_VERIFIER';

  const [document, setDocument] = useState<DocumentQueueItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const loadDocumentData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Document
      const docRes = await getDocumentById(id);
      if (!docRes.success || !docRes.data) {
        setError(docRes.error || 'Document not found in database.');
        setLoading(false);
        return;
      }
      const doc = docRes.data;
      setDocument(doc);

      // 2. Fetch Secure Signed URL for private storage inspection
      if (doc.storage_path) {
        const urlRes = await getDocumentSignedUrl(doc.storage_path);
        if (urlRes.success && urlRes.signedUrl) {
          setSignedUrl(urlRes.signedUrl);
        }
      }

      // 3. Fetch Audit Logs for this document
      const logs = await getEntityActivityLogs('DOCUMENT', id);
      setActivityLogs(logs || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load document information.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocumentData();
  }, [loadDocumentData]);

  // Handle Verify Action
  const handleVerify = async () => {
    if (!document || !canVerify || isVerifying) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await verifyCandidateDocument(document.id);
      if (!res.success) {
        setError(res.error || 'Verification failed.');
      } else {
        setSuccessMessage('Document has been officially verified and approved.');
        setTimeout(() => setSuccessMessage(null), 4000);
        loadDocumentData();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Reject Action
  const handleConfirmReject = async (reason: string) => {
    if (!document || !canVerify || isRejecting) return;
    setIsRejecting(true);
    setError(null);

    try {
      const res = await rejectCandidateDocument(document.id, reason);
      if (!res.success) {
        setError(res.error || 'Rejection failed.');
      } else {
        setSuccessMessage('Document marked as rejected with reason recorded.');
        setTimeout(() => setSuccessMessage(null), 4000);
        setIsRejectDialogOpen(false);
        loadDocumentData();
      }
    } catch (err: any) {
      setError(err?.message || 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B' }}>
        <Loader2
          size={36}
          style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#192A56' }}
        />
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading statutory document details...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#991B1B'
          }}
        >
          <AlertCircle size={36} style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Document Unavailable</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
            {error || 'Document not found in database records.'}
          </p>
          <Link
            to={ADMIN_ROUTES.documents}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#192A56',
              color: '#FFFFFF',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={14} /> Back to Document Queue
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_BADGES[document.verification_status] || STATUS_BADGES.UPLOADED;
  const docTypeTitle = DOC_TYPE_LABELS[document.document_type] || document.document_type;
  const sideBadge =
    document.document_side && document.document_side !== 'SINGLE'
      ? document.document_side
      : null;

  const candidateName =
    document.application?.full_name ||
    document.joining_form?.candidate_name ||
    'Candidate Profile';
  const appRef = document.application?.application_number;
  const joinRef = document.joining_form?.joining_reference;

  const isPdf =
    document.mime_type?.includes('pdf') ||
    document.original_file_name?.toLowerCase().endsWith('.pdf') ||
    document.storage_path?.toLowerCase().endsWith('.pdf');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to={ADMIN_ROUTES.documents}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#192A56',
            fontSize: '0.825rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Document Queue</span>
        </Link>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#065F46',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#991B1B',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0
                }}
              >
                {docTypeTitle}
              </h1>
              {sideBadge && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: sideBadge === 'FRONT' ? '#0369A1' : '#4338CA',
                    backgroundColor: sideBadge === 'FRONT' ? '#F0F9FF' : '#EEF2FF',
                    border: `1px solid ${sideBadge === 'FRONT' ? '#BAE6FD' : '#C7D2FE'}`,
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {sideBadge === 'FRONT' ? 'Side 1 (Front View)' : 'Side 2 (Back View)'}
                </span>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: statusInfo.color,
                  backgroundColor: statusInfo.bg,
                  border: `1px solid ${statusInfo.border}`
                }}
              >
                {document.verification_status === 'VERIFIED' && <CheckCircle2 size={12} />}
                {(document.verification_status === 'PENDING' ||
                  document.verification_status === 'UPLOADED') && <Clock size={12} />}
                {document.verification_status === 'REJECTED' && <XCircle size={12} />}
                <span>{statusInfo.label}</span>
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.85rem',
                color: '#64748B',
                marginTop: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#192A56' }}>
                <User size={14} style={{ color: '#64748B' }} />
                <span>{candidateName}</span>
              </div>
              {appRef && (
                <Link
                  to={`/admin/applications/${document.application_id}?tab=documents`}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#EFF6FF',
                    color: '#1E40AF',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>App: {appRef}</span>
                  <ExternalLink size={10} />
                </Link>
              )}
              {joinRef && (
                <Link
                  to={`/admin/joining/${document.joining_form_id}`}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#FDF4FF',
                    color: '#86198F',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>Joining: {joinRef}</span>
                  <ExternalLink size={10} />
                </Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} style={{ color: '#94A3B8' }} />
                <span>
                  Uploaded on{' '}
                  {new Date(document.uploaded_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {signedUrl && (
              <button
                onClick={() => setIsViewerOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  backgroundColor: '#FFFFFF',
                  color: '#192A56',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={14} />
                <span>Fullscreen Viewer</span>
              </button>
            )}

            {canVerify && (
              <>
                {document.verification_status !== 'VERIFIED' && (
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1.15rem',
                      backgroundColor: '#047857',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {isVerifying ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Verify & Approve Document</span>
                  </button>
                )}

                {document.verification_status !== 'REJECTED' && (
                  <button
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={isRejecting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1rem',
                      backgroundColor: '#FEF2F2',
                      color: '#B91C1C',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      cursor: 'pointer'
                    }}
                  >
                    <XCircle size={14} />
                    <span>Reject with Reason</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Workspace: Left = Document View / Right = Audit & Context */}
      <div className="admin-detail-split-grid">
        {/* Left Column: Private Storage Document Preview */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} style={{ color: '#1E40AF' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#192A56' }}>
                Encrypted Private Preview (Signed Token)
              </span>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#64748B' }}>
              Bucket: candidate-documents (Private)
            </span>
          </div>

          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '460px',
              backgroundColor: '#F1F5F9'
            }}
          >
            {!signedUrl ? (
              <div style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 0.5rem', color: '#94A3B8' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Unable to load signed storage preview. The file path may not exist or has expired.
                </p>
              </div>
            ) : isPdf ? (
              <iframe
                src={`${signedUrl}#toolbar=0`}
                title={docTypeTitle}
                style={{
                  width: '100%',
                  height: '600px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF'
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', maxWidth: '100%' }}>
                <img
                  src={signedUrl}
                  alt={docTypeTitle}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata, Rejection Banner & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Rejection Alert if Rejected */}
          {document.verification_status === 'REJECTED' && document.rejection_reason && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#991B1B' }}>
                <XCircle size={18} />
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Rejection Reason Stored</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                {document.rejection_reason}
              </p>
            </div>
          )}

          {/* Operational Metadata Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem'
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#192A56',
                margin: '0 0 1rem 0',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '0.75rem'
              }}
            >
              File & Storage Specifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Original File Name:</span>{' '}
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {document.original_file_name || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>MIME Content Type:</span>{' '}
                <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                  {document.mime_type || 'Unknown'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>File Size:</span>{' '}
                <span style={{ color: '#334155' }}>
                  {document.file_size ? `${Math.round(document.file_size / 1024)} KB` : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Storage Path:</span>{' '}
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.725rem',
                    color: '#64748B',
                    wordBreak: 'break-all'
                  }}
                >
                  {document.storage_path || 'No path recorded'}
                </span>
              </div>
              {document.verified_at && (
                <div>
                  <span style={{ color: '#94A3B8' }}>Verified Timestamp:</span>{' '}
                  <span style={{ color: '#047857', fontWeight: 600 }}>
                    {new Date(document.verified_at).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Candidate Association Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem'
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#192A56',
                margin: '0 0 1rem 0',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '0.75rem'
              }}
            >
              Candidate Ownership
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Full Name:</span>{' '}
                <span style={{ fontWeight: 700, color: '#192A56' }}>{candidateName}</span>
              </div>
              {document.application?.mobile && (
                <div>
                  <span style={{ color: '#94A3B8' }}>Registered Mobile:</span>{' '}
                  <span style={{ color: '#334155' }}>{document.application.mobile}</span>
                </div>
              )}
              {document.joining_form?.company?.name && (
                <div>
                  <span style={{ color: '#94A3B8' }}>Deployed Client:</span>{' '}
                  <span style={{ color: '#1E40AF', fontWeight: 600 }}>
                    {document.joining_form.company.name}
                  </span>
                </div>
              )}
              {document.joining_form?.employee_code && (
                <div>
                  <span style={{ color: '#94A3B8' }}>Employee Code:</span>{' '}
                  <span style={{ fontFamily: 'monospace', color: '#334155' }}>
                    {document.joining_form.employee_code}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log Trail */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Activity size={16} style={{ color: '#192A56' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Audit Events ({activityLogs.length})
              </h3>
            </div>

            {activityLogs.length === 0 ? (
              <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem', margin: 0 }}>
                No direct document events recorded yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, color: '#1E40AF' }}>{log.action}</span>
                      <span style={{ color: '#94A3B8' }}>
                        {new Date(log.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div style={{ color: '#475569' }}>{log.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN SECURE VIEWER MODAL */}
      <SecureDocumentViewer
        document={document}
        signedUrl={signedUrl}
        isOpen={isViewerOpen}
        isLoading={false}
        onClose={() => setIsViewerOpen(false)}
      />

      {/* REJECTION REASON DIALOG */}
      <RejectionDialog
        document={document}
        isOpen={isRejectDialogOpen}
        isSubmitting={isRejecting}
        onConfirm={handleConfirmReject}
        onClose={() => setIsRejectDialogOpen(false)}
      />
    </div>
  );
};
