// ==============================================================================
// File: src/components/admin/RegularJoiningSubmissionDossier.tsx
// Description: Administrative Dossier and Verification Workspace for Regular Joining Submissions
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Dedicated review view for regular joining records opened from Joining Submissions
//   - Complete candidate details across Sections A (1–7), B (8–21), C (22–26), D (27–30)
//   - High-fidelity preview and lightbox inspection for all 4 required statutory photographs
//   - Administrative verification controls ("Verify Candidate & Documents" / "Reject Submission")
//   - Post-verification action: "Generate Employee Reference Slip" (1-Page Vector Slip)
//   - Post-verification action: Seamless link to Employee ID Card in ID Cards section
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Briefcase,
  User,
  CreditCard,
  FileCheck2,
  FileBadge2,
  Download,
  Camera,
  ZoomIn,
  ExternalLink,
  Loader2,
  X,
  XCircle
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { RegularJoiningFormData, RegularJoiningDocItem } from '../../services/regularJoiningService';
import {
  verifyRegularJoiningSubmission,
  rejectRegularJoiningSubmission
} from '../../services/regularJoiningService';
import { RegularReferenceSlipModal } from './RegularReferenceSlipModal';
import { CompleteJoiningDocumentModal } from './CompleteJoiningDocumentModal';
import { EmployeeDocumentsPanel } from './EmployeeDocumentsPanel';
import { EmployeeIdCardPanel } from './EmployeeIdCardPanel';
import {
  getActiveCompanySignatureSignedUrl,
  getActiveCompanyStampSignedUrl
} from '../../services/companySignatureService';
import { downloadCompleteJoiningDocumentPdf } from '../../services/completeJoiningDocumentGenerator';
import type { EmployeeRow, DocumentRow } from '../../types/database';

interface RegularJoiningSubmissionDossierProps {
  formId: string;
  formData: RegularJoiningFormData;
  employee: EmployeeRow | null;
  documents?: DocumentRow[];
  canVerify: boolean;
  verifierName?: string;
  onRefresh: () => Promise<void> | void;
}

