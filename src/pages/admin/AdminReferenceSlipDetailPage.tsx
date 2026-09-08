// ==============================================================================
// File: src/pages/admin/AdminReferenceSlipDetailPage.tsx
// Description: Detailed Dossier View for a Single Reference Slip & Consultancy Return
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getReferenceSlipById,
  saveReferenceSlip,
  updateConsultancyReturnAcceptance,
  type ReferenceSlipDetailData,
  type ReferenceSlipFormData
} from '../../services/referenceSlipService';
import { generateAndPersistReferenceSlipPdf } from '../../services/referenceSlipPdfGenerator';
import { getGeneratedDocumentSignedUrl } from '../../services/filePersistenceService';
import { ReferenceSlipFormModal } from '../../components/admin/ReferenceSlipFormModal';
import { ReferenceSlipPreviewModal } from '../../components/admin/ReferenceSlipPreviewModal';
import {
  FileCheck,
  ArrowLeft,
  Building2,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Printer,
  Edit3,
  Loader2,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const AdminReferenceSlipDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAdminAuth();

  const canEdit = role === 'SUPER_ADMIN' || role === 'COORDINATOR';
  const canGenerate = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [detail, setDetail] = useState<ReferenceSlipDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeSignedUrl, setActiveSignedUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getReferenceSlipById(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error || 'Reference Slip record not found.');
      }

      // Fetch activity logs for this reference slip
      const { data: acts } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'REFERENCE_SLIP')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      if (acts) setActivityLogs(acts);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reference slip.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Submit
  const handleFormSubmit = async (formData: ReferenceSlipFormData): Promise<boolean> => {
    if (!detail) return false;
    setIsSaving(true);
    try {
      const res = await saveReferenceSlip({
        applicationId: detail.slip.application_id,
        joiningFormId: detail.slip.joining_form_id,
        slipId: detail.slip.id,
        formData,
        adminUser: { id: user?.id || 'admin', name: user?.email || 'Admin', role: role || undefined }
      });
      if (res.success) {
        await loadData();
        return true;
      } else {
        alert(res.error || 'Failed to update slip.');
        return false;
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating slip.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Generate PDF
  const handleGeneratePdf = async () => {
    if (!detail) return;
    setIsGenerating(true);
    try {
      const res = await generateAndPersistReferenceSlipPdf(detail, user?.id);
      if (res.success && res.signedUrl) {
        setActiveSignedUrl(res.signedUrl);
        setIsPreviewOpen(true);
        await loadData();
      } else {
        alert(res.error || 'Failed to generate PDF.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle View Latest PDF
  const handleViewPdf = async () => {
    if (!detail) return;
    const latestFile = detail.generatedFiles[0];
    if (latestFile?.storage_path) {
      const { url } = await getGeneratedDocumentSignedUrl(latestFile.storage_path, 3600);
      if (url) {
        setActiveSignedUrl(url);
        setIsPreviewOpen(true);
        return;
      }
    }
    if (canGenerate) {
      await handleGeneratePdf();
    }
  };

  // Handle Manual Acceptance Toggle
  const handleToggleAcceptance = async () => {
    if (!detail) return;
    const current = Boolean(detail.consultancyReturn?.candidate_acceptance);
    const confirmed = window.confirm(
      current
        ? 'Are you sure you want to mark candidate consultancy acceptance as PENDING?'
        : 'Confirm candidate acceptance of the 10 statutory terms and conditions?'
    );
    if (!confirmed) return;

    try {
      const res = await updateConsultancyReturnAcceptance({
        applicationId: detail.slip.application_id,
        joiningFormId: detail.slip.joining_form_id,
        acceptance: !current,
        adminUserName: user?.email || 'Admin'
      });
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to update acceptance status.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating acceptance.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={36} className="animate-spin" color="#4F46E5" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748B', fontWeight: 600 }}>Loading Reference Slip dossier...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="admin-page-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Reference Slip Not Found</h2>
        <p style={{ color: '#64748B', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>{error}</p>
        <Link
          to="/admin/reference-slips"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1.25rem',
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </div>
    );
  }

  const { slip, candidate, consultancyReturn, generatedFiles } = detail;
  const latestFile = generatedFiles[0];
  const isSelected = (slip.interview_result || '').toUpperCase() === 'SELECTED';
  const isHold = (slip.interview_result || '').toUpperCase() === 'HOLD';
  const isRejected = (slip.interview_result || '').toUpperCase() === 'REJECTED';

  // Masked KYC
  const maskedAadhaar = candidate.aadhaarNumber
    ? `XXXX-XXXX-${candidate.aadhaarNumber.slice(-4)}`
    : 'Not on file';
  const maskedPan = candidate.panNumber
    ? `${candidate.panNumber.slice(0, 2)}XXXX${candidate.panNumber.slice(-2)}`
    : 'Not on file';

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/admin/reference-slips"
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
          <ArrowLeft size={16} /> Back to Reference Slips Directory
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
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {slip.reference_number}
              </h1>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  backgroundColor: isSelected ? '#DCFCE7' : isHold ? '#FEF3C7' : isRejected ? '#FEE2E2' : '#F1F5F9',
                  color: isSelected ? '#15803D' : isHold ? '#B45309' : isRejected ? '#B91C1C' : '#475569',
                  border: `1px solid ${isSelected ? '#86EFAC' : isHold ? '#FDE68A' : isRejected ? '#FCA5A5' : '#CBD5E1'}`
                }}
              >
                {slip.interview_result || 'PENDING EVALUATION'}
              </span>

              {latestFile && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE'
                  }}
                >
                  Version {latestFile.version} Ready
                </span>
              )}
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748B' }}>
              <span>
                Candidate: <strong style={{ color: '#0F172A' }}>{candidate.fullName}</strong>
              </span>
              <span>
                Source:
                <span
                  style={{
                    marginLeft: '0.35rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: candidate.sourceType === 'APPLICATION' ? '#EEF2FF' : '#DCFCE7',
                    color: candidate.sourceType === 'APPLICATION' ? '#4338CA' : '#15803D'
                  }}
                >
                  {candidate.sourceReference}
                </span>
              </span>
              <span>
                Issued Date: <strong style={{ color: '#0F172A' }}>{slip.date}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Edit3 size={15} />
                <span>Edit Slip</span>
              </button>
            )}

            {latestFile ? (
              <>
                <button
                  type="button"
                  onClick={handleViewPdf}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1E293B',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={15} />
                  <span>View / Print 2-Page PDF</span>
                </button>

                {canGenerate && (
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={isGenerating}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#4F46E5',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <RotateCw size={15} className={isGenerating ? 'animate-spin' : ''} />
                    <span>{isGenerating ? 'Generating...' : 'Regenerate'}</span>
                  </button>
                )}
              </>
            ) : (
              canGenerate && (
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
                  <span>Generate Official 2-Page PDF</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Section 1: Candidate Demographic Summary */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#4F46E5" />
            <span>Candidate Demographic Summary</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Full Name:</span>
              <strong style={{ color: '#0F172A' }}>{candidate.fullName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Father's Name:</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{candidate.fatherName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Date of Birth & Gender:</span>
              <span style={{ color: '#0F172A' }}>
                {candidate.dob || '—'} {candidate.gender ? `(${candidate.gender})` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Mobile Contact:</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{candidate.mobile}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Email:</span>
              <span style={{ color: '#0F172A' }}>{candidate.email}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Aadhaar (Masked):</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{maskedAadhaar}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>PAN (Masked):</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{maskedPan}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Position Applied:</span>
              <strong style={{ color: '#4F46E5' }}>{candidate.positionApplied || '—'}</strong>
            </div>

            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Residential Address:</span>
              <span style={{ color: '#0F172A', fontSize: '0.8rem' }}>{candidate.address}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
              <span style={{ color: '#64748B' }}>Photo On File:</span>
              {candidate.photoUrl ? (
                <span style={{ color: '#15803D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Embedded on Page 1
                </span>
              ) : (
                <span style={{ color: '#94A3B8' }}>Not Provided</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Employer & Interview Decision */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#4F46E5" />
            <span>Employer Allocation & Interview Outcome</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Partner Employer:</span>
              <strong style={{ color: '#0F172A' }}>{slip.company_name || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Date of Interview:</span>
              <span style={{ color: '#0F172A' }}>{slip.interview_date || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Reporting Schedule:</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                {slip.reporting_date || '—'} {slip.reporting_time ? `at ${slip.reporting_time}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Department:</span>
              <span style={{ color: '#0F172A' }}>{slip.department || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Selected Designation:</span>
              <strong style={{ color: '#0F172A' }}>{slip.selected_designation || slip.designation || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Salary (CTC):</span>
              <strong style={{ color: '#0F172A' }}>
                {slip.salary_ctc ? `₹${slip.salary_ctc.toLocaleString('en-IN')} / Month` : '—'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Interview Conducted By:</span>
              <span style={{ color: '#0F172A' }}>{slip.interview_conducted_by || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Official Joining Date:</span>
              <strong style={{ color: '#15803D' }}>{slip.joining_date || '—'}</strong>
            </div>

            {slip.remarks && (
              <div style={{ marginTop: '0.25rem', backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '6px' }}>
                <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748B', fontWeight: 600 }}>Remarks:</span>
                <span style={{ color: '#334155' }}>{slip.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Consultancy Return Form Acceptance */}
      <div
        className="admin-card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.75rem',
          borderLeft: `4px solid ${consultancyReturn?.candidate_acceptance ? '#10B981' : '#F59E0B'}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color={consultancyReturn?.candidate_acceptance ? '#10B981' : '#F59E0B'} />
              <span>Page 2: Consultancy Return & Statutory Acceptance (10 Clauses)</span>
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.825rem', color: '#64748B', maxWidth: '680px' }}>
              Contains the client's official 10 terms regarding registration fees, recruitment process, disciplinary action, and placement guarantees.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                backgroundColor: consultancyReturn?.candidate_acceptance ? '#DCFCE7' : '#FEF3C7',
                color: consultancyReturn?.candidate_acceptance ? '#15803D' : '#92400E',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {consultancyReturn?.candidate_acceptance ? <CheckCircle2 size={15} /> : <Clock size={15} />}
              {consultancyReturn?.candidate_acceptance ? 'ACCEPTED' : 'PENDING CANDIDATE ACCEPTANCE'}
            </span>

            {canEdit && (
              <button
                type="button"
                onClick={handleToggleAcceptance}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {consultancyReturn?.candidate_acceptance ? 'Mark as Pending' : 'Record Acceptance'}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem', fontSize: '0.825rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ color: '#64748B', display: 'block' }}>Acceptance Timestamp:</span>
            <strong style={{ color: '#0F172A', marginTop: '0.15rem', display: 'block' }}>
              {consultancyReturn?.accepted_at
                ? new Date(consultancyReturn.accepted_at).toLocaleString('en-IN')
                : 'Not Accepted Yet'}
            </strong>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ color: '#64748B', display: 'block' }}>Candidate Signature:</span>
            <strong style={{ color: '#0F172A', marginTop: '0.15rem', display: 'block' }}>
              {consultancyReturn?.candidate_signature_path || candidate.signatureUrl
                ? 'Signature on File (Page 2)'
                : 'No Signature Uploaded'}
            </strong>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ color: '#64748B', display: 'block' }}>Dynamic Page 2 Value:</span>
            <strong style={{ color: consultancyReturn?.candidate_acceptance ? '#15803D' : '#92400E', marginTop: '0.15rem', display: 'block' }}>
              {consultancyReturn?.candidate_acceptance ? 'YES (Confirmed)' : 'PENDING'}
            </strong>
          </div>
        </div>
      </div>

      {/* Section 4: Generated Files Ledger */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#4F46E5" />
          <span>Official Generated Files Ledger (Private Storage: generated-documents)</span>
        </h3>

        {generatedFiles.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              No official 2-page PDF has been compiled for this reference slip yet.
            </p>
            {canGenerate && (
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer'
                }}
              >
                Compile Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '0.65rem' }}>Version</th>
                  <th style={{ padding: '0.65rem' }}>File Name</th>
                  <th style={{ padding: '0.65rem' }}>File Size</th>
                  <th style={{ padding: '0.65rem' }}>Generated Timestamp</th>
                  <th style={{ padding: '0.65rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedFiles.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 700, color: '#4F46E5' }}>v{f.version}</td>
                    <td style={{ padding: '0.65rem', color: '#0F172A', fontWeight: 600 }}>{f.file_name}</td>
                    <td style={{ padding: '0.65rem', color: '#64748B' }}>
                      {f.file_size ? `${Math.round(f.file_size / 1024)} KB` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem', color: '#64748B' }}>
                      {new Date(f.generated_at).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const { url } = await getGeneratedDocumentSignedUrl(f.storage_path, 3600);
                          if (url) {
                            setActiveSignedUrl(url);
                            setIsPreviewOpen(true);
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 5: Activity Logs Audit Trail */}
      {activityLogs.length > 0 && (
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
            Reference Slip Activity Audit Trail
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activityLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem'
                }}
              >
                <div>
                  <strong style={{ color: '#0F172A' }}>{log.action}</strong>
                  <span style={{ color: '#64748B', marginLeft: '0.5rem' }}>
                    {log.details ? JSON.stringify(log.details) : ''}
                  </span>
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isFormOpen && (
        <ReferenceSlipFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={slip}
          candidateInfo={candidate}
          isSaving={isSaving}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <ReferenceSlipPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          signedUrl={activeSignedUrl}
          referenceNumber={slip.reference_number}
          candidateName={candidate.fullName}
          sourceReference={candidate.sourceReference}
          consultancyAccepted={consultancyReturn?.candidate_acceptance}
          acceptedAt={consultancyReturn?.accepted_at}
          generatedFile={latestFile}
          onRegenerate={canGenerate ? handleGeneratePdf : undefined}
          isRegenerating={isGenerating}
          canManage={canGenerate}
        />
      )}
    </div>
  );
};
