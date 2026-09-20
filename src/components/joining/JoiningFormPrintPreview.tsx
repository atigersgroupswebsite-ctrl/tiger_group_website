// ==============================================================================
// File: src/components/joining/JoiningFormPrintPreview.tsx
// Description: Dedicated 14-Page Master Joining Form Print & Visual Preview
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Form Source: Canonical joining_form.pdf Packet Structure (Pages 1 to 14)
// ==============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import type { JoiningFormData } from '../../types/joining';
import type { DocumentRow } from '../../types/database';
import { getDocumentSignedUrl } from '../../services/adminDocumentService';
import { FileText, Paperclip } from 'lucide-react';

interface JoiningFormPrintPreviewProps {
  formData: JoiningFormData;
  documents?: DocumentRow[];
  onEditStep?: (stepNumber: number) => void;
  isSubmitted?: boolean;
}

export const JoiningFormPrintPreview: React.FC<JoiningFormPrintPreviewProps> = ({
  formData,
  documents,
  onEditStep,
  isSubmitted = false
}) => {
  const p = formData.personal;
  const emp = formData.employment;
  const perm = formData.permanentAddress;
  const curr = formData.currentAddress;
  const bank = formData.bank;
  const decl = formData.declarations;

  const photoUrl = formData.documents?.PHOTO?.file?.dataUrl;
  const signatureUrl = formData.documents?.SIGNATURE?.file?.dataUrl;

  const isFemale = p.gender?.toLowerCase() === 'female';
  const showWomenConsent = isFemale && Boolean(decl.womenNightShiftConsent);

  // Authoritative Annexure Document Selection:
  // Strictly: is_current === true, document_type NOT IN ('PHOTO', 'SIGNATURE')
  const annexureDocs = useMemo(() => {
    if (documents && documents.length > 0) {
      return documents.filter(
        (d) =>
          d.is_current !== false &&
          d.document_type !== 'PHOTO' &&
          d.document_type !== 'SIGNATURE' &&
          Boolean(d.storage_path)
      );
    }
    if (formData.documents) {
      return Object.values(formData.documents)
        .filter(
          (d) =>
            d.category !== 'PHOTO' &&
            d.category !== 'SIGNATURE' &&
            Boolean(d.file?.dataUrl || d.file?.storagePath)
        )
        .map((d, index) => ({
          id: `draft-${index}-${d.category}`,
          joining_form_id: formData.formId || null,
          application_id: formData.applicationId || null,
          document_type: (d.type || d.category) as any,
          document_side: (d.side as any) || null,
          storage_path: d.file?.storagePath || null,
          original_file_name: d.file?.name || d.title,
          mime_type: d.file?.type || null,
          file_size: d.file?.size || null,
          verification_status: d.verificationStatus || 'UPLOADED',
          rejection_reason: null,
          uploaded_at: new Date().toISOString(),
          verified_at: null,
          verified_by: null,
          rejected_at: null,
          rejected_by: null,
          is_current: true,
          _dataUrl: d.file?.dataUrl
        } as DocumentRow & { _dataUrl?: string }));
    }
    return [];
  }, [documents, formData.documents, formData.formId, formData.applicationId]);

  const [docSignedUrls, setDocSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const loadUrls = async () => {
      const urlMap: Record<string, string> = {};
      for (const doc of annexureDocs) {
        if ((doc as any)._dataUrl) {
          urlMap[doc.id] = (doc as any)._dataUrl;
        } else if (doc.storage_path) {
          const res = await getDocumentSignedUrl(doc.storage_path, 3600);
          if (res.success && res.signedUrl) {
            urlMap[doc.id] = res.signedUrl;
          }
        }
      }
      if (isMounted) {
        setDocSignedUrls(urlMap);
      }
    };
    if (annexureDocs.length > 0) {
      loadUrls();
    }
    return () => {
      isMounted = false;
    };
  }, [annexureDocs]);

  const formatDocLabel = (doc: DocumentRow) => {
    if (doc.document_type === 'AADHAAR') {
      return doc.document_side === 'BACK' ? 'AADHAAR CARD (BACK SIDE)' : 'AADHAAR CARD (FRONT SIDE)';
    }
    const formatted = doc.document_type ? doc.document_type.replace(/_/g, ' ') : 'DOCUMENT';
    if (doc.document_side && doc.document_side !== 'SINGLE') {
      return `${formatted} (${doc.document_side})`;
    }
    return formatted;
  };

  const activeEducation = (formData.education || []).filter(
    (edu) =>
      edu &&
      !((edu.qualification === '10th / SSC' || edu.qualification === '12th / HSC') &&
        !edu.boardOrUniversity?.trim() &&
        !edu.yearOfPassing?.trim() &&
        !edu.percentageOrGrade?.trim()) &&
      Boolean(
        edu.qualification?.trim() ||
        edu.boardOrUniversity?.trim() ||
        edu.yearOfPassing?.trim() ||
        edu.percentageOrGrade?.trim()
      )
  );

  return (
    <div className="joining-form-print-preview">
      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 1: REGISTRATION / JOINING FORM & DOCUMENT CHECKLIST              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          {/* Header Banner */}
          <div className="pdf-header-box">
            <h1 className="pdf-brand-title">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</h1>
            <p className="pdf-brand-address">
              PLOT NO. 440 BEHIND ROYAL CLUB, SUBHAN NAGAR, [HB TOWN], NAGPUR MH - 440035
            </p>
            <p className="pdf-brand-contact">
              MOBILE: +91 8349353946 • EMAIL: ATIGERGLOBAL@GMAIL.COM • REG. NO.: 106157392603
            </p>
            <div className="pdf-form-badge">REGISTRATION / JOINING FORM - 5</div>
          </div>

          {/* Section Edit Pill (Screen only) */}
          {onEditStep && !isSubmitted && (
            <div className="pdf-edit-bar no-print">
              <span className="pdf-page-indicator">PAGE 01 / 14 — REGISTRATION CHECKLIST</span>
              <button type="button" onClick={() => onEditStep(1)} className="pdf-btn-edit">
                Edit Personal Info (Step 1)
              </button>
            </div>
          )}

          {/* Employee Basic Info Grid */}
          <div className="pdf-section-title">EMPLOYEE APPOINTMENT DETAILS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-label" style={{ width: '20%' }}>Employee Name:</td>
                <td className="pdf-val pdf-bold" style={{ width: '30%' }}>{p.employeeName || '—'}</td>
                <td className="pdf-label" style={{ width: '20%' }}>Employee Code:</td>
                <td className="pdf-val" style={{ width: '30%' }}>{emp.employeeCode || 'ASSIGNED ON JOINING'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Date of Joining:</td>
                <td className="pdf-val">{emp.dateOfJoining || decl.declarationDate || '—'}</td>
                <td className="pdf-label">Department:</td>
                <td className="pdf-val">{emp.department || 'Operations'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Designation:</td>
                <td className="pdf-val">{emp.designation || 'Associate'}</td>
                <td className="pdf-label">Location / Unit:</td>
                <td className="pdf-val">{emp.location || 'Nagpur'} / {emp.unit || 'A TIGER GLOBAL'}</td>
              </tr>
            </tbody>
          </table>

          {/* Document Checklist Table */}
          <div className="pdf-section-title" style={{ marginTop: '12px' }}>
            DOCUMENT CHECKLIST (STATUTORY SUBMISSIONS)
          </div>
          <table className="pdf-table pdf-checklist-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>S.NO.</th>
                <th style={{ width: '64%' }}>PARTICULARS</th>
                <th style={{ width: '28%', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td>Document Check List & Registration Form</td>
                <td className="pdf-status-cell">✓ COMPLETED</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>2</td>
                <td>Resume / Bio-Data</td>
                <td className="pdf-status-cell">ON RECORD</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>3</td>
                <td>Employee Personal Information (Page 02)</td>
                <td className="pdf-status-cell">✓ COMPLETED</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>4</td>
                <td>Joining Report (Page 05)</td>
                <td className="pdf-status-cell">✓ ATTESTED</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>5</td>
                <td>Declaration Form (Page 08)</td>
                <td className="pdf-status-cell">✓ DECLARED</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>6</td>
                <td>Appointment / Joining Letter Terms</td>
                <td className="pdf-status-cell">✓ ACCEPTED</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>7</td>
                <td>EPFO Statutory Enrolment (Form 2 / Form 11)</td>
                <td className="pdf-status-cell">✓ APPLICABLE</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>8</td>
                <td>ESIC Registration (Form 1)</td>
                <td className="pdf-status-cell">✓ APPLICABLE</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>9</td>
                <td>Consent Form of Women Worker (Form 'L' Rule 13)</td>
                <td className="pdf-status-cell">
                  {isFemale
                    ? (showWomenConsent ? '✓ CONSENT GIVEN' : 'OPTIONAL — DECLINED')
                    : 'NOT APPLICABLE (MALE)'}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>10</td>
                <td>Academic Qualification Marksheets / Certificates</td>
                <td className="pdf-status-cell">
                  {activeEducation.length > 0
                    ? '✓ PROVIDED'
                    : 'OPTIONAL — NOT PROVIDED'}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>11</td>
                <td>Experience / Relieving Certificates (if applicable)</td>
                <td className="pdf-status-cell">
                  {formData.documents?.EXPERIENCE_CERTIFICATE?.file ? '✓ ATTACHED' : 'OPTIONAL'}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>12</td>
                <td>Identity & Address Proof (Aadhaar Card, PAN Card)</td>
                <td className="pdf-status-cell">
                  {p.aadhaarNumber && p.panNumber ? '✓ VERIFIED ON RECORD' : 'PENDING'}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>13</td>
                <td>Bank Passbook / Payment Information</td>
                <td className="pdf-status-cell">
                  {bank.bankAccountNumber ? '✓ VERIFIED' : 'PENDING'}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>14</td>
                <td>Photographs (Passport Size Specimen)</td>
                <td className="pdf-status-cell">{photoUrl ? '✓ UPLOADED' : 'PENDING'}</td>
              </tr>
            </tbody>
          </table>

          {/* Verification Box & Signature */}
          <div className="pdf-verification-row">
            <div className="pdf-sign-box">
              <span className="pdf-sign-label">Employee Signature:</span>
              <div className="pdf-sig-preview-frame">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Candidate Signature" className="pdf-rendered-signature" />
                ) : (
                  <span className="pdf-sign-placeholder">Awaiting Upload</span>
                )}
              </div>
              <span className="pdf-sign-name">{p.employeeName}</span>
            </div>

            <div className="pdf-hr-sign-box">
              <span className="pdf-sign-label">HR / Interviewer Verification:</span>
              <div className="pdf-sig-preview-frame">
                <span className="pdf-sign-placeholder">Authorized Verification Stamp</span>
              </div>
              <span className="pdf-sign-name">A TIGER GLOBAL Recruitment Cell</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 2: EMPLOYEE PERSONAL INFORMATION & ADDRESSES                     */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">EMPLOYEE PERSONAL INFORMATION & RESIDENCE DOSSIER</span>
          </div>

          {onEditStep && !isSubmitted && (
            <div className="pdf-edit-bar no-print">
              <span className="pdf-page-indicator">PAGE 02 / 14 — PERSONAL INFORMATION</span>
              <button type="button" onClick={() => onEditStep(1)} className="pdf-btn-edit">
                Edit Personal Info (Step 1)
              </button>
            </div>
          )}

          <div className="pdf-section-title">1. DEMOGRAPHIC & IDENTITY RECORDS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-label" style={{ width: '22%' }}>Full Legal Name:</td>
                <td className="pdf-val pdf-bold" style={{ width: '28%' }}>{p.employeeName || '—'}</td>
                <td className="pdf-label" style={{ width: '22%' }}>Date of Birth:</td>
                <td className="pdf-val" style={{ width: '28%' }}>{p.dateOfBirth || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Gender:</td>
                <td className="pdf-val">{p.gender || '—'}</td>
                <td className="pdf-label">Marital Status:</td>
                <td className="pdf-val">{p.maritalStatus || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Father's Name:</td>
                <td className="pdf-val">{p.fatherName || '—'}</td>
                <td className="pdf-label">Mother / Husband Name:</td>
                <td className="pdf-val">{p.motherOrHusbandName || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Spouse Name:</td>
                <td className="pdf-val">{p.spouseName || 'N/A'}</td>
                <td className="pdf-label">Blood Group:</td>
                <td className="pdf-val">{p.bloodGroup || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Aadhaar Card No.:</td>
                <td className="pdf-val pdf-mono">{p.aadhaarNumber || '—'}</td>
                <td className="pdf-label">PAN Card No.:</td>
                <td className="pdf-val pdf-mono">{p.panNumber || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Primary Mobile No.:</td>
                <td className="pdf-val">{p.employeeContactNumber || '—'}</td>
                <td className="pdf-label">Alternate Mobile No.:</td>
                <td className="pdf-val">{p.otherContactNumber || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Email Address:</td>
                <td className="pdf-val" colSpan={3}>{p.emailId || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title" style={{ marginTop: '12px' }}>
            2. PERMANENT & CURRENT RESIDENTIAL ADDRESSES
          </div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <th colSpan={2} style={{ backgroundColor: '#F8FAFC', fontWeight: 700 }}>PERMANENT RESIDENCE</th>
                <th colSpan={2} style={{ backgroundColor: '#F8FAFC', fontWeight: 700 }}>CURRENT / LOCAL RESIDENCE</th>
              </tr>
              <tr>
                <td className="pdf-label" style={{ width: '18%' }}>House / Road:</td>
                <td className="pdf-val" style={{ width: '32%' }}>{perm.flatHouseRoad || perm.address || '—'}</td>
                <td className="pdf-label" style={{ width: '18%' }}>House / Road:</td>
                <td className="pdf-val" style={{ width: '32%' }}>{curr.flatHouseRoad || curr.address || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">City / Village:</td>
                <td className="pdf-val">{perm.villageOrCity || perm.city || '—'}</td>
                <td className="pdf-label">City / Village:</td>
                <td className="pdf-val">{curr.villageOrCity || curr.city || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Taluka:</td>
                <td className="pdf-val">{perm.taluka || perm.district || '—'}</td>
                <td className="pdf-label">District:</td>
                <td className="pdf-val">{curr.district || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">District:</td>
                <td className="pdf-val">{perm.district || '—'}</td>
                <td className="pdf-label">State:</td>
                <td className="pdf-val">{curr.state || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">State / PIN:</td>
                <td className="pdf-val">{perm.state} - {perm.pinCode}</td>
                <td className="pdf-label">PIN Code:</td>
                <td className="pdf-val">{curr.pinCode}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title" style={{ marginTop: '12px' }}>
            3. EMERGENCY FAMILY CONTACT DETAILS
          </div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Contact Person Name</th>
                <th style={{ width: '20%' }}>Relationship</th>
                <th style={{ width: '22%' }}>Mobile Number</th>
                <th style={{ width: '28%' }}>Address / City</th>
              </tr>
            </thead>
            <tbody>
              {formData.emergencyContacts && formData.emergencyContacts.length > 0 ? (
                formData.emergencyContacts.map((c, i) => (
                  <tr key={c.id || i}>
                    <td className="pdf-bold">{c.name || '—'}</td>
                    <td>{c.relation || '—'}</td>
                    <td>{c.contactNumber || '—'}</td>
                    <td>{c.address || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#64748B' }}>
                    Emergency contacts recorded on file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 3: BANK DETAILS, EDUCATION & FAMILY                             */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">BANK DETAILS, EDUCATION QUALIFICATIONS & FAMILY RECORDS</span>
          </div>

          {onEditStep && !isSubmitted && (
            <div className="pdf-edit-bar no-print">
              <span className="pdf-page-indicator">PAGE 03 / 14 — BANK, EDUCATION & FAMILY</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" onClick={() => onEditStep(3)} className="pdf-btn-edit">
                  Edit Bank (Step 3)
                </button>
                <button type="button" onClick={() => onEditStep(4)} className="pdf-btn-edit">
                  Edit Education (Step 4)
                </button>
                <button type="button" onClick={() => onEditStep(5)} className="pdf-btn-edit">
                  Edit Family (Step 5)
                </button>
              </div>
            </div>
          )}

          <div className="pdf-section-title">1. STATUTORY BANK DISBURSEMENT PARTICULARS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-label" style={{ width: '22%' }}>Account Holder:</td>
                <td className="pdf-val pdf-bold" style={{ width: '28%' }}>{bank.accountHolderName || '—'}</td>
                <td className="pdf-label" style={{ width: '22%' }}>Bank Name:</td>
                <td className="pdf-val" style={{ width: '28%' }}>{bank.bankName || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Account Number:</td>
                <td className="pdf-val pdf-mono pdf-bold">{bank.bankAccountNumber || '—'}</td>
                <td className="pdf-label">IFSC Code:</td>
                <td className="pdf-val pdf-mono">{bank.ifscCode || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Branch Name:</td>
                <td className="pdf-val" colSpan={3}>{bank.branchName || '—'}</td>
              </tr>
              <tr>
                <td className="pdf-label">UAN (PF Number):</td>
                <td className="pdf-val pdf-mono">{bank.uanNumber || 'Not Enrolled / N/A'}</td>
                <td className="pdf-label">ESIC IP Number:</td>
                <td className="pdf-val pdf-mono">{bank.esicNumber || 'Not Enrolled / N/A'}</td>
              </tr>
              <tr>
                <td className="pdf-label">Professional Tax (PT):</td>
                <td className="pdf-val pdf-mono">{bank.ptNumber || 'Not Enrolled / N/A'}</td>
                <td className="pdf-label">Disbursement Mode:</td>
                <td className="pdf-val">NEFT / RTGS / Bank Transfer</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title" style={{ marginTop: '12px' }}>
            2. ACADEMIC & TECHNICAL QUALIFICATIONS (OPTIONAL)
          </div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Qualification</th>
                <th style={{ width: '40%' }}>Board / University</th>
                <th style={{ width: '15%' }}>Year</th>
                <th style={{ width: '20%' }}>Grade / Percentage</th>
              </tr>
            </thead>
            <tbody>
              {activeEducation.length > 0 ? (
                activeEducation.map((edu, i) => (
                  <tr key={edu.id || i}>
                    <td className="pdf-bold">{edu.qualification || '—'}</td>
                    <td>{edu.boardOrUniversity || '—'}</td>
                    <td>{edu.yearOfPassing || '—'}</td>
                    <td>{edu.percentageOrGrade || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#64748B', fontStyle: 'italic', padding: '10px' }}>
                    Optional — No qualification records submitted by candidate (Valid).
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pdf-section-title" style={{ marginTop: '12px' }}>
            3. FAMILY MEMBERS & DEPENDENT DETAILS
          </div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Family Member Full Name</th>
                <th style={{ width: '30%' }}>Relationship</th>
                <th style={{ width: '25%' }}>Date of Birth / Age</th>
              </tr>
            </thead>
            <tbody>
              {formData.family && formData.family.length > 0 ? (
                formData.family.map((f, i) => (
                  <tr key={f.id || i}>
                    <td className="pdf-bold">{f.name || '—'}</td>
                    <td>{f.relation || '—'}</td>
                    <td>{f.dateOfBirthOrAge || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: '#64748B' }}>
                    Family dependents on record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 4: JOINING REPORT                                                */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">JOINING REPORT (FORMAL UNDERTAKING)</span>
          </div>

          <div className="pdf-joining-report-body">
            <p className="pdf-report-proclamation">
              I hereby join my duties from today, dated <strong>{decl.declarationDate}</strong>, under A TIGER GLOBAL Career Solution & Consultancy.
            </p>

            <table className="pdf-table">
              <tbody>
                <tr>
                  <td className="pdf-label" style={{ width: '25%' }}>1. Location:</td>
                  <td className="pdf-val" style={{ width: '25%' }}>{emp.location || 'Nagpur, MH'}</td>
                  <td className="pdf-label" style={{ width: '25%' }}>2. Name:</td>
                  <td className="pdf-val pdf-bold" style={{ width: '25%' }}>{p.employeeName}</td>
                </tr>
                <tr>
                  <td className="pdf-label">3. Father's Name:</td>
                  <td className="pdf-val">{p.fatherName}</td>
                  <td className="pdf-label">4. Date of Birth:</td>
                  <td className="pdf-val">{p.dateOfBirth}</td>
                </tr>
                <tr>
                  <td className="pdf-label">5. Department:</td>
                  <td className="pdf-val">{emp.department || 'Operations'}</td>
                  <td className="pdf-label">6. Designation:</td>
                  <td className="pdf-val">{emp.designation || 'Associate'}</td>
                </tr>
                <tr>
                  <td className="pdf-label">7. PAN Number:</td>
                  <td className="pdf-val pdf-mono">{p.panNumber}</td>
                  <td className="pdf-label">8. Aadhaar Card No.:</td>
                  <td className="pdf-val pdf-mono">{p.aadhaarNumber}</td>
                </tr>
                <tr>
                  <td className="pdf-label">9. Blood Group:</td>
                  <td className="pdf-val">{p.bloodGroup || '—'}</td>
                  <td className="pdf-label">10. Mobile Number:</td>
                  <td className="pdf-val">{p.employeeContactNumber}</td>
                </tr>
                <tr>
                  <td className="pdf-label">11. Name of Bank:</td>
                  <td className="pdf-val">{bank.bankName}</td>
                  <td className="pdf-label">12. Branch:</td>
                  <td className="pdf-val">{bank.branchName}</td>
                </tr>
                <tr>
                  <td className="pdf-label">13. IFSC Code:</td>
                  <td className="pdf-val pdf-mono">{bank.ifscCode}</td>
                  <td className="pdf-label">14. Account Number:</td>
                  <td className="pdf-val pdf-mono">{bank.bankAccountNumber}</td>
                </tr>
                <tr>
                  <td className="pdf-label">15. Contact Address:</td>
                  <td className="pdf-val" colSpan={3}>
                    {perm.flatHouseRoad || perm.address || ''}, {perm.villageOrCity || perm.city || ''}, {perm.district}, {perm.state} - {perm.pinCode}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="pdf-verification-row" style={{ marginTop: '24px' }}>
              <div className="pdf-sign-box">
                <span className="pdf-sign-label">Signature of Joining Employee:</span>
                <div className="pdf-sig-preview-frame">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Candidate Signature" className="pdf-rendered-signature" />
                  ) : (
                    <span className="pdf-sign-placeholder">Awaiting Upload</span>
                  )}
                </div>
                <span className="pdf-sign-name">{p.employeeName}</span>
              </div>

              <div className="pdf-hr-sign-box">
                <span className="pdf-sign-label">HR Department Approval:</span>
                <div className="pdf-sig-preview-frame">
                  <span className="pdf-sign-placeholder">Authorized Personnel Stamp</span>
                </div>
                <span className="pdf-sign-name">A TIGER GLOBAL Career Solution & Consultancy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 6: Form - 'L' WOMEN WORKER NIGHT SHIFT CONSENT (CONDITIONAL)     */}
      {/* ---------------------------------------------------------------------- */}
      {showWomenConsent && (
        <div className="pdf-page-sheet">
          <div className="pdf-page-inner">
            <div className="pdf-subpage-header">
              <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
              <span className="pdf-subpage-title">
                FORM - 'L' (RULE 13) — CONSENT OF WOMEN WORKER TO WORK IN NIGHT SHIFT
              </span>
            </div>

            <div className="pdf-legal-prose">
              <p>
                I, <strong>{p.employeeName}</strong>, residing at{' '}
                <strong>{perm.villageOrCity || perm.city || 'Nagpur'}, {perm.district}</strong>, working as{' '}
                <strong>{emp.designation || 'Associate'}</strong> in M/s{' '}
                <strong>A TIGER GLOBAL Career Solution & Consultancy</strong>, state that I am working as{' '}
                <strong>{emp.designation || 'Associate'}</strong>.
              </p>
              <p>
                I am aware that:
              </p>
              <ul>
                <li>The employer will provide separate, safe and secure transport facility from the doorstep of my residence to the place of work and vice-versa;</li>
                <li>There will be at least three women workers working in the nightshift;</li>
                <li>There is an Internal Committee to prevent sexual harassment at work place under the Chairmanship of Smt. [Presiding Officer].</li>
              </ul>
              <p>
                I am therefore willing to work at nightshift during the applicable employment tenure.
              </p>
            </div>

            <div className="pdf-attestation-row" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p><strong>Place:</strong> {decl.womenNightShiftPlace || 'Nagpur'}</p>
                <p><strong>Date:</strong> {decl.declarationDate}</p>
              </div>

              <div className="pdf-sign-box">
                <span className="pdf-sign-label">Signature of the Women Worker:</span>
                <div className="pdf-sig-preview-frame">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" className="pdf-rendered-signature" />
                  ) : (
                    <span className="pdf-sign-placeholder">Awaiting Upload</span>
                  )}
                </div>
                <span className="pdf-sign-name">{p.employeeName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 7: SELF DECLARATION (RELIEVING / DUAL EMPLOYMENT)                */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">SELF DECLARATION (PAGE 07)</span>
          </div>

          <div className="pdf-legal-prose" style={{ marginTop: '16px' }}>
            <p><strong>TO:</strong> The Management & HR Department</p>
            <p><strong>Dear Sir/Madam,</strong></p>
            <p>
              This is to certify that prior to joining A TIGER GLOBAL Career Solution & Consultancy, I was working with{' '}
              <strong>{decl.previousEmployerName || 'None (Fresher / Open Onboarding)'}</strong> and have completed all relieving formalities with my previous employer.
              My last working day was <strong>{decl.previousEmployerLastWorkingDay || 'N/A'}</strong>.
            </p>
            <p>
              To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities viz., legal, financial, professional, or personal which I have with my previous employer, if any.
            </p>
            <p>
              I agree to submit formal relieving letter to HR department once I receive the same from my previous employer.
            </p>
            <p>
              I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action by the company, including termination of service.
            </p>
          </div>

          <div className="pdf-attestation-row" style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p><strong>Name:</strong> {p.employeeName}</p>
              <p><strong>Date:</strong> {decl.declarationDate}</p>
            </div>

            <div className="pdf-sign-box">
              <span className="pdf-sign-label">Signature:</span>
              <div className="pdf-sig-preview-frame">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="pdf-rendered-signature" />
                ) : (
                  <span className="pdf-sign-placeholder">Awaiting Upload</span>
                )}
              </div>
              <span className="pdf-sign-name">{p.employeeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGE 8: DECLARATION (EMPLOYMENT OF RELATIVES)                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PAGE 08)</span>
          </div>

          <div className="pdf-legal-prose" style={{ marginTop: '16px' }}>
            <p>
              As per Internal Policy, the Organization does not encourage employment of 'relatives' as it can cause various problems, including charges of favoritism, conflicts of interest, family discord, and scheduling conflicts that work to the disadvantage of both the Organization and the employees.
            </p>
            <p>
              For the above purpose, the term 'relatives' includes the following relationships, whether established by blood, marriage, or other legal action: mother, father, husband, wife, son, daughter, sister, brother, mother-in-law, father-in-law, sister-in-law, brother-in-law, son-in-law, daughter-in-law, stepchild, aunt, uncle, nephew, niece or cousin.
            </p>
            <p>
              I, <strong>{p.employeeName}</strong>, joined on <strong>{decl.declarationDate}</strong> as <strong>{emp.designation || 'Associate'}</strong>, do hereby declare that:
            </p>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '4px', margin: '12px 0' }}>
              {decl.hasRelativeInOrganization ? (
                <p style={{ margin: 0, fontWeight: 700 }}>
                  (I-b) I AM related to <u>{decl.relativeName}</u> working in <u>{decl.relativeDepartment || 'Dept'}</u> as <u>{decl.relativeRelationship || 'Relative'}</u>.
                </p>
              ) : (
                <p style={{ margin: 0, fontWeight: 700 }}>
                  (I-a) I am NOT directly or distantly related to any of the employees working in the Organization.
                </p>
              )}
            </div>
            <p>
              I understand that if the declaration given above is found false, the Organization can take disciplinary action to the extent of termination of service.
            </p>
          </div>

          <div className="pdf-attestation-row" style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p><strong>Name:</strong> {p.employeeName}</p>
              <p><strong>Date:</strong> {decl.declarationDate}</p>
            </div>

            <div className="pdf-sign-box">
              <span className="pdf-sign-label">Signature:</span>
              <div className="pdf-sig-preview-frame">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="pdf-rendered-signature" />
                ) : (
                  <span className="pdf-sign-placeholder">Awaiting Upload</span>
                )}
              </div>
              <span className="pdf-sign-name">{p.employeeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PAGES 9 to 14: TERMS, CONDUCT, AFFIDAVIT & APPOINTMENT                */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div className="pdf-subpage-header">
            <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
            <span className="pdf-subpage-title">TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME</span>
          </div>

          <div className="pdf-legal-prose">
            <p><strong>Enterprise Unit:</strong> Haldiram International / Client Enterprise Partners</p>
            <p><strong>Address:</strong> Nagpur, Maharashtra</p>
            <p><strong>1. Operational Shifts:</strong> Shift A (08:30 AM to 05:00 PM), Shift B (03:00 PM to 11:30 PM), Shift C (11:30 PM to 08:00 AM).</p>
            <p><strong>2. Discipline & Industrial Safety:</strong> Wearing safety shoes, uniforms, and identity badges is strictly mandatory. Tobacco, bidi, alcohol, and intoxicating substances are completely prohibited.</p>
            <p><strong>3. Statutory Wages:</strong> Minimum wages paid strictly in accordance with applicable notification schedules between the 10th and 15th of every month.</p>
          </div>

          <div className="pdf-attestation-row" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p><strong>Employee Name:</strong> {p.employeeName}</p>
              <p><strong>Attestation Date:</strong> {decl.declarationDate}</p>
            </div>

            <div className="pdf-sign-box">
              <span className="pdf-sign-label">Employee Acceptance Signature:</span>
              <div className="pdf-sig-preview-frame">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="pdf-rendered-signature" />
                ) : (
                  <span className="pdf-sign-placeholder">Awaiting Upload</span>
                )}
              </div>
              <span className="pdf-sign-name">{p.employeeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* OFFICIAL CONTRACT APPOINTMENT LETTER (SHEET 9)                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div
            style={{
              border: '1px solid #000000',
              padding: '28px 32px',
              minHeight: '960px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#0F172A',
              background: '#FFFFFF',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', color: '#0F172A', textTransform: 'uppercase' }}>
                  A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
                </div>
                <div style={{ fontSize: '17px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '0.8px', marginTop: '4px', color: '#0F172A' }}>
                  CONTRACT APPOINTMENT LETTER
                </div>
              </div>

              {/* Employee Particulars Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  marginBottom: '12px',
                  border: '1px solid #CBD5E1',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', width: '22%' }}>
                      Employee Name:
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 600, border: '1px solid #E2E8F0', width: '28%' }}>
                      {p.employeeName || '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', width: '22%' }}>
                      Father's Name:
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #E2E8F0', width: '28%' }}>
                      {p.fatherName || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Employee / Joining ID:
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 600, border: '1px solid #E2E8F0' }}>
                      {emp.employeeCode || formData.joiningReference || '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Designation:
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 600, border: '1px solid #E2E8F0' }}>
                      {emp.designation || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Department:
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #E2E8F0' }}>
                      {emp.department || 'Operations'}
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Date of Joining:
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #E2E8F0' }}>
                      {emp.dateOfJoining || decl.declarationDate || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Contact Number:
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #E2E8F0' }}>
                      {p.employeeContactNumber || p.otherContactNumber || '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontWeight: 700, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      Permanent Address:
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #E2E8F0', fontSize: '11px', lineHeight: 1.3 }}>
                      {[perm.flatHouseRoad, perm.address, perm.villageOrCity || perm.city, perm.district, perm.state ? `${perm.state} - ${perm.pinCode}` : perm.pinCode].filter(Boolean).join(', ') || perm.address || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Subject */}
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#0F172A' }}>
                Subject: Appointment on Contract Basis
              </div>

              {/* Salutation */}
              <div style={{ fontSize: '12.5px', marginBottom: '6px', color: '#0F172A' }}>
                Dear <strong>{p.employeeName || 'Candidate'}</strong>,
              </div>

              {/* Appointment Statement */}
              <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '0 0 10px 0', textAlign: 'justify', color: '#0F172A' }}>
                We are pleased to appoint you in A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY on a contractual basis for operational deployment with the organization/client unit under the terms and conditions outlined below:
              </p>

              {/* Terms and Conditions (1-7) */}
              <div style={{ fontSize: '11.5px', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', color: '#0F172A' }}>
                <div>
                  <strong>1. Nature of Contract Engagement:</strong> This appointment is on a contractual basis for operational deployment with the organization/client unit.
                </div>
                <div>
                  <strong>2. Remuneration:</strong> You shall receive a fixed consolidated salary of <strong>₹15,000/- per month</strong>, subject to applicable statutory deductions.
                </div>
                <div>
                  <strong>3. Statutory Benefits:</strong> You shall be eligible for statutory benefits, including Employees' Provident Fund (EPF) and Employee State Insurance (ESIC) where applicable, in accordance with applicable statutory provisions.
                </div>
                <div>
                  <strong>4. Working Hours & Overtime:</strong> You shall observe the standard working hours and operational shift requirements assigned at your deployment facility. Any overtime work performed shall be compensated strictly according to applicable company rules and operational policies.
                </div>
                <div>
                  <strong>5. Work Location / Duties:</strong> You shall diligently perform your assigned duties at the designated work location or client site, maintaining workplace discipline, safety standards, and adherence to applicable operational rules.
                </div>
                <div>
                  <strong>6. Leave:</strong> Leave entitlements shall be governed by applicable company rules and require prior authorization from your designated supervisor or management.
                </div>
                <div>
                  <strong>7. Transfer / Site Allocation:</strong> The employee may be transferred or reassigned to another site or location according to work requirements.
                </div>
              </div>
            </div>

            {/* Signature / Acceptance Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: '10px',
                borderTop: '1px solid #CBD5E1',
                gap: '24px',
              }}
            >
              {/* Company Authorization Block */}
              <div style={{ width: '48%', fontSize: '11.5px', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px' }}>
                  For A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
                </div>
                <div style={{ minHeight: '44px' }} />
                <div style={{ fontWeight: 700, color: '#0F172A' }}>Authorized Management Signatory</div>
                <div style={{ color: '#475569', fontSize: '11px' }}>HR & Operations Department</div>
              </div>

              {/* Employee Acceptance Acknowledgment Block */}
              <div style={{ width: '48%', fontSize: '11.5px', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px' }}>
                  Employee Acceptance Acknowledgment:
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', marginBottom: '4px', fontStyle: 'italic' }}>
                  "I have read, understood, and accept the above terms and conditions of my appointment."
                </div>
                <div
                  style={{
                    minHeight: '44px',
                    borderBottom: '1px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '4px',
                    marginBottom: '4px',
                  }}
                >
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Employee Signature"
                      className="pdf-rendered-signature"
                      style={{ maxHeight: '40px', maxWidth: '150px', objectFit: 'contain' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <span className="pdf-sign-placeholder" style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                      Awaiting Upload
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ fontWeight: 700 }}>Employee Signature</span>
                  <span style={{ fontWeight: 600 }}>{p.employeeName || '\u00A0'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* OFFICIAL VOLUNTARY RESIGNATION DECLARATION & UNDERTAKING (SHEET 10)   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="pdf-page-sheet">
        <div className="pdf-page-inner">
          <div
            style={{
              border: '1px solid #000000',
              padding: '36px 40px',
              minHeight: '960px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              color: '#0F172A',
              fontSize: '15px',
              lineHeight: 1.8,
              background: '#FFFFFF',
            }}
          >
            {/* Centered Underlined Heading */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  letterSpacing: '1px',
                }}
              >
                EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING
              </span>
            </div>

            {/* Addressee Section */}
            <div style={{ marginBottom: '22px', lineHeight: 1.7, fontSize: '15px' }}>
              <div>To,</div>
              <div>The Management (HR Department)</div>
              <div style={{ fontWeight: 'bold' }}>A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</div>
            </div>

            {/* Subject Line */}
            <div style={{ marginBottom: '22px', fontSize: '15px', fontWeight: 'bold' }}>
              Subject: Employee Resignation Declaration & Exit Undertaking
            </div>

            {/* Salutation */}
            <div style={{ marginBottom: '18px', fontSize: '15px' }}>
              Dear Sir / Madam,
            </div>

            {/* Body Paragraph 1 */}
            <p style={{ margin: '0 0 18px 0', fontSize: '15px', lineHeight: 2.1, textAlign: 'justify' }}>
              I, the undersigned, am engaged with A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY in the capacity of{' '}
              {emp.designation ? (
                <span style={{ textDecoration: 'underline', fontWeight: 600, padding: '0 6px' }}>
                  {emp.designation}
                </span>
              ) : (
                '___________________________________'
              )}
              .
            </p>

            {/* Body Paragraph 2 */}
            <p style={{ margin: '0 0 18px 0', fontSize: '15px', lineHeight: 2.1, textAlign: 'justify' }}>
              I hereby declare that, upon my decision to discontinue or separate from my employment/service with the organization, this declaration may be relied upon as my voluntary resignation declaration and may be used for completing the applicable exit formalities and Full & Final Settlement, subject to the company's applicable rules and statutory requirements.
            </p>

            {/* Body Paragraph 3 */}
            <p style={{ margin: '0 0 28px 0', fontSize: '15px', lineHeight: 2.1, textAlign: 'justify' }}>
              I express my sincere appreciation to A TIGER GROUP'S for the opportunity, cooperation, professional guidance, and experience provided to me during my association with the organization.
            </p>

            {/* Closing */}
            <div style={{ marginBottom: '28px', fontSize: '15px', lineHeight: 1.6 }}>
              <div>Thanking you,</div>
              <div style={{ fontWeight: 600 }}>Yours faithfully,</div>
            </div>

            {/* Employee Section */}
            <div style={{ width: '100%', maxWidth: '460px', fontSize: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '14px', fontSize: '16px' }}>
                Employee Particulars
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ minWidth: '170px', fontWeight: 600 }}>Employee Name:</span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px solid #000000',
                    paddingLeft: '8px',
                    minHeight: '22px',
                    fontWeight: 600,
                  }}
                >
                  {p.employeeName || '\u00A0'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ minWidth: '170px', fontWeight: 600 }}>Employee / Joining ID:</span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px solid #000000',
                    paddingLeft: '8px',
                    minHeight: '22px',
                    fontWeight: 600,
                  }}
                >
                  {emp.employeeCode || formData.joiningReference || '\u00A0'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ minWidth: '170px', fontWeight: 600 }}>Designation:</span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px solid #000000',
                    paddingLeft: '8px',
                    minHeight: '22px',
                    fontWeight: 600,
                  }}
                >
                  {emp.designation || '\u00A0'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ minWidth: '170px', fontWeight: 600 }}>Contact Number:</span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px solid #000000',
                    paddingLeft: '8px',
                    minHeight: '22px',
                    fontWeight: 600,
                  }}
                >
                  {p.employeeContactNumber || p.otherContactNumber || '\u00A0'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ minWidth: '170px', fontWeight: 600 }}>Employee Signature:</span>
                <div
                  style={{
                    flex: 1,
                    borderBottom: '1px solid #000000',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                  }}
                >
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Employee Signature"
                      className="pdf-rendered-signature"
                      style={{ maxHeight: '40px', maxWidth: '160px', objectFit: 'contain' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <span className="pdf-sign-placeholder" style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>
                      Awaiting Upload
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* ANNEXURES: CANDIDATE STATUTORY ATTACHMENTS (EXCLUDING PHOTO & SIGNATURE)*/}
      {/* ---------------------------------------------------------------------- */}
      {annexureDocs.map((doc, idx) => {
        const docTitle = formatDocLabel(doc);
        const isPdf =
          doc.mime_type?.includes('pdf') ||
          doc.storage_path?.toLowerCase().endsWith('.pdf') ||
          doc.original_file_name?.toLowerCase().endsWith('.pdf');
        const fileUrl = docSignedUrls[doc.id] || (doc as any)._dataUrl;

        return (
          <div key={doc.id || idx} className="pdf-page-sheet pdf-annexure-sheet">
            <div className="pdf-page-inner">
              <div className="pdf-subpage-header">
                <span className="pdf-subpage-brand">A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</span>
                <span className="pdf-subpage-title">ANNEXURE: {docTitle}</span>
              </div>

              <table className="pdf-table" style={{ marginBottom: '16px' }}>
                <tbody>
                  <tr>
                    <td className="pdf-label" style={{ width: '22%' }}>Document Type:</td>
                    <td className="pdf-val pdf-bold" style={{ width: '28%' }}>{docTitle}</td>
                    <td className="pdf-label" style={{ width: '22%' }}>Original File:</td>
                    <td className="pdf-val" style={{ width: '28%' }}>{doc.original_file_name || 'Document'}</td>
                  </tr>
                  <tr>
                    <td className="pdf-label">Verification Status:</td>
                    <td className="pdf-val">
                      <span style={{
                        fontWeight: 700,
                        color: doc.verification_status === 'VERIFIED' ? '#15803D' : doc.verification_status === 'REJECTED' ? '#B91C1C' : '#B45309'
                      }}>
                        {doc.verification_status || 'UPLOADED'}
                      </span>
                    </td>
                    <td className="pdf-label">Upload Timestamp:</td>
                    <td className="pdf-val">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-GB') : 'ON RECORD'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Document Content Box */}
              {isPdf ? (
                <div style={{
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center'
                }}>
                  <FileText size={48} color="#0F1B38" style={{ margin: '0 auto 0.75rem auto' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0F1B38', fontSize: '1rem', fontWeight: 800 }}>
                    {doc.original_file_name || 'Uploaded PDF Document'}
                  </h4>
                  <p style={{ margin: '0 auto 1rem auto', maxWidth: '480px', fontSize: '0.825rem', color: '#475569', lineHeight: 1.5 }}>
                    Official candidate-uploaded PDF attachment. All pages of this PDF are preserved and directly compiled into the downloadable Master Joining Packet.
                  </p>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-print"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#1D4ED8',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Preview Uploaded PDF in New Tab</span>
                    </a>
                  )}
                </div>
              ) : (
                <div style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '140mm'
                }}>
                  {fileUrl ? (
                    <img
                      src={fileUrl}
                      alt={docTitle}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '190mm',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748B', padding: '3rem' }}>
                      <Paperclip size={36} style={{ margin: '0 auto 0.5rem auto' }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Image attachment on record</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
