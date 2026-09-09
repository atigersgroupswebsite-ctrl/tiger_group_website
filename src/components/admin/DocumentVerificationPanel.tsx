// ==============================================================================
// File: src/components/admin/DocumentVerificationPanel.tsx
// Description: Primary Admin Document Verification Workspace for Candidate Applications
//              and Standalone Joining Dossiers (Isolated Candidate Context)
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security:
//   - Strict Admin Authorization (SUPER_ADMIN, DOCUMENT_VERIFIER, COORDINATOR)
//   - Zero cross-candidate data leakage (scoped to candidate's own records)
//   - Private Storage retrieval via temporary signed URLs
//   - Audited actions recorded in activity_logs
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Clock
} from 'lucide-react';
import type { DocumentRow } from '../../types/database';
import {
  calculateDocumentVerificationStats,
  verifyCandidateDocument,
  rejectCandidateDocument,
  getDocumentSignedUrl,
  CONFIGURED_REQUIRED_DOCUMENTS
} from '../../services/adminDocumentService';
import { DocumentSummary } from './DocumentSummary';
import { DocumentCard } from './DocumentCard';
import { SecureDocumentViewer } from './SecureDocumentViewer';
import { RejectionDialog } from './RejectionDialog';

interface DocumentVerificationPanelProps {
  applicationId?: string | null;
  joiningFormId?: string | null;
  candidateName?: string;
  referenceNumber?: string;
  documents: DocumentRow[];
  canVerify: boolean;
  onRefresh: () => void;
}