export const RegularJoiningSubmissionDossier: React.FC<RegularJoiningSubmissionDossierProps> = ({
  formId,
  formData,
  employee,
  documents: _documents,
  canVerify,
  verifierName = 'Administrator',
  onRefresh
}) => {
  const navigate = useNavigate();
  const { isJoiningOperator, role } = useAdminAuth();
  const isOperator = isJoiningOperator || role === 'REGULAR_JOINING_OPERATOR';

  // Verification & Action states
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals & Document Actions
  const [isReferenceSlipModalOpen, setIsReferenceSlipModalOpen] = useState<boolean>(false);
  const [isCompleteDocModalOpen, setIsCompleteDocModalOpen] = useState<boolean>(false);
  const [isDownloadingCompleteDoc, setIsDownloadingCompleteDoc] = useState<boolean>(false);
  const [companySignatureUrl, setCompanySignatureUrl] = useState<string | null>(null);
  const [companyStampUrl, setCompanyStampUrl] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getActiveCompanySignatureSignedUrl(),
      getActiveCompanyStampSignedUrl()
    ])
      .then(([sig, stamp]) => {
        if (isMounted) {
          if (sig) setCompanySignatureUrl(sig);
          if (stamp) setCompanyStampUrl(stamp);
        }
      })
      .catch((err) => console.warn('Company assets load warning:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownloadCompleteDoc = async () => {
    try {
      setIsDownloadingCompleteDoc(true);
      setActionError(null);
      const res = await downloadCompleteJoiningDocumentPdf(formData, {
        companySignatureUrl,
        companyStampUrl,
        verifierName
      });
      if (res.success) {
        setActionSuccess(`Downloaded Complete Joining Document (${res.fileName})`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || 'Failed to download complete joining document');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error generating Complete Joining Document');
    } finally {
      setIsDownloadingCompleteDoc(false);
    }
  };

  const status = formData.submissionStatus || 'DRAFT';
  const isVerified = status === 'VERIFIED';
  const isPending = status === 'SUBMITTED';
  const isRejected = status === 'REJECTED';

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Handler: Verify Regular Joining Submission
  const handleVerifySubmission = async () => {
    if (!canVerify) {
      alert('You do not have administrative permission to verify joining records.');
      return;
    }

    const confirmMsg = `Are you sure you want to verify candidate ${formData.fullName} (${formData.employeeCode})? This will confirm all 4 statutory documents and provision the official employee record.`;
    if (!window.confirm(confirmMsg)) return;

    setIsVerifying(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await verifyRegularJoiningSubmission(formId, verifierName);
      if (!res.success) {
        throw new Error(res.error || 'Failed to verify regular joining record.');
      }

      setActionSuccess(`Submission successfully verified for ${formData.fullName} (${res.data?.employeeCode})! Reference Slip and ID Card generation are now available.`);
      await onRefresh();
    } catch (err: any) {
      console.error('[handleVerifySubmission] Error:', err);
      setActionError(err.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handler: Reject Regular Joining Submission
  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }

    setIsRejecting(true);
    setActionError(null);

    try {
      const res = await rejectRegularJoiningSubmission(formId, rejectionReason.trim(), verifierName);
      if (!res.success) {
        throw new Error(res.error || 'Failed to reject submission.');
      }

      setShowRejectModal(false);
      setRejectionReason('');
      setActionSuccess('Submission rejected. Rejection reason has been recorded.');
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  const renderDocCard = (
    title: string,
    itemNumber: string,
    doc: RegularJoiningDocItem | null | undefined,
    fallbackLabel: string
  ) => {
    const isUploaded = Boolean(doc?.dataUrl || doc?.storagePath);
    const imageUrl = doc?.dataUrl;

    return (
      <div
        style={{
          border: isUploaded ? '1px solid #CBD5E1' : '1px dashed #F87171',
          borderRadius: '8px',
          padding: '0.85rem',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '230px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F1B38' }}>
            {itemNumber}. {title}
          </span>
          {isVerified ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              <CheckCircle2 size={11} />
              <span>Verified</span>
            </span>
          ) : isUploaded ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              <CheckCircle2 size={11} />
              <span>Uploaded</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#B91C1C',
                backgroundColor: '#FEE2E2',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              <AlertCircle size={11} />
              <span>Missing *</span>
            </span>
          )}
        </div>

        {/* Thumbnail Box */}
        <div
          style={{
            width: '100%',
            height: '130px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={`${title} Preview`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '130px',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <button
                type="button"
                onClick={() => setInspectDoc({ title: `${itemNumber}. ${title}`, url: imageUrl })}
                title="Click to inspect photograph in full resolution"
                style={{
                  position: 'absolute',
                  right: '6px',
                  bottom: '6px',
                  backgroundColor: 'rgba(15, 27, 56, 0.85)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer'
                }}
              >
                <ZoomIn size={12} />
                <span>Inspect</span>
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94A3B8' }}>
              <Camera size={26} style={{ margin: '0 auto 0.25rem auto', color: '#CBD5E1' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fallbackLabel}</div>
              <div style={{ fontSize: '0.7rem', color: '#DC2626' }}>Document required</div>
            </div>
          )}
        </div>

        {/* File metadata */}
        <div style={{ width: '100%', marginTop: '0.5rem', textAlign: 'left', fontSize: '0.72rem', color: '#64748B' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
            {doc?.name || 'No file selected'}
          </div>
          {doc?.size ? <div>Size: {formatFileSize(doc.size)}</div> : null}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Banner Navigation & Summary Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(isOperator ? '/admin/regular-joining-list' : '/admin/joining')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>{isOperator ? 'Back to Joining Submissions' : 'Back to Joining Register'}</span>
          </button>

          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '0.85rem',
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              padding: '3px 9px',
              borderRadius: '4px'
            }}
          >
            {formData.employeeCode}
          </span>

          {/* Workflow Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#0F1B38',
              color: '#C5A059',
              border: '1px solid #C5A059',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <ShieldCheck size={12} />
            <span>Regular Joining</span>
          </span>

          {/* Status Badge */}
          {isVerified ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                padding: '3px 9px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <CheckCircle2 size={12} />
              <span>VERIFIED</span>
            </span>
          ) : isRejected ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#991B1B',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                padding: '3px 9px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <AlertCircle size={12} />
              <span>REJECTED</span>
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                padding: '3px 9px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Clock size={12} />
              <span>PENDING VERIFICATION</span>
            </span>
          )}
        </div>

        {/* Action Buttons in Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Download Complete Joining Document Button */}
          <button
            type="button"
            onClick={handleDownloadCompleteDoc}
            disabled={isDownloadingCompleteDoc}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: '#0F1B38',
              color: '#C5A059',
              border: '1px solid #C5A059',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: isDownloadingCompleteDoc ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {isDownloadingCompleteDoc ? <Loader2 size={15} className="admin-spinner" /> : <Download size={15} />}
            <span>Download Complete Joining Document</span>
          </button>

          {/* View Complete Document & Undertaking Modal Button */}
          <button
            type="button"
            onClick={() => setIsCompleteDocModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: '#F8FAFC',
              color: '#0F1B38',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileBadge2 size={15} style={{ color: '#C5A059' }} />
            <span>Complete Document & Undertaking</span>
          </button>

          {isVerified ? (
            <>
              {/* Generate Employee Reference Slip Button */}
              <button
                type="button"
                onClick={() => setIsReferenceSlipModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1rem',
                  backgroundColor: '#C5A059',
                  color: '#0F1B38',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <FileCheck2 size={16} />
                <span>Generate Employee Reference Slip</span>
              </button>

              {/* Navigate to ID Cards Section Button (Admins only) */}
              {!isOperator && (
                <button
                  type="button"
                  onClick={() => {
                    if (employee?.id) {
                      navigate(`/admin/employees/${employee.id}`);
                    } else {
                      navigate('/admin/employees');
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <CreditCard size={15} style={{ color: '#C5A059' }} />
                  <span>Open in ID Cards Section</span>
                  <ExternalLink size={13} />
                </button>
              )}
            </>
          ) : isPending ? (
            <>
              {/* Verify Submission Action */}
              <button
                type="button"
                onClick={handleVerifySubmission}
                disabled={isVerifying || !canVerify}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.1rem',
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(21, 128, 61, 0.2)'
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Verify Candidate & Documents</span>
                  </>
                )}
              </button>

              {/* Reject Submission Action */}
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isVerifying || !canVerify}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.9rem',
                  backgroundColor: '#FFFFFF',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Action Notifications */}
      {actionSuccess && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.85rem 1rem', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '0.85rem 1rem', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Verification Guidance Banner */}
      {isPending && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem'
          }}
        >
          <Clock size={22} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#92400E' }}>
              Statutory Administrative Verification Required
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350F', lineHeight: 1.45 }}>
              Please inspect the candidate biographical details, statutory identifiers, banking coordinates, and the 4 uploaded photographs below. Once verified, click <strong>"Verify Candidate & Documents"</strong> above to officially authorize this candidate, provision their employee profile, and unlock single-page Reference Slip and ID Card generation.
            </p>
          </div>
        </div>
      )}

      {isVerified && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #22C55E',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={24} style={{ color: '#16A34A', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#166534' }}>
                Statutory Verification Complete
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803D' }}>
                Verified on {new Date(formData.verifiedAt || '').toLocaleDateString('en-IN')} by {formData.verifiedBy || 'Administrator'}.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setIsReferenceSlipModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: '#C5A059',
                color: '#0F1B38',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileCheck2 size={14} />
              <span>Reference Slip</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION A: JOINING DETAILS (1–7)
          ========================================================================= */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Briefcase size={16} style={{ color: '#0F1B38' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SECTION A: JOINING DETAILS (1–7)
          </h3>
        </div>
        <div
          style={{
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              1. Employee Code / Joining Ref:
            </span>
            <strong style={{ color: '#0F1B38', fontFamily: 'monospace', fontSize: '0.92rem' }}>
              {formData.employeeCode}
            </strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              2. Joining Date:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formatDate(formData.joiningDate)}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              3. Department:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.department || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              4. Designation:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.designation || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              5. Company Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.companyName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              6. Unit Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.unitName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              7. Factory / Supervisor Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.factorySupervisorName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              Date of Interview:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formatDate(formData.interviewDate)}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              Salary (CTC) / Month:
            </span>
            <strong style={{ color: '#0F1B38' }}>
              {formData.salaryCtc ? `INR ${formData.salaryCtc.toLocaleString('en-IN')}` : '—'}
            </strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: CANDIDATE PERSONAL DETAILS (8–21)
          ========================================================================= */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <User size={16} style={{ color: '#0F1B38' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SECTION B: CANDIDATE PERSONAL DETAILS (8–21)
          </h3>
        </div>
        <div
          style={{
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              8. Full Name:
            </span>
            <strong style={{ color: '#0F1B38', fontSize: '0.9rem' }}>{formData.fullName}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              9. Father's Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.fatherName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              10. Date of Birth:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formatDate(formData.dob)}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              11. Gender:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.gender}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              12. Marital Status:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.maritalStatus}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              13. Aadhaar Card Number:
            </span>
            <strong style={{ color: '#0F1B38', fontFamily: 'monospace' }}>
              {formData.aadhaarNumber ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}` : '—'}
            </strong>
          </div>

          {/* Long Addresses */}
          <div style={{ gridColumn: '1 / -1', minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              14. Permanent Address:
            </span>
            <span style={{ color: '#0F1B38', lineHeight: 1.4, fontWeight: 500 }}>
              {formData.permanentAddress || '—'}
            </span>
          </div>
          <div style={{ gridColumn: '1 / -1', minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              15. Current Address:
            </span>
            <span style={{ color: '#0F1B38', lineHeight: 1.4, fontWeight: 500 }}>
              {formData.sameAsPermanent ? 'Same as Permanent Address' : (formData.currentAddress || '—')}
            </span>
          </div>

          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              16. UAN Number:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.uanNumber || 'None'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              17. ESIC Number:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.esicNumber || 'None'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              18. PT Number:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.ptNumber || 'None'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              19. Aadhaar-Linked Mobile:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.mobile || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              20. Alternate Mobile Number:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.alternateMobile || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              21. Email ID:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.email || '—'}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C: BANK DETAILS (22–26)
          ========================================================================= */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CreditCard size={16} style={{ color: '#0F1B38' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SECTION C: BANK DETAILS (22–26)
          </h3>
        </div>
        <div
          style={{
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              22. Bank Account Number:
            </span>
            <strong style={{ color: '#0F1B38', fontFamily: 'monospace' }}>
              {formData.bankAccountNumber || '—'}
            </strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              23. IFSC Code:
            </span>
            <strong style={{ color: '#0F1B38', fontFamily: 'monospace' }}>
              {formData.ifscCode || '—'}
            </strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              24. Bank Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.bankName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              25. Branch Name:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.branchName || '—'}</strong>
          </div>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              26. PhonePe / UPI Number:
            </span>
            <strong style={{ color: '#0F1B38' }}>{formData.upiNumber || '—'}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION D: REQUIRED DOCUMENTS (27–30)
          ========================================================================= */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileCheck2 size={16} style={{ color: '#0F1B38' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SECTION D: REQUIRED DOCUMENTS (27–30)
          </h3>
        </div>
        <div
          style={{
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem'
          }}
        >
          {renderDocCard('Live Photo', '27', formData.photo, 'Live Photo')}
          {renderDocCard('Aadhaar Card Photo', '28', formData.aadhaar, 'Aadhaar Card')}
          {renderDocCard('Bank Passbook Photo', '29', formData.bankPassbook, 'Passbook / Cheque')}
          {renderDocCard('Signature Photo', '30', formData.signature, 'Candidate Signature')}
        </div>
      </div>

      {/* =========================================================================
          EMPLOYEE DOCUMENTS REPOSITORY SECTION (8 ITEMS)
          ========================================================================= */}
      <div className="no-print">
        <EmployeeDocumentsPanel
          employeeCode={formData.employeeCode}
          formData={formData}
          employee={employee}
          companySignatureUrl={companySignatureUrl}
          companyStampUrl={companyStampUrl}
          verifierName={verifierName}
          onRefresh={onRefresh}
        />
      </div>

      {/* =========================================================================
          POST-VERIFICATION PANELS: REFERENCE SLIP & ID CARD
          ========================================================================= */}
      {isVerified && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '0.5rem' }}>
          {/* Reference Slip Governance Box */}
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: '0 0 0.25rem 0' }}>
                  EMPLOYEE REFERENCE SLIP (SINGLE-PAGE FORM)
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
                  Statutory single-page A4 portrait reference slip for {formData.fullName} ({formData.employeeCode}).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsReferenceSlipModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#C5A059',
                  color: '#0F1B38',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <FileCheck2 size={16} />
                <span>View / Generate Reference Slip</span>
              </button>
            </div>
          </div>

          {/* Employee ID Card Governance Box */}
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: '0 0 0.25rem 0' }}>
                  EMPLOYEE IDENTITY CARD GOVERNANCE
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
                  Integrated employee identity credentials associated with employee master record.
                </p>
              </div>

              {!isOperator && employee?.id && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/employees/${employee.id}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open in ID Cards Directory</span>
                </button>
              )}
            </div>

            {/* Embedded ID Card Panel for immediate management */}
            <EmployeeIdCardPanel
              joiningFormId={formId}
              candidateName={formData.fullName}
              candidateEmail={formData.email}
              candidateMobile={formData.mobile}
              dob={formData.dob}
              address={formData.currentAddress || formData.permanentAddress}
              photoUrl={formData.photo?.storagePath}
              signatureUrl={formData.signature?.storagePath}
              existingEmployee={employee}
              onEmployeeUpdated={onRefresh}
            />
          </div>
        </div>
      )}

      {/* 1-Page Reference Slip Modal */}
      <RegularReferenceSlipModal
        isOpen={isReferenceSlipModalOpen}
        onClose={() => setIsReferenceSlipModalOpen(false)}
        formData={formData}
      />

      {/* Multi-Page Complete Joining Document Modal */}
      <CompleteJoiningDocumentModal
        isOpen={isCompleteDocModalOpen}
        onClose={() => setIsCompleteDocModalOpen(false)}
        formData={formData}
        companySignatureUrl={companySignatureUrl}
        verifierName={verifierName}
      />

      {/* Rejection Modal */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#991B1B' }}>
                Reject Regular Joining Submission
              </h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
              Please specify the reason for rejecting <strong>{formData.fullName}</strong> ({formData.employeeCode}). This reason will be recorded on the submission dossier.
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Ineligible statutory documents; blurred bank passbook photograph..."
              style={{
                width: '100%',
                padding: '0.65rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={isRejecting}
                className="btn btn-outline"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isRejecting || !rejectionReason.trim()}
                style={{
                  padding: '0.55rem 1.1rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isRejecting ? 'not-allowed' : 'pointer'
                }}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Inspection Modal */}
      {inspectDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setInspectDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #1E293B'
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C5A059' }}>
                {inspectDoc.title}
              </span>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              <img
                src={inspectDoc.url}
                alt={inspectDoc.title}
                style={{
                  maxWidth: '80vw',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
