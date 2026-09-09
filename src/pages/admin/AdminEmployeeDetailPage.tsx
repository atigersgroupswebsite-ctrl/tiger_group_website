// ==============================================================================
// File: src/pages/admin/AdminEmployeeDetailPage.tsx
// Description: Operational Employee Detail & Identity Card Governance View
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Styling: Native Admin Panel Design System (Vanilla CSS, CSS Tokens, Custom Controls)
// Access:
//   - SUPER_ADMIN: Full Employee Governance, Status Changes & ID Card Operations
//   - COORDINATOR: Operational Employee Management, Status Changes & ID Card Operations
//   - DOCUMENT_VERIFIER: Read-Only Detail View
//   - ACCOUNTANT: Read-Only Detail View
// Security:
//   - Strict Candidate Isolation & Admin RLS Verification
//   - Sensitive KYC fields (Aadhaar, PAN, Bank IFSC/Account) excluded from operational view
//   - Non-destructive status changes (never deletes employee records on resignation/termination)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getEmployeeById,
  updateEmployee,
  updateEmploymentStatus,
  type EmployeeWithRelations
} from '../../services/employeeService';
import { getAllCompanies, type CompanyRow } from '../../services/companyService';
import { getEntityActivityLogs } from '../../services/activityService';
import { EmployeeIdCardPanel } from '../../components/admin/EmployeeIdCardPanel';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import type { ActivityLogRow, EmploymentStatus } from '../../types/database';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  ArrowLeft,
  Users,
  Building2,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck2,
  UserCheck,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';

const STATUS_CONFIG: Record<
  EmploymentStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  ACTIVE: {
    label: 'Active',
    color: '#166534',
    bg: '#DCFCE7',
    border: '#BBF7D0'
  },
  PROBATION: {
    label: 'Probation',
    color: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE'
  },
  ON_LEAVE: {
    label: 'On Leave',
    color: '#854D0E',
    bg: '#FEF9C3',
    border: '#FEF08A'
  },
  RESIGNED: {
    label: 'Resigned',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0'
  },
  TERMINATED: {
    label: 'Terminated',
    color: '#991B1B',
    bg: '#FEE2E2',
    border: '#FECACA'
  }
};