export const DocumentVerificationPanel: React.FC<DocumentVerificationPanelProps> = ({
  applicationId: _applicationId,
  joiningFormId: _joiningFormId,
  candidateName,
  referenceNumber,
  documents,
  canVerify,
  onRefresh
}) => {
  // Local document state — mirrors the documents prop but allows in-place
  // updates after verify/reject without triggering a full parent page reload.
  const [localDocuments, setLocalDocuments] = useState<DocumentRow[]>(documents);

  // Resync whenever the parent passes fresh data (e.g. on explicit Refresh).
  useEffect(() => {
    setLocalDocuments(documents);
  }, [documents]);

  // Helper: update a single document in local state by id.
  const updateLocalDocument = (docId: string, patch: Partial<DocumentRow>) => {
    setLocalDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, ...patch } : d))
    );
  };

  const stats = useMemo(
    () => calculateDocumentVerificationStats(localDocuments),
    [localDocuments]
  );

  // Modal states
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentRow | null>(null);
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState<boolean>(false);

  const [selectedDocForReject, setSelectedDocForReject] = useState<DocumentRow | null>(null);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);

  // Handle View / Preview
  const handleOpenViewer = async (doc: DocumentRow) => {
    setSelectedDocForView(doc);
    setIsViewerLoading(true);
    setViewerSignedUrl(null);

    try {
      const res = await getDocumentSignedUrl(doc.storage_path);
      if (res.success && res.signedUrl) {
        setViewerSignedUrl(res.signedUrl);
      } else {
        setPanelError(res.error || 'Could not generate secure document preview.');
      }
    } catch (err: any) {
      setPanelError(err.message || 'Failed to open document preview.');
    } finally {
      setIsViewerLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setSelectedDocForView(null);
    setViewerSignedUrl(null);
  };

  // Handle Verify
  const handleVerify = async (doc: DocumentRow) => {
    if (!canVerify) return;
    setProcessingDocId(doc.id);
    setPanelError(null);
    setPanelSuccess(null);

    try {
      const res = await verifyCandidateDocument(doc.id);
      if (res.success) {
        // In-place update: patch the document's status in local state so the
        // card re-renders immediately without causing a full page reload.
        updateLocalDocument(doc.id, {
          verification_status: 'VERIFIED',
          verified_at: res.verifiedAt || new Date().toISOString(),
          rejection_reason: null
        });
        setPanelSuccess(
          `Successfully verified ${doc.document_type.replace(/_/g, ' ')}${
            doc.document_side && doc.document_side !== 'SINGLE' ? ` (${doc.document_side})` : ''
          }.`
        );
        // Do NOT call onRefresh() here — no page reload needed.
      } else {
        setPanelError(res.error || 'Failed to verify document.');
      }
    } catch (err: any) {
      setPanelError(err.message || 'An error occurred during verification.');
    } finally {
      setProcessingDocId(null);
    }
  };

  // Handle Reject
  const handleOpenReject = (doc: DocumentRow) => {
    if (!canVerify) return;
    setSelectedDocForReject(doc);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!selectedDocForReject) return;
    setIsRejecting(true);
    setPanelError(null);
    setPanelSuccess(null);

    try {
      const res = await rejectCandidateDocument(selectedDocForReject.id, reason);
      if (res.success) {
        // In-place update: patch the document's status and rejection reason in
        // local state so the card re-renders immediately without a page reload.
        updateLocalDocument(selectedDocForReject.id, {
          verification_status: 'REJECTED',
          rejection_reason: res.rejectionReason || reason.trim(),
          verified_at: null
        });
        setPanelSuccess(
          `Rejected ${selectedDocForReject.document_type.replace(/_/g, ' ')}. Candidate audit log updated with rejection reason.`
        );
        setSelectedDocForReject(null);
        // Do NOT call onRefresh() here — no page reload needed.
      } else {
        setPanelError(res.error || 'Failed to reject document.');
      }
    } catch (err: any) {
      setPanelError(err.message || 'An error occurred during rejection.');
    } finally {
      setIsRejecting(false);
    }
  };

  // 1. Resolve 6 Mandatory Statutory Requirements — derived from localDocuments.
  const mandatorySpecs = CONFIGURED_REQUIRED_DOCUMENTS.filter((s) => s.required);

  // Match each mandatory requirement to candidate's uploaded document
  const mappedStatutorySlots = useMemo(() =>
    mandatorySpecs.map((spec) => {
      const matchingDoc = localDocuments.find((doc) => {
        if (doc.document_type !== spec.type) return false;
        if (spec.side) {
          return doc.document_side === spec.side;
        }
        return true;
      });
      return { spec, doc: matchingDoc || null };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localDocuments]
  );

  // Track matched doc IDs so we don't duplicate them in additional documents
  const matchedDocIds = useMemo(
    () => new Set(
      mappedStatutorySlots.map((slot) => slot.doc?.id).filter(Boolean) as string[]
    ),
    [mappedStatutorySlots]
  );

  // 2. Resolve Additional / Supporting Documents (Education certificates, address proofs, etc.)
  const additionalDocs = useMemo(
    () => localDocuments.filter((d) => !matchedDocIds.has(d.id)),
    [localDocuments, matchedDocIds]
  );

  return (
    <div>
      {/* Candidate Identity Context Banner */}
      {(candidateName || referenceNumber) && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #192A56',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.725rem',
                fontWeight: 800,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Candidate Identity Context
            </div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#192A56',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              <span>{candidateName || 'Candidate Profile'}</span>
              {referenceNumber && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#E2E8F0',
                    color: '#0F1B38',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {referenceNumber}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              fontSize: '0.775rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0'
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>Dedicated Verification Workspace • Zero Cross-Candidate Leakage</span>
          </div>
        </div>
      )}

      {/* Document Summary Metrics Banner */}
      <DocumentSummary stats={stats} totalDocumentsCount={localDocuments.length} />

      {/* Action Notices */}
      {panelError && (
        <div
          style={{
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <AlertCircle size={18} color="#C9726F" />
          <span style={{ fontSize: '0.85rem', color: '#C9726F', fontWeight: 600 }}>{panelError}</span>
        </div>
      )}

      {panelSuccess && (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <CheckCircle size={18} color="#2E7D32" />
          <span style={{ fontSize: '0.85rem', color: '#2E7D32', fontWeight: 600 }}>{panelSuccess}</span>
        </div>
      )}

      {/* =========================================================================
          STATUTORY MANDATORY DOCUMENTS (6 MANDATORY REQUIREMENTS)
          ========================================================================= */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              Statutory Required Documents ({stats.uploadedCount} of {stats.totalRequired} uploaded)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Mandatory identification, photograph, specimen signature, and banking details for verified active workforce onboarding.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="btn-admin-secondary"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1rem'
          }}
        >
          {mappedStatutorySlots.map(({ spec, doc }) => {
            if (doc) {
              // Document is uploaded: Render full interactive DocumentCard
              return (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isProcessing={processingDocId === doc.id}
                  canVerify={canVerify}
                  onView={handleOpenViewer}
                  onVerify={handleVerify}
                  onReject={handleOpenReject}
                />
              );
            }

            // Document is NOT yet uploaded by the candidate: Render missing statutory placeholder
            return (
              <div
                key={`missing-${spec.type}-${spec.side || 'single'}`}
                className="admin-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px dashed #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  minHeight: '220px',
                  minWidth: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              >
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      width: '100%',
                      minWidth: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: '1 1 auto' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#F1F5F9',
                          color: '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: '#475569',
                            wordBreak: 'break-word',
                            lineHeight: 1.25
                          }}
                        >
                          {spec.label}
                        </h4>
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: '#94A3B8',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Mandatory Statutory Requirement
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Clock size={11} />
                      <span>NOT UPLOADED</span>
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4, margin: '0.75rem 0' }}>
                    This mandatory compliance document has not yet been submitted by candidate in the Joining Form dossier.
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #E2E8F0',
                    fontSize: '0.725rem',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <AlertTriangle size={12} color="#D97706" />
                  <span>Awaiting candidate upload before onboarding verification.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          ADDITIONAL / SUPPORTING DOCUMENTS (Education, Address Proof, etc.)
          ========================================================================= */}
      {additionalDocs.length > 0 && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              Additional & Supporting Documents ({additionalDocs.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Highest education certificates, address proofs, experience credentials, and supporting candidate attachments.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '1rem'
            }}
          >
            {additionalDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isProcessing={processingDocId === doc.id}
                canVerify={canVerify}
                onView={handleOpenViewer}
                onVerify={handleVerify}
                onReject={handleOpenReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Secure Document Viewer Modal */}
      <SecureDocumentViewer
        document={selectedDocForView}
        signedUrl={viewerSignedUrl}
        isOpen={!!selectedDocForView}
        isLoading={isViewerLoading}
        onClose={handleCloseViewer}
      />

      {/* Rejection Reason Dialog */}
      <RejectionDialog
        document={selectedDocForReject}
        isOpen={!!selectedDocForReject}
        isSubmitting={isRejecting}
        onConfirm={handleConfirmReject}
        onClose={() => setSelectedDocForReject(null)}
      />
    </div>
  );
};
