// ==============================================================================
// File: src/components/admin/CompleteJoiningDocumentModal.tsx
// Description: Multi-Page A4 Interactive Preview & Print Modal for Complete Joining Documents
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   - High-fidelity 3-page A4 vector preview matching complete onboarded paperwork
//   - Section A: Company Header
//   - Section B: Joining Details (1–7)
//   - Section C: Candidate Personal Details (8–21) (Strictly NO PAN for Regular Joining)
//   - Section D: Banking Particulars (22–26)
//   - Section E: Required Document & Photo Specimens (27–30)
//   - Section F: Original Formal Joining Report Undertaking
//   - Section G: Statutory Undertakings & Code of Conduct (Clauses 1–6)
//   - Section H: Master Attestation & Signatures
//   - One-Click PDF Download & Print
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Loader2,
  FileCheck2,
  CheckCircle2
} from 'lucide-react';
import type { RegularJoiningFormData } from '../../services/regularJoiningService';
import {
  downloadCompleteJoiningDocumentPdf
} from '../../services/completeJoiningDocumentGenerator';
import {
  FORMAL_JOINING_UNDERTAKING,
  STATUTORY_UNDERTAKINGS,
  MASTER_ATTESTATION
} from '../../constants/joiningDeclarations';

interface CompleteJoiningDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RegularJoiningFormData;
  companySignatureUrl?: string | null;
  verifierName?: string;
}