export const AdminEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Candidate context data for ID card
  const [bloodGroup, setBloodGroup] = useState<string>('—');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Status Change Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus>('ACTIVE');
  const [statusReason, setStatusReason] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editEmployeeCode, setEditEmployeeCode] = useState<string>('');
  const [editCandidateName, setEditCandidateName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editMobile, setEditMobile] = useState<string>('');
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editJoiningDate, setEditJoiningDate] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load Employee Master Record & Child Details
  const loadEmployeeDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [empRes, compRes, logs] = await Promise.all([
        getEmployeeById(id),
        getAllCompanies(),
        getEntityActivityLogs('EMPLOYEE', id)
      ]);

      if (!empRes.success || !empRes.employee) {
        throw new Error(empRes.error || 'Employee record not found.');
      }

      setEmployee(empRes.employee);
      setSelectedStatus(empRes.employee.employment_status);
      setActivityLogs(logs);

      if (compRes.success && compRes.data) {
        setCompanies(compRes.data);
      }

      // Populate Edit Modal fields
      setEditEmployeeCode(empRes.employee.employee_code || '');
      setEditCandidateName(empRes.employee.candidate_name || '');
      setEditEmail(empRes.employee.email || '');
      setEditMobile(empRes.employee.mobile || '');
      setEditCompanyId(empRes.employee.company_id || '');
      setEditDesignation(empRes.employee.designation || 'Associate');
      setEditDepartment(empRes.employee.department || 'Operations');
      setEditLocation(empRes.employee.location || 'Nagpur, Maharashtra');
      setEditJoiningDate(empRes.employee.joining_date || '');

      // Load Candidate Source Context for ID Card (Blood Group, Emergency Contact, Photo, Signature)
      if (isSupabaseConfigured) {
        if (empRes.employee.joining_form_id) {
          // Source: Standalone Joining Form
          const { data: jf } = await supabase
            .from('joining_forms')
            .select('*')
            .eq('id', empRes.employee.joining_form_id)
            .maybeSingle();

          if (jf) {
            if (jf.blood_group) setBloodGroup(jf.blood_group);
            if (jf.date_of_birth) setDob(jf.date_of_birth);
            if (jf.permanent_address) {
              const pa = jf.permanent_address as any;
              if (typeof pa === 'string') {
                setAddress(pa);
              } else if (typeof pa === 'object' && pa !== null) {
                setAddress([pa.address || pa.addressLine1 || pa.line1, pa.city, pa.district, pa.state, pa.pincode || pa.pinCode].filter(Boolean).join(', '));
              }
            }

            // Emergency contact
            const { data: emList } = await supabase
              .from('emergency_contacts')
              .select('*')
              .eq('joining_form_id', jf.id)
              .limit(1);

            if (emList && emList.length > 0) {
              setEmergencyContactName(emList[0].name || '');
              setEmergencyContactPhone(emList[0].contact_number || '');
              setEmergencyContactRelation(emList[0].relation || '');
            }

            // Signed URLs for photo and signature
            if (jf.photo_path) {
              const { data: pRes } = await supabase.storage
                .from('candidate-documents')
                .createSignedUrl(jf.photo_path, 3600);
              if (pRes?.signedUrl) setPhotoUrl(pRes.signedUrl);
            }
            if (jf.candidate_signature_path) {
              const { data: sRes } = await supabase.storage
                .from('candidate-documents')
                .createSignedUrl(jf.candidate_signature_path, 3600);
              if (sRes?.signedUrl) setSignatureUrl(sRes.signedUrl);
            }
          }
        } else if (empRes.employee.application_id) {
          // Source: Application-based
          const { data: docs } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', empRes.employee.application_id);

          if (docs && docs.length > 0) {
            const photoDoc = docs.find((d) => d.document_type === 'PHOTO');
            if (photoDoc?.storage_path) {
              const { data: pRes } = await supabase.storage
                .from('documents')
                .createSignedUrl(photoDoc.storage_path, 3600);
              if (pRes?.signedUrl) setPhotoUrl(pRes.signedUrl);
            }

            const sigDoc = docs.find((d) => d.document_type === 'SIGNATURE');
            if (sigDoc?.storage_path) {
              const { data: sRes } = await supabase.storage
                .from('documents')
                .createSignedUrl(sigDoc.storage_path, 3600);
              if (sRes?.signedUrl) setSignatureUrl(sRes.signedUrl);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[AdminEmployeeDetailPage] Load Error:', err);
      setError(err.message || 'Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEmployeeDetails();
  }, [loadEmployeeDetails]);

  // Handle Non-Destructive Employment Status Change
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      setStatusUpdating(true);
      const res = await updateEmploymentStatus(
        employee.id,
        selectedStatus,
        statusReason.trim(),
        user?.id
      );

      if (!res.success || !res.employee) {
        throw new Error(res.error || 'Failed to update employment status.');
      }

      setSuccessMessage(
        `Employment status successfully updated to ${selectedStatus} for ${employee.employee_code}.`
      );
      setIsStatusModalOpen(false);
      setStatusReason('');
      loadEmployeeDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle Operational Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await updateEmployee(
        employee.id,
        {
          employeeCode: editEmployeeCode.trim(),
          candidateName: editCandidateName.trim(),
          email: editEmail.trim(),
          mobile: editMobile.trim() || null,
          companyId: editCompanyId || null,
          designation: editDesignation.trim(),
          department: editDepartment.trim(),
          location: editLocation.trim(),
          joiningDate: editJoiningDate || null
        },
        user?.id
      );

      if (!res.success || !res.employee) {
        throw new Error(res.error || 'Failed to update employee details.');
      }

      setSuccessMessage(`Updated profile for ${res.employee.employee_code}.`);
      setIsEditModalOpen(false);
      loadEmployeeDetails();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update employee.');
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--color-champagne-dark)' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading employee record...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div style={{ padding: '3rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#DC2626', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginBottom: '0.5rem' }}>
          Employee Not Found
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {error || 'The requested employee record does not exist or has been modified.'}
        </p>
        <Link
          to={ADMIN_ROUTES.employees}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} /> Back to Employee Directory
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[employee.employment_status] || {
    label: employee.employment_status,
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb & Return Link */}
      <div>
        <Link
          to={ADMIN_ROUTES.employees}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-midnight-navy)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 700
          }}
        >
          <ArrowLeft size={16} />
          <span>BACK TO EMPLOYEES</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Users size={26} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
                {employee.candidate_name}
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: statusConfig.color,
                  backgroundColor: statusConfig.bg,
                  border: `1px solid ${statusConfig.border}`
                }}
              >
                {statusConfig.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F1B38' }}>
                {employee.employee_code}
              </span>
              <span>•</span>
              <span>{employee.designation || 'Associate'}</span>
              <span>•</span>
              <span>{employee.department || 'Operations'}</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        {canManage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8125rem',
                padding: '0.55rem 1rem'
              }}
            >
              <RefreshCw size={14} />
              <span>Change Status</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8125rem',
                padding: '0.6rem 1.15rem'
              }}
            >
              <Edit2 size={14} />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: Left Column (Profile & Origin) + Right Column (ID Card Panel) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Operational Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Operational Details Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.75rem'
              }}
            >
              <h2
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--color-midnight-navy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Users size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                Operational Master Profile
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                Created: {new Date(employee.created_at).toLocaleDateString()}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '1.25rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Employee Code
                </span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-midnight-navy)', marginTop: '0.2rem', display: 'block' }}>
                  {employee.employee_code}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Full Name
                </span>
                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem', marginTop: '0.2rem', display: 'block' }}>
                  {employee.candidate_name}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Designation
                </span>
                <span style={{ fontWeight: 600, color: '#334155', marginTop: '0.2rem', display: 'block' }}>
                  {employee.designation || 'Associate'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Department
                </span>
                <span style={{ fontWeight: 600, color: '#334155', marginTop: '0.2rem', display: 'block' }}>
                  {employee.department || 'Operations'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Assigned Company
                </span>
                {employee.company ? (
                  <Link
                    to={ADMIN_ROUTES.companyDetail(employee.company.id)}
                    style={{
                      color: 'var(--color-midnight-navy)',
                      textDecoration: 'none',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginTop: '0.2rem'
                    }}
                  >
                    <Building2 size={14} style={{ color: '#94A3B8' }} />
                    <span>{employee.company.name}</span>
                  </Link>
                ) : (
                  <span style={{ color: '#94A3B8', fontStyle: 'italic', marginTop: '0.2rem', display: 'block' }}>
                    Unassigned (Corporate Pool)
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Work Location
                </span>
                <span style={{ fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <MapPin size={14} style={{ color: '#94A3B8' }} />
                  <span>{employee.location || 'Nagpur, Maharashtra'}</span>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Joining Date
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <Calendar size={14} style={{ color: '#94A3B8' }} />
                  <span>{employee.joining_date || '—'}</span>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  ID Card Ledger Number
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem', color: '#166534', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.2rem' }}>
                  {employee.id_card_number || `IDC-${employee.employee_code}`}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Authoritative Email
                </span>
                <span style={{ fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <Mail size={14} style={{ color: '#94A3B8' }} />
                  <span>{employee.email || '—'}</span>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Contact Phone
                </span>
                <span style={{ fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <Phone size={14} style={{ color: '#94A3B8' }} />
                  <span>{employee.mobile ? formatIndianPhoneNumber(employee.mobile) : '—'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Candidate Source Dossier Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.75rem'
              }}
            >
              <h2
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--color-midnight-navy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                Candidate Source Relationship
              </h2>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.8125rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Origin Category:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                  {employee.joining_form_id ? 'Standalone Joining Candidate' : 'Application Candidate'}
                </span>
              </div>

              {employee.joining_form_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Joining Dossier:</span>
                  <Link
                    to={ADMIN_ROUTES.joiningDetail(employee.joining_form_id)}
                    style={{
                      fontWeight: 700,
                      color: '#92400E',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <FileCheck2 size={14} />
                    <span>{employee.joining_reference || 'View Joining Dossier'}</span>
                  </Link>
                </div>
              )}

              {employee.application_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Application Reference:</span>
                  <Link
                    to={ADMIN_ROUTES.applicationDetail(employee.application_id)}
                    style={{
                      fontWeight: 700,
                      color: '#1E40AF',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <UserCheck size={14} />
                    <span>{employee.application?.application_number || 'View Application'}</span>
                  </Link>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Identity Photo Specimen:</span>
                <span style={{ fontWeight: 700, color: photoUrl ? '#166534' : '#94A3B8' }}>
                  {photoUrl ? '✓ Available on record' : 'Pending upload'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Signature Specimen:</span>
                <span style={{ fontWeight: 700, color: signatureUrl ? '#166534' : '#94A3B8' }}>
                  {signatureUrl ? '✓ Available on record' : 'Pending upload'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Activity Logs Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.75rem'
              }}
            >
              <h2
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--color-midnight-navy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Activity size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                Employee Audit Trail
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {activityLogs.length} logged event(s)
              </span>
            </div>

            {activityLogs.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', margin: '1rem 0', fontStyle: 'italic' }}>
                No activity records logged for this employee yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-midnight-navy)', display: 'block' }}>
                        {log.action}
                      </span>
                      <p style={{ margin: '0.2rem 0 0 0', color: '#475569' }}>
                        {log.description}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                      <Clock size={11} />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Embedded Identity Card Panel */}
        <div>
          <EmployeeIdCardPanel
            applicationId={employee.application_id}
            joiningFormId={employee.joining_form_id}
            candidateName={employee.candidate_name || 'Employee'}
            candidateEmail={employee.email}
            candidateMobile={employee.mobile}
            bloodGroup={bloodGroup}
            emergencyContactName={emergencyContactName}
            emergencyContactPhone={emergencyContactPhone}
            emergencyContactRelation={emergencyContactRelation}
            dob={dob}
            address={address}
            photoUrl={photoUrl}
            signatureUrl={signatureUrl}
            existingEmployee={employee}
            onEmployeeUpdated={(updated) => {
              setEmployee((prev) => (prev ? { ...prev, ...updated } : (updated as EmployeeWithRelations)));
              loadEmployeeDetails();
            }}
          />
        </div>
      </div>

      {/* Status Change Modal */}
      {isStatusModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                UPDATE EMPLOYMENT STATUS
              </h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Target Employment Status *
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as EmploymentStatus)}
                  className="form-control form-select"
                  style={{ width: '100%' }}
                >
                  <option value="ACTIVE">ACTIVE — On regular duty</option>
                  <option value="PROBATION">PROBATION — Under evaluation</option>
                  <option value="ON_LEAVE">ON_LEAVE — Approved leave</option>
                  <option value="RESIGNED">RESIGNED — Voluntarily separated</option>
                  <option value="TERMINATED">TERMINATED — Involuntarily separated</option>
                </select>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  Status changes are strictly non-destructive. Resigned and Terminated records remain safely archived.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Administrative Reason / Notes
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Optional note explaining the status change"
                  rows={3}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={statusUpdating}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem', padding: '0.55rem 1.25rem' }}
                >
                  {statusUpdating ? 'Updating...' : 'Confirm Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                EDIT OPERATIONAL DETAILS
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  {editError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    value={editEmployeeCode}
                    onChange={(e) => setEditEmployeeCode(e.target.value)}
                    required
                    className="form-control"
                    style={{ fontWeight: 800, fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    value={editCandidateName}
                    onChange={(e) => setEditCandidateName(e.target.value)}
                    required
                    className="form-control"
                    style={{ fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Authoritative Email *
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Assigned Company
                </label>
                <select
                  value={editCompanyId}
                  onChange={(e) => setEditCompanyId(e.target.value)}
                  className="form-control form-select"
                  style={{ width: '100%' }}
                >
                  <option value="">-- Unassigned (General Corporate) --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.active ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Work Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={editJoiningDate}
                    onChange={(e) => setEditJoiningDate(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editSubmitting}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem', padding: '0.55rem 1.25rem' }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
