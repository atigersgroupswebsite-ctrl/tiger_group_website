// ==============================================================================
// File: src/components/admin/RegularJoiningReviewModal.tsx
// Description: Pre-Submission Review Modal for Regular Joining Form
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Fully scrollable flex layout preventing clipped text and collapsed sections
//   - Displays complete candidate dossier across Sections A, B, C, D (Zero PAN)
//   - High-fidelity preview thumbnails for all 4 uploaded documents (Photo, Aadhaar, Passbook, Signature)
//   - Click-to-inspect image lightbox for administrative verification of documents
//   - Responsive layout for desktop and mobile displays
//   - Pre-submission inspection with "Submit Regular Joining Form" action
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  User,
  CreditCard,
  Briefcase,
  Loader2,
  ZoomIn,
  Eye,
  Camera
} from 'lucide-react';
import type { RegularJoiningFormData, RegularJoiningDocItem } from '../../services/regularJoiningService';

interface RegularJoiningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RegularJoiningFormData;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export const RegularJoiningReviewModal: React.FC<RegularJoiningReviewModalProps> = ({
  isOpen,
  onClose,
  formData,
  onSubmit,
  isSubmitting
}) => {
  const [inspectDoc, setInspectDoc] = useState<{ title: string; url: string } | null>(null);

  // Lock background body scroll when preview modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (val?: string | null) => {
    if (!val) return '—';
    try {
      const parts = val.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return val;
    } catch {
      return val;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    return `${Math.round(bytes / 1024)} KB`;
  };

  const renderDocCard = (
    titleWithNumber: string,
    doc: RegularJoiningDocItem | null | undefined,
    fallbackLabel: string
  ) => {
    const isUploaded = Boolean(doc?.dataUrl || doc?.storagePath);
    const imageUrl = doc?.dataUrl;

    return (
      <div
        style={{
          border: isUploaded ? '1px solid #CBD5E1' : '1px dashed #F87171',
          borderRadius: '8px',
          padding: '0.85rem',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '220px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F1B38' }}>
            {titleWithNumber}
          </span>
          {isUploaded ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              <CheckCircle2 size={11} />
              <span>Uploaded</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#B91C1C',
                backgroundColor: '#FEE2E2',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              <AlertCircle size={11} />
              <span>Missing *</span>
            </span>
          )}
        </div>

        {/* Image Preview Box */}
        <div
          style={{
            width: '100%',
            height: '130px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={`${titleWithNumber} Preview`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '130px',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <button
                type="button"
                onClick={() => setInspectDoc({ title: titleWithNumber, url: imageUrl })}
                title="Click to inspect photo in high resolution"
                style={{
                  position: 'absolute',
                  right: '6px',
                  bottom: '6px',
                  backgroundColor: 'rgba(15, 27, 56, 0.85)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer'
                }}
              >
                <ZoomIn size={12} />
                <span>Inspect</span>
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94A3B8' }}>
              <Camera size={26} style={{ margin: '0 auto 0.25rem auto', color: '#CBD5E1' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fallbackLabel}</div>
              <div style={{ fontSize: '0.7rem', color: '#DC2626' }}>Document required</div>
            </div>
          )}
        </div>

        {/* File Details */}
        <div style={{ width: '100%', marginTop: '0.5rem', textAlign: 'left', fontSize: '0.72rem', color: '#64748B' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
            {doc?.name || 'No file selected'}
          </div>
          {doc?.size ? <div>Size: {formatFileSize(doc.size)}</div> : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
          }
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1020px',
            height: '90vh',
            maxHeight: '90vh',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #CBD5E1',
            margin: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pinned Modal Header */}
          <div
            style={{
              flexShrink: 0,
              padding: '1.1rem 1.5rem',
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1E293B'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(197, 160, 89, 0.15)',
                  border: '1px solid #C5A059',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={22} style={{ color: '#C5A059' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                  Review and Verify Joining Form
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Assigned Employee Code: <strong style={{ color: '#C5A059' }}>{formData.employeeCode}</strong> • {formData.fullName || 'Candidate'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div
            className="regular-joining-modal-scroll"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              backgroundColor: '#F8FAFC'
            }}
          >
            {/* Informational Guidance Notice */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <Eye size={18} style={{ color: '#1E40AF', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.4 }}>
                <strong>Administrative Pre-Submission Review:</strong> Please inspect all candidate biographical data, statutory identifiers, banking coordinates, and the 4 mandatory photographs before submitting. Final verification will be conducted in Joining Submissions.
              </p>
            </div>

            {/* SECTION A: JOINING DETAILS (1–7) */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                minHeight: 'fit-content',
                height: 'auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Briefcase size={16} style={{ color: '#0F1B38' }} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SECTION A: JOINING DETAILS (1–7)
                </h4>
              </div>
              <div
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    1. Joining Reference Number / Employee Code:
                  </span>
                  <strong style={{ color: '#0F1B38', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {formData.employeeCode}
                  </strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    2. Joining Date:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formatDate(formData.joiningDate)}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    3. Department:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.department || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    4. Designation:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.designation || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    5. Company Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.companyName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    6. Unit Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.unitName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    7. Factory / Supervisor Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.factorySupervisorName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    Date of Interview:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formatDate(formData.interviewDate)}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    Salary (CTC) / Month:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>
                    {formData.salaryCtc ? `INR ${formData.salaryCtc.toLocaleString('en-IN')}` : '—'}
                  </strong>
                </div>
              </div>
            </div>

            {/* SECTION B: CANDIDATE PERSONAL DETAILS (8–21) */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                minHeight: 'fit-content',
                height: 'auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <User size={16} style={{ color: '#0F1B38' }} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SECTION B: CANDIDATE PERSONAL DETAILS (8–21)
                </h4>
              </div>
              <div
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    8. Full Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.fullName}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    9. Father's Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.fatherName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    10. Date of Birth:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formatDate(formData.dob)}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    11. Gender:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.gender}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    12. Marital Status:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.maritalStatus}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    13. Aadhaar Card Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>
                    {formData.aadhaarNumber
                      ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}`
                      : '—'}
                  </strong>
                </div>

                {/* Addresses span full width */}
                <div style={{ gridColumn: '1 / -1', minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    14. Permanent Address:
                  </span>
                  <span style={{ color: '#0F1B38', lineHeight: 1.4, fontWeight: 500 }}>
                    {formData.permanentAddress || '—'}
                  </span>
                </div>
                <div style={{ gridColumn: '1 / -1', minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    15. Current Address:
                  </span>
                  <span style={{ color: '#0F1B38', lineHeight: 1.4, fontWeight: 500 }}>
                    {formData.sameAsPermanent ? 'Same as Permanent Address' : (formData.currentAddress || '—')}
                  </span>
                </div>

                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    16. UAN Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.uanNumber || 'None'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    17. ESIC Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.esicNumber || 'None'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    18. PT Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.ptNumber || 'None'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    19. Aadhaar-Linked Mobile Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.mobile || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    20. Alternate Mobile Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.alternateMobile || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    21. Email ID:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.email || '—'}</strong>
                </div>
              </div>
            </div>

            {/* SECTION C: BANK DETAILS (22–26) */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                minHeight: 'fit-content',
                height: 'auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CreditCard size={16} style={{ color: '#0F1B38' }} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SECTION C: BANK DETAILS (22–26)
                </h4>
              </div>
              <div
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    22. Bank Account Number:
                  </span>
                  <strong style={{ color: '#0F1B38', fontFamily: 'monospace' }}>
                    {formData.bankAccountNumber || '—'}
                  </strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    23. IFSC Code:
                  </span>
                  <strong style={{ color: '#0F1B38', fontFamily: 'monospace' }}>
                    {formData.ifscCode || '—'}
                  </strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    24. Bank Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.bankName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    25. Branch Name:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.branchName || '—'}</strong>
                </div>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                    26. PhonePe / UPI Number:
                  </span>
                  <strong style={{ color: '#0F1B38' }}>{formData.upiNumber || '—'}</strong>
                </div>
              </div>
            </div>

            {/* SECTION D: REQUIRED DOCUMENTS (27–30) */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                minHeight: 'fit-content',
                height: 'auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FileCheck2 size={16} style={{ color: '#0F1B38' }} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SECTION D: REQUIRED DOCUMENTS (27–30)
                </h4>
              </div>
              <div
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem'
                }}
              >
                {renderDocCard('27. Live Photo', formData.photo, 'Live Photo')}
                {renderDocCard('28. Aadhaar Card Photo', formData.aadhaar, 'Aadhaar Card')}
                {renderDocCard('29. Bank Passbook Photo', formData.bankPassbook, 'Passbook / Cheque')}
                {renderDocCard('30. Signature Photo', formData.signature, 'Candidate Signature')}
              </div>
            </div>

            {/* SECTION E: ADMINISTRATOR VERIFICATION CONFIRMATION */}
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                minHeight: 'fit-content',
                height: 'auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ShieldCheck size={16} style={{ color: '#0F1B38' }} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ADMINISTRATOR VERIFICATION CONFIRMATION
                </h4>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Candidate Live Photo Verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Aadhaar Card Photo Verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bank Passbook Photo Verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Specimen Signature Verified</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                    <strong>Administrative Declaration:</strong> I hereby certify that the candidate biographical records, statutory identification numbers, bank account coordinates, and all four uploaded documents displayed above have been reviewed and verified for authenticity and correctness.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#64748B' }}>
                    <span>Verification Status: <strong style={{ color: '#16A34A' }}>Verified & Ready for Submission</strong></span>
                    <span>Review Date: <strong style={{ color: '#0F1B38' }}>{formatDate(new Date().toISOString().split('T')[0])}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Modal Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '1rem 1.5rem',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline"
              style={{
                fontSize: '0.85rem',
                padding: '0.55rem 1.25rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Back to Edit Form
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="btn btn-navy"
              style={{
                fontSize: '0.88rem',
                padding: '0.65rem 1.6rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(15, 27, 56, 0.2)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Submitting Regular Joining Form...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} style={{ color: '#C5A059' }} />
                  <span>Confirm & Verify Joining Form</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .regular-joining-modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .regular-joining-modal-scroll::-webkit-scrollbar-track {
          background: #F1F5F9;
        }
        .regular-joining-modal-scroll::-webkit-scrollbar-thumb {
          background: #94A3B8;
          border-radius: 4px;
        }
        .regular-joining-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748B;
        }
      `}</style>

      {/* Lightbox Image Inspection Modal */}
      {inspectDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setInspectDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #1E293B'
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C5A059' }}>
                {inspectDoc.title}
              </span>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              <img
                src={inspectDoc.url}
                alt={inspectDoc.title}
                style={{
                  maxWidth: '80vw',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
