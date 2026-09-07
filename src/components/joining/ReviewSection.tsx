// ==============================================================================
// File: src/components/joining/ReviewSection.tsx
// Description: Print-Style Joining Form Preview for A TIGER GLOBAL
// Hierarchy: Formal Document Header, Employee Information, Personal, Address,
//            Emergency, Bank, Education, Family, Documents, Declarations,
//            with actual rendered Photo and Signature previews, section EDIT buttons,
//            and dedicated @media print layout rules.
// ==============================================================================

import React from 'react';
import {
  Printer,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  User,
  Check
} from 'lucide-react';
import type { JoiningFormData } from '../../types/joining';
import type { StepValidationResult } from '../../utils/joiningValidation';

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

  // Aggregate missing fields across candidate steps (1 through 7)
  const missingItems: { step: number; stepName: string; fields: string[] }[] = [];
  const candidateStepTitles: Record<number, string> = {
    1: 'Personal Information',
    2: 'Address & Emergency Contacts',
    3: 'Bank Details',
    4: 'Education Details',
    5: 'Family Details',
    6: 'Documents & Verification',
    7: 'Declarations & Consent'
  };

  for (let s = 1; s <= 7; s++) {
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

  // Photo & Signature Image URLs
  const candidatePhotoUrl = formData.documents?.PHOTO?.file?.dataUrl;
  const candidateSignatureUrl = formData.documents?.SIGNATURE?.file?.dataUrl;

  const maskAccount = (num: string) => {
    if (!num) return '—';
    if (num.length <= 4) return num;
    return '•'.repeat(num.length - 4) + num.slice(-4);
  };

  return (
    <div className="print-review-wrapper">
      {/* Print Stylesheet Definition */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .no-print,
          .joining-progress-sidebar,
          .joining-mobile-progress,
          .joining-nav-actions,
          header,
          nav,
          footer,
          .btn-edit-section,
          .review-alert-banner,
          .submission-banner-action {
            display: none !important;
          }
          .joining-layout {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .joining-main-content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .joining-form-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .print-document-container {
            border: 1.5pt solid #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: #ffffff !important;
          }
          .print-section-box {
            border: 1pt solid #333333 !important;
            margin-bottom: 8mm !important;
            page-break-inside: avoid;
          }
          .print-section-header {
            background-color: #f0f0f0 !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        .print-document-container {
          background: #FFFFFF;
          border: 2px solid #0F1B38;
          border-radius: 8px;
          padding: 2.5rem;
          color: #0F172A;
          box-shadow: 0 4px 16px rgba(15, 27, 56, 0.08);
          position: relative;
        }

        .print-doc-header {
          border-bottom: 2px solid #0F1B38;
          padding-bottom: 1.25rem;
          margin-bottom: 1.75rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .print-doc-brand {
          flex: 1;
        }

        .print-doc-brand-title {
          font-size: 1.35rem;
          font-weight: 900;
          color: #0F1B38;
          letter-spacing: 0.08em;
          margin: 0 0 0.2rem 0;
          text-transform: uppercase;
        }

        .print-doc-brand-subtitle {
          font-size: 0.95rem;
          font-weight: 700;
          color: #8C7B65;
          letter-spacing: 0.05em;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
        }

        .print-doc-title {
          font-size: 1.1rem;
          font-weight: 800;
          background-color: #0F1B38;
          color: #FFFFFF;
          padding: 0.35rem 0.85rem;
          display: inline-block;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 0.25rem;
        }

        .print-photo-box {
          width: 110px;
          height: 135px;
          border: 1.5px solid #0F1B38;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          text-align: center;
          position: relative;
        }

        .print-photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .print-section-box {
          border: 1px solid #CBD5E1;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .print-section-header {
          background-color: #F1F5F9;
          border-bottom: 1px solid #CBD5E1;
          padding: 0.6rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .print-section-title {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0F1B38;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0;
        }

        .print-section-body {
          padding: 1rem 1.25rem;
        }

        .print-grid-4 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.85rem;
        }

        .print-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .print-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 2px;
        }

        .print-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.825rem;
          text-align: left;
        }

        .print-table th {
          background-color: #F8FAFC;
          border-bottom: 1px solid #CBD5E1;
          padding: 0.5rem 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.72rem;
        }

        .print-table td {
          border-bottom: 1px solid #F1F5F9;
          padding: 0.55rem 0.75rem;
          color: #1E293B;
        }

        .btn-edit-section {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: transparent;
          border: 1px solid #CBD5E1;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #0F1B38;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-edit-section:hover {
          background-color: #0F1B38;
          color: #FFFFFF;
          border-color: #0F1B38;
        }

        .print-sig-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .print-sig-box {
          border: 1px dashed #64748B;
          background-color: #F8FAFC;
          border-radius: 4px;
          width: 220px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-top: 0.4rem;
        }

        .print-sig-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      `}</style>

      {/* SUBMITTED PERSISTENT BANNER */}
      {isSubmitted && (
        <div
          className="submission-banner-action"
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
              <span>SUBMITTED RECORD LOCKED</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#0F172A', margin: '0.2rem 0' }}>
              JOINING DOSSIER SUBMITTED
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              This submission is official and locked. Candidate modifications are disabled.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Joining Reference
              </span>
              <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F1B38', fontSize: '1rem' }}>
                {formData.joiningReference || 'JOIN-2026-SUBMITTED'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Submission Date
              </span>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                {formData.submittedAt ? new Date(formData.submittedAt).toLocaleDateString() : 'Confirmed'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Status
              </span>
              <div>
                <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '12px', background: '#16A34A', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>
                  SUBMITTED
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="no-print"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.1rem',
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
          </div>
        </div>
      )}

      {/* Top Toolbar in Draft Mode */}
      {!isSubmitted && (
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: 0 }}>
              PRINT-STYLE JOINING FORM PREVIEW
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Structured document review prior to official candidate submission.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.95rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 700,
              color: '#0F1B38',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>PRINT PREVIEW</span>
          </button>
        </div>
      )}

      {/* Missing Items Warning (Draft mode only) */}
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
              You must supply all mandatory fields before submitting. Click <strong>EDIT</strong> on any section below to update:
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

      {/* ====================================================================== */}
      {/* FORMAL PRINT-STYLE JOINING FORM DOCUMENT CONTAINER                     */}
      {/* ====================================================================== */}
      <div className="print-document-container">
        {/* DOCUMENT HEADER & BRAND */}
        <div className="print-doc-header">
          <div className="print-doc-brand">
            <h1 className="print-doc-brand-title">A TIGER GLOBAL</h1>
            <div className="print-doc-brand-subtitle">CAREER SOLUTION & CONSULTANCY</div>
            <div className="print-doc-title">JOINING / REGISTRATION FORM</div>
          </div>

          {/* CANDIDATE PHOTO PREVIEW (Section 20 requirement) */}
          <div className="print-photo-box">
            {candidatePhotoUrl ? (
              <img src={candidatePhotoUrl} alt="Candidate Specimen Photograph" />
            ) : (
              <div style={{ padding: '0.5rem', color: '#94A3B8', fontSize: '0.65rem' }}>
                <User size={28} style={{ margin: '0 auto 0.25rem auto' }} />
                <span>AFFIX PASSPORT SIZE PHOTO</span>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: EMPLOYEE INFORMATION (Company-side blank / unassigned)  */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">EMPLOYEE INFORMATION</h2>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
              [ Administrative Placement Controls ]
            </span>
          </div>
          <div className="print-section-body">
            <div className="print-grid-4">
              <div>
                <span className="print-label">Employee Name</span>
                <div className="print-value">{formData.personal.employeeName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Employee Code</span>
                <div className="print-value" style={{ color: '#64748B', fontStyle: 'italic' }}>
                  [ To be allocated by administration ]
                </div>
              </div>
              <div>
                <span className="print-label">Designation</span>
                <div className="print-value" style={{ color: '#64748B', fontStyle: 'italic' }}>
                  [ To be allocated by administration ]
                </div>
              </div>
              <div>
                <span className="print-label">Department</span>
                <div className="print-value" style={{ color: '#64748B', fontStyle: 'italic' }}>
                  [ To be allocated by administration ]
                </div>
              </div>
              <div>
                <span className="print-label">Location</span>
                <div className="print-value" style={{ color: '#64748B', fontStyle: 'italic' }}>
                  [ To be allocated by administration ]
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: EMPLOYEE PERSONAL INFORMATION                           */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">EMPLOYEE PERSONAL INFORMATION</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(1)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body">
            <div className="print-grid-4">
              <div>
                <span className="print-label">Full Name</span>
                <div className="print-value">{formData.personal.employeeName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Date of Birth</span>
                <div className="print-value">{formData.personal.dateOfBirth || '—'}</div>
              </div>
              <div>
                <span className="print-label">Gender</span>
                <div className="print-value">{formData.personal.gender || '—'}</div>
              </div>
              <div>
                <span className="print-label">Father Name</span>
                <div className="print-value">{formData.personal.fatherName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Mother / Husband Name</span>
                <div className="print-value">{formData.personal.motherOrHusbandName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Marital Status</span>
                <div className="print-value">{formData.personal.maritalStatus || '—'}</div>
              </div>
              <div>
                <span className="print-label">Spouse Name</span>
                <div className="print-value">{formData.personal.spouseName || 'N/A'}</div>
              </div>
              <div>
                <span className="print-label">Blood Group</span>
                <div className="print-value">{formData.personal.bloodGroup || '—'}</div>
              </div>
              <div>
                <span className="print-label">Aadhaar Number</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {formData.personal.aadhaarNumber
                    ? `•••• •••• ${formData.personal.aadhaarNumber.slice(-4)}`
                    : '—'}
                </div>
              </div>
              <div>
                <span className="print-label">PAN Number</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {formData.personal.panNumber || '—'}
                </div>
              </div>
              <div>
                <span className="print-label">Mobile Number</span>
                <div className="print-value">{formData.personal.employeeContactNumber || '—'}</div>
              </div>
              <div>
                <span className="print-label">Email Address</span>
                <div className="print-value">{formData.personal.emailId || formData.userEmail || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: ADDRESS DETAILS                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">ADDRESS DETAILS</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(2)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body">
            <div className="print-grid-2">
              <div>
                <span className="print-label" style={{ fontWeight: 800, color: '#0F1B38' }}>
                  Permanent Address
                </span>
                <div className="print-value" style={{ marginTop: '4px', lineHeight: 1.5 }}>
                  {formData.permanentAddress.address || '—'}<br />
                  {formData.permanentAddress.city && `${formData.permanentAddress.city}, `}
                  {formData.permanentAddress.district && `${formData.permanentAddress.district}, `}
                  {formData.permanentAddress.state} — {formData.permanentAddress.pinCode}
                </div>
              </div>

              <div>
                <span className="print-label" style={{ fontWeight: 800, color: '#0F1B38' }}>
                  Current Address
                </span>
                <div className="print-value" style={{ marginTop: '4px', lineHeight: 1.5 }}>
                  {formData.sameAsPermanentAddress ? (
                    <em style={{ color: '#64748B' }}>Same as Permanent Address</em>
                  ) : (
                    <>
                      {formData.currentAddress.address || '—'}<br />
                      {formData.currentAddress.city && `${formData.currentAddress.city}, `}
                      {formData.currentAddress.district && `${formData.currentAddress.district}, `}
                      {formData.currentAddress.state} — {formData.currentAddress.pinCode}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 4: EMERGENCY FAMILY CONTACT                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">EMERGENCY FAMILY CONTACT</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(2)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body" style={{ padding: 0 }}>
            {formData.emergencyContacts.length === 0 ? (
              <div style={{ padding: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
                No emergency contact records provided.
              </div>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Relation</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.emergencyContacts.map((c, i) => (
                    <tr key={c.id || i}>
                      <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                      <td>{c.contactNumber || '—'}</td>
                      <td>{c.relation || '—'}</td>
                      <td>{c.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 5: BANK DETAILS                                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">BANK DETAILS</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(3)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body">
            <div className="print-grid-4">
              <div>
                <span className="print-label">Account Holder</span>
                <div className="print-value">{formData.bank.accountHolderName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Account Number</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {maskAccount(formData.bank.bankAccountNumber)}
                </div>
              </div>
              <div>
                <span className="print-label">IFSC Code</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {formData.bank.ifscCode || '—'}
                </div>
              </div>
              <div>
                <span className="print-label">Bank Name</span>
                <div className="print-value">{formData.bank.bankName || '—'}</div>
              </div>
              <div>
                <span className="print-label">Branch</span>
                <div className="print-value">{formData.bank.branchName || '—'}</div>
              </div>
              <div>
                <span className="print-label">UAN</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {formData.bank.uanNumber || 'N/A'}
                </div>
              </div>
              <div>
                <span className="print-label">ESIC</span>
                <div className="print-value" style={{ fontFamily: 'monospace' }}>
                  {formData.bank.esicNumber || 'N/A'}
                </div>
              </div>
              <div>
                <span className="print-label">PT</span>
                <div className="print-value">
                  {formData.bank.ptNumber || 'Not Applicable'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 6: EDUCATION DETAILS                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">EDUCATION DETAILS</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(4)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body" style={{ padding: 0 }}>
            {formData.education.length === 0 ? (
              <div style={{ padding: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
                No education records entered.
              </div>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Qualification</th>
                    <th>Board / University</th>
                    <th>Year</th>
                    <th>Percentage / Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.education.map((edu, i) => (
                    <tr key={edu.id || i}>
                      <td style={{ fontWeight: 600 }}>{edu.qualification || '—'}</td>
                      <td>{edu.boardOrUniversity || '—'}</td>
                      <td>{edu.yearOfPassing || '—'}</td>
                      <td>{edu.percentageOrGrade || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 7: FAMILY DETAILS                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">FAMILY DETAILS</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(5)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body" style={{ padding: 0 }}>
            {formData.family.length === 0 ? (
              <div style={{ padding: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
                No family details provided.
              </div>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age / DOB</th>
                    <th>Relation</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.family.map((fam, i) => (
                    <tr key={fam.id || i}>
                      <td style={{ fontWeight: 600 }}>{fam.name || '—'}</td>
                      <td>{fam.dateOfBirthOrAge || '—'}</td>
                      <td>{fam.relation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 8: DOCUMENT CHECKLIST                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">DOCUMENT CHECKLIST</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(6)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body" style={{ padding: 0 }}>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Requirement</th>
                  <th>Submission Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'PHOTO', label: 'Passport Size Photograph', req: 'Mandatory' },
                  { key: 'SIGNATURE', label: 'Specimen Signature', req: 'Mandatory' },
                  { key: 'AADHAAR_FRONT', label: 'Aadhaar Card (Front Side)', req: 'Mandatory' },
                  { key: 'AADHAAR_BACK', label: 'Aadhaar Card (Back Side)', req: 'Mandatory' },
                  { key: 'PAN', label: 'PAN Card Copy', req: 'Mandatory' },
                  { key: 'BANK_PASSBOOK', label: 'Bank Passbook / Cheque', req: 'Mandatory' },
                  { key: 'EDUCATION_CERTIFICATE', label: 'Education Certificate / Marksheet', req: 'Mandatory' },
                  { key: 'ADDRESS_PROOF', label: 'Address Proof (Optional)', req: 'Optional' },
                  { key: 'EXPERIENCE_CERTIFICATE', label: 'Experience Certificate (Optional)', req: 'Optional' }
                ].map((item) => {
                  const doc = (formData.documents as any)?.[item.key];
                  const hasFile = !!doc?.file?.name || !!doc?.file?.dataUrl;

                  return (
                    <tr key={item.key}>
                      <td style={{ fontWeight: 600 }}>{item.label}</td>
                      <td style={{ color: '#64748B' }}>{item.req}</td>
                      <td>
                        {hasFile ? (
                          <span style={{ color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={13} />
                            <span>Uploaded ({doc?.file?.name || 'File Attached'})</span>
                          </span>
                        ) : (
                          <span style={{ color: item.req === 'Mandatory' ? '#DC2626' : '#94A3B8', fontWeight: 600 }}>
                            {item.req === 'Mandatory' ? 'Pending Upload' : 'Not Provided'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 9: DECLARATIONS                                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="print-section-box">
          <div className="print-section-header">
            <h2 className="print-section-title">DECLARATIONS & UNDERTAKING</h2>
            {!isSubmitted && (
              <button
                type="button"
                className="btn-edit-section no-print"
                onClick={() => onEditStep(7)}
              >
                <Edit3 size={11} />
                <span>EDIT</span>
              </button>
            )}
          </div>
          <div className="print-section-body">
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.825rem', color: '#334155', lineHeight: 1.6 }}>
              I hereby declare that all information and documentation provided in this Joining Form are complete, genuine, and accurate to the best of my knowledge. I understand that any false declaration or concealment of material facts may result in cancellation of my onboarding and termination of service without notice.
            </p>

            <div className="print-sig-container">
              <div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.25rem' }}>
                  Candidate Acceptance: <strong>{formData.declarations.candidateDeclarationAcknowledged ? 'Confirmed' : 'Pending'}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.25rem' }}>
                  Code of Conduct Acceptance: <strong>{formData.declarations.rulesAndConductAccepted ? 'Accepted' : 'Pending'}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.25rem' }}>
                  Date: <strong>{formData.declarations.declarationDate || new Date().toISOString().split('T')[0]}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                  Signatory Name: <strong>{formData.declarations.signatoryName || formData.personal.employeeName}</strong>
                </div>
              </div>

              {/* CANDIDATE SPECIMEN SIGNATURE PREVIEW (Section 21 requirement) */}
              <div>
                <span className="print-label" style={{ textAlign: 'center' }}>
                  Candidate Signature
                </span>
                <div className="print-sig-box">
                  {candidateSignatureUrl ? (
                    <img src={candidateSignatureUrl} alt="Candidate Specimen Signature" />
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      [ Specimen Signature Area ]
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* FINAL SUBMISSION CONTROLS (Only visible when NOT yet submitted)        */}
      {/* Section 24: Do NOT show old submit button after submission!           */}
      {/* ====================================================================== */}
      {!isSubmitted && (
        <div
          className="no-print"
          style={{
            background: '#F8FAFC',
            border: '2px solid #0F1B38',
            borderRadius: '8px',
            padding: '1.75rem',
            marginTop: '1.5rem'
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
