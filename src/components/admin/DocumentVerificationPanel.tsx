// ==============================================================================
// File: src/components/admin/DocumentVerificationPanel.tsx
// Description: Admin Document Verification Workspace for Candidate Applications
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React, { useState } from 'react';
import { FileText, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
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
  applicationId?: string;
  documents: DocumentRow[];
  canVerify: boolean;
  onRefresh: () => void;
}

export const DocumentVerificationPanel: React.FC<DocumentVerificationPanelProps> = ({
  applicationId: _applicationId,
  documents,
  canVerify,
  onRefresh
}) => {
  const stats = calculateDocumentVerificationStats(documents);

  // Modal states
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentRow | null>(null);
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState<boolean>(false);

  const [selectedDocForReject, setSelectedDocForReject] = useState<DocumentRow | null>(null);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);

  // Handle View
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
        setPanelSuccess(`Successfully verified ${doc.document_type.replace(/_/g, ' ')}${doc.document_side ? ` (${doc.document_side})` : ''}.`);
        onRefresh();
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
        setPanelSuccess(`Rejected ${selectedDocForReject.document_type.replace(/_/g, ' ')}. Candidate notified with rejection reason.`);
        setSelectedDocForReject(null);
        onRefresh();
      } else {
        setPanelError(res.error || 'Failed to reject document.');
      }
    } catch (err: any) {
      setPanelError(err.message || 'An error occurred during rejection.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Split documents into Required vs Additional
  const requiredDocTypes = new Set(CONFIGURED_REQUIRED_DOCUMENTS.map((d) => d.type));
  const statutoryDocs = documents.filter((d) => requiredDocTypes.has(d.document_type));
  const additionalDocs = documents.filter((d) => !requiredDocTypes.has(d.document_type));

  return (
    <div>
      {/* Document Summary Banner */}
      <DocumentSummary stats={stats} totalDocumentsCount={documents.length} />

      {/* Notices */}
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

      {/* Statutory Required Documents Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              Statutory Required Documents ({statutoryDocs.length} of {stats.totalRequired})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Mandatory identification, photograph, signature, and qualifications for compliance verification.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="btn-admin-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {statutoryDocs.length === 0 ? (
          <div
            className="admin-card"
            style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}
          >
            <FileText size={36} color="#CBD5E1" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56' }}>
              No statutory documents uploaded yet.
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Documents will appear here as soon as the candidate uploads them in the Joining Form.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem'
            }}
          >
            {statutoryDocs.map((doc) => (
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
        )}
      </div>

      {/* Additional / Supporting Documents Section */}
      {additionalDocs.length > 0 && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              Additional & Supporting Documents ({additionalDocs.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Address proof, experience letters, or other supporting candidate attachments.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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
