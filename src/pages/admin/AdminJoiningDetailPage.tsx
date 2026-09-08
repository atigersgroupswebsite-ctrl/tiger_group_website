// ==============================================================================
// File: src/pages/admin/AdminJoiningDetailPage.tsx
// Description: Official Joining Paperwork Representation for Admin Joining Dossier
// Brand: A TIGER GROUPS — Verification & Dossier Governance
// Architecture:
//   - Canonical 14-page Joining Form representation matching candidate paperwork
//   - Zero generic dashboard cards
//   - Single source of truth: JoiningFormPrintPreview + JoiningFormData
//   - Official Joining Packet PDF download via downloadJoiningPacketPdf
//   - Direct Print action isolated via @media print
//   - ID Card & Reference Slips preserved as post-joining admin panels outside print
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Loader2
} from 'lucide-react';

import { JoiningFormPrintPreview } from '../../components/joining/JoiningFormPrintPreview';
import { EmployeeIdCardPanel } from '../../components/admin/EmployeeIdCardPanel';
import { ReferenceSlipApplicationTab } from '../../components/admin/ReferenceSlipApplicationTab';
import { getAdminJoiningDossier, type AdminJoiningDossierResult } from '../../services/joiningService';
import { downloadJoiningPacketPdf } from '../../services/joiningPdfGenerator';
import { getEmployeeByJoiningFormId } from '../../services/employeeService';
import type { EmployeeRow } from '../../types/database';
import type { JoiningFormData } from '../../types/joining';

export const AdminJoiningDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<JoiningFormData | null>(null);
  const [rawDossier, setRawDossier] = useState<AdminJoiningDossierResult['raw'] | null>(null);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadJoiningDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch normalized joining dossier using shared admin service
        const res = await getAdminJoiningDossier(id);

        if (!res.success || !res.data) {
          throw new Error(res.error || 'Joining record not found.');
        }

        if (!isMounted) return;
        setFormData(res.data.formData);
        setRawDossier(res.data.raw);

        // 2. Fetch linked Employee record if already promoted
        const formId = res.data.raw.joiningForm?.id || id;
        const empRecord = await getEmployeeByJoiningFormId(formId);
        if (empRecord && isMounted) {
          setEmployee(empRecord);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load joining record details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadJoiningDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handler: Download Official Joining Packet PDF
  const handleDownloadPdf = async () => {
    if (!formData) return;
    try {
      setIsDownloadingPdf(true);
      await downloadJoiningPacketPdf(formData);
    } catch (err: any) {
      console.error('Failed to download official joining packet:', err);
      alert('Unable to generate official joining PDF packet: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', background: '#FFFFFF', borderRadius: '12px' }}>
        <div className="admin-spinner" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: '#0F1B38', fontSize: '1.1rem', fontWeight: 800 }}>
          LOADING OFFICIAL JOINING DOSSIER
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
          Preparing canonical paperwork sheets and statutory credentials...
        </p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B' }}>
        <AlertCircle size={36} style={{ margin: '0 auto 0.75rem auto' }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>Unable to Open Dossier</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error || 'Submission not found.'}</p>
        <button
          onClick={() => navigate('/admin/joining')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0F1B38',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Return to Joining List
        </button>
      </div>
    );
  }

  const isSubmitted = formData.submissionStatus === 'SUBMITTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/joining')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Joining Register</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '0.8rem',
                backgroundColor: '#E2E8F0',
                color: '#0F1B38',
                padding: '3px 8px',
                borderRadius: '4px'
              }}
            >
              {formData.joiningReference || 'PENDING'}
            </span>

            {isSubmitted ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#15803D',
                  backgroundColor: '#DCFCE7',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <CheckCircle2 size={12} />
                <span>SUBMITTED</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#92400E',
                  backgroundColor: '#FEF3C7',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Clock size={12} />
                <span>DRAFT</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Print Action */}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-admin-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Print Official Form</span>
          </button>

          {/* Download Official PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-admin-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isDownloadingPdf ? <Loader2 size={15} className="admin-spinner-sm" /> : <Download size={15} />}
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL JOINING FORM (CANONICAL 14-PAGE PAPERWORK SHEETS)
          Single Source of Truth: JoiningFormPrintPreview
          ========================================================================= */}
      <JoiningFormPrintPreview
        formData={formData}
        isSubmitted={isSubmitted}
      />

      {/* =========================================================================
          POST-JOINING ADMINISTRATIVE GOVERNANCE PANELS (OUTSIDE JOINING PACKET)
          Marked with .no-print so they never contaminate the official form print
          ========================================================================= */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
        {/* Reference Slip & Consultancy Return */}
        {rawDossier?.joiningForm?.id && (
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginBottom: '1rem' }}>
              Reference Slip & Consultancy Return (Administrative)
            </h2>
            <ReferenceSlipApplicationTab joiningFormId={rawDossier.joiningForm.id} />
          </div>
        )}

        {/* Employee Identity Card Administration */}
        {rawDossier?.joiningForm?.id && (
          <EmployeeIdCardPanel
            joiningFormId={rawDossier.joiningForm.id}
            candidateName={formData.personal.employeeName}
            candidateEmail={formData.personal.emailId}
            candidateMobile={formData.personal.employeeContactNumber}
            bloodGroup={formData.personal.bloodGroup || null}
            emergencyContactName={formData.emergencyContacts[0]?.name || null}
            emergencyContactPhone={formData.emergencyContacts[0]?.contactNumber || null}
            emergencyContactRelation={formData.emergencyContacts[0]?.relation || null}
            photoUrl={rawDossier.signedPhotoUrl}
            signatureUrl={rawDossier.signedSigUrl}
            existingEmployee={employee}
            onEmployeeUpdated={(updatedEmp) => setEmployee(updatedEmp)}
          />
        )}
      </div>
    </div>
  );
};

