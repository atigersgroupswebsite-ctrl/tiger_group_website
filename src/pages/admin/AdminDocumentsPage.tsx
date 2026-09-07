// ==============================================================================
// File: src/pages/admin/AdminDocumentsPage.tsx
// Description: Central Document Verification Queue for A Tiger Group's Admin Panel
// Access:
//   - SUPER_ADMIN: Full View, Verify, Reject
//   - COORDINATOR: Full View, Verify, Reject
//   - DOCUMENT_VERIFIER: Full View, Verify, Reject
//   - ACCOUNTANT: Read-Only View (verification/rejection disabled)
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getDocumentQueue,
  verifyCandidateDocument,
  rejectCandidateDocument,
  getDocumentSignedUrl,
  type DocumentQueueItem,
  type DocumentQueueFilters
} from '../../services/adminDocumentService';
import type { DocumentType, DocumentVerificationStatus } from '../../types/database';
import { SecureDocumentViewer } from '../../components/admin/SecureDocumentViewer';
import { RejectionDialog } from '../../components/admin/RejectionDialog';
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Check,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const STATUS_BADGES: Record<
  DocumentVerificationStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  VERIFIED: {
    label: 'Verified',
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
    label: 'Rejected',
    color: '#B91C1C',
    bg: '#FEF2F2',
    border: '#FCA5A5'
  }
};

const DOC_TYPE_LABELS: Record<string, string> = {
  PHOTO: 'Passport Photograph',
  SIGNATURE: 'Signature',
  AADHAAR: 'Aadhaar Card',
  PAN: 'PAN Card',
  BANK_PASSBOOK: 'Bank Passbook / Cheque',
  EDUCATION_CERTIFICATE: 'Education Certificate',
  ADDRESS_PROOF: 'Address Proof',
  EXPERIENCE_CERTIFICATE: 'Experience Certificate',
  OTHER: 'Other Document'
};

