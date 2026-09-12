// ==============================================================================
// File: src/pages/admin/AdminCompanyDetailPage.tsx
// Description: Company Detail View with Linked Jobs & Employee Deployments
// Brand: A Tiger Group's — Enterprise Ecosystem & Partner Plant Profile
// Security:
//   - Role-gated actions for SUPER_ADMIN and COORDINATOR
//   - Sensitive candidate PII (Aadhaar, PAN, Bank) strictly excluded from employee lists
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getCompanyById,
  updateCompany,
  setCompanyActive,
  getCompanyJobs,
  getCompanyEmployees,
  deleteCompanyPermanently,
  type CompanyRow,
  type JobRow,
  type EmployeeRow,
  type UpdateCompanyInput
} from '../../services/companyService';
import { getEntityActivityLogs } from '../../services/activityService';
import type { ActivityLogRow, CompanyType } from '../../types/database';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  Building2,
  ArrowLeft,
  Edit2,
  Trash2,
  Power,
  MapPin,
  Briefcase,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { normalizeIndianPhoneNumber, formatIndianPhoneNumber } from '../../utils/phoneUtils';


const COMPANY_TYPE_CONFIG: Record<CompanyType, { label: string; color: string; bg: string; border: string }> = {
  GROUP_BUSINESS: {
    label: "A Tiger Group's Business",
    color: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE'
  },
  EMPLOYER_PARTNER: {
    label: 'Employer Partner',
    color: '#86198F',
    bg: '#FDF4FF',
    border: '#F5D0FE'
  },
  OTHER: {
    label: 'Other Facility / Client',
    color: '#475569',
    bg: '#F8FAFC',
    border: '#E2E8F0'
  }
};

