// ==============================================================================
// File: src/components/admin/JoiningReview.tsx
// Description: Official Joining Paperwork Representation for Admin Application Review
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Architecture:
//   - Canonical 14-page Joining Form representation matching candidate paperwork
//   - Unified data mapping through buildJoiningFormDataFromDb
//   - Secure signed URL resolution for uploaded photo and specimen signature
//   - Action toolbar for Print Official Form & Download Official Joining Packet PDF
//   - Sensitive PII masked by default with SUPER_ADMIN unmasking audit control
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Lock,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Loader2
} from 'lucide-react';
import type {
  ApplicationRow,
  JoiningFormRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  DeclarationRow,
  CompanyRow
} from '../../types/database';
import type { JoiningFormData } from '../../types/joining';
import { CompanyInformationEditor } from './CompanyInformationEditor';
import { AdminSensitiveRevealModal } from './AdminSensitiveRevealModal';
import { JoiningFormPrintPreview } from '../joining/JoiningFormPrintPreview';
import { buildJoiningFormDataFromDb } from '../../services/joiningService';
import { downloadJoiningPacketPdf } from '../../services/joiningPdfGenerator';
import { supabase } from '../../lib/supabaseClient';

interface JoiningReviewProps {
  application: ApplicationRow;
  joiningForm: JoiningFormRow | null;
  education: EducationRecordRow[];
  family: FamilyDetailRow[];
  emergency: EmergencyContactRow[];
  declarations: DeclarationRow | null;
  companies: CompanyRow[];
  isSuperAdmin: boolean;
  canEditCompanyInfo: boolean;
  onRefresh: () => void;
  logActivity: (action: string, description: string, metadata?: Record<string, unknown>) => Promise<void>;
}

