// ==============================================================================
// File: src/components/admin/EmployeeDocumentsPanel.tsx
// Description: Comprehensive Document Section for Employees & Regular Joining Records
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Items:
//   1. Employee Reference Slip (View, Download, Print)
//   2. Complete Joining Form with Undertaking (View, Download, Print)
//   3. Employee Declaration (View, Download, Print)
//   4. Live Photo (Preview, View, Download)
//   5. Aadhaar Card Photo (Preview, View, Download)
//   6. Bank Passbook Photo (Preview, View, Download)
//   7. Signature Photo (Preview, View, Download)
//   8. Employee ID Card (View, Download, Print / Generate)
// Security:
//   - Sensitive KYC protected
//   - Clear badges when unuploaded/pending (no misleading download buttons)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  CreditCard,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Loader2,
  X,
  FileBadge2,
  Lock,
  RefreshCw
} from 'lucide-react';
import type { RegularJoiningFormData, RegularJoiningDocItem } from '../../services/regularJoiningService';
import { downloadRegularReferenceSlipPdf } from '../../services/regularReferenceSlipPdfGenerator';
import {
  downloadCompleteJoiningDocumentPdf,
  downloadEmployeeDeclarationPdf
} from '../../services/completeJoiningDocumentGenerator';
import { CompleteJoiningDocumentModal } from './CompleteJoiningDocumentModal';
import { RegularReferenceSlipModal } from './RegularReferenceSlipModal';
import { generateAndPersistEmployeeIdCard } from '../../services/employeeIdCardGenerator';
import type { EmployeeRow } from '../../types/database';
import {
  getActiveCompanySignatureSignedUrl,
  getActiveCompanyStampSignedUrl
} from '../../services/companySignatureService';

interface EmployeeDocumentsPanelProps {
  employeeCode: string;
  formData: RegularJoiningFormData;
  employee?: EmployeeRow | null;
  companySignatureUrl?: string | null;
  companyStampUrl?: string | null;
  verifierName?: string;
  onRefresh?: () => Promise<void> | void;
}