export const AdminCompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [confirmNameInput, setConfirmNameInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<CompanyType>('EMPLOYER_PARTNER');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toggle status loading state
  const [toggling, setToggling] = useState<boolean>(false);

  // Handle Permanent Company Deletion
  const handleExecuteDelete = async () => {
    if (!company || !isSuperAdmin) return;
    if (confirmNameInput !== company.name) {
      setDeleteError(`Please type exact company name "${company.name}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteCompanyPermanently(company.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete company.');
      }

      navigate(ADMIN_ROUTES.companies, {
        replace: true,
        state: {
          deletedNotification: `Company "${company.name}" was permanently deleted.`
        }
      });
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete company.');
      setIsDeleting(false);
    }
  };

  const loadCompanyData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch company record
      const compRes = await getCompanyById(id);
      if (!compRes.success || !compRes.data) {
        setError(compRes.error || 'Company record not found.');
        setLoading(false);
        return;
      }
      setCompany(compRes.data);

      // 2. Fetch linked jobs
      const jobsRes = await getCompanyJobs(id);
      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data);
      }

      // 3. Fetch linked employees
      const empRes = await getCompanyEmployees(id);
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data);
      }

      // 4. Fetch activity logs
      const logs = await getEntityActivityLogs('COMPANY', id);
      setActivityLogs(logs);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred loading company details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // Handle Edit Click
  const handleOpenEdit = () => {
    if (!company) return;
    setFormName(company.name);
    setFormType(company.company_type);
    setFormAddress(company.address || '');
    setFormEmail(company.contact_email || '');
    setFormPhone(company.contact_phone || '');
    setFormActive(company.active);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !canManage) return;

    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('Company Name is required (minimum 2 characters).');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const input: UpdateCompanyInput = {
      name: formName.trim(),
      company_type: formType,
      address: formAddress.trim() || null,
      contact_email: formEmail.trim().toLowerCase() || null,
      contact_phone: formPhone.trim()
        ? (normalizeIndianPhoneNumber(formPhone).isValid
            ? normalizeIndianPhoneNumber(formPhone).normalized
            : formPhone.trim())
        : null,
      active: formActive
    };

    const res = await updateCompany(company.id, input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to update company.');
      return;
    }

    setSuccessMessage(`Company "${res.data.name}" updated successfully.`);
    setIsEditModalOpen(false);
    setCompany(res.data);
    loadCompanyData();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Toggle Active Status
  const handleToggleStatus = async () => {
    if (!company || !canManage) return;

    const nextStatus = !company.active;
    const confirmMsg = nextStatus
      ? `Are you sure you want to activate "${company.name}"?`
      : `Are you sure you want to deactivate "${company.name}"? Deactivated companies are hidden from candidate assignment while preserving all historical data.`;

    if (!window.confirm(confirmMsg)) return;

    setToggling(true);
    const res = await setCompanyActive(company.id, nextStatus);
    setToggling(false);

    if (!res.success || !res.data) {
      alert(res.error || 'Failed to update status.');
      return;
    }

    setSuccessMessage(`Company status updated to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
    setCompany(res.data);
    loadCompanyData();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (loading) {
    return (
      <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--color-champagne-dark)' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading company record...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div style={{ padding: '3rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#DC2626', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginBottom: '0.5rem' }}>
          Company Not Found
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {error || 'The requested company ID does not exist or you do not have permission to view it.'}
        </p>
        <Link to={ADMIN_ROUTES.companies} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Companies
        </Link>
      </div>
    );
  }

  const typeCfg = COMPANY_TYPE_CONFIG[company.company_type] || COMPANY_TYPE_CONFIG.OTHER;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb / Back Link */}
      <div>
        <Link
          to={ADMIN_ROUTES.companies}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--color-midnight-navy)',
            textDecoration: 'none',
            fontSize: '0.8125rem',
            fontWeight: 700
          }}
        >
          <ArrowLeft size={16} />
          <span>BACK TO COMPANIES DIRECTORY</span>
        </Link>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.5rem 2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'rgba(25, 42, 86, 0.05)',
              border: '1px solid rgba(25, 42, 86, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-champagne-dark)',
              flexShrink: 0
            }}
          >
            <Building2 size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
                {company.name}
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: typeCfg.color,
                  backgroundColor: typeCfg.bg,
                  border: `1px solid ${typeCfg.border}`
                }}
              >
                {typeCfg.label}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: company.active ? '#ECFDF5' : '#F3F4F6',
                  color: company.active ? '#065F46' : '#6B7280',
                  border: `1px solid ${company.active ? '#A7F3D0' : '#E5E7EB'}`
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: company.active ? '#10B981' : '#9CA3AF'
                  }}
                />
                {company.active ? 'Active Facility' : 'Inactive'}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.35rem' }}>
              Database Reference: <code>{company.id}</code>
            </div>
          </div>
        </div>

        {canManage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleOpenEdit}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8125rem',
                padding: '0.5rem 1rem'
              }}
            >
              <Edit2 size={15} />
              <span>Edit Details</span>
            </button>

            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8125rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: `1px solid ${company.active ? '#FCA5A5' : '#86EFAC'}`,
                backgroundColor: company.active ? '#FEF2F2' : '#F0FDF4',
                color: company.active ? '#991B1B' : '#166534',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {toggling ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
              <span>{company.active ? 'Deactivate Company' : 'Activate Company'}</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setConfirmNameInput('');
                  setDeleteError(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8125rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="Permanently Delete Company (Super Admin)"
              >
                <Trash2 size={15} />
                <span>Delete Company</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid: Details & Summary */}
      <div className="admin-cards-grid-2col">
        {/* Contact & Location Details */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            Location & Contact
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Plant / Operating Address
              </span>
              <span style={{ color: '#1E293B', fontWeight: 500, marginTop: '0.15rem', display: 'block', lineHeight: 1.5 }}>
                {company.address || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Address not recorded</span>}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Contact Email
                </span>
                <span style={{ color: '#1E293B', fontWeight: 500, marginTop: '0.15rem', display: 'block' }}>
                  {company.contact_email ? (
                    <a href={`mailto:${company.contact_email}`} style={{ color: '#1E40AF', textDecoration: 'none' }}>
                      {company.contact_email}
                    </a>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>None</span>
                  )}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Contact Phone
                </span>
                <span style={{ color: '#1E293B', fontWeight: 500, marginTop: '0.15rem', display: 'block' }}>
                  {company.contact_phone ? (
                    <a href={`tel:${company.contact_phone}`} style={{ color: '#1E40AF', textDecoration: 'none' }}>
                      {formatIndianPhoneNumber(company.contact_phone)}
                    </a>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>None</span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Registered On
                </span>
                <span style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '0.15rem', display: 'block' }}>
                  {new Date(company.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Last Updated
                </span>
                <span style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '0.15rem', display: 'block' }}>
                  {new Date(company.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Overview Quick Stats */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            Operational Statistics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1E40AF', fontSize: '0.8125rem', fontWeight: 700 }}>
                <Briefcase size={16} /> Linked Jobs
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.35rem' }}>
                {jobs.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                Active / open plant positions
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065F46', fontSize: '0.8125rem', fontWeight: 700 }}>
                <Users size={16} /> Deployed Workforce
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.35rem' }}>
                {employees.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                Employees registered under unit
              </div>
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '0.8125rem', color: '#1E40AF', lineHeight: 1.4 }}>
            Active status enables this company to receive candidate assignments in joining dossier Form-5.
          </div>
        </div>
      </div>

      {/* Linked Jobs Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>LINKED JOB VACANCIES ({jobs.length})</span>
          </h3>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <Briefcase size={36} style={{ color: '#94A3B8', margin: '0 auto 0.75rem' }} />
            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              No Job Openings Associated
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              There are currently no job records linked to this company in <code>public.jobs</code>.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Job Title</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Location</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Employment Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Vacancies</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                      {job.title}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {job.department || 'General'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {job.location}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {job.employment_type}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                      {job.vacancies}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: job.status === 'ACTIVE' ? '#ECFDF5' : '#F3F4F6',
                          color: job.status === 'ACTIVE' ? '#065F46' : '#6B7280'
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deployed Workforce / Employees Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>DEPLOYED WORKFORCE / EMPLOYEES ({employees.length})</span>
          </h3>
        </div>

        {employees.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <Users size={36} style={{ color: '#94A3B8', margin: '0 auto 0.75rem' }} />
            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              No Workforce Deployed
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              There are currently no employee records assigned to this company unit.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Employee Code</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Candidate Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Designation</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Joining Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                      <code>{emp.employee_code}</code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1E293B', fontWeight: 600 }}>
                      {emp.candidate_name || 'Registered Candidate'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {emp.designation || 'Staff'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {emp.department || 'Operations'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : 'Pending'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: emp.employment_status === 'ACTIVE' ? '#ECFDF5' : '#FEF3C7',
                          color: emp.employment_status === 'ACTIVE' ? '#065F46' : '#92400E'
                        }}
                      >
                        {emp.employment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Logs Card */}
      {activityLogs.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>COMPANY AUDIT TRAIL</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activityLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8125rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>{log.action}</span>
                  <span style={{ color: '#64748B', marginLeft: '0.5rem' }}>{log.description}</span>
                </div>
                <span style={{ color: '#94A3B8', fontSize: '0.75rem', flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DANGER ZONE (SUPER ADMIN ONLY) */}
      <div
        style={{
          marginTop: '0.5rem',
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Trash2 size={18} style={{ color: '#DC2626' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
              Danger Zone — Company Deletion
            </h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0, maxWidth: '650px' }}>
            Permanently delete this corporate facility. To safeguard business and candidate history, deletion will be safely rejected if active jobs, employees, joining forms, or reference slips reference this company. Restricted strictly to Super Administrators.
          </p>
        </div>

        <div>
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setConfirmNameInput('');
                setDeleteError(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #DC2626',
                borderRadius: '8px',
                padding: '0.65rem 1.15rem',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={15} />
              <span>DELETE COMPANY</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
              Restricted to Super Admin
            </span>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                  EDIT COMPANY DETAILS
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formError && (
                <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#991B1B', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Company Type <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CompanyType)}
                  className="form-control form-select"
                  style={{ width: '100%' }}
                >
                  <option value="GROUP_BUSINESS">A Tiger Group's Business (Direct Subsidiary)</option>
                  <option value="EMPLOYER_PARTNER">Employer Partner (Client Industrial Plant)</option>
                  <option value="OTHER">Other Client / Commercial Facility</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Plant / Facility Address
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="detail_edit_active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="detail_edit_active" style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  Active (Available for candidate placement and job postings)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-outline"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {formSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 42, 86, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2DFD8',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px -10px rgba(25, 42, 86, 0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#192A56',
                    margin: 0
                  }}
                >
                  Delete Corporate Facility
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '2px' }}>
                  Irreversible Destructive Action
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.5, marginBottom: '1rem' }}>
              This will permanently delete this company record from the operational database.
            </p>

            <div
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E2DFD8',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Company Name:</div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#192A56',
                  marginTop: '2px'
                }}
              >
                {company.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4A5568', marginTop: '4px' }}>
                Type: <strong>{typeCfg.label}</strong> • Active Status: <strong>{company.active ? 'Active' : 'Inactive'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginTop: '6px' }}>
                Operational Dependencies: Linked jobs ({jobs.length}), deployed employees ({employees.length}). Deletion will be safely rejected if active operational records exist.
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  backgroundColor: '#FBF0EF',
                  border: '1px solid #EDA6A3',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={18} color="#C9726F" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.825rem', color: '#C9726F', fontWeight: 600, lineHeight: 1.4 }}>
                  {deleteError}
                </span>
              </div>
            )}

            <p style={{ fontSize: '0.825rem', color: '#192A56', fontWeight: 600, marginBottom: '0.5rem' }}>
              Please type <code style={{ backgroundColor: '#F1F5F9', padding: '2px 5px', borderRadius: '4px', color: '#DC2626' }}>{company.name}</code> to confirm:
            </p>

            <input
              type="text"
              value={confirmNameInput}
              onChange={(e) => setConfirmNameInput(e.target.value)}
              placeholder={company.name}
              disabled={isDeleting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid',
                borderColor: confirmNameInput === company.name ? '#10B981' : '#D2CECE',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                color: '#192A56',
                outline: 'none',
                marginBottom: '1.5rem'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmNameInput('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="btn-admin-secondary"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting || confirmNameInput !== company.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: confirmNameInput === company.name ? '#DC2626' : '#FCA5A5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: confirmNameInput === company.name && !isDeleting ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <span>DELETE PERMANENTLY</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