export const JoiningReview: React.FC<JoiningReviewProps> = ({
  application,
  joiningForm,
  education,
  family,
  emergency,
  declarations,
  companies,
  isSuperAdmin,
  canEditCompanyInfo,
  onRefresh,
  logActivity
}) => {
  const [revealSensitive, setRevealSensitive] = useState<boolean>(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const isSubmitted = joiningForm?.submission_status === 'SUBMITTED';

  // Securely resolve candidate photo and specimen signature via signed URLs
  useEffect(() => {
    let isMounted = true;

    const resolveSignedAssets = async () => {
      try {
        // 1. Photo resolution
        const photoPath =
          (joiningForm as any)?.photo_storage_path ||
          (joiningForm as any)?.photo_path;

        if (photoPath) {
          const { data } = await supabase.storage
            .from('candidate-documents')
            .createSignedUrl(photoPath, 3600);
          if (data?.signedUrl && isMounted) setPhotoUrl(data.signedUrl);
        } else if (application?.id) {
          const { data: doc } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('application_id', application.id)
            .eq('document_type', 'PHOTO')
            .maybeSingle();
          if (doc?.storage_path) {
            const { data } = await supabase.storage
              .from('candidate-documents')
              .createSignedUrl(doc.storage_path, 3600);
            if (data?.signedUrl && isMounted) setPhotoUrl(data.signedUrl);
          }
        }

        // 2. Specimen Signature resolution
        const sigPath =
          (joiningForm as any)?.signature_storage_path ||
          (joiningForm as any)?.candidate_signature_path ||
          declarations?.candidate_signature_path;

        if (sigPath) {
          const { data } = await supabase.storage
            .from('candidate-documents')
            .createSignedUrl(sigPath, 3600);
          if (data?.signedUrl && isMounted) setSignatureUrl(data.signedUrl);
        } else if (application?.id) {
          const { data: doc } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('application_id', application.id)
            .eq('document_type', 'SIGNATURE')
            .maybeSingle();
          if (doc?.storage_path) {
            const { data } = await supabase.storage
              .from('candidate-documents')
              .createSignedUrl(doc.storage_path, 3600);
            if (data?.signedUrl && isMounted) setSignatureUrl(data.signedUrl);
          }
        }
      } catch (err) {
        console.warn('Could not resolve signed assets for joining review:', err);
      }
    };

    resolveSignedAssets();

    return () => {
      isMounted = false;
    };
  }, [joiningForm, application?.id, declarations]);

  // Masking helpers
  const maskAadhaar = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return `•••• •••• ${clean.slice(-4)}`;
  };

  const maskPan = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.trim();
    if (clean.length <= 4) return clean;
    return `•••••${clean.slice(-4)}`;
  };

  const maskBank = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return `••••••••${clean.slice(-4)}`;
  };

  const handleConfirmReveal = async () => {
    const nextState = !revealSensitive;
    setRevealSensitive(nextState);

    if (nextState) {
      await logActivity(
        'SENSITIVE_DATA_VIEWED',
        'SUPER_ADMIN accessed unmasked statutory identification data (Aadhaar, PAN, Bank details).',
        { candidate_id: application.id, application_number: application.application_number }
      );
    }
  };

  // Build authentic canonical JoiningFormData
  const fullFormData: JoiningFormData = useMemo(() => {
    return buildJoiningFormDataFromDb({
      formRecord: joiningForm,
      applicationRecord: application,
      emergencyRows: emergency,
      educationRows: education,
      familyRows: family,
      declarationRow: declarations,
      signedPhotoUrl: photoUrl,
      signedSigUrl: signatureUrl
    });
  }, [joiningForm, application, emergency, education, family, declarations, photoUrl, signatureUrl]);

  // Screen display form data with sensitive PII masking applied when not revealed
  const displayFormData: JoiningFormData = useMemo(() => {
    if (revealSensitive) return fullFormData;
    return {
      ...fullFormData,
      personal: {
        ...fullFormData.personal,
        aadhaarNumber: maskAadhaar(fullFormData.personal.aadhaarNumber),
        panNumber: maskPan(fullFormData.personal.panNumber)
      },
      bank: {
        ...fullFormData.bank,
        bankAccountNumber: maskBank(fullFormData.bank.bankAccountNumber)
      }
    };
  }, [fullFormData, revealSensitive]);

  // Handler: Download Official PDF
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadJoiningPacketPdf(fullFormData);
      await logActivity(
        'JOINING_PACKET_DOWNLOADED',
        `Downloaded official joining packet PDF for candidate ${application.full_name}.`,
        { application_id: application.id, candidate_name: application.full_name }
      );
    } catch (err: any) {
      console.error('Failed to download official joining packet:', err);
      alert('Unable to generate official joining PDF packet: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div>
      {/* Status & Security Control Banner */}
      <div
        className="admin-card no-print"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: isSubmitted ? '#DCFCE7' : '#FEF3C7',
                color: isSubmitted ? '#166534' : '#92400E',
                border: isSubmitted ? '1px solid #86EFAC' : '1px solid #FDE68A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {isSubmitted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              <span>{joiningForm?.submission_status || 'DRAFT / PREVIEW'}</span>
            </span>

            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: '#F1F5F9',
                color: '#192A56',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0'
              }}
            >
              {fullFormData.joiningReference}
            </span>

            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
              OFFICIAL JOINING FORM (DOSSIER)
            </h2>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {isSubmitted ? (
              <>
                Submitted on{' '}
                <strong style={{ color: '#192A56' }}>
                  {joiningForm?.submitted_at
                    ? new Date(joiningForm.submitted_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
                    : 'Recorded'}
                </strong>{' '}
                • Official Canonical Paperwork View
              </>
            ) : (
              'Candidate has not submitted final joining form yet. Showing pre-populated registration draft.'
            )}
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Sensitive Information Unmask Control (SUPER_ADMIN Only) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsRevealModalOpen(true)}
              className={revealSensitive ? 'btn-admin-danger' : 'btn-admin-secondary'}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {revealSensitive ? <Lock size={14} /> : <Eye size={14} />}
              <span>{revealSensitive ? 'Re-mask Sensitive PII' : 'Reveal Sensitive PII'}</span>
            </button>
          )}

          {/* Print Official Form */}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-admin-secondary"
            style={{
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Printer size={14} />
            <span>Print Official Form</span>
          </button>

          {/* Download Official PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-admin-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {isDownloadingPdf ? <Loader2 size={14} className="admin-spinner-sm" /> : <Download size={14} />}
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>
        </div>
      </div>

      {/* Admin / Company Information Allocation Control (Outside Form Sheets) */}
      <div className="no-print">
        <CompanyInformationEditor
          applicationId={application.id}
          joiningForm={joiningForm}
          companies={companies}
          canEdit={canEditCompanyInfo}
          onSaved={onRefresh}
          logActivity={logActivity}
        />
      </div>

      {/* Official Joining Form Paperwork Representation (Canonical Sheets) */}
      <div style={{ marginTop: '1.5rem' }}>
        <JoiningFormPrintPreview
          formData={displayFormData}
          isSubmitted={isSubmitted}
        />
      </div>

      {/* Sensitive PII Reveal Confirmation Modal */}
      <AdminSensitiveRevealModal
        isOpen={isRevealModalOpen}
        isRevealed={revealSensitive}
        onConfirm={handleConfirmReveal}
        onClose={() => setIsRevealModalOpen(false)}
      />
    </div>
  );
};