export const EmployeeDocumentsPanel: React.FC<EmployeeDocumentsPanelProps> = ({
  employeeCode,
  formData,
  employee,
  companySignatureUrl,
  companyStampUrl,
  verifierName = 'Authorized Administrator',
  onRefresh
}) => {
  // Modal states
  const [isCompleteDocModalOpen, setIsCompleteDocModalOpen] = useState<boolean>(false);
  const [completeDocModalMode, setCompleteDocModalMode] = useState<'all' | 'official_5'>('all');
  const [isReferenceSlipModalOpen, setIsReferenceSlipModalOpen] = useState<boolean>(false);
  const [inspectDoc, setInspectDoc] = useState<{ title: string; url: string; badge?: string } | null>(null);

  // Active Company Stamp & Signature URLs
  const [activeCompanySig, setActiveCompanySig] = useState<string | null>(companySignatureUrl || null);
  const [activeCompanyStamp, setActiveCompanyStamp] = useState<string | null>(companyStampUrl || null);

  useEffect(() => {
    if (companySignatureUrl) setActiveCompanySig(companySignatureUrl);
    if (companyStampUrl) setActiveCompanyStamp(companyStampUrl);

    if (!companySignatureUrl || !companyStampUrl) {
      let isMounted = true;
      Promise.all([
        !companySignatureUrl ? getActiveCompanySignatureSignedUrl().catch(() => null) : Promise.resolve(companySignatureUrl),
        !companyStampUrl ? getActiveCompanyStampSignedUrl().catch(() => null) : Promise.resolve(companyStampUrl)
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
  }, [companySignatureUrl, companyStampUrl]);

  // Download processing states
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const candidateName = formData.fullName || employee?.candidate_name || 'Candidate';
  const hasLivePhoto = Boolean(formData.photo?.dataUrl || formData.photo?.storagePath);
  const hasAadhaar = Boolean(formData.aadhaar?.dataUrl || formData.aadhaar?.storagePath);
  const hasBankPassbook = Boolean(formData.bankPassbook?.dataUrl || formData.bankPassbook?.storagePath);
  const hasSignature = Boolean(formData.signature?.dataUrl || formData.signature?.storagePath);
  const hasIdCard = Boolean(employee?.id_card_number || employee?.id);

  // Helper: Trigger file download for an image data URL / HTTP URL
  const triggerFileDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 1. Download Reference Slip
  const handleDownloadRefSlip = async () => {
    try {
      setDownloadingItem('ref-slip');
      setActionError(null);
      const res = await downloadRegularReferenceSlipPdf(formData, {
        companySignatureUrlOrData: activeCompanySig,
        companyStampUrlOrData: activeCompanyStamp,
        verifierName
      });
      if (res.success) {
        setActionSuccess(`Downloaded Employee Reference Slip (${res.fileName})`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || 'Failed to download Reference Slip');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error downloading reference slip');
    } finally {
      setDownloadingItem(null);
    }
  };

  // 2. Download Complete Joining Document
  const handleDownloadCompleteDoc = async () => {
    try {
      setDownloadingItem('complete-doc');
      setActionError(null);
      const res = await downloadCompleteJoiningDocumentPdf(formData, {
        companySignatureUrl: activeCompanySig,
        companyStampUrl: activeCompanyStamp,
        verifierName
      });
      if (res.success) {
        setActionSuccess(`Downloaded Complete Joining Document (${res.fileName})`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || 'Failed to download Complete Joining Document');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error downloading complete joining document');
    } finally {
      setDownloadingItem(null);
    }
  };

  // 3. Download Employee Declaration
  const handleDownloadDeclaration = async () => {
    try {
      setDownloadingItem('declaration');
      setActionError(null);
      const res = await downloadEmployeeDeclarationPdf(formData, {
        companySignatureUrl: activeCompanySig,
        companyStampUrl: activeCompanyStamp,
        verifierName
      });
      if (res.success) {
        setActionSuccess(`Downloaded Employee Declaration (${res.fileName})`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || 'Failed to download Declaration');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error downloading declaration');
    } finally {
      setDownloadingItem(null);
    }
  };

  // 4. Download Image Documents
  const handleDownloadImage = (doc: RegularJoiningDocItem | null, defaultName: string) => {
    if (!doc?.dataUrl) return;
    const sanitizedCode = employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = doc.dataUrl.includes('png') ? 'png' : 'jpg';
    triggerFileDownload(doc.dataUrl, `${sanitizedCode}-${sanitizedName}-${defaultName}.${ext}`);
  };

  // 8. Download / Generate Employee ID Card
  const handleDownloadIdCard = async () => {
    if (!employee?.id) {
      setActionError('Employee record must be verified before ID Card can be downloaded.');
      return;
    }
    try {
      setDownloadingItem('id-card');
      setActionError(null);
      const res = await generateAndPersistEmployeeIdCard({
        employeeId: employee.id,
        employeeCode,
        employeeName: candidateName,
        designation: formData.designation || employee.designation || 'Associate',
        department: formData.department || employee.department || 'Operations',
        location: formData.unitName || employee.location || 'Nagpur, Maharashtra',
        issuanceDate: formData.joiningDate || employee.joining_date || undefined,
        photoUrlOrData: formData.photo?.storagePath || formData.photo?.dataUrl,
        signatureUrlOrData: formData.signature?.storagePath || formData.signature?.dataUrl
      });

      if (res && res.blob) {
        const url = URL.createObjectURL(res.blob);
        triggerFileDownload(url, res.fileName || `${employeeCode}-ID-Card.pdf`);
        URL.revokeObjectURL(url);
        setActionSuccess(`Downloaded Employee ID Card (${res.fileName})`);
        setTimeout(() => setActionSuccess(null), 4000);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setActionError('Failed to generate ID Card.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error generating ID Card');
    } finally {
      setDownloadingItem(null);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              backgroundColor: '#0F1B38',
              color: '#C5A059',
              padding: '0.6rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38' }}>
                Employee Documents Repository
              </h3>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  backgroundColor: '#0F1B38',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                {employeeCode}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Statutory onboarded paperwork, identity proofs, photo specimens & official ID credentials for{' '}
              <strong style={{ color: '#0F1B38' }}>{candidateName}</strong>
            </p>
          </div>
        </div>

        {/* Actions: Refresh and Download Complete Joining Document */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              title="Refresh repository documents status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.6rem 0.85rem',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCompleteDoc}
            disabled={downloadingItem === 'complete-doc'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.15rem',
              backgroundColor: '#C5A059',
              color: '#0F1B38',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: downloadingItem === 'complete-doc' ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(197, 160, 89, 0.25)'
            }}
          >
            {downloadingItem === 'complete-doc' ? (
              <Loader2 size={16} className="admin-spinner" />
            ) : (
              <Download size={16} />
            )}
            <span>Download Complete Joining Document</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            color: '#065F46',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            color: '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Documents Grid: 8 Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1.15rem'
        }}
      >
        {/* ================================================================== */}
        {/* ITEM 1: EMPLOYEE REFERENCE SLIP                                    */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <FileCheck2 size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>1. Reference Slip</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                1-PAGE A4
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
              Official candidate deployment reference slip with interview & joining coordinates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsReferenceSlipModalOpen(true)}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <Eye size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadRefSlip}
              disabled={downloadingItem === 'ref-slip'}
              style={{
                flex: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#0F1B38',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: downloadingItem === 'ref-slip' ? 'not-allowed' : 'pointer'
              }}
            >
              {downloadingItem === 'ref-slip' ? <Loader2 size={13} className="admin-spinner" /> : <Download size={13} />}
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 2: COMPLETE JOINING FORM WITH UNDERTAKING                     */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #C5A059',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FCFAF6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(197, 160, 89, 0.1)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <FileBadge2 size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>2. Complete Joining Form</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#92400E',
                  backgroundColor: '#FEF3C7',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                MULTI-PAGE A4
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
              Includes Sections A to H with original undertaking, declarations, photos, and signatures.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid rgba(197, 160, 89, 0.3)', paddingTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setCompleteDocModalMode('all');
                setIsCompleteDocModalOpen(true);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <Eye size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCompleteDoc}
              disabled={downloadingItem === 'complete-doc'}
              style={{
                flex: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#C5A059',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#0F1B38',
                cursor: downloadingItem === 'complete-doc' ? 'not-allowed' : 'pointer'
              }}
            >
              {downloadingItem === 'complete-doc' ? <Loader2 size={13} className="admin-spinner" /> : <Download size={13} />}
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 3: 5 OFFICIAL JOINING DECLARATIONS                            */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <ShieldCheck size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>3. Official Joining Declarations</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                5 A4 PAGES
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
              Reproduces the 5 official joining documents: Self Declaration, Relatives Declaration, Terms & Conditions, Contract Appointment Letter, Resignation Declaration.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setCompleteDocModalMode('official_5');
                setIsCompleteDocModalOpen(true);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <Eye size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDeclaration}
              disabled={downloadingItem === 'declaration'}
              style={{
                flex: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#0F1B38',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: downloadingItem === 'declaration' ? 'not-allowed' : 'pointer'
              }}
            >
              {downloadingItem === 'declaration' ? <Loader2 size={13} className="admin-spinner" /> : <Download size={13} />}
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 4: LIVE PHOTO                                                 */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <Camera size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>4. Live Photo</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: hasLivePhoto ? '#047857' : '#DC2626',
                  backgroundColor: hasLivePhoto ? '#ECFDF5' : '#FEF2F2',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {hasLivePhoto ? 'UPLOADED' : 'NOT UPLOADED'}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div
              style={{
                height: '75px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '0.75rem'
              }}
            >
              {formData.photo?.dataUrl ? (
                <img
                  src={formData.photo.dataUrl}
                  alt="Candidate Live Photo"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>No Preview</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              disabled={!hasLivePhoto}
              onClick={() => {
                if (formData.photo?.dataUrl) {
                  setInspectDoc({ title: 'Candidate Live Passport Photo', url: formData.photo.dataUrl });
                }
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasLivePhoto ? '#334155' : '#94A3B8',
                cursor: hasLivePhoto ? 'pointer' : 'not-allowed'
              }}
            >
              <Eye size={13} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              disabled={!hasLivePhoto}
              onClick={() => handleDownloadImage(formData.photo, 'Live-Photo')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: hasLivePhoto ? '#0F1B38' : '#F1F5F9',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasLivePhoto ? '#FFFFFF' : '#94A3B8',
                cursor: hasLivePhoto ? 'pointer' : 'not-allowed'
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 5: AADHAAR CARD PHOTO                                         */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <Lock size={16} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>5. Aadhaar Card</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: hasAadhaar ? '#047857' : '#DC2626',
                  backgroundColor: hasAadhaar ? '#ECFDF5' : '#FEF2F2',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {hasAadhaar ? 'UPLOADED' : 'NOT UPLOADED'}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div
              style={{
                height: '75px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '0.75rem'
              }}
            >
              {formData.aadhaar?.dataUrl ? (
                <img
                  src={formData.aadhaar.dataUrl}
                  alt="Aadhaar Card"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>No Preview</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              disabled={!hasAadhaar}
              onClick={() => {
                if (formData.aadhaar?.dataUrl) {
                  setInspectDoc({ title: 'Aadhaar Card Photo (Confidential)', url: formData.aadhaar.dataUrl, badge: 'KYC Document' });
                }
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasAadhaar ? '#334155' : '#94A3B8',
                cursor: hasAadhaar ? 'pointer' : 'not-allowed'
              }}
            >
              <Eye size={13} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              disabled={!hasAadhaar}
              onClick={() => handleDownloadImage(formData.aadhaar, 'Aadhaar-Card')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: hasAadhaar ? '#0F1B38' : '#F1F5F9',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasAadhaar ? '#FFFFFF' : '#94A3B8',
                cursor: hasAadhaar ? 'pointer' : 'not-allowed'
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 6: BANK PASSBOOK PHOTO                                        */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <Lock size={16} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>6. Bank Passbook</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: hasBankPassbook ? '#047857' : '#DC2626',
                  backgroundColor: hasBankPassbook ? '#ECFDF5' : '#FEF2F2',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {hasBankPassbook ? 'UPLOADED' : 'NOT UPLOADED'}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div
              style={{
                height: '75px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '0.75rem'
              }}
            >
              {formData.bankPassbook?.dataUrl ? (
                <img
                  src={formData.bankPassbook.dataUrl}
                  alt="Bank Passbook"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>No Preview</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              disabled={!hasBankPassbook}
              onClick={() => {
                if (formData.bankPassbook?.dataUrl) {
                  setInspectDoc({ title: 'Bank Passbook / Cheque (Restricted)', url: formData.bankPassbook.dataUrl, badge: 'Banking Document' });
                }
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasBankPassbook ? '#334155' : '#94A3B8',
                cursor: hasBankPassbook ? 'pointer' : 'not-allowed'
              }}
            >
              <Eye size={13} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              disabled={!hasBankPassbook}
              onClick={() => handleDownloadImage(formData.bankPassbook, 'Bank-Passbook')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: hasBankPassbook ? '#0F1B38' : '#F1F5F9',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasBankPassbook ? '#FFFFFF' : '#94A3B8',
                cursor: hasBankPassbook ? 'pointer' : 'not-allowed'
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 7: SIGNATURE PHOTO                                            */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <ImageIcon size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>7. Signature Photo</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: hasSignature ? '#047857' : '#DC2626',
                  backgroundColor: hasSignature ? '#ECFDF5' : '#FEF2F2',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {hasSignature ? 'UPLOADED' : 'NOT UPLOADED'}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div
              style={{
                height: '75px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '0.75rem'
              }}
            >
              {formData.signature?.dataUrl ? (
                <img
                  src={formData.signature.dataUrl}
                  alt="Candidate Signature"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>No Preview</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <button
              type="button"
              disabled={!hasSignature}
              onClick={() => {
                if (formData.signature?.dataUrl) {
                  setInspectDoc({ title: 'Candidate Specimen Signature', url: formData.signature.dataUrl });
                }
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasSignature ? '#334155' : '#94A3B8',
                cursor: hasSignature ? 'pointer' : 'not-allowed'
              }}
            >
              <Eye size={13} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              disabled={!hasSignature}
              onClick={() => handleDownloadImage(formData.signature, 'Signature')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: hasSignature ? '#0F1B38' : '#F1F5F9',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hasSignature ? '#FFFFFF' : '#94A3B8',
                cursor: hasSignature ? 'pointer' : 'not-allowed'
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ITEM 8: EMPLOYEE ID CARD                                           */}
        {/* ================================================================== */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F1B38' }}>
                <CreditCard size={18} style={{ color: '#C5A059' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>8. Employee ID Card</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: hasIdCard ? '#047857' : '#92400E',
                  backgroundColor: hasIdCard ? '#ECFDF5' : '#FEF3C7',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {hasIdCard ? 'READY' : 'PENDING'}
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
              PVC Identity badge (Front & Back) with official consultancy branding and QR clearance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            {hasIdCard ? (
              <button
                type="button"
                onClick={handleDownloadIdCard}
                disabled={downloadingItem === 'id-card'}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: '#0F1B38',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: downloadingItem === 'id-card' ? 'not-allowed' : 'pointer'
                }}
              >
                {downloadingItem === 'id-card' ? <Loader2 size={13} className="admin-spinner" /> : <Download size={13} />}
                <span>Download ID Card PDF</span>
              </button>
            ) : (
              <div
                style={{
                  width: '100%',
                  textAlign: 'center',
                  padding: '0.35rem',
                  fontSize: '0.72rem',
                  color: '#92400E',
                  backgroundColor: '#FFFBEB',
                  borderRadius: '4px',
                  border: '1px dashed #FCD34D',
                  fontWeight: 600
                }}
              >
                Generate via ID Cards Section
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* 1. Reference Slip Modal */}
      <RegularReferenceSlipModal
        isOpen={isReferenceSlipModalOpen}
        onClose={() => setIsReferenceSlipModalOpen(false)}
        formData={formData}
        companySignatureUrl={activeCompanySig}
        companyStampUrl={activeCompanyStamp}
        verifierName={verifierName}
      />

      {/* 2. Complete Joining Document & Official Declarations Modal */}
      <CompleteJoiningDocumentModal
        isOpen={isCompleteDocModalOpen}
        onClose={() => setIsCompleteDocModalOpen(false)}
        formData={formData}
        companySignatureUrl={activeCompanySig}
        companyStampUrl={activeCompanyStamp}
        verifierName={verifierName}
        initialMode={completeDocModalMode}
      />

      {/* 3. Lightbox Inspection Modal */}
      {inspectDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C5A059' }}>
                  {inspectDoc.title}
                </span>
                {inspectDoc.badge && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      backgroundColor: 'rgba(197, 160, 89, 0.2)',
                      color: '#C5A059',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {inspectDoc.badge}
                  </span>
                )}
              </div>
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
    </div>
  );
};
