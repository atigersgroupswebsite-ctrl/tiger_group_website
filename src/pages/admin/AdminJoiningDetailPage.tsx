// ==============================================================================
// File: src/pages/admin/AdminJoiningDetailPage.tsx
// Description: Admin detailed inspection and document review of a Joining Submission
// Brand: A TIGER GROUPS — Verification & Dossier Governance
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  MapPin,
  Phone,
  CreditCard,
  GraduationCap,
  Users,
  FileSignature,
  AlertCircle,
  Calendar,
  Mail,
  Printer
} from 'lucide-react';

import { EmployeeIdCardPanel } from '../../components/admin/EmployeeIdCardPanel';
import { ReferenceSlipApplicationTab } from '../../components/admin/ReferenceSlipApplicationTab';
import { getEmployeeByJoiningFormId } from '../../services/employeeService';
import type { EmployeeRow } from '../../types/database';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';

export const AdminJoiningDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<any>(null);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [emergency, setEmergency] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [family, setFamily] = useState<any[]>([]);
  const [declarations, setDeclarations] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadJoiningDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Master Joining Form
        const { data: formData, error: formErr } = await supabase
          .from('joining_forms')
          .select('*')
          .eq('id', id)
          .single();

        if (formErr || !formData) {
          throw new Error(formErr?.message || 'Joining record not found.');
        }

        if (!isMounted) return;
        setForm(formData);

        // 2. Fetch Child Records in Parallel
        const [emRes, eduRes, famRes, decRes] = await Promise.all([
          supabase.from('emergency_contacts').select('*').eq('joining_form_id', id),
          supabase.from('education_records').select('*').eq('joining_form_id', id),
          supabase.from('family_details').select('*').eq('joining_form_id', id),
          supabase.from('declarations').select('*').eq('joining_form_id', id).maybeSingle()
        ]);

        if (emRes.data) setEmergency(emRes.data);
        if (eduRes.data) setEducation(eduRes.data);
        if (famRes.data) setFamily(famRes.data);
        if (decRes.data) setDeclarations(decRes.data);

        // 3. Create signed URLs for secure private photo and signature
        const photoPath = (formData as any).photo_storage_path;
        if (photoPath) {
          const { data: photoData } = await supabase.storage
            .from('candidate-documents')
            .createSignedUrl(photoPath, 3600);
          if (photoData?.signedUrl && isMounted) {
            setPhotoUrl(photoData.signedUrl);
          }
        }

        const signaturePath = (formData as any).signature_storage_path;
        if (signaturePath) {
          const { data: sigData } = await supabase.storage
            .from('candidate-documents')
            .createSignedUrl(signaturePath, 3600);
          if (sigData?.signedUrl && isMounted) {
            setSignatureUrl(sigData.signedUrl);
          }
        }

        // 4. Fetch linked Employee record if already promoted
        const empRecord = await getEmployeeByJoiningFormId(id);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', background: '#FFFFFF', borderRadius: '12px' }}>
        <div className="admin-spinner" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: '#0F1B38', fontSize: '1.1rem', fontWeight: 800 }}>
          LOADING JOINING DOSSIER
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
          Loading candidate submissions and security credentials...
        </p>
      </div>
    );
  }

  if (error || !form) {
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

  const isSubmitted = form.submission_status === 'SUBMITTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            color: '#0F1B38',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Printer size={15} />
          <span>Print Dossier</span>
        </button>
      </div>

      {/* Header Profile Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Photo Preview */}
          <div
            style={{
              width: '80px',
              height: '95px',
              borderRadius: '6px',
              border: '2px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Candidate Photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.7rem' }}>
                <User size={24} style={{ margin: '0 auto 0.2rem auto' }} />
                <span>No Photo</span>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  backgroundColor: '#E2E8F0',
                  color: '#0F1B38',
                  padding: '2px 7px',
                  borderRadius: '4px'
                }}
              >
                {form.joining_reference || 'PENDING'}
              </span>
              {isSubmitted ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '12px' }}>
                  SUBMITTED
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '12px' }}>
                  DRAFT
                </span>
              )}
            </div>

            <h1 style={{ margin: '0.2rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>
              {form.candidate_name || 'Candidate Dossier'}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.825rem', color: '#64748B', marginTop: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={13} />
                <span>{form.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={13} />
                <span>{form.employee_contact_number ? formatIndianPhoneNumber(form.employee_contact_number) : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} />
                <span>Submitted: {form.submitted_at ? new Date(form.submitted_at).toLocaleString() : 'Draft'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* 1. EMPLOYEE PERSONAL INFORMATION */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <User size={16} style={{ color: '#C5A880' }} />
            <span>EMPLOYEE PERSONAL INFORMATION</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Employee Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.candidate_name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Date of Birth</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.date_of_birth || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Gender</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.gender || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Father Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.father_name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Mother / Husband Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.mother_or_husband_name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Marital Status</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.marital_status || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Spouse Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.spouse_name || 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Blood Group</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.blood_group || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Aadhaar Number</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>
                {form.aadhaar_number ? `•••• •••• ${form.aadhaar_number.slice(-4)}` : '—'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>PAN Number</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>
                {form.pan_number || '—'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Contact Number</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.employee_contact_number ? formatIndianPhoneNumber(form.employee_contact_number) : '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Email Address</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.email || '—'}</div>
            </div>
          </div>
        </div>

        {/* 2. ADDRESS DETAILS */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <MapPin size={16} style={{ color: '#C5A880' }} />
            <span>ADDRESS PARTICULARS</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase' }}>Permanent Address</span>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                {form.permanent_address || 'No address provided.'}<br />
                {form.permanent_city && `${form.permanent_city}, `}
                {form.permanent_district && `${form.permanent_district}, `}
                {form.permanent_state} — {form.permanent_pin_code}
              </p>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F1B38', textTransform: 'uppercase' }}>Current Address</span>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                {form.same_as_permanent ? (
                  <em>Same as Permanent Address</em>
                ) : (
                  <>
                    {form.current_address || 'No current address provided.'}<br />
                    {form.current_city && `${form.current_city}, `}
                    {form.current_district && `${form.current_district}, `}
                    {form.current_state} — {form.current_pin_code}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 3. EMERGENCY FAMILY CONTACT */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <Phone size={16} style={{ color: '#C5A880' }} />
            <span>EMERGENCY FAMILY CONTACTS</span>
          </h2>
          {emergency.length === 0 ? (
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>No emergency contacts specified.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Contact</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Relation</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {emergency.map((em, idx) => (
                    <tr key={em.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{em.name}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{formatIndianPhoneNumber(em.contact_number)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{em.relation}</td>
                      <td style={{ padding: '0.6rem 0.8rem', color: '#64748B' }}>{em.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. BANK DETAILS */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <CreditCard size={16} style={{ color: '#C5A880' }} />
            <span>BANK DETAILS</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Account Holder</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.bank_account_holder || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Account Number</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>
                {form.bank_account_number ? `•••• •••• ${form.bank_account_number.slice(-4)}` : '—'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>IFSC Code</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>{form.ifsc_code || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Bank Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.bank_name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Branch Name</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.branch_name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>UAN (PF Number)</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>{form.uan || 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>ESIC IP Number</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'monospace' }}>{form.esic_number || 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Professional Tax (PT)</span>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{form.pt_applicable ? 'Enrolled' : 'Not Applicable'}</div>
            </div>
          </div>
        </div>

        {/* 5. EDUCATION & QUALIFICATION */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <GraduationCap size={16} style={{ color: '#C5A880' }} />
            <span>EDUCATION & QUALIFICATIONS</span>
          </h2>
          {education.length === 0 ? (
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>No education records entered.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Qualification</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Board / University</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Year</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Percentage / Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {education.map((edu, idx) => (
                    <tr key={edu.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{edu.qualification}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{edu.board_or_university}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{edu.year_of_passing}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{edu.percentage_or_grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. FAMILY DETAILS */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <Users size={16} style={{ color: '#C5A880' }} />
            <span>FAMILY COMPOSITION</span>
          </h2>
          {family.length === 0 ? (
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>No family particulars entered.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Member Name</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Relation</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Age / Date of Birth</th>
                  </tr>
                </thead>
                <tbody>
                  {family.map((fam, idx) => (
                    <tr key={fam.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{fam.name}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{fam.relation}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{fam.age_or_date_of_birth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 7. SPECIMEN SIGNATURE & DECLARATIONS */}
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1B38', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.6rem' }}>
            <FileSignature size={16} style={{ color: '#C5A880' }} />
            <span>SIGNATURE & DECLARATIONS</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: declarations?.candidate_acceptance ? '#16A34A' : '#94A3B8' }} />
                  <span>Joining Undertaking: <strong>{declarations?.candidate_acceptance ? 'Acknowledged' : 'Pending'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: declarations?.code_of_conduct_acceptance ? '#16A34A' : '#94A3B8' }} />
                  <span>Code of Conduct: <strong>{declarations?.code_of_conduct_acceptance ? 'Accepted' : 'Pending'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: declarations?.background_check_consent ? '#16A34A' : '#94A3B8' }} />
                  <span>Aadhaar/KYC Consent: <strong>{declarations?.background_check_consent ? 'Consented' : 'Pending'}</strong></span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748B' }}>
                  Signatory: <strong>{declarations?.signatory_name || form.candidate_name}</strong> | Date: <strong>{declarations?.declaration_date || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Specimen Signature Box */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                Candidate Specimen Signature
              </span>
              <div
                style={{
                  display: 'inline-block',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#F8FAFC',
                  minWidth: '200px',
                  minHeight: '80px'
                }}
              >
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Candidate Signature"
                    style={{ maxHeight: '70px', maxWidth: '240px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: '0.8rem', padding: '1.25rem 0' }}>
                    No Signature Uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 6. REFERENCE SLIP & CONSULTANCY RETURN */}
        {form && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginBottom: '1rem' }}>
              Reference Slip & Consultancy Return
            </h2>
            <ReferenceSlipApplicationTab joiningFormId={form.id} />
          </div>
        )}

        {/* 7. EMPLOYEE IDENTITY CARD & ADMINISTRATION */}
        {form && (
          <EmployeeIdCardPanel
            joiningFormId={form.id}
            candidateName={form.candidate_name || 'Candidate'}
            candidateEmail={form.email}
            candidateMobile={form.employee_contact_number}
            bloodGroup={form.blood_group || null}
            emergencyContactName={emergency[0]?.name || null}
            emergencyContactPhone={emergency[0]?.contact_number || null}
            emergencyContactRelation={emergency[0]?.relation || null}
            photoUrl={photoUrl}
            signatureUrl={signatureUrl}
            existingEmployee={employee}
            onEmployeeUpdated={(updatedEmp) => setEmployee(updatedEmp)}
          />
        )}
      </div>
    </div>
  );
};
