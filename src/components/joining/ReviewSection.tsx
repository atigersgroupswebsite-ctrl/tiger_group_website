// ==============================================================================
// File: src/components/joining/ReviewSection.tsx
// Description: Print-Style Joining Form Review for A TIGER GLOBAL
// Brand: A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY
// Architecture:
//   - Hosts the authentic 14-page JoiningFormPrintPreview matching client joining_form.pdf
//   - Clean toolbar for Print & Direct Master PDF Download (via pdf-lib overlay)
//   - Education is completely OPTIONAL (never marked missing or blocking)
//   - Strict @media print styling hiding all browser/website UI
//   - Submitted state locks candidate edits and hides submission button
// ==============================================================================

import React, { useState } from 'react';
import {
  Printer,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Loader2
} from 'lucide-react';
import type { JoiningFormData } from '../../types/joining';
import type { StepValidationResult } from '../../utils/joiningValidation';
import { JoiningFormPrintPreview } from './JoiningFormPrintPreview';
import { downloadJoiningPacketPdf } from '../../services/joiningPdfGenerator';

interface ReviewSectionProps {
  formData: JoiningFormData;
  stepValidation: Record<number, StepValidationResult>;
  onEditStep: (stepNumber: number) => void;
  confirmationChecked: boolean;
  onConfirmationToggle: (checked: boolean) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  onBackToSuccess?: () => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  formData,
  stepValidation,
  onEditStep,
  confirmationChecked,
  onConfirmationToggle,
  onSubmit,
  isSubmitting = false
}) => {
  const isSubmitted =
    formData.status === 'SUBMITTED' || formData.submissionStatus === 'SUBMITTED';

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Aggregate missing fields across candidate steps (1 through 7)
  // Step 4 (Education) is completely OPTIONAL. It does not block or show error if 0 records.
  const missingItems: { step: number; stepName: string; fields: string[] }[] = [];
  const candidateStepTitles: Record<number, string> = {
    1: 'Personal Information',
    2: 'Address & Emergency Contacts',
    3: 'Bank Details',
    4: 'Education Details (Optional)',
    5: 'Family Details',
    6: 'Documents & Verification',
    7: 'Declarations & Undertaking'
  };

  for (let s = 1; s <= 7; s++) {
    // Step 4 is education - it is completely optional. It only flags if a candidate entered a partial/invalid row.
    if (s === 4) {
      const eduVal = stepValidation[4];
      if (!eduVal || eduVal.isValid || !formData.education || formData.education.length === 0) {
        continue;
      }
    }

    const val = stepValidation[s];
    if (val && !val.isValid && val.missingFields?.length > 0) {
      missingItems.push({
        step: s,
        stepName: candidateStepTitles[s] || `Step ${s}`,
        fields: val.missingFields
      });
    }
  }

  const isAllComplete = missingItems.length === 0;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfError(null);
      await downloadJoiningPacketPdf(formData);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate PDF. You can also use the Print button to Save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="print-review-wrapper">
      {/* ---------------------------------------------------------------------- */}
      {/* PRINT-ONLY CSS RULES (Section 5 & 22: Hide everything except form)    */}
      {/* ---------------------------------------------------------------------- */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all application & website navigation elements */
          header,
          footer,
          nav,
          .navbar,
          .site-header,
          .site-footer,
          .no-print,
          .joining-header,
          .joining-progress-sidebar,
          .joining-mobile-progress,
          .joining-navigation,
          .btn-edit-section,
          .pdf-edit-bar,
          .review-alert-banner,
          .submission-banner-action,
          .review-actions-toolbar,
          .confirm-submit-card,
          button {
            display: none !important;
          }
          .joining-page-container {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            min-height: auto !important;
          }
          .joining-layout,
          .joining-main-content,
          .joining-form-card,
          .print-review-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .joining-form-print-preview {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            border: 1.5pt solid #000000 !important;
            box-shadow: none !important;
            margin: 0 0 10mm 0 !important;
            padding: 10mm !important;
            background: #ffffff !important;
          }
          .pdf-page-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* ---------------------------------------------------------------------- */}
      {/* SUBMITTED STATE BANNER (Section 23)                                    */}
      {/* ---------------------------------------------------------------------- */}
      {isSubmitted && (
        <div
          className="submission-banner-action no-print"
          style={{
            backgroundColor: '#F0FDF4',
            border: '2px solid #16A34A',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              <CheckCircle2 size={16} />
              <span>SUBMISSION OFFICIAL & LOCKED</span>
            </div>
            <h2 style={{ fontSize: '1.3rem', color: '#0F172A', margin: '0.2rem 0', fontWeight: 800 }}>
              JOINING DOSSIER SUBMITTED
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              Your onboarding dossier is officially submitted. Record edits are closed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>
                Joining Reference
              </span>
              <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F1B38', fontSize: '0.95rem' }}>
                {formData.joiningReference || 'JOIN-2026-CONFIRMED'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>
                Submission Date
              </span>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                {formData.submittedAt ? new Date(formData.submittedAt).toLocaleDateString() : 'Confirmed'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>PRINT FORM</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isGeneratingPdf ? 'wait' : 'pointer'
              }}
            >
              {isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              <span>{isGeneratingPdf ? 'PREPARING PDF...' : 'DOWNLOAD PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TOP TOOLBAR (Draft Review Mode)                                        */}
      {/* ---------------------------------------------------------------------- */}
      {!isSubmitted && (
        <div
          className="review-actions-toolbar no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: 0 }}>
              JOINING FORM PREVIEW
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.825rem', color: '#64748B' }}>
              Matches the official 14-page client joining packet. Review details before final submission.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#0F1B38',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>PRINT PREVIEW</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: isGeneratingPdf ? 'wait' : 'pointer'
              }}
            >
              {isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              <span>{isGeneratingPdf ? 'GENERATING...' : 'DOWNLOAD MASTER PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {pdfError && (
        <div
          className="no-print"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '6px',
            fontSize: '0.825rem',
            color: '#991B1B'
          }}
        >
          {pdfError}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MISSING ITEMS ALERT (Draft Mode Only)                                  */}
      {/* ---------------------------------------------------------------------- */}
      {!isSubmitted && !isAllComplete && (
        <div
          className="review-alert-banner no-print"
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.85rem'
          }}
        >
          <AlertTriangle size={20} style={{ color: '#991B1B', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#991B1B', margin: '0 0 0.35rem 0', fontWeight: 800 }}>
              Form Incomplete — Required Fields Missing
            </h4>
            <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0 0 0.5rem 0' }}>
              You must supply all mandatory fields before submitting. (Education is optional). Click <strong>EDIT</strong> on any section below to complete:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#991B1B' }}>
              {missingItems.map((item) => (
                <li key={item.step} style={{ marginBottom: '0.2rem' }}>
                  <strong>{item.stepName}:</strong> {item.fields.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* CANONICAL 14-PAGE FORM PRINT PREVIEW                                   */}
      {/* ---------------------------------------------------------------------- */}
      <JoiningFormPrintPreview
        formData={formData}
        onEditStep={onEditStep}
        isSubmitted={isSubmitted}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* FINAL SUBMISSION CONTROLS (Only visible when NOT yet submitted)        */}
      {/* ---------------------------------------------------------------------- */}
      {!isSubmitted && (
        <div
          className="confirm-submit-card no-print"
          style={{
            background: '#F8FAFC',
            border: '2px solid #0F1B38',
            borderRadius: '8px',
            padding: '1.75rem',
            marginTop: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <input
              type="checkbox"
              id="confirmReviewSubmit"
              checked={confirmationChecked}
              onChange={(e) => onConfirmationToggle(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
            />
            <label
              htmlFor="confirmReviewSubmit"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer', lineHeight: 1.5 }}
            >
              I confirm that I have reviewed the complete Joining / Registration Form preview above, all details provided are correct and final, and I consent to the official submission of my onboarding records to A TIGER GLOBAL Career Solution & Consultancy.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!confirmationChecked || !isAllComplete || isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.85rem 2rem',
                backgroundColor: !confirmationChecked || !isAllComplete || isSubmitting ? '#94A3B8' : '#0F1B38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: !confirmationChecked || !isAllComplete || isSubmitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease'
              }}
            >
              <FileCheck2 size={18} />
              <span>{isSubmitting ? 'SUBMITTING ONBOARDING DOSSIER...' : 'SUBMIT JOINING FORM'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
