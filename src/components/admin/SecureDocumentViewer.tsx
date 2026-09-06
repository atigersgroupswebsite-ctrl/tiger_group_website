// ==============================================================================
// File: src/components/admin/SecureDocumentViewer.tsx
// Description: Secure Modal for Viewing Candidate Statutory Documents via Temporary Signed URLs
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React, { useState } from 'react';
import { X, ExternalLink, AlertCircle, FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import type { DocumentRow } from '../../types/database';

interface SecureDocumentViewerProps {
  document: DocumentRow | null;
  signedUrl: string | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

export const SecureDocumentViewer: React.FC<SecureDocumentViewerProps> = ({
  document,
  signedUrl,
  isOpen,
  isLoading,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!isOpen || !document) return null;

  const isPdf =
    document.mime_type?.includes('pdf') ||
    document.original_file_name?.toLowerCase().endsWith('.pdf') ||
    document.storage_path?.toLowerCase().endsWith('.pdf');

  const docTitle = `${document.document_type.replace(/_/g, ' ')}${
    document.document_side && document.document_side !== 'SINGLE' ? ` (${document.document_side})` : ''
  }`;

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
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#192A56" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
                {docTitle}
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    document.verification_status === 'VERIFIED'
                      ? '#E8F5E9'
                      : document.verification_status === 'REJECTED'
                      ? '#FBF0EF'
                      : '#FEF3C7',
                  color:
                    document.verification_status === 'VERIFIED'
                      ? '#2E7D32'
                      : document.verification_status === 'REJECTED'
                      ? '#C9726F'
                      : '#92400E'
                }}
              >
                {document.verification_status}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              {document.original_file_name || 'candidate_document'}
              {document.file_size ? ` • ${(document.file_size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>

          {/* Action Tools & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!isPdf && signedUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  style={{
                    padding: '0.4rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <ZoomOut size={16} color="#475569" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  title="Zoom In"
                  style={{
                    padding: '0.4rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <ZoomIn size={16} color="#475569" />
                </button>
              </>
            )}

            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                style={{
                  padding: '0.4rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ExternalLink size={16} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close Preview"
              style={{
                padding: '0.4rem',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            minHeight: '400px',
            maxHeight: 'calc(90vh - 120px)',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: '1rem',
            position: 'relative'
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#94A3B8' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>Generating secure view...</div>
            </div>
          ) : !signedUrl ? (
            <div style={{ textAlign: 'center', color: '#FDA4AF', padding: '2rem' }}>
              <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Unable to load document preview.</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                The storage file might be missing or access expired.
              </div>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=0`}
              title={docTitle}
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF'
              }}
            />
          ) : (
            <img
              src={signedUrl}
              alt={docTitle}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '6px',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s ease-in-out'
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
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Private Storage Session • Encrypted Link expires in 60 minutes
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-admin-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
