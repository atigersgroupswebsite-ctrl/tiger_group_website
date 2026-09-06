import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Building,
  User,
  MapPin,
  PhoneCall,
  CreditCard,
  GraduationCap,
  Users,
  FileCheck,
  FileSignature,
  ShieldCheck,
  ArrowRight,
  Eye
} from 'lucide-react';
import { Button } from '../common/Button';
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
  isSubmitting = false,
  onBackToSuccess
}) => {
  const isSubmittedMode = formData.status === 'SUBMITTED';

  // Aggregate all missing fields across steps 1-8
  const missingItems: { step: number; stepName: string; fields: string[] }[] = [];
  const stepTitles: Record<number, string> = {
    1: 'Employment Information',
    2: 'Personal Information',
    3: 'Address & Emergency',
    4: 'Bank Details',
    5: 'Education Details',
    6: 'Family Details',
    7: 'Documents & Verification',
    8: 'Declarations & Consent'
  };

  for (let s = 1; s <= 8; s++) {
    const val = stepValidation[s];
    if (val && !val.isValid && val.missingFields.length > 0) {
      missingItems.push({
        step: s,
        stepName: stepTitles[s] || `Step ${s}`,
        fields: val.missingFields
      });
    }
  }

  const isAllComplete = missingItems.length === 0;

  const renderStatusBadge = (stepNum: number) => {
    const val = stepValidation[stepNum];
    const isComplete = val ? val.isValid : true;

    if (isComplete) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(25, 42, 86, 0.08)',
            color: 'var(--color-midnight-navy)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={12} style={{ color: 'var(--color-champagne-dark)' }} />
          <span>Complete</span>
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.2rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(237, 166, 163, 0.3)',
          color: 'var(--color-dusty-rose-dark)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700
        }}
      >
        <AlertTriangle size={12} />
        <span>Incomplete</span>
      </span>
    );
  };

  const maskAccount = (num: string) => {
    if (!num) return 'Not Provided';
    if (num.length <= 4) return num;
    return '•'.repeat(num.length - 4) + num.slice(-4);
  };

  return (
    <div>
      {/* Top Banner when form is SUBMITTED */}
      {isSubmittedMode && (
        <div
          style={{
            backgroundColor: 'rgba(25, 42, 86, 0.05)',
            border: '2px solid var(--color-midnight-navy)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-champagne-dark)', fontWeight: 800 }}>
                OFFICIAL RECORD LOCKED
              </span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', color: 'var(--color-midnight-navy)', margin: '0.25rem 0' }}>
                JOINING FORM SUBMITTED
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                This joining dossier has been received and locked for administrative verification.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Submission Date
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                  {formData.submittedAt ? new Date(formData.submittedAt).toLocaleDateString() : 'Confirmed'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Application Number
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-midnight-navy)', fontFamily: 'monospace' }}>
                  {formData.applicationId}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
                <div style={{ marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'var(--color-midnight-navy)', color: '#fff', fontSize: '11px', fontWeight: 800 }}>
                    SUBMITTED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 09</span>
        <h2 className="joining-step-title">
          {isSubmittedMode ? 'SUBMISSION RECORD REVIEW' : 'REVIEW & FINAL SUBMISSION'}
        </h2>
        <p className="joining-step-desc">
          {isSubmittedMode
            ? 'Archived copy of submitted onboarding particulars and uploaded compliance credentials.'
            : 'Verify all provided records, documents, and declarations before official generation into the 14-page Joining Packet.'}
        </p>
      </div>

      {/* Global Incomplete Warning (Only in edit/draft mode) */}
      {!isSubmittedMode && !isAllComplete && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-dusty-rose-light)',
            border: '1px solid var(--color-dusty-rose)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            gap: '0.85rem'
          }}
        >
          <AlertTriangle
            size={20}
            style={{ color: 'var(--color-dusty-rose-dark)', flexShrink: 0, marginTop: '2px' }}
          />
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-midnight-navy)', margin: '0 0 0.4rem 0' }}>
              Action Required: Missing Information Detected
            </h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
              The joining dossier cannot be submitted while required fields remain empty. Please click EDIT on the incomplete sections below to supply required records:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: 'var(--text-xs)', color: 'var(--color-midnight-navy)' }}>
              {missingItems.map((item) => (
                <li key={item.step} style={{ marginBottom: '0.3rem' }}>
                  <strong>{item.stepName}:</strong> {item.fields.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 1: EMPLOYMENT */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              01. Employment Information
            </h3>
            {renderStatusBadge(1)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(1)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-3">
          <div>
            <span className="review-label">Company Name</span>
            <div className="review-value">{formData.employment.companyName}</div>
          </div>
          <div>
            <span className="review-label">Unit / Plant</span>
            <div className="review-value">{formData.employment.unit}</div>
          </div>
          <div>
            <span className="review-label">Employee Code</span>
            <div className="review-value">{formData.employment.employeeCode}</div>
          </div>
          <div>
            <span className="review-label">Designation</span>
            <div className="review-value">{formData.employment.designation}</div>
          </div>
          <div>
            <span className="review-label">Department</span>
            <div className="review-value">{formData.employment.department} / {formData.employment.subDepartment}</div>
          </div>
          <div>
            <span className="review-label">Work Location</span>
            <div className="review-value">{formData.employment.location}</div>
          </div>
          <div>
            <span className="review-label">Date of Joining</span>
            <div className="review-value">{formData.employment.dateOfJoining}</div>
          </div>
          <div>
            <span className="review-label">Monthly Gross / CTC</span>
            <div className="review-value">{formData.employment.grossSalaryCTC}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONAL */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              02. Personal Information
            </h3>
            {renderStatusBadge(2)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(2)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-3">
          <div>
            <span className="review-label">Full Name</span>
            <div className="review-value">{formData.personal.employeeName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Date of Birth</span>
            <div className="review-value">{formData.personal.dateOfBirth || '—'}</div>
          </div>
          <div>
            <span className="review-label">Gender</span>
            <div className="review-value">{formData.personal.gender || '—'}</div>
          </div>
          <div>
            <span className="review-label">Father's Name</span>
            <div className="review-value">{formData.personal.fatherName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Mother's / Husband's Name</span>
            <div className="review-value">{formData.personal.motherOrHusbandName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Marital Status</span>
            <div className="review-value">
              {formData.personal.maritalStatus}
              {formData.personal.spouseName ? ` (Spouse: ${formData.personal.spouseName})` : ''}
            </div>
          </div>
          <div>
            <span className="review-label">Blood Group</span>
            <div className="review-value">{formData.personal.bloodGroup || '—'}</div>
          </div>
          <div>
            <span className="review-label">Aadhaar Number</span>
            <div className="review-value">{formData.personal.aadhaarNumber || '—'}</div>
          </div>
          <div>
            <span className="review-label">PAN Number</span>
            <div className="review-value">{formData.personal.panNumber || '—'}</div>
          </div>
          <div>
            <span className="review-label">Mobile Number</span>
            <div className="review-value">{formData.personal.employeeContactNumber || '—'}</div>
          </div>
          <div>
            <span className="review-label">Alternate Contact</span>
            <div className="review-value">{formData.personal.otherContactNumber || '—'}</div>
          </div>
          <div>
            <span className="review-label">Email ID</span>
            <div className="review-value">{formData.personal.emailId || '—'}</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: ADDRESS */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MapPin size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              03. Address Information
            </h3>
            {renderStatusBadge(3)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(3)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-2">
          <div>
            <span className="review-label" style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              Permanent Residence
            </span>
            <div className="review-value" style={{ lineHeight: 1.5, marginTop: '4px' }}>
              {formData.permanentAddress.address || '—'}, {formData.permanentAddress.city},{' '}
              {formData.permanentAddress.district}, {formData.permanentAddress.state} —{' '}
              {formData.permanentAddress.pinCode}
            </div>
          </div>

          <div>
            <span className="review-label" style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              Current Workplace Address
            </span>
            <div className="review-value" style={{ lineHeight: 1.5, marginTop: '4px' }}>
              {formData.sameAsPermanentAddress ? (
                <em>Same as permanent residential address</em>
              ) : (
                `${formData.currentAddress.address || '—'}, ${formData.currentAddress.city}, ${formData.currentAddress.district}, ${formData.currentAddress.state} — ${formData.currentAddress.pinCode}`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: EMERGENCY */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <PhoneCall size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              04. Emergency Contact
            </h3>
            {renderStatusBadge(3)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(3)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-3">
          {formData.emergencyContacts.map((contact, idx) => (
            <div key={contact.id} style={{ gridColumn: 'span 3', padding: '0.5rem 0', borderBottom: idx < formData.emergencyContacts.length - 1 ? '1px dashed var(--color-border)' : 'none' }}>
              <span className="review-label">Relative #{idx + 1} ({contact.relation || 'Relation Unspecified'})</span>
              <div className="review-value" style={{ fontWeight: 600 }}>
                {contact.name || '—'} • {contact.contactNumber || '—'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Address: {contact.address || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: BANK */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CreditCard size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              05. Bank Details
            </h3>
            {renderStatusBadge(4)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(4)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-3">
          <div>
            <span className="review-label">Account Holder Name</span>
            <div className="review-value">{formData.bank.accountHolderName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Bank Account Number</span>
            <div className="review-value" style={{ fontFamily: 'monospace' }}>
              {maskAccount(formData.bank.bankAccountNumber)}
            </div>
          </div>
          <div>
            <span className="review-label">IFSC Code</span>
            <div className="review-value">{formData.bank.ifscCode || '—'}</div>
          </div>
          <div>
            <span className="review-label">Bank Name</span>
            <div className="review-value">{formData.bank.bankName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Branch Name</span>
            <div className="review-value">{formData.bank.branchName || '—'}</div>
          </div>
          <div>
            <span className="review-label">UAN / ESIC / PT Number</span>
            <div className="review-value">
              {formData.bank.uanNumber || formData.bank.esicNumber || formData.bank.ptNumber ? (
                `UAN: ${formData.bank.uanNumber || 'N/A'} | ESIC: ${formData.bank.esicNumber || 'N/A'}`
              ) : (
                'New Enrollee / To Be Generated'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: EDUCATION */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <GraduationCap size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              06. Education Qualifications
            </h3>
            {renderStatusBadge(5)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(5)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="joining-table">
            <thead>
              <tr>
                <th>Qualification</th>
                <th>Board / University</th>
                <th>Year</th>
                <th>Percentage / Grade</th>
              </tr>
            </thead>
            <tbody>
              {formData.education.map((edu) => (
                <tr key={edu.id}>
                  <td style={{ fontWeight: 600 }}>{edu.qualification || '—'}</td>
                  <td>{edu.boardOrUniversity || '—'}</td>
                  <td>{edu.yearOfPassing || '—'}</td>
                  <td>{edu.percentageOrGrade || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 7: FAMILY */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              07. Family Dependents
            </h3>
            {renderStatusBadge(6)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(6)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="joining-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Date of Birth / Age</th>
                <th>Relationship</th>
              </tr>
            </thead>
            <tbody>
              {formData.family.map((fam) => (
                <tr key={fam.id}>
                  <td style={{ fontWeight: 600 }}>{fam.name || '—'}</td>
                  <td>{fam.dateOfBirthOrAge || '—'}</td>
                  <td>{fam.relation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 8: DOCUMENTS */}
      <div className="review-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCheck size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              08. Documents & Photos
            </h3>
            {renderStatusBadge(7)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(7)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Photo Preview */}
          <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-pearl-surface)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {formData.documents.PHOTO?.file?.dataUrl ? (
              <img
                src={formData.documents.PHOTO.file.dataUrl}
                alt="Candidate"
                style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
              />
            ) : (
              <div style={{ width: '48px', height: '60px', background: 'rgba(237, 166, 163, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <AlertTriangle size={16} color="var(--color-dusty-rose-dark)" />
              </div>
            )}
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>Passport Photo</div>
              <div style={{ fontSize: '11px', color: formData.documents.PHOTO?.file ? 'var(--color-text-secondary)' : 'var(--color-dusty-rose-dark)' }}>
                {formData.documents.PHOTO?.file ? `✓ ${formData.documents.PHOTO.file.name}` : 'Missing (Required)'}
              </div>
            </div>
          </div>

          {/* Signature Preview */}
          <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-pearl-surface)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {formData.documents.SIGNATURE?.file?.dataUrl ? (
              <img
                src={formData.documents.SIGNATURE.file.dataUrl}
                alt="Signature"
                style={{ width: '70px', height: '36px', objectFit: 'contain', background: '#fff', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
              />
            ) : (
              <div style={{ width: '70px', height: '36px', background: 'rgba(237, 166, 163, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <AlertTriangle size={16} color="var(--color-dusty-rose-dark)" />
              </div>
            )}
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>Specimen Signature</div>
              <div style={{ fontSize: '11px', color: formData.documents.SIGNATURE?.file ? 'var(--color-text-secondary)' : 'var(--color-dusty-rose-dark)' }}>
                {formData.documents.SIGNATURE?.file ? `✓ ${formData.documents.SIGNATURE.file.name}` : 'Missing (Required)'}
              </div>
            </div>
          </div>

          {/* Aadhaar Front */}
          <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-pearl-surface)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              Aadhaar Card (Front Side)
            </div>
            <div style={{ fontSize: '11px', color: formData.documents.AADHAAR_FRONT?.file ? 'var(--color-text-secondary)' : 'var(--color-dusty-rose-dark)', marginTop: '2px' }}>
              {formData.documents.AADHAAR_FRONT?.file ? `✓ ${formData.documents.AADHAAR_FRONT.file.name}` : 'Missing (Required)'}
            </div>
          </div>

          {/* Aadhaar Back */}
          <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-pearl-surface)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              Aadhaar Card (Back Side)
            </div>
            <div style={{ fontSize: '11px', color: formData.documents.AADHAAR_BACK?.file ? 'var(--color-text-secondary)' : 'var(--color-dusty-rose-dark)', marginTop: '2px' }}>
              {formData.documents.AADHAAR_BACK?.file ? `✓ ${formData.documents.AADHAAR_BACK.file.name}` : 'Missing (Required)'}
            </div>
          </div>

          {/* Other Documents */}
          {Object.entries(formData.documents)
            .filter(([cat]) => !['PHOTO', 'SIGNATURE', 'AADHAAR_FRONT', 'AADHAAR_BACK'].includes(cat))
            .map(([cat, doc]) => (
              <div key={cat} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-pearl-surface)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '11px', color: doc.file ? 'var(--color-text-secondary)' : doc.required ? 'var(--color-dusty-rose-dark)' : 'var(--color-text-muted)', marginTop: '2px' }}>
                  {doc.file ? `✓ ${doc.file.name}` : doc.required ? 'Missing (Required)' : 'Optional (Not uploaded)'}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* SECTION 9: DECLARATIONS */}
      <div className="review-card" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="review-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSignature size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-midnight-navy)' }}>
              09. Declarations & Undertaking
            </h3>
            {renderStatusBadge(8)}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditStep(8)}
            style={{ fontSize: '0.75rem', gap: '0.3rem' }}
          >
            {isSubmittedMode ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isSubmittedMode ? 'VIEW' : 'EDIT'}</span>
          </button>
        </div>

        <div className="review-grid-3">
          <div>
            <span className="review-label">Joining Undertaking</span>
            <div className="review-value">
              {formData.declarations.candidateDeclarationAcknowledged ? '✓ Acknowledged' : '✗ Pending'}
            </div>
          </div>
          <div>
            <span className="review-label">Code of Conduct</span>
            <div className="review-value">
              {formData.declarations.rulesAndConductAccepted ? '✓ Accepted' : '✗ Pending'}
            </div>
          </div>
          <div>
            <span className="review-label">KYC Verification Consent</span>
            <div className="review-value">
              {formData.declarations.backgroundVerificationConsent ? '✓ Consented' : '✗ Pending'}
            </div>
          </div>
          <div>
            <span className="review-label">Signatory Candidate</span>
            <div className="review-value">{formData.declarations.signatoryName || '—'}</div>
          </div>
          <div>
            <span className="review-label">Declaration Date</span>
            <div className="review-value">{formData.declarations.declarationDate || '—'}</div>
          </div>
        </div>
      </div>

      {/* SUBMISSION FOOTER: LOCKED BANNER vs EDITABLE SUBMIT */}
      {isSubmittedMode ? (
        <div
          style={{
            backgroundColor: 'var(--color-pearl-surface)',
            border: '2px solid var(--color-midnight-navy)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(1.5rem, 3vw, 2.25rem)',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-2)' }}>
            <CheckCircle2 size={22} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
              JOINING FORM SUBMITTED & ARCHIVED
            </h3>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '580px', margin: '0 auto var(--space-6)', lineHeight: 1.6 }}>
            Your onboarding dossier was submitted on {formData.submittedAt ? new Date(formData.submittedAt).toLocaleDateString() : 'recently'}. All records are locked for administrative verification. No further modifications can be submitted online.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {onBackToSuccess && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onBackToSuccess}
              >
                BACK TO CONFIRMATION
              </Button>
            )}
            <Button
              to="/"
              variant="primary"
              size="md"
            >
              RETURN TO HOMEPAGE
            </Button>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--color-pearl-surface)',
            border: '2px solid var(--color-champagne-dark)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(1.5rem, 3vw, 2rem)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-3)' }}>
            <ShieldCheck size={22} style={{ color: 'var(--color-midnight-navy)' }} />
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
              FINAL VERIFICATION & SUBMISSION CONFIRMATION
            </h3>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
            Please review all information carefully before submitting your joining form. Once submitted, your onboarding packet will be processed for background verification, EPFO Form 11 creation, and reporting pass issuance.
          </p>

          <label
            className="form-checkbox-label"
            style={{
              alignItems: 'flex-start',
              padding: '1rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-6)',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              className="form-checkbox-input"
              checked={confirmationChecked}
              onChange={(e) => onConfirmationToggle(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-midnight-navy)', fontWeight: 600, lineHeight: 1.5 }}>
              I confirm that the information provided by me is accurate to the best of my knowledge. I understand that any false declaration may result in cancellation of my appointment.
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!confirmationChecked || !isAllComplete || isSubmitting}
              onClick={onSubmit}
              icon={<ArrowRight size={18} />}
            >
              {isSubmitting ? 'SUBMITTING JOINING DOSSIER...' : 'SUBMIT JOINING FORM →'}
            </Button>
          </div>

          {!isAllComplete && (
            <div style={{ marginTop: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-dusty-rose-dark)', fontWeight: 600 }}>
              * Please resolve all incomplete sections before submitting.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
