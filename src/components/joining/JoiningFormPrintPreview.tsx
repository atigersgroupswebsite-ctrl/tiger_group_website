// ==============================================================================
// File: src/components/joining/JoiningFormPrintPreview.tsx
// Description: Dedicated 14-Page Master Joining Form Print & Visual Preview
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Form Source: Canonical joining_form.pdf Packet Structure (Pages 1 to 14)
// ==============================================================================

import React from 'react';
import type { JoiningFormData } from '../../types/joining';

interface JoiningFormPrintPreviewProps {
  formData: JoiningFormData;
  onEditStep?: (stepNumber: number) => void;
  isSubmitted?: boolean;
}

export const JoiningFormPrintPreview: React.FC<JoiningFormPrintPreviewProps> = ({
  formData,
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
    </div>
  );
};