export const AdminDocumentsPage: React.FC = () => {
  const { role } = useAdminAuth();
  const canVerify =
    role === 'SUPER_ADMIN' || role === 'COORDINATOR' || role === 'DOCUMENT_VERIFIER';

  const [documents, setDocuments] = useState<DocumentQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    DocumentVerificationStatus | 'ALL' | 'PENDING_OR_UPLOADED'
  >('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | 'ALL'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'APPLICATION' | 'JOINING'>('ALL');

  // Secure Document Viewer State
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentQueueItem | null>(null);
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState<boolean>(false);

  // Rejection Dialog State
  const [selectedDocForReject, setSelectedDocForReject] = useState<DocumentQueueItem | null>(null);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Inline action processing
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: DocumentQueueFilters = {
        search: searchQuery,
        status: statusFilter,
        documentType: docTypeFilter,
        source: sourceFilter
      };

      const res = await getDocumentQueue(filters);
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load document verification queue.');
      } else {
        setDocuments(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while fetching document queue.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, docTypeFilter, sourceFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = documents.length;
    const pending = documents.filter(
      (d) => d.verification_status === 'PENDING' || d.verification_status === 'UPLOADED'
    ).length;
    const verified = documents.filter((d) => d.verification_status === 'VERIFIED').length;
    const rejected = documents.filter((d) => d.verification_status === 'REJECTED').length;
    return { total, pending, verified, rejected };
  }, [documents]);

  // Handle View Securely
  const handleOpenViewer = async (doc: DocumentQueueItem) => {
    setSelectedDocForView(doc);
    setIsViewerLoading(true);
    setViewerSignedUrl(null);

    try {
      const res = await getDocumentSignedUrl(doc.storage_path);
      if (res.success && res.signedUrl) {
        setViewerSignedUrl(res.signedUrl);
      } else {
        setError(res.error || 'Could not generate secure view URL for document.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate signed document view URL.');
    } finally {
      setIsViewerLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setSelectedDocForView(null);
    setViewerSignedUrl(null);
  };

  // Handle Verify via RPC
  const handleVerify = async (doc: DocumentQueueItem) => {
    if (!canVerify || processingDocId) return;
    setProcessingDocId(doc.id);
    setError(null);

    try {
      const res = await verifyCandidateDocument(doc.id);
      if (!res.success) {
        setError(res.error || 'Verification failed.');
      } else {
        const docLabel = `${DOC_TYPE_LABELS[doc.document_type] || doc.document_type}${
          doc.document_side && doc.document_side !== 'SINGLE' ? ` (${doc.document_side})` : ''
        }`;
        setSuccessMessage(`Document "${docLabel}" marked as VERIFIED.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        fetchQueue();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setProcessingDocId(null);
    }
  };

  // Handle Reject Confirmation via RPC
  const handleConfirmReject = async (reason: string) => {
    if (!selectedDocForReject || !canVerify || isRejecting) return;
    setIsRejecting(true);
    setError(null);

    try {
      const res = await rejectCandidateDocument(selectedDocForReject.id, reason);
      if (!res.success) {
        setError(res.error || 'Rejection failed.');
      } else {
        const docLabel = `${DOC_TYPE_LABELS[selectedDocForReject.document_type] || selectedDocForReject.document_type}`;
        setSuccessMessage(`Document "${docLabel}" marked as REJECTED with reason recorded.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setSelectedDocForReject(null);
        fetchQueue();
      }
    } catch (err: any) {
      setError(err?.message || 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                backgroundColor: '#EFF6FF',
                padding: '0.6rem',
                borderRadius: '8px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0
                }}
              >
                Central Document Verification Queue
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                Statutory KYC review, private storage inspection & transactional document authorization
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            color: '#334155',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Queue</span>
        </button>
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
            justifyContent: 'space-between',
            gap: '0.75rem',
            color: '#991B1B',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchQueue}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: '1px solid #DC2626',
              color: '#DC2626',
              padding: '0.25rem 0.65rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Total Uploads
            </span>
            <FileText size={18} style={{ color: '#192A56' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#192A56' }}>{stats.total}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#B45309', textTransform: 'uppercase' }}>
              Pending Review
            </span>
            <Clock size={18} style={{ color: '#B45309' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309' }}>{stats.pending}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>
              Verified Valid
            </span>
            <CheckCircle2 size={18} style={{ color: '#047857' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>{stats.verified}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#B91C1C', textTransform: 'uppercase' }}>
              Rejected / Corrections
            </span>
            <XCircle size={18} style={{ color: '#B91C1C' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B91C1C' }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }}
          />
          <input
            type="text"
            placeholder="Search candidate, ref (INQ/JOIN), doc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as DocumentVerificationStatus | 'ALL' | 'PENDING_OR_UPLOADED'
              )
            }
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_OR_UPLOADED">Pending Review Only</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="REJECTED">Rejected Only</option>
          </select>
        </div>

        {/* Document Type Filter */}
        <div style={{ flex: '0 1 210px', minWidth: '170px' }}>
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value as DocumentType | 'ALL')}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Document Types</option>
            <option value="PHOTO">Passport Photograph</option>
            <option value="SIGNATURE">Signature</option>
            <option value="AADHAAR">Aadhaar Card (Front/Back)</option>
            <option value="PAN">PAN Card</option>
            <option value="BANK_PASSBOOK">Bank Passbook / Cheque</option>
            <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
            <option value="OTHER">Other Documents</option>
          </select>
        </div>

        {/* Source Filter */}
        <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'ALL' | 'APPLICATION' | 'JOINING')}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Candidate Sources</option>
            <option value="APPLICATION">Candidate Enquiry (INQ)</option>
            <option value="JOINING">Joining Dossier (JOIN)</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchQuery || statusFilter !== 'ALL' || docTypeFilter !== 'ALL' || sourceFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setDocTypeFilter('ALL');
              setSourceFilter('ALL');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#991B1B',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem'
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Document Queue Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2
              size={32}
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem', color: '#192A56' }}
            />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading document verification queue...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#94A3B8', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#192A56', margin: '0 0 0.5rem 0' }}>
              No Documents in Queue
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {searchQuery || statusFilter !== 'ALL' || docTypeFilter !== 'ALL' || sourceFilter !== 'ALL'
                ? 'No documents match your active search and filter options.'
                : 'There are currently no uploaded candidate documents requiring processing.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Candidate & Reference</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Document Type & Side</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>File Information</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Uploaded</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Audit Info</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const statusInfo = STATUS_BADGES[doc.verification_status] || STATUS_BADGES.UPLOADED;
                  const candidateName =
                    doc.application?.full_name ||
                    doc.joining_form?.candidate_name ||
                    'Candidate Profile';
                  const appRef = doc.application?.application_number;
                  const joinRef = doc.joining_form?.joining_reference;

                  const docTypeFormatted = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
                  const sideBadge =
                    doc.document_side && doc.document_side !== 'SINGLE' ? doc.document_side : null;

                  const isProcessing = processingDocId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Candidate & Reference */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#192A56', fontSize: '0.875rem' }}>
                          {candidateName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          {appRef && (
                            <Link
                              to={`/admin/applications/${doc.application_id}?tab=documents`}
                              title="Open Candidate Application Dossier"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                backgroundColor: '#EFF6FF',
                                color: '#1E40AF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <span>{appRef}</span>
                              <ExternalLink size={10} />
                            </Link>
                          )}
                          {joinRef && (
                            <Link
                              to={`/admin/joining/${doc.joining_form_id}`}
                              title="Open Joining Form"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                backgroundColor: '#FDF4FF',
                                color: '#86198F',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <span>{joinRef}</span>
                              <ExternalLink size={10} />
                            </Link>
                          )}
                          {doc.joining_form?.company?.name && (
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              • {doc.joining_form.company.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Document Type & Side */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>{docTypeFormatted}</div>
                        {sideBadge && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '0.2rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: sideBadge === 'FRONT' ? '#0369A1' : '#4338CA',
                              backgroundColor: sideBadge === 'FRONT' ? '#F0F9FF' : '#EEF2FF',
                              border: `1px solid ${sideBadge === 'FRONT' ? '#BAE6FD' : '#C7D2FE'}`,
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {sideBadge === 'FRONT' ? 'Side 1 (Front)' : 'Side 2 (Back)'}
                          </span>
                        )}
                      </td>

                      {/* File Info */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#64748B', fontSize: '0.78rem' }}>
                        <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155', fontWeight: 600 }}>
                          {doc.original_file_name || 'Uploaded Document'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }}>
                          <span style={{ textTransform: 'uppercase' }}>
                            {doc.mime_type ? doc.mime_type.split('/')[1] : 'FILE'}
                          </span>
                          {doc.file_size && (
                            <span>• {Math.round(doc.file_size / 1024)} KB</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            color: statusInfo.color,
                            backgroundColor: statusInfo.bg,
                            border: `1px solid ${statusInfo.border}`
                          }}
                        >
                          {doc.verification_status === 'VERIFIED' && <CheckCircle2 size={11} />}
                          {(doc.verification_status === 'PENDING' || doc.verification_status === 'UPLOADED') && (
                            <Clock size={11} />
                          )}
                          {doc.verification_status === 'REJECTED' && <XCircle size={11} />}
                          <span>{statusInfo.label}</span>
                        </span>

                        {doc.rejection_reason && (
                          <div
                            style={{
                              marginTop: '0.35rem',
                              fontSize: '0.725rem',
                              color: '#B91C1C',
                              backgroundColor: '#FEF2F2',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              border: '1px solid #FECACA',
                              maxWidth: '220px',
                              lineHeight: 1.3
                            }}
                          >
                            <strong>Reason:</strong> {doc.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Uploaded Date */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#64748B', fontSize: '0.8rem' }}>
                        {new Date(doc.uploaded_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {new Date(doc.uploaded_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Audit Info */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#64748B', fontSize: '0.78rem' }}>
                        {doc.verified_at ? (
                          <div>
                            <span style={{ color: '#047857', fontWeight: 600 }}>Verified on</span>
                            <div>
                              {new Date(doc.verified_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Awaiting review</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Secure Preview Button */}
                          <button
                            onClick={() => handleOpenViewer(doc)}
                            title="Inspect Document (Private Signed Preview)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#192A56',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>

                          {/* Link to Document Detail */}
                          <Link
                            to={`/admin/documents/${doc.id}`}
                            title="Open Document Detail"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <ExternalLink size={13} />
                          </Link>

                          {/* Verification Actions (Role Gated) */}
                          {canVerify && (
                            <>
                              {doc.verification_status !== 'VERIFIED' && (
                                <button
                                  onClick={() => handleVerify(doc)}
                                  disabled={isProcessing}
                                  title="Approve & Mark Verified"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #A7F3D0',
                                    backgroundColor: '#ECFDF5',
                                    color: '#047857',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isProcessing ? (
                                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  <span>Verify</span>
                                </button>
                              )}

                              {doc.verification_status !== 'REJECTED' && (
                                <button
                                  onClick={() => setSelectedDocForReject(doc)}
                                  title="Reject Document (Reason Required)"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #FECACA',
                                    backgroundColor: '#FEF2F2',
                                    color: '#B91C1C',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECURE DOCUMENT VIEWER MODAL */}
      <SecureDocumentViewer
        document={selectedDocForView}
        signedUrl={viewerSignedUrl}
        isOpen={Boolean(selectedDocForView)}
        isLoading={isViewerLoading}
        onClose={handleCloseViewer}
      />

      {/* REJECTION REASON DIALOG */}
      <RejectionDialog
        document={selectedDocForReject}
        isOpen={Boolean(selectedDocForReject)}
        isSubmitting={isRejecting}
        onConfirm={handleConfirmReject}
        onClose={() => setSelectedDocForReject(null)}
      />
    </div>
  );
};
