// ==============================================================================
// File: src/components/admin/CompleteJoiningDocumentModal.tsx
// Description: Multi-Page A4 Interactive Preview & Print Modal for Complete Joining Documents
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   - High-fidelity A4 vector preview matching complete onboarded paperwork
//   - Complete Dossier Mode (9 Pages Total):
//       Page 1: Joining Details (1–7), Candidate Personal (8–21), Bank (22–26)
//       Page 2: Required Document & Photo Specimens (27–30)
//       Page 3: Formal Joining Report Undertaking
//       Page 4: Document 1 — SELF DECLARATION (Reference PDF Page 5)
//       Page 5: Document 2 — DECLARATION REGARDING EMPLOYMENT OF RELATIVES (Reference PDF Page 6)
//       Page 6: Document 3 — TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME (Reference PDF Page 7)
//       Page 7: Document 4 — CONTRACT APPOINTMENT LETTER (Reference PDF Page 8)
//       Page 8: Document 5 — EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING (Reference PDF Page 9)
//       Page 9: Master Attestation & Combined Corporate Authorization Seal
//   - Official 5-Document Mode (5 Pages Total):
//       Faithful reproduction of PDF Pages 5, 6, 7, 8, and 9
// ==============================================================================

import React, { useState, useEffect } from 'react';
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
  extractDynamicEmployeeData,
  downloadCompleteJoiningDocumentPdf,
  downloadFiveOfficialJoiningDocumentsPdf,
  resolveCandidateSignatureSource
} from '../../services/completeJoiningDocumentGenerator';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  FORMAL_JOINING_UNDERTAKING,
  MASTER_ATTESTATION
} from '../../constants/joiningDeclarations';
import {
  getActiveCompanySignatureSignedUrl,
  getActiveCompanyStampSignedUrl
} from '../../services/companySignatureService';

interface CompleteJoiningDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RegularJoiningFormData;
  companySignatureUrl?: string | null;
  companyStampUrl?: string | null;
  verifierName?: string;
  initialMode?: 'all' | 'official_5';
}

