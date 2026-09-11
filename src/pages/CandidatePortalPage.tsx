// ==============================================================================
// File: src/pages/CandidatePortalPage.tsx
// Description: Secure Candidate Continuation & Controlled Re-submission Workspace
// Route: /joining/portal
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Specifications:
//   - Candidate-authenticated workspace
//   - Strict RLS protection: only dossiers owned by candidate are accessible
//   - Controlled Re-upload: Only REJECTED documents/fields are editable
//   - Verified & pending documents remain locked
//   - Preserves historical records on re-upload
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Loader2,
  RefreshCw,
  FileText,
  AlertCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabaseClient';
import {
  getCandidateJoiningDossiers,
  getCandidateDossierDetails,
  candidateReuploadDocument,
  candidateResubmitJoiningForm,
  uploadCandidateDocument
} from '../services/joiningService';
import type { DocumentCategory } from '../types/joining';

export const CandidatePortalPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [candidateEmail, setCandidateEmail] = useState<string>('');
  const [candidateName, setCandidateName] = useState<string>('');
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  // Selected dossier details
  const [dossierLoading, setDossierLoading] = useState<boolean>(false);
  const [selectedDossier, setSelectedDossier] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Authenticate candidate session & load candidate dossiers
  const loadDossiers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        navigate('/joining/login', { replace: true });
        return;
      }

      setCandidateEmail(user.email || '');

      const res = await getCandidateJoiningDossiers();
      if (!res.success) {
        setActionNotice({ type: 'error', message: res.error || 'Failed to load dossiers.' });
        setLoading(false);
        return;
      }

      const dossierList = res.data || [];
      setDossiers(dossierList);

      if (dossierList.length > 0) {
        setCandidateName(dossierList[0].candidate_name || user.user_metadata?.full_name || 'Candidate');
        // Auto-select first dossier if none selected
        setSelectedDossierId((prev) => prev || dossierList[0].id);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Authentication error.' });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDossiers();
  }, [loadDossiers]);

  // 2. Load detailed dossier contents & document inspection queue when selectedDossierId changes
  const loadDossierDetails = useCallback(async (formId: string) => {
    setDossierLoading(true);
    try {
      const res = await getCandidateDossierDetails(formId);
      if (res.success && res.data) {
        setSelectedDossier(res.data.form);
        setDocuments(res.data.documents);
      } else {
        setActionNotice({ type: 'error', message: res.error || 'Could not load dossier details.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Error loading dossier details.' });
    } finally {
      setDossierLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDossierId) {
      loadDossierDetails(selectedDossierId);
    }
  }, [selectedDossierId, loadDossierDetails]);

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/joining/login', { replace: true });
  };

  // Controlled Document Re-upload Handler
  const handleFileSelect = async (doc: any, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Replacement file size must not exceed 5MB.');
      return;
    }

    setUploadingDocId(doc.id);
    setActionNotice(null);

    try {
      // 1. Upload to private Supabase storage under candidates/
      const category = doc.document_type as DocumentCategory;
      const uploadRes = await uploadCandidateDocument(selectedDossierId || undefined, category, file);

      if (!uploadRes.success || !uploadRes.data?.storagePath) {
        throw new Error(uploadRes.error || 'Failed to upload replacement file to secure storage.');
      }

      // 2. Call Security Definer candidate_reupload_document RPC
      const reuploadRes = await candidateReuploadDocument(
        doc.id,
        uploadRes.data.storagePath,
        file.name,
        file.type,
        file.size
      );

      if (!reuploadRes.success) {
        throw new Error(reuploadRes.error || 'Re-upload failed.');
      }

      setActionNotice({
        type: 'success',
        message: `Replacement document for ${doc.document_type} uploaded successfully. Status updated to PENDING REVIEW.`
      });

      // Reload dossier details to update document list
      if (selectedDossierId) {
        await loadDossierDetails(selectedDossierId);
        await loadDossiers();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Document re-upload failed.' });
    } finally {
      setUploadingDocId(null);
    }
  };

  // Handle Dossier Resubmission
  const handleResubmit = async () => {
    if (!selectedDossierId) return;

    // Check if any rejected document still exists
    const currentRejected = documents.filter((d) => d.is_current && d.verification_status === 'REJECTED');
    if (currentRejected.length > 0) {
      alert(`Please replace all rejected documents before resubmitting. ${currentRejected.length} document(s) still require action.`);
      return;
    }

    setResubmitting(true);
    setActionNotice(null);

    try {
      const res = await candidateResubmitJoiningForm(selectedDossierId);
      if (!res.success) {
        throw new Error(res.error || 'Resubmission failed.');
      }

      setActionNotice({
        type: 'success',
        message: 'Your corrected Joining Dossier has been successfully resubmitted for administrative review.'
      });

      await loadDossierDetails(selectedDossierId);
      await loadDossiers();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to resubmit dossier.' });
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 3rem)', minHeight: '80vh', textAlign: 'center' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto 1.5rem auto' }} />
        <h3 style={{ color: 'var(--color-midnight-navy)', fontWeight: 800 }}>AUTHENTICATING CANDIDATE DOSSIER...</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Verifying row level security credentials...</p>
      </div>
    );
  }

  // Current documents (excluding archived versions for primary action view)
  const activeDocuments = documents.filter((d) => d.is_current);
  const historicalDocuments = documents.filter((d) => !d.is_current);
  const rejectedCount = activeDocuments.filter((d) => d.verification_status === 'REJECTED').length;
  const isReuploadRequired = selectedDossier?.submission_status === 'REUPLOAD_REQUIRED' || rejectedCount > 0;

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)', minHeight: '90vh', paddingBottom: '5rem', backgroundColor: '#F8FAFC' }}>
      {/* Top Candidate Bar */}
      <section style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--color-border)', padding: '1.25rem 0' }}>
        <Container size="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 42, 86, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-midnight-navy)'
                }}
              >
                <FileCheck2 size={24} />
              </div>
              <div>
                <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '0.12em', margin: 0 }}>
                  CANDIDATE ONBOARDING WORKSPACE
                </span>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-midnight-navy)', fontWeight: 800, margin: 0 }}>
                  {candidateName || 'Candidate Portal'}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Logged in as:</span>
                <strong style={{ color: 'var(--color-midnight-navy)' }}>{candidateEmail}</strong>
              </div>

              <Button
                variant="navy"
                size="sm"
                onClick={() => navigate('/joining')}
              >
                Open Joining Form
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<LogOut size={14} />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <div style={{ marginTop: '2rem' }}>
        <Container size="lg">
        {/* Notice Alert */}
        {actionNotice && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: actionNotice.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${actionNotice.type === 'success' ? '#86EFAC' : '#F87171'}`,
              borderRadius: 'var(--radius-lg)',
              color: actionNotice.type === 'success' ? '#166534' : '#991B1B',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}
          >
            {actionNotice.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <div style={{ flex: 1 }}>{actionNotice.message}</div>
          </div>
        )}

        {/* Dossiers Selection Bar (if multiple exist) */}
        {dossiers.length > 1 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {dossiers.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDossierId(d.id)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: selectedDossierId === d.id ? '2px solid var(--color-midnight-navy)' : '1px solid var(--color-border)',
                  backgroundColor: selectedDossierId === d.id ? 'rgba(25, 42, 86, 0.05)' : '#FFFFFF',
                  fontWeight: selectedDossierId === d.id ? 800 : 600,
                  color: 'var(--color-midnight-navy)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{d.joining_reference || 'Dossier'}</span>
                <span
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '10px',
                    backgroundColor: d.submission_status === 'REUPLOAD_REQUIRED' ? '#FEF2F2' : '#F1F5F9',
                    color: d.submission_status === 'REUPLOAD_REQUIRED' ? '#DC2626' : '#475569'
                  }}
                >
                  {d.submission_status}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* No Dossiers State */}
        {dossiers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <FileText size={48} style={{ color: '#94A3B8', margin: '0 auto 1rem auto' }} />
            <h3 style={{ color: 'var(--color-midnight-navy)', fontWeight: 800 }}>No Joining Submissions Found</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              You do not have any submitted joining dossiers associated with this account. You can begin a new onboarding registration below.
            </p>
            <Button variant="primary" size="md" onClick={() => navigate('/joining')}>
              START NEW JOINING FORM &rarr;
            </Button>
          </div>
        )}

        {selectedDossier && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Status Hero Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                padding: '2rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Joining Reference
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '14px',
                        backgroundColor: '#F1F5F9',
                        color: 'var(--color-midnight-navy)'
                      }}
                    >
                      {selectedDossier.joining_reference}
                    </span>
                  </div>

                  <h1 style={{ fontSize: '1.75rem', color: 'var(--color-midnight-navy)', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                    {selectedDossier.candidate_name}
                  </h1>

                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Submitted on: {new Date(selectedDossier.submitted_at || selectedDossier.created_at).toLocaleDateString('en-IN', { dateStyle: 'full' })}
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 800,
                      fontSize: '13px',
                      backgroundColor:
                        selectedDossier.submission_status === 'REUPLOAD_REQUIRED'
                          ? '#FEF2F2'
                          : selectedDossier.submission_status === 'VERIFIED' || selectedDossier.submission_status === 'APPROVED'
                          ? '#F0FDF4'
                          : selectedDossier.submission_status === 'RESUBMITTED'
                          ? '#EFF6FF'
                          : '#F8FAFC',
                      color:
                        selectedDossier.submission_status === 'REUPLOAD_REQUIRED'
                          ? '#DC2626'
                          : selectedDossier.submission_status === 'VERIFIED' || selectedDossier.submission_status === 'APPROVED'
                          ? '#16A34A'
                          : selectedDossier.submission_status === 'RESUBMITTED'
                          ? '#2563EB'
                          : '#475569',
                      border: `1px solid ${
                        selectedDossier.submission_status === 'REUPLOAD_REQUIRED'
                          ? '#FCA5A5'
                          : selectedDossier.submission_status === 'VERIFIED' || selectedDossier.submission_status === 'APPROVED'
                          ? '#86EFAC'
                          : selectedDossier.submission_status === 'RESUBMITTED'
                          ? '#93C5FD'
                          : '#CBD5E1'
                      }`
                    }}
                  >
                    {selectedDossier.submission_status === 'REUPLOAD_REQUIRED' ? (
                      <AlertTriangle size={16} />
                    ) : selectedDossier.submission_status === 'VERIFIED' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                    <span>{selectedDossier.submission_status?.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>

              {/* Urgent Action Banner if Re-upload Required */}
              {isReuploadRequired && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1.25rem',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #F87171',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}
                >
                  <AlertTriangle size={24} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ color: '#991B1B', fontWeight: 800, margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
                      DOCUMENT RE-UPLOAD REQUIRED
                    </h4>
                    <p style={{ color: '#7F1D1D', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.5 }}>
                      Administrative compliance verification has rejected one or more of your submitted documents.
                      Review the specific rejection reason below and upload clear replacement copies.
                      <strong> Note:</strong> Already reviewed and verified information remains securely locked and protected.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Inspection & Controlled Re-upload Table */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                padding: '2rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-midnight-navy)', fontWeight: 800, margin: 0 }}>
                    Submitted Compliance Documents
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Controlled document verification queue. Only rejected documents may be edited or replaced.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  onClick={() => loadDossierDetails(selectedDossierId!)}
                  disabled={dossierLoading}
                >
                  Refresh Status
                </Button>
              </div>

              {/* Documents Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-midnight-navy)', fontWeight: 700 }}>Document Item</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-midnight-navy)', fontWeight: 700 }}>File Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-midnight-navy)', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-midnight-navy)', fontWeight: 700 }}>Verification / Reason</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-midnight-navy)', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocuments.map((doc) => {
                      const isRejected = doc.verification_status === 'REJECTED';
                      const isVerified = doc.verification_status === 'VERIFIED';
                      const isPending = doc.verification_status === 'UPLOADED' || doc.verification_status === 'PENDING';
                      const isUploading = uploadingDocId === doc.id;

                      const label = `${doc.document_type?.replace(/_/g, ' ')}${doc.document_side && doc.document_side !== 'SINGLE' ? ` (${doc.document_side})` : ''}`;

                      return (
                        <tr
                          key={doc.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: isRejected ? '#FFF5F5' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                            {label}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                            {doc.original_file_name || 'Attached file'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.65rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isRejected ? '#FEE2E2' : isVerified ? '#DCFCE7' : '#E0E7FF',
                                color: isRejected ? '#DC2626' : isVerified ? '#15803D' : '#3730A3'
                              }}
                            >
                              {isRejected && <XCircle size={12} />}
                              {isVerified && <CheckCircle2 size={12} />}
                              {isPending && <Clock size={12} />}
                              <span>{doc.verification_status}</span>
                            </span>
                          </td>
                          <td style={{ padding: '1rem', maxWidth: '300px' }}>
                            {isRejected ? (
                              <div style={{ color: '#DC2626', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                                <strong>Reason:</strong> {doc.rejection_reason || 'Image is unclear or does not match records.'}
                              </div>
                            ) : isVerified ? (
                              <div style={{ color: '#15803D', fontSize: 'var(--text-xs)' }}>
                                Verified by Compliance
                              </div>
                            ) : (
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                                Awaiting Administrative Review
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {isRejected ? (
                              <div>
                                <input
                                  type="file"
                                  id={`reupload-${doc.id}`}
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  onChange={(e) => handleFileSelect(doc, e)}
                                  disabled={isUploading}
                                  style={{ display: 'none' }}
                                />
                                <label
                                  htmlFor={`reupload-${doc.id}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.45rem 0.85rem',
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                      <span>UPLOADING...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={14} />
                                      <span>RE-UPLOAD DOCUMENT</span>
                                    </>
                                  )}
                                </label>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                Locked (Approved)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resubmission Section (Active only when re-upload was required and all rejected items are resolved) */}
              {isReuploadRequired && (
                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <h4 style={{ color: 'var(--color-midnight-navy)', fontWeight: 800, margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
                      Ready to Resubmit for Compliance Review?
                    </h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {rejectedCount === 0
                        ? 'All rejected items have been replaced with new copies. You may now resubmit your dossier.'
                        : `Please re-upload replacement copies for all ${rejectedCount} rejected document(s) before resubmitting.`}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={rejectedCount > 0 || resubmitting}
                    icon={resubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
                    onClick={handleResubmit}
                  >
                    {resubmitting ? 'RESUBMITTING...' : 'RESUBMIT DOSSIER FOR REVIEW'}
                  </Button>
                </div>
              )}
            </div>

            {/* Historical Document Audit Trail (Read-only for transparency) */}
            {historicalDocuments.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  padding: '2rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <h4 style={{ fontSize: '1.1rem', color: 'var(--color-midnight-navy)', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                  Archived Document History
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0 0 1.25rem 0' }}>
                  Auditable record of previously rejected documents that have been superseded by replacement submissions.
                </p>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Document</th>
                        <th style={{ padding: '0.5rem' }}>Previous File</th>
                        <th style={{ padding: '0.5rem' }}>Rejection Reason</th>
                        <th style={{ padding: '0.5rem' }}>Replaced Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalDocuments.map((h) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{h.document_type}</td>
                          <td style={{ padding: '0.5rem' }}>{h.original_file_name}</td>
                          <td style={{ padding: '0.5rem', color: '#DC2626' }}>{h.rejection_reason || 'Rejected'}</td>
                          <td style={{ padding: '0.5rem' }}>{new Date(h.uploaded_at).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
      </div>
    </div>
  );
};

export default CandidatePortalPage;