export const CompleteJoiningDocumentModal: React.FC<CompleteJoiningDocumentModalProps> = ({
  isOpen,
  onClose,
  formData,
  companySignatureUrl,
  verifierName = 'Authorized HR Cell'
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const employeeCode = formData.employeeCode || 'ATG-501-2026';
  const joiningDate = formData.joiningDate || new Date().toISOString().split('T')[0];
  const place = 'Nagpur, Maharashtra';

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      setDownloadSuccess(null);
      const res = await downloadCompleteJoiningDocumentPdf(formData, {
        companySignatureUrl,
        verifierName,
        place
      });
      if (res.success) {
        setDownloadSuccess(`Downloaded: ${res.fileName}`);
        setTimeout(() => setDownloadSuccess(null), 4000);
      }
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="complete-doc-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 27, 56, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      {/* Top Floating Control Bar (Hidden during Print) */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: '920px',
          backgroundColor: '#0F1B38',
          color: '#FFFFFF',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(197, 160, 89, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              backgroundColor: 'rgba(197, 160, 89, 0.2)',
              color: '#C5A059',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <FileCheck2 size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.3px' }}>
              COMPLETE EMPLOYEE JOINING DOCUMENT
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Code: <strong style={{ color: '#C5A059' }}>{employeeCode}</strong> | Candidate: <strong>{formData.fullName}</strong>
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div
            style={{
              backgroundColor: '#065F46',
              color: '#A7F3D0',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={13} />
            <span>{downloadSuccess}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Print A4 Document</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#C5A059',
              color: '#0F1B38',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: isDownloading ? 'not-allowed' : 'pointer'
            }}
          >
            {isDownloading ? <Loader2 size={15} className="admin-spinner" /> : <Download size={15} />}
            <span>Download Complete Joining Document</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* A4 Printable Sheets Wrapper */}
      <div
        id="complete-joining-printable-dossier"
        style={{
          width: '100%',
          maxWidth: '820px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        {/* ==================================================================== */}
        {/* SHEET 1: JOINING DETAILS, PERSONAL PARTICULARS & BANKING            */}
        {/* ==================================================================== */}
        <div
          className="pdf-page-sheet"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            borderRadius: '4px',
            padding: '32px 36px',
            minHeight: '1120px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#1E293B',
            fontSize: '12px'
          }}
        >
          <div>
            {/* Sheet Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0F1B38',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F1B38', letterSpacing: '0.5px' }}>
                  A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  Nagpur, Maharashtra | Certified Employment & Placement Governance
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38' }}>
                  REF: <span style={{ fontFamily: 'monospace' }}>{employeeCode}</span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  DATE: {joiningDate}
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div
              style={{
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                textAlign: 'center',
                padding: '6px 10px',
                fontWeight: 800,
                fontSize: '12.5px',
                letterSpacing: '0.5px',
                marginBottom: '14px',
                borderRadius: '2px'
              }}
            >
              EMPLOYEE JOINING DOSSIER & STATUTORY PARTICULARS
            </div>

            {/* SECTION A: JOINING DETAILS */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderBottom: 'none',
                  padding: '5px 8px',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: '#0F1B38',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>SECTION A: JOINING DETAILS (1–7)</span>
                <span style={{ color: '#C5A059' }}>OFFICIAL RECORD</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #CBD5E1', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>1. Employee Code:</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, border: '1px solid #CBD5E1' }}>{formData.employeeCode}</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>2. Joining Date:</td>
                    <td style={{ width: '25%', padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.joiningDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>3. Department:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.department || '—'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>4. Designation:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.designation || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>5. Placement Company:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.companyName || '—'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>6. Unit / Worksite:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.unitName || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>7. Factory / Supervisor:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.factorySupervisorName || '—'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>Date of Interview:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.interviewDate || '—'}</td>
                  </tr>
                  {formData.salaryCtc ? (
                    <tr>
                      <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>Salary (CTC) per Month:</td>
                      <td style={{ padding: '4px 6px', fontWeight: 700, color: '#047857', border: '1px solid #CBD5E1' }}>₹ {Number(formData.salaryCtc).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>Status:</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>ACTIVE / VERIFIED</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* SECTION B: CANDIDATE PERSONAL DETAILS (NO PAN FIELD) */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderBottom: 'none',
                  padding: '5px 8px',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: '#0F1B38',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>SECTION B: CANDIDATE PERSONAL DETAILS (8–21)</span>
                <span style={{ color: '#047857' }}>VERIFIED KYC</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #CBD5E1', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>8. Full Legal Name:</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 800, color: '#0F1B38', border: '1px solid #CBD5E1' }}>{formData.fullName}</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>9. Father's Name:</td>
                    <td style={{ width: '25%', padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.fatherName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>10. Date of Birth:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.dob}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>11. Gender / Marital:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.gender} / {formData.maritalStatus}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>12. Aadhaar Number:</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, border: '1px solid #CBD5E1' }}>{formData.aadhaarNumber}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>13. Mobile (Aadhaar):</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.mobile}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>14. Alternate Mobile:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.alternateMobile || '—'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>15. Email Address:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.email}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>16. UAN (PF Number):</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.uanNumber || 'Not Enrolled / N/A'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>17. ESIC Number:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.esicNumber || 'Not Enrolled / N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>18. Professional Tax (PT):</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.ptNumber || 'Not Enrolled / N/A'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>Verification Status:</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, color: '#047857', border: '1px solid #CBD5E1' }}>{formData.submissionStatus || 'VERIFIED'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>19. Permanent Address:</td>
                    <td colSpan={3} style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.permanentAddress}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>20. Current Address:</td>
                    <td colSpan={3} style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.currentAddress || formData.permanentAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION C: BANK DETAILS */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderBottom: 'none',
                  padding: '5px 8px',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: '#0F1B38',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>SECTION C: BANK DISBURSEMENT DETAILS (22–26)</span>
                <span style={{ color: '#DC2626' }}>CONFIDENTIAL / INTERNAL</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #CBD5E1', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>22. Account Number:</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, border: '1px solid #CBD5E1' }}>{formData.bankAccountNumber}</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>23. IFSC Code:</td>
                    <td style={{ width: '25%', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, border: '1px solid #CBD5E1' }}>{formData.ifscCode}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>24. Bank Name:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.bankName}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>25. Branch Name:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.branchName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>26. PhonePe / UPI:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>{formData.upiNumber || 'Not Linked'}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>Disbursement:</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #CBD5E1' }}>Direct Bank Transfer (NEFT/RTGS)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sheet Footer */}
          <div
            style={{
              borderTop: '1px solid #CBD5E1',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748B'
            }}
          >
            <span>A TIGER GLOBAL Career Solution & Consultancy — Confidential Onboarding Record</span>
            <span>Page 1 of 3</span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SHEET 2: REQUIRED PHOTOGRAPHS & ORIGINAL FORMAL JOINING UNDERTAKING */}
        {/* ==================================================================== */}
        <div
          className="pdf-page-sheet"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            borderRadius: '4px',
            padding: '32px 36px',
            minHeight: '1120px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#1E293B',
            fontSize: '12px'
          }}
        >
          <div>
            {/* Sheet Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0F1B38',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F1B38' }}>
                  A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  SECTION D & E: DOCUMENT SPECIMENS & FORMAL REPORTING UNDERTAKING
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38' }}>
                  REF: {employeeCode}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  DATE: {joiningDate}
                </div>
              </div>
            </div>

            {/* SECTION D: REQUIRED PHOTOGRAPHS (27–30) */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  padding: '6px 10px',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  color: '#0F1B38',
                  marginBottom: '10px'
                }}
              >
                SECTION D: REQUIRED PHOTOGRAPHS & UPLOADED DOCUMENTS (27–30)
              </div>

              {/* 4 Image Specimens Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* 27. Live Photo */}
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '6px' }}>
                    27. Live Passport Photo
                  </div>
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.photo?.dataUrl ? (
                      <img
                        src={formData.photo.dataUrl}
                        alt="Candidate Live Photo"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                    )}
                  </div>
                </div>

                {/* 28. Aadhaar Card Photo */}
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '6px' }}>
                    28. Aadhaar Card Photo
                  </div>
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.aadhaar?.dataUrl ? (
                      <img
                        src={formData.aadhaar.dataUrl}
                        alt="Aadhaar Card"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                    )}
                  </div>
                </div>

                {/* 29. Bank Passbook */}
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '6px' }}>
                    29. Bank Passbook / Cheque
                  </div>
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.bankPassbook?.dataUrl ? (
                      <img
                        src={formData.bankPassbook.dataUrl}
                        alt="Bank Passbook"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                    )}
                  </div>
                </div>

                {/* 30. Candidate Signature */}
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '6px' }}>
                    30. Specimen Signature
                  </div>
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.signature?.dataUrl ? (
                      <img
                        src={formData.signature.dataUrl}
                        alt="Candidate Signature"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION E: ORIGINAL FORMAL JOINING REPORT UNDERTAKING */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                  {FORMAL_JOINING_UNDERTAKING.title}
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.6, color: '#78350F' }}>
                  {FORMAL_JOINING_UNDERTAKING.proclamation(joiningDate)}
                </p>
              </div>

              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  background: '#F8FAFC'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '11px', color: '#0F1B38', marginBottom: '6px' }}>
                  TERMS OF REPORTING & WORKPLACE OBLIGATIONS:
                </div>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: 1.6, color: '#334155' }}>
                  {FORMAL_JOINING_UNDERTAKING.terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Mid-Attestation Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
              <div style={{ border: '1px solid #CBD5E1', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
                  Candidate Reporting Signature:
                </div>
                <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                  {formData.signature?.dataUrl && (
                    <img src={formData.signature.dataUrl} alt="Signature" style={{ maxHeight: '32px' }} />
                  )}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569' }}>
                  {formData.fullName} ({employeeCode})
                </div>
              </div>

              <div style={{ border: '1px solid #CBD5E1', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
                  HR Department Reporting Verification:
                </div>
                <div style={{ height: '36px', display: 'flex', alignItems: 'center', color: '#047857', fontWeight: 700 }}>
                  VERIFIED & ON FILE
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569' }}>
                  A TIGER GLOBAL Career Solution & Consultancy
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div
            style={{
              borderTop: '1px solid #CBD5E1',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748B'
            }}
          >
            <span>A TIGER GLOBAL Career Solution & Consultancy — Document Specimens & Formal Undertaking</span>
            <span>Page 2 of 3</span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SHEET 3: STATUTORY CODE OF CONDUCT & MASTER ATTESTATION             */}
        {/* ==================================================================== */}
        <div
          className="pdf-page-sheet"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            borderRadius: '4px',
            padding: '32px 36px',
            minHeight: '1120px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#1E293B',
            fontSize: '12px'
          }}
        >
          <div>
            {/* Sheet Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0F1B38',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F1B38' }}>
                  A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  SECTION F & G: STATUTORY CODE OF CONDUCT & MASTER ATTESTATION
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38' }}>
                  REF: {employeeCode}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  DATE: {joiningDate}
                </div>
              </div>
            </div>

            {/* SECTION F: STATUTORY UNDERTAKINGS & CODE OF CONDUCT (6 CLAUSES) */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  padding: '5px 8px',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  color: '#0F1B38',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>SECTION F: STATUTORY UNDERTAKINGS & CODE OF CONDUCT</span>
                <span style={{ color: '#C5A059' }}>CANONICAL SCHEDULES</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {STATUTORY_UNDERTAKINGS.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      padding: '7px 10px',
                      background: '#F8FAFC'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#0F1B38', marginBottom: '2px' }}>
                      {item.number}. {item.title}
                    </div>
                    <p style={{ margin: 0, fontSize: '10.5px', lineHeight: 1.5, color: '#475569' }}>
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION G: MASTER ATTESTATION STATEMENT */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '4px',
                padding: '10px 14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '11px', color: '#1E40AF', marginBottom: '4px' }}>
                {MASTER_ATTESTATION.title}
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '10.5px', lineHeight: 1.55, color: '#1E3A8A' }}>
                {MASTER_ATTESTATION.statement}
              </p>
              <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#1E40AF' }}>
                {MASTER_ATTESTATION.declarationAcknowledgeNote}
              </div>
            </div>

            {/* Signatures & Execution Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Left: Employee Signature */}
              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  background: '#FFFFFF'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38', marginBottom: '6px' }}>
                  CANDIDATE SIGNATURE & ACCEPTANCE:
                </div>
                <div
                  style={{
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #E2E8F0',
                    marginBottom: '8px'
                  }}
                >
                  {formData.signature?.dataUrl ? (
                    <img
                      src={formData.signature.dataUrl}
                      alt="Candidate Signature"
                      style={{ maxHeight: '46px', maxWidth: '160px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                  )}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
                  {formData.fullName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  Place: {place} | Date: {joiningDate}
                </div>
              </div>

              {/* Right: Company Authorization */}
              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  background: '#FFFFFF'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38', marginBottom: '6px' }}>
                  FOR A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY:
                </div>
                <div
                  style={{
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #E2E8F0',
                    marginBottom: '8px'
                  }}
                >
                  {companySignatureUrl ? (
                    <img
                      src={companySignatureUrl}
                      alt="Authorized Stamp"
                      style={{ maxHeight: '46px', maxWidth: '160px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: '#047857', fontWeight: 800, fontSize: '11px' }}>
                      [AUTHORIZED MANAGEMENT STAMP & SIGNATURE]
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
                  {verifierName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  HR & Operational Governance Directorate
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div
            style={{
              borderTop: '1px solid #CBD5E1',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748B'
            }}
          >
            <span>A TIGER GLOBAL Career Solution & Consultancy — Master Attestation & Governance Schedule</span>
            <span>Page 3 of 3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
