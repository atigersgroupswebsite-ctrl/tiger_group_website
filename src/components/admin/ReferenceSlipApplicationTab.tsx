// ==============================================================================
// File: src/components/admin/ReferenceSlipApplicationTab.tsx
// Description: Real Candidate Dossier Reference Slip & Consultancy Return Integration
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Replaces: Old placeholder shell inside AdminApplicationDetailPage
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Printer,
  Edit3,
  Plus,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getReferenceSlipForEntity,
  saveReferenceSlip,
  type ReferenceSlipDetailData,
  type ReferenceSlipFormData
} from '../../services/referenceSlipService';
import { generateAndPersistReferenceSlipPdf } from '../../services/referenceSlipPdfGenerator';
import { getGeneratedDocumentSignedUrl } from '../../services/filePersistenceService';
import { ReferenceSlipFormModal } from './ReferenceSlipFormModal';
import { ReferenceSlipPreviewModal } from './ReferenceSlipPreviewModal';

interface ReferenceSlipApplicationTabProps {
  applicationId: string;
  onRefreshParent?: () => void;
}

export const ReferenceSlipApplicationTab: React.FC<ReferenceSlipApplicationTabProps> = ({
  applicationId,
  onRefreshParent
}) => {
  const { role, user } = useAdminAuth();
  const canEdit = role === 'SUPER_ADMIN' || role === 'COORDINATOR';
  const canGenerate = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [loading, setLoading] = useState<boolean>(true);
  const [detail, setDetail] = useState<ReferenceSlipDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeSignedUrl, setActiveSignedUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReferenceSlipForEntity({ applicationId });
      if (res.success) {
        setDetail(res.data || null);
      } else {
        setError(res.error || 'Failed to load reference slip for application.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading reference slip.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Form Submit (Save / Update Slip)
  const handleFormSubmit = async (formData: ReferenceSlipFormData): Promise<boolean> => {
    setIsSaving(true);
    try {
      const res = await saveReferenceSlip({
        applicationId,
        slipId: detail?.slip?.id,
        formData,
        adminUser: { id: user?.id || 'admin', name: user?.email || 'Admin', role: role || undefined }
      });
      if (res.success) {
        await loadData();
        if (onRefreshParent) onRefreshParent();
        return true;
      } else {
        alert(res.error || 'Failed to save reference slip.');
        return false;
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving reference slip.');
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
        if (onRefreshParent) onRefreshParent();
      } else {
        alert(res.error || 'Failed to generate official PDF packet.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle View PDF
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
    // If not generated yet, prompt generation
    if (canGenerate) {
      await handleGeneratePdf();
    }
  };

  if (loading) {
    return (
      <div className="admin-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={32} className="animate-spin" color="#4F46E5" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Loading Reference Slip dossier...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontSize: '0.9rem', color: '#991B1B', fontWeight: 600 }}>{error}</p>
        <button
          onClick={loadData}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // If no reference slip exists yet
  if (!detail) {
    return (
      <div className="admin-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#EEF2FF',
            color: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}
        >
          <FileCheck size={28} />
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
          Employee Reference Slip Not Yet Prepared
        </h3>
        <p style={{ margin: '0 auto 1.5rem auto', maxWidth: '520px', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
          Prepare the official 2-page Employee Reference Slip & Consultancy Return packet. You can specify the referring company, interview schedule, department, CTC, and official interview outcome.
        </p>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Plus size={18} />
            <span>Prepare Reference Slip</span>
          </button>
        )}

        {isFormOpen && (
          <ReferenceSlipFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
            isSaving={isSaving}
          />
        )}
      </div>
    );
  }

  const { slip, candidate, consultancyReturn, generatedFiles } = detail;
  const latestFile = generatedFiles[0];
  const isSelected = (slip.interview_result || '').toUpperCase() === 'SELECTED';
  const isHold = (slip.interview_result || '').toUpperCase() === 'HOLD';
  const isRejected = (slip.interview_result || '').toUpperCase() === 'REJECTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Card: Slip Identification & Key Status */}
      <div
        className="admin-card"
        style={{
          padding: '1.5rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                {slip.reference_number}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
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
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE'
                  }}
                >
                  PDF Version {latestFile.version}
                </span>
              )}
            </div>

            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span>Company: <strong style={{ color: '#0F172A' }}>{slip.company_name || '—'}</strong></span>
              <span>Designation: <strong style={{ color: '#0F172A' }}>{slip.designation || candidate.positionApplied || '—'}</strong></span>
              <span>Issued Date: <strong style={{ color: '#0F172A' }}>{slip.date}</strong></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Edit3 size={15} />
                <span>Edit Slip Data</span>
              </button>
            )}

            {latestFile ? (
              <>
                <button
                  type="button"
                  onClick={handleViewPdf}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1E293B',
                    color: '#FFFFFF',
                    fontSize: '0.825rem',
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
                    title="Regenerate official PDF with incremented version"
                    style={{
                      padding: '0.55rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#4F46E5',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <RotateCw size={14} className={isGenerating ? 'animate-spin' : ''} />
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
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileCheck size={16} />
                  )}
                  <span>Generate Official 2-Page PDF</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Card 1: Page 1 Data - Reference Details */}
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={18} color="#4F46E5" />
            <span>Page 1: Reference & Interview Allotment</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Interview Date:</span>
              <strong style={{ color: '#0F172A' }}>{slip.interview_date || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Reporting Date & Time:</span>
              <strong style={{ color: '#0F172A' }}>
                {slip.reporting_date || '—'} {slip.reporting_time ? `at ${slip.reporting_time}` : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Department:</span>
              <strong style={{ color: '#0F172A' }}>{slip.department || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Allocated Designation:</span>
              <strong style={{ color: '#0F172A' }}>{slip.selected_designation || slip.designation || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Monthly Salary (CTC):</span>
              <strong style={{ color: '#0F172A' }}>
                {slip.salary_ctc ? `₹${slip.salary_ctc.toLocaleString('en-IN')}` : '—'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Interviewer / Authority:</span>
              <strong style={{ color: '#0F172A' }}>{slip.interview_conducted_by || '—'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Confirmed Joining Date:</span>
              <strong style={{ color: '#0F172A' }}>{slip.joining_date || '—'}</strong>
            </div>

            {slip.remarks && (
              <div style={{ marginTop: '0.25rem', backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '6px' }}>
                <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748B', fontWeight: 600 }}>Remarks / Notes:</span>
                <span style={{ color: '#334155' }}>{slip.remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Page 2 Data - Consultancy Return Form Status */}
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="#10B981" />
            <span>Page 2: Consultancy Return & Statutory Acceptance</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Terms & Conditions:</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>10 Client Statutory Clauses Active</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Candidate Acceptance:</span>
              {consultancyReturn?.candidate_acceptance ? (
                <span style={{ fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Accepted
                </span>
              ) : (
                <span style={{ fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> Pending Candidate Action
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Accepted Timestamp:</span>
              <strong style={{ color: '#0F172A' }}>
                {consultancyReturn?.accepted_at
                  ? new Date(consultancyReturn.accepted_at).toLocaleString('en-IN')
                  : '—'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Candidate Signature:</span>
              {consultancyReturn?.candidate_signature_path || candidate.signatureUrl ? (
                <span style={{ fontWeight: 700, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Available On File
                </span>
              ) : (
                <span style={{ color: '#94A3B8' }}>Not Uploaded</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B' }}>Candidate Photo (Page 1):</span>
              {candidate.photoUrl ? (
                <span style={{ fontWeight: 700, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Attached
                </span>
              ) : (
                <span style={{ color: '#94A3B8' }}>Optional / Not Provided</span>
              )}
            </div>

            <div style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #DCFCE7' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#166534', lineHeight: 1.4 }}>
                Candidate acceptance and signature status are dynamically reflected on Page 2 of the official client document.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generated File History Ledger */}
      {generatedFiles.length > 0 && (
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
            Generated Document Audit Trail (Private Storage)
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '0.5rem' }}>Version</th>
                  <th style={{ padding: '0.5rem' }}>File Name</th>
                  <th style={{ padding: '0.5rem' }}>Size</th>
                  <th style={{ padding: '0.5rem' }}>Generated Date</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedFiles.map((file) => (
                  <tr key={file.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 700, color: '#4F46E5' }}>v{file.version}</td>
                    <td style={{ padding: '0.5rem', color: '#0F172A' }}>{file.file_name}</td>
                    <td style={{ padding: '0.5rem', color: '#64748B' }}>
                      {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem', color: '#64748B' }}>
                      {new Date(file.generated_at).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const { url } = await getGeneratedDocumentSignedUrl(file.storage_path, 3600);
                          if (url) {
                            setActiveSignedUrl(url);
                            setIsPreviewOpen(true);
                          }
                        }}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#475569',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        View v{file.version}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
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

      {/* PDF Preview Modal */}
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