export const CompleteJoiningDocumentModal: React.FC<CompleteJoiningDocumentModalProps> = ({
  isOpen,
  onClose,
  formData,
  companySignatureUrl: propSigUrl,
  companyStampUrl: propStampUrl,
  verifierName = 'Authorized HR Cell',
  initialMode = 'all'
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'all' | 'official_5'>(initialMode);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeCompanySig, setActiveCompanySig] = useState<string | null>(propSigUrl || null);
  const [activeCompanyStamp, setActiveCompanyStamp] = useState<string | null>(propStampUrl || null);

  const [candidateSigUrl, setCandidateSigUrl] = useState<string | null>(null);

  useEffect(() => {
    setActiveViewMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    let isMounted = true;
    const rawSig = resolveCandidateSignatureSource(formData);
    if (!rawSig) {
      setCandidateSigUrl(null);
    } else if (rawSig.startsWith('data:image/') || rawSig.startsWith('http://') || rawSig.startsWith('https://')) {
      setCandidateSigUrl(rawSig);
    } else if (isSupabaseConfigured) {
      let bucket = 'candidate-documents';
      let cleanPath = rawSig;
      if (rawSig.startsWith('candidate-documents/')) {
        cleanPath = rawSig.replace(/^candidate-documents\//, '');
      } else if (
        rawSig.startsWith('company-assets/') ||
        rawSig.startsWith('signatures/') ||
        rawSig.startsWith('stamps/')
      ) {
        bucket = 'company-assets';
        cleanPath = rawSig.replace(/^company-assets\//, '');
      }

      supabase.storage
        .from(bucket)
        .createSignedUrl(cleanPath, 3600)
        .then(({ data }) => {
          if (isMounted && data?.signedUrl) {
            setCandidateSigUrl(data.signedUrl);
          }
        })
        .catch(() => {
          if (isMounted) setCandidateSigUrl(null);
        });
    } else {
      setCandidateSigUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [formData]);

  useEffect(() => {
    if (propSigUrl) setActiveCompanySig(propSigUrl);
    if (propStampUrl) setActiveCompanyStamp(propStampUrl);

    if (!propSigUrl || !propStampUrl) {
      let isMounted = true;
      Promise.all([
        !propSigUrl ? getActiveCompanySignatureSignedUrl().catch(() => null) : Promise.resolve(propSigUrl),
        !propStampUrl ? getActiveCompanyStampSignedUrl().catch(() => null) : Promise.resolve(propStampUrl)
      ]).then(([sig, stamp]) => {
        if (isMounted) {
          if (sig) setActiveCompanySig(sig);
          if (stamp) setActiveCompanyStamp(stamp);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [propSigUrl, propStampUrl]);

  if (!isOpen) return null;

  const emp = extractDynamicEmployeeData(formData);
  const employeeCode = emp.employeeCode;
  const joiningDate = emp.joiningDate;
  const place = 'Nagpur, Maharashtra';
  const sigDataUrl = candidateSigUrl || formData.signature?.dataUrl || null;

  const handleDownloadCompletePdf = async () => {
    try {
      setIsDownloading(true);
      setDownloadSuccess(null);
      const res = await downloadCompleteJoiningDocumentPdf(formData, {
        companySignatureUrl: activeCompanySig,
        companyStampUrl: activeCompanyStamp,
        verifierName,
        place
      });
      if (res.success) {
        setDownloadSuccess(`Downloaded Complete Dossier: ${res.fileName}`);
        setTimeout(() => setDownloadSuccess(null), 4000);
      }
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadOfficialFivePdf = async () => {
    try {
      setIsDownloading(true);
      setDownloadSuccess(null);
      const res = await downloadFiveOfficialJoiningDocumentsPdf(formData, {
        companySignatureUrl: activeCompanySig,
        companyStampUrl: activeCompanyStamp,
        verifierName,
        place
      });
      if (res.success) {
        setDownloadSuccess(`Downloaded 5 Official Documents: ${res.fileName}`);
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

  // Reusable Sheet Header
  const renderSheetHeader = (sectionTitle: string) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '2px solid #0F1B38',
        paddingBottom: '8px',
        marginBottom: '12px'
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 900, color: '#0F1B38' }}>
          A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
        </div>
        <div style={{ fontSize: '10px', color: '#64748B' }}>
          {sectionTitle}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F1B38' }}>
          REF: {employeeCode}
        </div>
        <div style={{ fontSize: '10px', color: '#64748B' }}>
          DATE: {joiningDate}
        </div>
      </div>
    </div>
  );

  // Reusable Candidate Identification Mini-Table
  const renderCandidateDetailsBadge = () => (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #CBD5E1',
        borderRadius: '4px',
        padding: '8px 12px',
        marginBottom: '12px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        fontSize: '11px'
      }}
    >
      <div>
        <strong style={{ color: '#0F1B38' }}>Candidate Name: </strong>
        <span>{emp.employeeName}</span>
      </div>
      <div>
        <strong style={{ color: '#0F1B38' }}>Father's Name: </strong>
        <span>{emp.fatherName}</span>
      </div>
      <div>
        <strong style={{ color: '#0F1B38' }}>Designation Applied: </strong>
        <span>{emp.designation}</span>
      </div>
      <div>
        <strong style={{ color: '#0F1B38' }}>Worksite / Unit: </strong>
        <span>{emp.enterpriseUnit}</span>
      </div>
    </div>
  );

  // Reusable Dual Execution Block (Candidate Signature + Company Authorization)
  const renderExecutionBlock = (acknowledgementText: string) => (
    <div style={{ marginTop: 'auto' }}>
      <div
        style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: '4px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '10.5px',
          color: '#78350F',
          lineHeight: 1.45
        }}
      >
        <strong style={{ color: '#92400E' }}>CANDIDATE SOLEMN UNDERTAKING: </strong>
        {acknowledgementText}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* Left: Candidate Signature */}
        <div
          style={{
            border: '1px solid #CBD5E1',
            borderRadius: '4px',
            padding: '10px 12px',
            background: '#FFFFFF'
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F1B38', marginBottom: '4px' }}>
            CANDIDATE SIGNATURE & AFFIRMATION:
          </div>
          <div
            style={{
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '6px'
            }}
          >
            {sigDataUrl ? (
              <img
                src={sigDataUrl}
                alt="Candidate Signature"
                style={{ maxHeight: '42px', maxWidth: '150px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>Signature not uploaded</span>
            )}
          </div>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
            {emp.employeeName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748B' }}>
            Place: {place} | Date: {joiningDate}
          </div>
        </div>

        {/* Right: Company Authorization */}
        <div
          style={{
            border: '1px solid #CBD5E1',
            borderRadius: '4px',
            padding: '10px 12px',
            background: '#FFFFFF'
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F1B38', marginBottom: '4px' }}>
            COMPANY AUTHORIZATION & REGISTRATION SEAL:
          </div>
          <div
            style={{
              height: '48px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              alignItems: 'center',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '6px',
              gap: '6px'
            }}
          >
            <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeCompanyStamp ? (
                <img
                  src={activeCompanyStamp}
                  alt="Company Stamp"
                  style={{ maxHeight: '42px', maxWidth: '85px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontSize: '9px', color: '#64748B', textAlign: 'center', lineHeight: 1.2, border: '1px dashed #CBD5E1', padding: '2px 4px', borderRadius: '3px' }}>
                  <strong>[ OFFICIAL STAMP ]</strong><br />Pending Configuration
                </div>
              )}
            </div>
            <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeCompanySig ? (
                <img
                  src={activeCompanySig}
                  alt="Authorized Signatory"
                  style={{ maxHeight: '42px', maxWidth: '85px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontSize: '9px', color: '#047857', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                  [AUTHORIZED SIGNATURE]
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0F1B38' }}>
            Authorized Officer: {verifierName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748B' }}>
            A TIGER GLOBAL Career Solution & Consultancy
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // FIVE OFFICIAL EMPLOYEE JOINING DOCUMENTS RENDERERS
  // Matching Source PDF Pages 5, 6, 7, 8, 9
  // ============================================================================

  // DOCUMENT 1 — SELF DECLARATION (PDF Page 5)
  const renderSelfDeclarationSheet = (pageLabel: string) => (
    <div
      key="official-doc-1"
      className="pdf-page-sheet"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '36px 40px',
        minHeight: '1120px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#0F1B38',
        fontSize: '13px'
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F1B38', marginBottom: '4px' }}>
          A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
        </div>
        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F1B38', marginBottom: '8px' }}>
          SELF DECLARATION (PAGE 07)
        </div>
        <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '32px' }} />

        <div style={{ fontWeight: 800, fontSize: '12.5px', marginBottom: '16px' }}>
          TO: The Management & HR Department
        </div>

        <div style={{ fontWeight: 800, fontSize: '12px', marginBottom: '16px' }}>
          Dear Sir/Madam,
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.7, fontSize: '12px', color: '#1E293B' }}>
          <p style={{ margin: 0 }}>
            This is to certify that prior to joining A TIGER GLOBAL Career Solution & Consultancy, I was working with <strong>{emp.previousEmployer}</strong> and have completed all relieving formalities with my previous employer. My last working day was <strong>{emp.lastWorkingDay}</strong>.
          </p>

          <p style={{ margin: 0 }}>
            To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities viz., legal, financial, professional, or personal which I have with my previous employer, if any.
          </p>

          <p style={{ margin: 0 }}>
            I agree to submit formal relieving letter to HR department once I receive the same from my previous employer.
          </p>

          <p style={{ margin: 0 }}>
            I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action by the company, including termination of service.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '12px', lineHeight: 1.8 }}>
            <div><strong>Name: </strong> {emp.employeeName}</div>
            <div><strong>Date: </strong> {emp.joiningDate}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '180px',
                height: '75px',
                border: '1.5px dashed #94A3B8',
                borderRadius: '4px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'left' }}>Signature:</div>
              <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sigDataUrl ? (
                  <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '42px', maxWidth: '160px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '6px', color: '#0F1B38' }}>
              {emp.employeeName}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '24px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
          <span>A TIGER GLOBAL Career Solution & Consultancy — Official Self Declaration</span>
          <span>{pageLabel}</span>
        </div>
      </div>
    </div>
  );

  // DOCUMENT 2 — DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PDF Page 6)
  const renderRelativeDeclarationSheet = (pageLabel: string) => (
    <div
      key="official-doc-2"
      className="pdf-page-sheet"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '36px 40px',
        minHeight: '1120px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#0F1B38',
        fontSize: '13px'
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F1B38', marginBottom: '4px' }}>
          A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F1B38', marginBottom: '8px' }}>
          DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PAGE 08)
        </div>
        <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '28px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.7, fontSize: '12px', color: '#1E293B' }}>
          <p style={{ margin: 0 }}>
            As per Internal Policy, the Organization does not encourage employment of 'relatives' as it can cause various problems, including charges of favoritism, conflicts of interest, family discord, and scheduling conflicts that work to the disadvantage of both the Organization and the employees.
          </p>

          <p style={{ margin: 0 }}>
            For the above purpose, the term 'relatives' includes the following relationships, whether established by blood, marriage, or other legal action: mother, father, husband, wife, son, daughter, sister, brother, mother-in-law, father-in-law, sister-in-law, brother-in-law, son-in-law, daughter-in-law, stepchild, aunt, uncle, nephew, niece or cousin.
          </p>

          <p style={{ margin: 0 }}>
            I, <strong>{emp.employeeName}</strong>, joined on <strong>{emp.joiningDate}</strong> as <strong>{emp.designation}</strong>, do hereby declare that:
          </p>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '12px 16px',
              fontWeight: 700,
              color: '#0F1B38',
              fontSize: '12px'
            }}
          >
            {emp.hasRelative ? (
              <span>(I-b) I AM related to <strong>{emp.relativeName}</strong> working in <strong>{emp.relativeDept}</strong> as <strong>{emp.relativeRel}</strong>.</span>
            ) : (
              <span>(I-a) I am NOT directly or distantly related to any of the employees working in the Organization.</span>
            )}
          </div>

          <p style={{ margin: 0 }}>
            I understand that if the declaration given above is found false, the Organization can take disciplinary action to the extent of termination of service.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '12px', lineHeight: 1.8 }}>
            <div><strong>Name: </strong> {emp.employeeName}</div>
            <div><strong>Date: </strong> {emp.joiningDate}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '180px',
                height: '75px',
                border: '1.5px dashed #94A3B8',
                borderRadius: '4px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'left' }}>Signature:</div>
              <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sigDataUrl ? (
                  <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '42px', maxWidth: '160px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '6px', color: '#0F1B38' }}>
              {emp.employeeName}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '24px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
          <span>A TIGER GLOBAL Career Solution & Consultancy — Relatives Employment Declaration</span>
          <span>{pageLabel}</span>
        </div>
      </div>
    </div>
  );

  // DOCUMENT 3 — TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME (PDF Page 7)
  const renderTermsAndConditionsSheet = (pageLabel: string) => (
    <div
      key="official-doc-3"
      className="pdf-page-sheet"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '36px 40px',
        minHeight: '1120px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#0F1B38',
        fontSize: '13px'
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F1B38', marginBottom: '4px' }}>
          A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F1B38', marginBottom: '8px' }}>
          TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME
        </div>
        <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '28px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px', color: '#1E293B', marginBottom: '24px' }}>
          <div>
            <strong>Enterprise Unit: </strong> <span>{emp.enterpriseUnit}</span>
          </div>
          <div>
            <strong>Address: </strong> <span>{emp.worksiteAddress}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12px', color: '#1E293B', lineHeight: 1.6 }}>
          <div>
            <strong>1. Operational Shifts: </strong>
            <span>Shift A (08:30 AM to 05:00 PM), Shift B (03:00 PM to 11:30 PM), Shift C (11:30 PM to 08:00 AM).</span>
          </div>

          <div>
            <strong>2. Discipline & Industrial Safety: </strong>
            <span>Wearing safety shoes, uniforms, and identity badges is strictly mandatory. Tobacco, bidi, alcohol, and intoxicating substances are completely prohibited.</span>
          </div>

          <div>
            <strong>3. Statutory Wages: </strong>
            <span>Minimum wages paid strictly in accordance with applicable notification schedules between the 10th and 15th of every month.</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '12px', lineHeight: 1.8 }}>
            <div><strong>Employee Name: </strong> {emp.employeeName}</div>
            <div><strong>Attestation Date: </strong> {emp.joiningDate}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px', textAlign: 'left' }}>
              Employee Acceptance Signature:
            </div>
            <div
              style={{
                width: '180px',
                height: '75px',
                border: '1.5px dashed #94A3B8',
                borderRadius: '4px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F8FAFC'
              }}
            >
              {sigDataUrl ? (
                <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '45px', maxWidth: '160px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
              )}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '6px', color: '#0F1B38' }}>
              {emp.employeeName}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '24px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
          <span>A TIGER GLOBAL Career Solution & Consultancy — Employment & Shift Terms</span>
          <span>{pageLabel}</span>
        </div>
      </div>
    </div>
  );

  // DOCUMENT 4 — CONTRACT APPOINTMENT LETTER (PDF Page 8)
  const renderContractAppointmentLetterSheet = (pageLabel: string) => (
    <div
      key="official-doc-4"
      className="pdf-page-sheet"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '24px 28px',
        minHeight: '1120px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#0F1B38',
        fontSize: '11.5px',
        border: '2px solid #000000'
      }}
    >
      <div>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#000000' }}>
            A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000', textDecoration: 'underline', marginTop: '2px' }}>
            CONTRACT APPOINTMENT LETTER
          </div>
        </div>

        {/* 4-Column Particulars Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10.5px',
            marginBottom: '14px',
            border: '1px solid #CBD5E1'
          }}
        >
          <tbody>
            <tr>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC', width: '22%' }}>Employee Name:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', width: '28%' }}>{emp.employeeName}</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC', width: '22%' }}>Father's Name:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', width: '28%' }}>{emp.fatherName}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Employee / Joining ID:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.employeeCode}</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Designation:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.designation}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Department:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.department}</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Date of Joining:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.joiningDate}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Contact Number:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.contactNumber}</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px', fontWeight: 800, backgroundColor: '#F8FAFC' }}>Permanent Address:</td>
              <td style={{ border: '1px solid #CBD5E1', padding: '5px 8px' }}>{emp.permanentAddress}</td>
            </tr>
          </tbody>
        </table>

        {/* Subject & Opening */}
        <div style={{ fontSize: '11.5px', fontWeight: 800, marginBottom: '6px' }}>
          Subject: Appointment on Contract Basis
        </div>
        <div style={{ fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
          Dear {emp.employeeName},
        </div>
        <p style={{ margin: '0 0 10px 0', fontSize: '10.5px', lineHeight: 1.5, color: '#1E293B' }}>
          We are pleased to appoint you in A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY on a contractual basis for operational deployment with the organization/client unit under the terms and conditions outlined below:
        </p>

        {/* Terms 1 to 7 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10.5px', lineHeight: 1.45, color: '#1E293B' }}>
          <div>
            <strong>1. Nature of Contract Engagement: </strong>
            <span>This appointment is on a contractual basis for operational deployment with the organization/client unit.</span>
          </div>
          <div>
            <strong>2. Remuneration: </strong>
            <span>You shall receive a fixed consolidated salary of {emp.salary}, subject to applicable statutory deductions.</span>
          </div>
          <div>
            <strong>3. Statutory Benefits: </strong>
            <span>You shall be eligible for statutory benefits, including Employees' Provident Fund (EPF) and Employee State Insurance (ESIC) where applicable, in accordance with applicable statutory provisions.</span>
          </div>
          <div>
            <strong>4. Working Hours & Overtime: </strong>
            <span>You shall observe the standard working hours and operational shift requirements assigned at your deployment facility. Any overtime work performed shall be compensated strictly according to applicable company rules and operational policies.</span>
          </div>
          <div>
            <strong>5. Work Location / Duties: </strong>
            <span>You shall diligently perform your assigned duties at the designated work location or client site, maintaining workplace discipline, safety standards, and adherence to applicable operational rules.</span>
          </div>
          <div>
            <strong>6. Leave: </strong>
            <span>Leave entitlements shall be governed by applicable company rules and require prior authorization from your designated supervisor or management.</span>
          </div>
          <div>
            <strong>7. Transfer / Site Allocation: </strong>
            <span>The employee may be transferred or reassigned to another site or location according to work requirements.</span>
          </div>
        </div>
      </div>

      {/* Dual Authorization Bottom Block */}
      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
          {/* Company Side */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000' }}>
              For A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
            </div>
            <div style={{ height: '48px', display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
              {activeCompanyStamp && (
                <img src={activeCompanyStamp} alt="Stamp" style={{ maxHeight: '42px', maxWidth: '80px', objectFit: 'contain' }} />
              )}
              {activeCompanySig && (
                <img src={activeCompanySig} alt="Signature" style={{ maxHeight: '42px', maxWidth: '85px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000' }}>
              Authorized Management Signatory
            </div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>
              HR & Operations Department
            </div>
          </div>

          {/* Employee Acceptance Side */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000' }}>
              Employee Acceptance Acknowledgment:
            </div>
            <div style={{ fontSize: '9.5px', fontStyle: 'italic', color: '#64748B', margin: '2px 0 6px 0', lineHeight: 1.3 }}>
              "I have read, understood, and accept the above terms and conditions of my appointment."
            </div>
            <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
              {sigDataUrl ? (
                <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '34px', maxWidth: '140px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '9px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
              )}
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 800 }}>
              <span>Employee Signature</span>
              <span>{emp.employeeName}</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '14px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748B' }}>
          <span>Contract Appointment Letter — Tiger Group Operations</span>
          <span>{pageLabel}</span>
        </div>
      </div>
    </div>
  );

  // DOCUMENT 5 — EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING (PDF Page 9)
  const renderResignationDeclarationSheet = (pageLabel: string) => (
    <div
      key="official-doc-5"
      className="pdf-page-sheet"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '28px 32px',
        minHeight: '1120px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#0F1B38',
        fontSize: '12px',
        border: '2px solid #000000'
      }}
    >
      <div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#000000', textDecoration: 'underline' }}>
            EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING
          </div>
        </div>

        <div style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
          <div>To,</div>
          <div>The Management (HR Department)</div>
          <div style={{ fontWeight: 800 }}>A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</div>
        </div>

        <div style={{ fontSize: '12.5px', fontWeight: 800, marginBottom: '14px' }}>
          Subject: Employee Resignation Declaration & Exit Undertaking
        </div>

        <div style={{ fontSize: '12px', marginBottom: '14px' }}>
          Dear Sir / Madam,
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.7, fontSize: '12px', color: '#1E293B' }}>
          <p style={{ margin: 0 }}>
            I, the undersigned, am engaged with A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY in the capacity of <strong>{emp.designation}</strong>.
          </p>

          <p style={{ margin: 0 }}>
            I hereby declare that, upon my decision to discontinue or separate from my employment/service with the organization, this declaration may be relied upon as my voluntary resignation declaration and may be used for completing the applicable exit formalities and Full & Final Settlement, subject to the company's applicable rules and statutory requirements.
          </p>

          <p style={{ margin: 0 }}>
            I express my sincere appreciation to A TIGER GROUP'S for the opportunity, cooperation, professional guidance, and experience provided to me during my association with the organization.
          </p>
        </div>

        <div style={{ marginTop: '20px', fontSize: '12px', lineHeight: 1.6 }}>
          <div>Thanking you,</div>
          <div style={{ fontWeight: 800 }}>Yours faithfully,</div>
        </div>

        {/* Employee Particulars Block */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textDecoration: 'underline', marginBottom: '12px' }}>
            Employee Particulars
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ width: '180px', fontWeight: 800 }}>Employee Name:</span>
              <span style={{ flex: 1, borderBottom: '1px solid #000000', paddingBottom: '2px' }}>{emp.employeeName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ width: '180px', fontWeight: 800 }}>Employee / Joining ID:</span>
              <span style={{ flex: 1, borderBottom: '1px solid #000000', paddingBottom: '2px' }}>{emp.employeeCode}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ width: '180px', fontWeight: 800 }}>Designation:</span>
              <span style={{ flex: 1, borderBottom: '1px solid #000000', paddingBottom: '2px' }}>{emp.designation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ width: '180px', fontWeight: 800 }}>Contact Number:</span>
              <span style={{ flex: 1, borderBottom: '1px solid #000000', paddingBottom: '2px' }}>{emp.contactNumber}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '6px' }}>
              <span style={{ width: '180px', fontWeight: 800 }}>Employee Signature:</span>
              <div style={{ flex: 1, borderBottom: '1px solid #000000', paddingBottom: '2px', height: '36px', display: 'flex', alignItems: 'flex-end' }}>
                {sigDataUrl ? (
                  <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '32px', maxWidth: '140px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748B' }}>
          <span>Employee Resignation Declaration & Undertaking</span>
          <span>{pageLabel}</span>
        </div>
      </div>
    </div>
  );

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
      {/* Top Floating Control Bar */}
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
              {activeViewMode === 'all'
                ? 'COMPLETE EMPLOYEE JOINING DOSSIER (9 PAGES)'
                : 'FIVE OFFICIAL JOINING DOCUMENTS (5 PAGES)'}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Code: <strong style={{ color: '#C5A059' }}>{employeeCode}</strong> | Candidate: <strong>{emp.employeeName}</strong>
            </div>
          </div>
        </div>

        {/* View Switch Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1E293B', padding: '3px', borderRadius: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveViewMode('all')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeViewMode === 'all' ? '#C5A059' : 'transparent',
              color: activeViewMode === 'all' ? '#0F1B38' : '#94A3B8',
              transition: 'all 0.15s ease'
            }}
          >
            All 9 Pages
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('official_5')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeViewMode === 'official_5' ? '#C5A059' : 'transparent',
              color: activeViewMode === 'official_5' ? '#0F1B38' : '#94A3B8',
              transition: 'all 0.15s ease'
            }}
          >
            5 Official Documents
          </button>
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
            <CheckCircle2 size={14} />
            <span>{downloadSuccess}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          {activeViewMode === 'official_5' ? (
            <button
              type="button"
              onClick={handleDownloadOfficialFivePdf}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#C5A059',
                color: '#0F1B38',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isDownloading ? 'wait' : 'pointer'
              }}
            >
              {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>Download 5 Official Documents</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadCompletePdf}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#C5A059',
                color: '#0F1B38',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isDownloading ? 'wait' : 'pointer'
              }}
            >
              {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>Download Complete Dossier</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Close Preview"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Printable Multi-Page Container */}
      <div
        id="complete-joining-printable-dossier"
        style={{
          width: '100%',
          maxWidth: '850px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          paddingBottom: '3rem'
        }}
      >
        {activeViewMode === 'official_5' ? (
          <>
            {renderSelfDeclarationSheet('Page 1 of 5')}
            {renderRelativeDeclarationSheet('Page 2 of 5')}
            {renderTermsAndConditionsSheet('Page 3 of 5')}
            {renderContractAppointmentLetterSheet('Page 4 of 5')}
            {renderResignationDeclarationSheet('Page 5 of 5')}
          </>
        ) : (
          <>
            {/* SHEET 1: JOINING DETAILS, PERSONAL DETAILS & BANKING PARTICULARS */}
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
                {renderSheetHeader('PAGE 01 / 09 — EMPLOYEE PARTICULARS & ONBOARDING DETAILS')}

                <div
                  style={{
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    padding: '8px',
                    fontWeight: 800,
                    fontSize: '12px',
                    letterSpacing: '0.4px',
                    marginBottom: '14px'
                  }}
                >
                  FORMAL EMPLOYEE JOINING & STATUTORY ONBOARDING DOSSIER
                </div>

                {/* SECTION A: JOINING DETAILS */}
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '4px 8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      color: '#0F1B38',
                      marginBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>SECTION A: JOINING DETAILS (1–7)</span>
                    <span style={{ color: '#C5A059' }}>OFFICIAL ONBOARDING</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>1. Employee Code: </strong> {formData.employeeCode}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>2. Joining Date: </strong> {formData.joiningDate}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>3. Department: </strong> {formData.department}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>4. Designation Applied: </strong> {formData.designation}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>5. Placement Enterprise: </strong> {formData.companyName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>6. Unit / Worksite: </strong> {formData.unitName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>7. Factory / Supervisor: </strong> {formData.factorySupervisorName || '—'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>Interview Date: </strong> {formData.interviewDate ? String(formData.interviewDate) : '—'}
                    </div>
                    {formData.salaryCtc && (
                      <>
                        <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                          <strong>Salary (CTC) per Month: </strong> ₹ {Number(formData.salaryCtc).toLocaleString('en-IN')}
                        </div>
                        <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                          <strong>Employment Status: </strong> ACTIVE / VERIFIED
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION B: CANDIDATE PERSONAL DETAILS */}
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '4px 8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      color: '#0F1B38',
                      marginBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>SECTION B: CANDIDATE PERSONAL DETAILS (8–21)</span>
                    <span style={{ color: '#C5A059' }}>VERIFIED KYC RECORDS</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>8. Full Legal Name: </strong> {formData.fullName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>9. Father's Name: </strong> {formData.fatherName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>10. Date of Birth: </strong> {formData.dob}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>11. Gender / Marital Status: </strong> {formData.gender || '—'} / {formData.maritalStatus || '—'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>12. Aadhaar Number: </strong> {formData.aadhaarNumber}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>13. Mobile (Aadhaar Linked): </strong> {formData.mobile}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>14. Alternate Mobile: </strong> {formData.alternateMobile || '—'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>15. Official Email: </strong> {formData.email || '—'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>16. UAN (PF Number): </strong> {formData.uanNumber || 'Not Enrolled / N/A'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>17. ESIC Number: </strong> {formData.esicNumber || 'Not Enrolled / N/A'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>18. Professional Tax (PT): </strong> {formData.ptNumber || 'Not Enrolled / N/A'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>Verification Status: </strong> {formData.submissionStatus || 'VERIFIED'}
                    </div>
                  </div>

                  <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>19. Permanent Address: </strong> {formData.permanentAddress || '—'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>20. Current Address: </strong> {formData.currentAddress || formData.permanentAddress || '—'}
                    </div>
                  </div>
                </div>

                {/* SECTION C: BANK PARTICULARS */}
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '4px 8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      color: '#0F1B38',
                      marginBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>SECTION C: BANK DISBURSEMENT PARTICULARS (22–26)</span>
                    <span style={{ color: '#C5A059' }}>RESTRICTED / INTERNAL</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>22. Bank Account No.: </strong> {formData.bankAccountNumber}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>23. IFSC Code: </strong> {formData.ifscCode}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>24. Bank Name: </strong> {formData.bankName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>25. Branch Name: </strong> {formData.branchName}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>26. PhonePe / UPI Number: </strong> {formData.upiNumber || 'Not Linked'}
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', padding: '5px 8px' }}>
                      <strong>Disbursement Channel: </strong> Electronic Bank Transfer (NEFT/RTGS)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
                <span>A TIGER GLOBAL Career Solution & Consultancy — Internal Employment Onboarding Record</span>
                <span>Page 1 of 09</span>
              </div>
            </div>

            {/* SHEET 2: REQUIRED DOCUMENT & PHOTO SPECIMENS */}
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
                {renderSheetHeader('PAGE 02 / 09 — REQUIRED PHOTOGRAPHS & UPLOADED SPECIMENS')}

                <div
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '6px 10px',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    color: '#0F1B38',
                    marginBottom: '16px'
                  }}
                >
                  SECTION D: REQUIRED PHOTOGRAPHS & UPLOADED DOCUMENTS (27–30)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '8px' }}>
                      27. Live Passport Photo
                    </div>
                    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      {formData.photo?.dataUrl ? (
                        <img src={formData.photo.dataUrl} alt="Live Photo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                      )}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '8px' }}>
                      28. Aadhaar Card Photo
                    </div>
                    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      {formData.aadhaar?.dataUrl ? (
                        <img src={formData.aadhaar.dataUrl} alt="Aadhaar Card" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                      )}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '8px' }}>
                      29. Bank Passbook / Cheque
                    </div>
                    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      {formData.bankPassbook?.dataUrl ? (
                        <img src={formData.bankPassbook.dataUrl} alt="Bank Passbook" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                      )}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F1B38', marginBottom: '8px' }}>
                      30. Specimen Signature
                    </div>
                    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      {formData.signature?.dataUrl ? (
                        <img src={formData.signature.dataUrl} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Specimen On File</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
                <span>A TIGER GLOBAL Career Solution & Consultancy — Document Specimens Record</span>
                <span>Page 2 of 09</span>
              </div>
            </div>

            {/* SHEET 3: FORMAL JOINING REPORT (DEDICATED) */}
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
                {renderSheetHeader('PAGE 03 / 09 — FORMAL JOINING REPORT & DUTY UNDERTAKING')}
                {renderCandidateDetailsBadge()}

                <div style={{ marginBottom: '18px' }}>
                  <div
                    style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      padding: '12px 14px',
                      borderRadius: '4px',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', marginBottom: '6px' }}>
                      {FORMAL_JOINING_UNDERTAKING.title}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#78350F' }}>
                      {FORMAL_JOINING_UNDERTAKING.proclamation(joiningDate)}
                    </p>
                  </div>

                  <div
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      padding: '14px 18px',
                      background: '#F8FAFC',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#0F1B38', marginBottom: '10px' }}>
                      TERMS OF REPORTING & WORKPLACE OBLIGATIONS:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '11.5px', lineHeight: 1.8, color: '#334155' }}>
                      {FORMAL_JOINING_UNDERTAKING.terms.map((term, i) => (
                        <li key={i}>{term}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {renderExecutionBlock(
                `I, ${emp.employeeName}, confirm that I report for active duty on ${joiningDate} and agree to faithfully execute all assigned operational functions.`
              )}

              <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '12px' }}>
                <span>A TIGER GLOBAL Career Solution & Consultancy — Formal Joining Report Schedule</span>
                <span>Page 3 of 09</span>
              </div>
            </div>

            {/* SHEET 4: SELF DECLARATION (PDF Page 5) */}
            {renderSelfDeclarationSheet('Page 4 of 09')}

            {/* SHEET 5: DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PDF Page 6) */}
            {renderRelativeDeclarationSheet('Page 5 of 09')}

            {/* SHEET 6: TERMS & CONDITIONS OF EMPLOYMENT (PDF Page 7) */}
            {renderTermsAndConditionsSheet('Page 6 of 09')}

            {/* SHEET 7: CONTRACT APPOINTMENT LETTER (PDF Page 8) */}
            {renderContractAppointmentLetterSheet('Page 7 of 09')}

            {/* SHEET 8: EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING (PDF Page 9) */}
            {renderResignationDeclarationSheet('Page 8 of 09')}

            {/* SHEET 9: MASTER ATTESTATION & CORPORATE AUTHORIZATION SEAL */}
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
                {renderSheetHeader('PAGE 09 / 09 — MASTER ATTESTATION & CORPORATE AUTHORIZATION')}
                {renderCandidateDetailsBadge()}

                <div
                  style={{
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    padding: '8px',
                    fontWeight: 800,
                    fontSize: '12px',
                    letterSpacing: '0.4px',
                    marginBottom: '16px'
                  }}
                >
                  MASTER SUBMISSION ATTESTATION & STATUTORY AUTHORIZATION
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '4px',
                    padding: '16px 20px',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#1E40AF', marginBottom: '8px' }}>
                    {MASTER_ATTESTATION.title}
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', lineHeight: 1.7, color: '#1E3A8A' }}>
                    {MASTER_ATTESTATION.statement}
                  </p>
                  <div style={{ fontWeight: 700, fontSize: '11.5px', color: '#1E40AF' }}>
                    {MASTER_ATTESTATION.declarationAcknowledgeNote}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '11px', color: '#0F1B38', marginBottom: '4px' }}>
                    CORPORATE GOVERNANCE & AUTHENTICATION PROTOCOL:
                  </div>
                  <p style={{ margin: 0, fontSize: '10.5px', lineHeight: 1.55, color: '#64748B' }}>
                    This onboarding document constitutes an official corporate record. The digital signatures and seals inscribed below authenticate the formal induction of the candidate under the rules, guidelines, and statutory service codes of A TIGER GLOBAL Career Solution & Consultancy.
                  </p>
                </div>
              </div>

              {renderExecutionBlock(
                `I, the undersigned joining employee, solemnly affirm that the information furnished by me in this Joining Form and accompanying annexures is true, correct, and legally binding.`
              )}

              <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '12px' }}>
                <span>A TIGER GLOBAL Career Solution & Consultancy — Master Attestation & Governance Schedule</span>
                <span>Page 9 of 09</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
