// ==============================================================================
// File: src/components/admin/JoiningReview.tsx
// Description: Comprehensive Admin Review of Candidate Joining Dossier
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security:
//   - Clear distinction between CANDIDATE PROVIDED and ADMIN PROVIDED
//   - Sensitive PII masked by default (Aadhaar, PAN, Bank)
//   - Explicit secure unmasking action restricted to SUPER_ADMIN with audit log
// ==============================================================================

import React, { useState } from 'react';
import {
  User,
  MapPin,
  CreditCard,
  GraduationCap,
  Users,
  PhoneCall,
  FileCheck,
  Eye,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type {
  ApplicationRow,
  JoiningFormRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  DeclarationRow,
  CompanyRow
} from '../../types/database';
import { CompanyInformationEditor } from './CompanyInformationEditor';
import { AdminSensitiveRevealModal } from './AdminSensitiveRevealModal';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';

interface JoiningReviewProps {
  application: ApplicationRow;
  joiningForm: JoiningFormRow | null;
  education: EducationRecordRow[];
  family: FamilyDetailRow[];
  emergency: EmergencyContactRow[];
  declarations: DeclarationRow | null;
  companies: CompanyRow[];
  isSuperAdmin: boolean;
  canEditCompanyInfo: boolean;
  onRefresh: () => void;
  logActivity: (action: string, description: string, metadata?: Record<string, unknown>) => Promise<void>;
}

export const JoiningReview: React.FC<JoiningReviewProps> = ({
  application,
  joiningForm,
  education,
  family,
  emergency,
  declarations,
  companies,
  isSuperAdmin,
  canEditCompanyInfo,
  onRefresh,
  logActivity
}) => {
  const [revealSensitive, setRevealSensitive] = useState<boolean>(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState<boolean>(false);

  const isSubmitted = joiningForm?.submission_status === 'SUBMITTED';

  // Masking helpers
  const maskAadhaar = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return `•••• •••• ${clean.slice(-4)}`;
  };

  const maskPan = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.trim();
    if (clean.length <= 4) return clean;
    return `•••••${clean.slice(-4)}`;
  };

  const maskBank = (val: string | null | undefined): string => {
    if (!val) return '—';
    if (revealSensitive) return val;
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return `••••••••${clean.slice(-4)}`;
  };

  const handleConfirmReveal = async () => {
    const nextState = !revealSensitive;
    setRevealSensitive(nextState);

    if (nextState) {
      await logActivity(
        'SENSITIVE_DATA_VIEWED',
        'SUPER_ADMIN accessed unmasked statutory identification data (Aadhaar, PAN, Bank details).',
        { candidate_id: application.id, application_number: application.application_number }
      );
    }
  };

  return (
    <div>
      {/* Status & Security Control Banner */}
      <div
        className="admin-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: isSubmitted ? '#DCFCE7' : '#FEF3C7',
                color: isSubmitted ? '#166534' : '#92400E',
                border: isSubmitted ? '1px solid #86EFAC' : '1px solid #FDE68A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {isSubmitted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              <span>{joiningForm?.submission_status || 'NOT STARTED'}</span>
            </span>

            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
              CANDIDATE ONBOARDING DOSSIER
            </h2>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {isSubmitted ? (
              <>
                Submitted on{' '}
                <strong style={{ color: '#192A56' }}>
                  {joiningForm?.submitted_at
                    ? new Date(joiningForm.submitted_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
                    : 'Recorded'}
                </strong>{' '}
                • Locked for candidate edits
              </>
            ) : (
              'Candidate has not completed final submission yet.'
            )}
          </div>
        </div>

        {/* Sensitive Information Unmask Control (SUPER_ADMIN Only) */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsRevealModalOpen(true)}
            className={revealSensitive ? 'btn-admin-danger' : 'btn-admin-secondary'}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {revealSensitive ? <Lock size={14} /> : <Eye size={14} />}
            <span>{revealSensitive ? 'Re-mask Sensitive PII' : 'Reveal Sensitive PII'}</span>
          </button>
        )}
      </div>

      {/* 1. Admin / Company Information (Editable by Coordinator/SuperAdmin) */}
      <CompanyInformationEditor
        applicationId={application.id}
        joiningForm={joiningForm}
        companies={companies}
        canEdit={canEditCompanyInfo}
        onSaved={onRefresh}
        logActivity={logActivity}
      />

      {/* 2. Personal Information Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              01. Personal Information
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Employee Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{application.full_name}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Father's Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{application.father_name || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Mother / Husband Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.mother_or_husband_name || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Date of Birth</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.date_of_birth || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Gender</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.gender || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Marital Status</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.marital_status || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Spouse Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.spouse_name || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Blood Group</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{joiningForm?.blood_group || '—'}</div>
          </div>

          {/* Sensitive: Aadhaar */}
          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              Aadhaar Card Number {revealSensitive ? '(Unmasked)' : '(Masked)'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
              {maskAadhaar(joiningForm?.aadhaar_number)}
            </div>
          </div>

          {/* Sensitive: PAN */}
          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              PAN Number {revealSensitive ? '(Unmasked)' : '(Masked)'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
              {maskPan(joiningForm?.pan_number)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Mobile Contact</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
              {formatIndianPhoneNumber(joiningForm?.employee_contact_number || application.mobile)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Alternate Contact</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
              {joiningForm?.other_contact_number ? formatIndianPhoneNumber(joiningForm.other_contact_number) : '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.email || application.email}</div>
          </div>
        </div>
      </div>

      {/* 3. Address Information Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              02. Addresses
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Permanent Address */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Permanent Address
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
              {joiningForm?.permanent_address || application.address || '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.4rem' }}>
              {[joiningForm?.permanent_city, joiningForm?.permanent_district, joiningForm?.permanent_state, joiningForm?.permanent_pin_code]
                .filter(Boolean)
                .join(', ') || '—'}
            </div>
          </div>

          {/* Current Address */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Current / Present Address
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
              {joiningForm?.same_as_permanent
                ? 'Same as Permanent Address'
                : joiningForm?.current_address || '—'}
            </div>
            {!joiningForm?.same_as_permanent && (
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.4rem' }}>
                {[joiningForm?.current_city, joiningForm?.current_district, joiningForm?.current_state, joiningForm?.current_pin_code]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bank Information Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              03. Bank Information
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Account Holder Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{joiningForm?.bank_account_holder || application.full_name}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              Bank Account Number {revealSensitive ? '(Unmasked)' : '(Masked)'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
              {maskBank(joiningForm?.bank_account_number)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>IFSC Code</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>{joiningForm?.ifsc_code || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Bank Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.bank_name || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Branch Name</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.branch_name || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>UAN (PF Number)</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.uan || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>ESIC Number</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.esic_number || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>PT Number</div>
            <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>{joiningForm?.pt_number || '—'}</div>
          </div>
        </div>
      </div>

      {/* 5. Education History Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GraduationCap size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              04. Education Records ({education.length})
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        {education.length === 0 ? (
          <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1rem 0' }}>
            No education records submitted.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Qualification</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Board / University</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Passing Year</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Percentage / Grade</th>
                </tr>
              </thead>
              <tbody>
                {education.map((edu) => (
                  <tr key={edu.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>{edu.qualification}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{edu.board_university || '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{edu.year || '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{edu.percentage_or_grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Family Details Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              05. Family Details ({family.length})
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        {family.length === 0 ? (
          <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1rem 0' }}>
            No family details submitted.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Member Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Relation</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Age / Date of Birth</th>
                </tr>
              </thead>
              <tbody>
                {family.map((fam) => (
                  <tr key={fam.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>{fam.name}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{fam.relation}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{fam.age_or_date_of_birth || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Emergency Contacts Section */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PhoneCall size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              06. Emergency Contacts ({emergency.length})
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        {emergency.length === 0 ? (
          <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1rem 0' }}>
            No emergency contacts submitted.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Contact Person</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Relation</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Phone Number</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>Address</th>
                </tr>
              </thead>
              <tbody>
                {emergency.map((em) => (
                  <tr key={em.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#192A56' }}>{em.name}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{em.relation}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#192A56', fontWeight: 600 }}>{em.contact_number ? formatIndianPhoneNumber(em.contact_number) : '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{em.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. Declarations Section */}
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={18} color="#192A56" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              07. Statutory Declarations
            </h3>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            CANDIDATE PROVIDED
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: declarations?.candidate_acceptance ? '#DCFCE7' : '#FEE2E2', color: declarations?.candidate_acceptance ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {declarations?.candidate_acceptance ? '✓' : '✕'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              Truthfulness & Authenticity Declaration acknowledged by candidate.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: declarations?.background_check_consent ? '#DCFCE7' : '#FEE2E2', color: declarations?.background_check_consent ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {declarations?.background_check_consent ? '✓' : '✕'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              Consent for Background & Criminal Verification granted.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: declarations?.code_of_conduct_acceptance ? '#DCFCE7' : '#FEE2E2', color: declarations?.code_of_conduct_acceptance ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {declarations?.code_of_conduct_acceptance ? '✓' : '✕'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              Code of Conduct and Company Policies accepted.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Signatory Name: </span>
              <strong style={{ fontSize: '0.85rem', color: '#192A56' }}>{declarations?.signatory_name || application.full_name}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Declaration Date: </span>
              <strong style={{ fontSize: '0.85rem', color: '#192A56' }}>{declarations?.declaration_date || '—'}</strong>
            </div>

            {declarations?.accepted_at && (
              <div>
                <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Accepted At: </span>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{new Date(declarations.accepted_at).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sensitive PII Reveal Confirmation Modal */}
      <AdminSensitiveRevealModal
        isOpen={isRevealModalOpen}
        isRevealed={revealSensitive}
        onConfirm={handleConfirmReveal}
        onClose={() => setIsRevealModalOpen(false)}
      />
    </div>
  );
};
