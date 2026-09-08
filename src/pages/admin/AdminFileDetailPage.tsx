// ==============================================================================
// File: src/pages/admin/AdminFileDetailPage.tsx
// Description: Detail Dossier View for a Single Generated Document
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Pre-signed temporary URL for authenticated file viewing (3600s)
//   - Permanent storage deletion strictly restricted to SUPER_ADMIN
//   - Preserves historical version audit trail
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getGeneratedFileDetail,
  deleteGeneratedFile,
  getGeneratedDocumentSignedUrl,
  type GeneratedFileDetail
} from '../../services/filePersistenceService';
import {
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  User,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AdminFileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAdminAuth();

  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [detail, setDetail] = useState<GeneratedFileDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getGeneratedFileDetail(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error || 'Generated file record not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load file details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleDownload = async () => {
    if (!detail) return;
    try {
      const { url } = await getGeneratedDocumentSignedUrl(detail.file.storage_path, 60);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = detail.file.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Could not retrieve secure download link.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error initiating file download.');
    }
  };

  const handleDelete = async () => {
    if (!detail || !isSuperAdmin) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteGeneratedFile({
        id: detail.file.id,
        storagePath: detail.file.storage_path,
        fileName: detail.file.file_name,
        adminUserId: user?.id,
        applicationId: detail.file.application_id
      });

      if (res.success) {
        navigate('/admin/files', { replace: true });
      } else {
        setDeleteError(res.error || 'Failed to delete file.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while deleting file.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={36} className="animate-spin" color="var(--color-champagne-dark)" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748B', fontWeight: 600 }}>Loading generated file detail...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="admin-page-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
          Generated File Not Found
        </h2>
        <p style={{ color: '#64748B', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>{error}</p>
        <Link to="/admin/files" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Files Repository</span>
        </Link>
      </div>
    );
  }

  const { file, candidate, allVersions, signedUrl } = detail;

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/admin/files"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#64748B',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Generated Files Repository</span>
        </Link>
      </div>

      {/* Header Card */}
      <div
        className="admin-card"
        style={{
          padding: '1.75rem',
          marginBottom: '1.75rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', wordBreak: 'break-word' }}>
                {file.file_name}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  backgroundColor: '#EEF2FF',
                  color: '#4338CA',
                  border: '1px solid #C7D2FE'
                }}
              >
                {file.file_type}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569'
                }}
              >
                Version {file.version}
              </span>
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748B' }}>
              {candidate && (
                <span>
                  Candidate: <strong style={{ color: '#0F172A' }}>{candidate.candidateName}</strong> ({candidate.sourceReference})
                </span>
              )}
              <span>
                Generated: <strong style={{ color: '#0F172A' }}>{new Date(file.generated_at).toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Size: <strong style={{ color: '#0F172A' }}>{formatBytes(file.file_size)}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={15} />
                <span>Open in New Tab</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.15rem',
                fontSize: '0.85rem'
              }}
            >
              <Download size={15} />
              <span>Download File</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
        {/* Left Column: File Details & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* File Metadata Card */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
              File Specification & Ledger Metadata
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>Record ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{file.id}</span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>File Type</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{file.file_type}</span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>File Size</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatBytes(file.file_size)}</span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>MIME Type</span>
                <span style={{ fontFamily: 'monospace', color: '#334155' }}>{file.mime_type || 'application/pdf'}</span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>Version</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>v{file.version}</span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>Generated Timestamp</span>
                <span style={{ color: '#0F172A' }}>{new Date(file.generated_at).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.775rem' }}>Storage Bucket & Path</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#334155', wordBreak: 'break-all' }}>
                  generated-documents / {file.storage_path}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Document Viewer (iframe) */}
          <div className="admin-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                Document Preview
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Authenticated pre-signed session</span>
            </div>

            {signedUrl ? (
              <div style={{ width: '100%', height: '650px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <iframe
                  src={signedUrl}
                  title="Document Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <FileText size={36} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>Preview Not Available</p>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.825rem', color: '#64748B' }}>
                  The signed viewing session could not be established. Use the download action to inspect this file.
                </p>
                <button type="button" onClick={handleDownload} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}>
                  <Download size={14} style={{ marginRight: '0.35rem' }} />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Candidate Association, Versions, Governance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Associated Candidate */}
          {candidate && (
            <div className="admin-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                  Associated Candidate
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B' }}>Full Name</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{candidate.candidateName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B' }}>Source Reference</span>
                  <span
                    style={{
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: candidate.sourceType === 'APPLICATION' ? '#EEF2FF' : '#DCFCE7',
                      color: candidate.sourceType === 'APPLICATION' ? '#4338CA' : '#15803D'
                    }}
                  >
                    {candidate.sourceReference}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B' }}>Contact Number</span>
                  <span style={{ color: '#334155' }}>{candidate.mobile || '—'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B' }}>Email</span>
                  <span style={{ color: '#334155' }}>{candidate.email || '—'}</span>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <Link
                    to={candidate.sourceType === 'APPLICATION' ? `/admin/applications/${candidate.sourceId}` : `/admin/joining/${candidate.sourceId}`}
                    className="btn btn-outline"
                    style={{ width: '100%', textAlign: 'center', justifyContent: 'center', display: 'flex', fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    <span>View Candidate Dossier</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Sibling Version History */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={18} style={{ color: 'var(--color-champagne-dark)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                Document Version History ({allVersions.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {allVersions.map((ver) => {
                const isCurrent = ver.id === file.id;

                return (
                  <div
                    key={ver.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: isCurrent ? '2px solid var(--color-champagne-dark)' : '1px solid #E2E8F0',
                      backgroundColor: isCurrent ? '#FFFBF5' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>v{ver.version}</span>
                        {isCurrent && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                            Viewing
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.15rem' }}>
                        {new Date(ver.generated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    {!isCurrent && (
                      <Link
                        to={`/admin/files/${ver.id}`}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storage & Privacy Guarantee */}
          <div className="admin-card" style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={18} color="#059669" />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#065F46' }}>
                Private Document Vault
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.775rem', color: '#64748B', lineHeight: 1.5 }}>
              All documents in this repository reside in the encrypted private <code>generated-documents</code> storage bucket.
              Public URLs are strictly prohibited; all views utilize ephemeral signed tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin Permanent Deletion Modal */}
      {isDeleteModalOpen && isSuperAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: '#DC2626' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Confirm Permanent Deletion</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Are you sure you want to permanently delete this generated document?
            </p>

            <div style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
              <div><strong>File:</strong> {file.file_name}</div>
              <div><strong>Version:</strong> v{file.version}</div>
              <div><strong>Path:</strong> {file.storage_path}</div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.775rem', marginBottom: '1.25rem' }}>
              <strong>Caution:</strong> This will permanently delete the binary object from private storage and remove its entry from the database ledger. This action is logged and cannot be undone.
            </div>

            {deleteError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="btn btn-outline"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
