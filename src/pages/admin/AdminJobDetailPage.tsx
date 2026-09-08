// ==============================================================================
// File: src/pages/admin/AdminJobDetailPage.tsx
// Description: Detailed Job View, Candidate Applications, Company Profile & Audit Trails
// Brand: A Tiger Group's — Operational Admin Panel
// Security:
//   - Sensitive candidate PII (Aadhaar, PAN, Bank) strictly excluded from applications list
//   - Role-gated actions for SUPER_ADMIN and COORDINATOR
//   - Audited status changes and edits
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getJobById,
  updateJob,
  setJobStatus,
  getJobApplications,
  type JobWithCompany,
  type JobApplicationSummary,
  type UpdateJobInput
} from '../../services/jobService';
import { getAllCompanies, type CompanyRow } from '../../services/companyService';
import { getEntityActivityLogs } from '../../services/activityService';
import type { ActivityLogRow, JobStatus } from '../../types/database';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  PauseCircle,
  PlayCircle,
  Archive,
  Ban,
  Activity,
  FileText,
  ExternalLink,
  Phone,
  Mail
} from 'lucide-react';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';

const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: {
    label: 'Active & Hiring',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0'
  },
  PAUSED: {
    label: 'Paused',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A'
  },
  CLOSED: {
    label: 'Closed',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#CBD5E1'
  },
  ARCHIVED: {
    label: 'Archived',
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB'
  }
};

export const AdminJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [job, setJob] = useState<JobWithCompany | null>(null);
  const [applications, setApplications] = useState<JobApplicationSummary[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formEmploymentType, setFormEmploymentType] = useState<string>('Full-Time');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formSalaryRange, setFormSalaryRange] = useState<string>('');
  const [formVacancies, setFormVacancies] = useState<number>(1);
  const [formExperienceLevel, setFormExperienceLevel] = useState<string>('0 - 2 Years');
  const [formStatus, setFormStatus] = useState<JobStatus>('ACTIVE');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formResponsibilities, setFormResponsibilities] = useState<string>('');
  const [formRequirements, setFormRequirements] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status changing state
  const [statusChanging, setStatusChanging] = useState<boolean>(false);

  // Load companies for edit dropdown
  useEffect(() => {
    getAllCompanies().then((res) => {
      if (res.success && res.data) {
        setCompanies(res.data);
      }
    });
  }, []);

  const loadJobData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Job
      const jobRes = await getJobById(id);
      if (!jobRes.success || !jobRes.data) {
        setError(jobRes.error || 'Job opening not found.');
        setLoading(false);
        return;
      }
      setJob(jobRes.data);

      // 2. Fetch Applications for this job
      const appRes = await getJobApplications(id);
      if (appRes.success && appRes.data) {
        setApplications(appRes.data);
      }

      // 3. Fetch Activity Logs
      const logs = await getEntityActivityLogs('JOB', id);
      setActivityLogs(logs || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!job) return;
    setFormTitle(job.title || '');
    setFormCompanyId(job.company_id || '');
    setFormLocation(job.location || '');
    setFormEmploymentType(job.employment_type || 'Full-Time');
    setFormDepartment(job.department || '');
    setFormSalaryRange(job.salary_range || '');
    setFormVacancies(job.vacancies || 1);
    setFormExperienceLevel(job.experience_level || '0 - 2 Years');
    setFormStatus(job.status || 'ACTIVE');
    setFormDescription(job.description || '');
    setFormResponsibilities(job.responsibilities || '');
    setFormRequirements(job.requirements || '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || formSubmitting) return;

    if (!formTitle.trim()) {
      setFormError('Job title cannot be empty.');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('Location cannot be empty.');
      return;
    }
    if (Number(formVacancies) < 1) {
      setFormError('Vacancies must be at least 1.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Description is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const input: UpdateJobInput = {
      title: formTitle.trim(),
      company_id: formCompanyId,
      location: formLocation.trim(),
      employment_type: formEmploymentType.trim(),
      department: formDepartment.trim() || undefined,
      salary_range: formSalaryRange.trim() || undefined,
      vacancies: Number(formVacancies),
      experience_level: formExperienceLevel.trim() || undefined,
      status: formStatus,
      description: formDescription.trim(),
      responsibilities: formResponsibilities.trim() || undefined,
      requirements: formRequirements.trim() || undefined
    };

    const res = await updateJob(job.id, input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to update job details.');
    } else {
      setIsEditModalOpen(false);
      setSuccessMessage('Job details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadJobData();
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (newStatus: JobStatus) => {
    if (!job || statusChanging) return;
    setStatusChanging(true);

    const res = await setJobStatus(job.id, newStatus);
    setStatusChanging(false);

    if (!res.success || !res.data) {
      setError(res.error || `Failed to change status to ${newStatus}.`);
    } else {
      setSuccessMessage(`Job status updated to ${newStatus}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadJobData();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#192A56' }} />
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading job opening details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#991B1B'
        }}>
          <AlertCircle size={36} style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Unable to Display Job Opening</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>{error || 'Job not found in database.'}</p>
          <Link
            to={ADMIN_ROUTES.jobs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#192A56',
              color: '#FFFFFF',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={14} /> Back to Jobs Directory
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.ACTIVE;

  // Split bullet points
  const splitItems = (text: string | null): string[] => {
    if (!text) return [];
    return text
      .split(/\r?\n|•|-|\*/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
  };

  const responsibilitiesList = splitItems(job.responsibilities);
  const requirementsList = splitItems(job.requirements);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to={ADMIN_ROUTES.jobs}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#192A56',
            fontSize: '0.825rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Jobs Directory</span>
        </Link>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#065F46',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                {job.title}
              </h1>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#F1F5F9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                #{job.id.slice(0, 8)}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: statusConfig.color,
                backgroundColor: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`
              }}>
                {job.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                {job.status === 'PAUSED' && <PauseCircle size={12} />}
                {job.status === 'CLOSED' && <Ban size={12} />}
                {job.status === 'ARCHIVED' && <Archive size={12} />}
                <span>{statusConfig.label}</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748B', marginTop: '0.5rem' }}>
              {job.company && (
                <Link
                  to={`/admin/companies/${job.company.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#1E40AF',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <Building2 size={14} />
                  <span>{job.company.name}</span>
                </Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} style={{ color: '#94A3B8' }} />
                <span>{job.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} style={{ color: '#94A3B8' }} />
                <span>Posted {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canManage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleOpenEditModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  backgroundColor: '#FFFFFF',
                  color: '#1E40AF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer'
                }}
              >
                <Edit2 size={14} />
                <span>Edit Job Details</span>
              </button>

              {job.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleQuickStatusChange('PAUSED')}
                  disabled={statusChanging}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: '#FFFBEB',
                    color: '#B45309',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  <PauseCircle size={14} />
                  <span>Pause Opening</span>
                </button>
              ) : (
                <button
                  onClick={() => handleQuickStatusChange('ACTIVE')}
                  disabled={statusChanging}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  <PlayCircle size={14} />
                  <span>Activate & Publish</span>
                </button>
              )}

              {job.status !== 'CLOSED' && (
                <button
                  onClick={() => handleQuickStatusChange('CLOSED')}
                  disabled={statusChanging}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  <Ban size={14} />
                  <span>Close</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Vacancies / Openings
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#192A56' }}>
            {job.vacancies}
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Candidate Applicants
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E40AF' }}>
            {applications.length}
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Employment Type
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
            {job.employment_type}
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Experience Level
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
            {job.experience_level || 'Not Specified'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Specifications & Company Profile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
        gap: '1.5rem',
        alignItems: 'start',
        marginBottom: '2rem'
      }}>
        {/* Left Column: Scope, Responsibilities, Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Job Overview */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1rem 0' }}>
              Role Overview & Description
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, margin: 0 }}>
              {job.description || 'No description provided.'}
            </p>
          </div>

          {/* Responsibilities */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1rem 0' }}>
              Key Responsibilities
            </h3>
            {responsibilitiesList.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {responsibilitiesList.map((resp, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                    <CheckCircle2 size={16} style={{ color: '#047857', flexShrink: 0, marginTop: '2px' }} />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>
                {job.responsibilities || 'No specific responsibilities listed.'}
              </p>
            )}
          </div>

          {/* Requirements */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1rem 0' }}>
              Eligibility & Candidate Requirements
            </h3>
            {requirementsList.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {requirementsList.map((req, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                    <CheckCircle2 size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: '2px' }} />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>
                {job.requirements || 'No specific eligibility requirements listed.'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Company Details & Operational Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Company Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Hiring Partner Facility
              </h3>
              {job.company && (
                <Link
                  to={`/admin/companies/${job.company.id}`}
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1E40AF', textDecoration: 'none' }}
                >
                  View Profile →
                </Link>
              )}
            </div>

            {job.company ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block' }}>Company Name</span>
                  <div style={{ fontWeight: 700, color: '#192A56' }}>{job.company.name}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block' }}>Classification</span>
                  <div style={{ fontWeight: 600, color: '#334155' }}>{job.company.company_type}</div>
                </div>

                {job.company.address && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block' }}>Registered Address</span>
                    <div style={{ color: '#475569' }}>{job.company.address}</div>
                  </div>
                )}

                {job.company.contact_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                    <Mail size={13} style={{ color: '#94A3B8' }} />
                    <span>{job.company.contact_email}</span>
                  </div>
                )}

                {job.company.contact_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                    <Phone size={13} style={{ color: '#94A3B8' }} />
                    <span>{formatIndianPhoneNumber(job.company.contact_phone)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No partner company assigned.
              </div>
            )}
          </div>

          {/* Operational Details Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.25rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56', margin: '0 0 1rem 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              Operational Data
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Department:</span>{' '}
                <span style={{ fontWeight: 600, color: '#334155' }}>{job.department || 'Operations'}</span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Salary Budget:</span>{' '}
                <span style={{ fontWeight: 600, color: '#334155' }}>{job.salary_range || 'Standard Grade Pay'}</span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Database ID:</span>{' '}
                <span style={{ fontFamily: 'monospace', color: '#475569' }}>{job.id}</span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Created:</span>{' '}
                <span style={{ color: '#475569' }}>{new Date(job.created_at).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Last Updated:</span>{' '}
                <span style={{ color: '#475569' }}>{new Date(job.updated_at).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Candidate Applications Section (PII PROTECTED) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: '#192A56' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
              Candidate Applications ({applications.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Showing candidate submissions associated with this specific opening
          </span>
        </div>

        {applications.length === 0 ? (
          <div style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px dashed #CBD5E1'
          }}>
            <FileText size={32} style={{ color: '#94A3B8', margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              No candidates have applied for this specific job opening yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Application No.</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Candidate Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Mobile</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Applied Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF' }}>
                        {app.application_number}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#192A56' }}>
                      {app.full_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {app.mobile}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF'
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                      {new Date(app.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Link
                        to={`/admin/applications/${app.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#1E40AF',
                          textDecoration: 'none'
                        }}
                      >
                        <span>Open Dossier</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Logs & Audit Timeline */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Activity size={20} style={{ color: '#192A56' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
            Audit & Mutation Timeline ({activityLogs.length})
          </h2>
        </div>

        {activityLogs.length === 0 ? (
          <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>
            No mutation events logged for this job opening yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activityLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF'
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 600 }}>
                      {log.description}
                    </span>
                  </div>
                  {log.metadata && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={20} style={{ color: '#1E40AF' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                  Edit Job Opening
                </h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                marginBottom: '1rem',
                color: '#991B1B',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Company *
                  </label>
                  <select
                    required
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {!comp.active ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Employment Type
                  </label>
                  <select
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Rotational Shift">Rotational Shift</option>
                    <option value="Temporary">Temporary</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Vacancies (Openings) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formVacancies}
                    onChange={(e) => setFormVacancies(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Salary Range
                  </label>
                  <input
                    type="text"
                    value={formSalaryRange}
                    onChange={(e) => setFormSalaryRange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Experience Level
                  </label>
                  <input
                    type="text"
                    value={formExperienceLevel}
                    onChange={(e) => setFormExperienceLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Job Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as JobStatus)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <option value="ACTIVE">ACTIVE (Published publicly)</option>
                    <option value="PAUSED">PAUSED (Retained internally)</option>
                    <option value="CLOSED">CLOSED (Not accepting applicants)</option>
                    <option value="ARCHIVED">ARCHIVED (Historical record)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Responsibilities (One per line)
                </label>
                <textarea
                  rows={3}
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Requirements (One per line)
                </label>
                <textarea
                  rows={3}
                  value={formRequirements}
                  onChange={(e) => setFormRequirements(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-admin-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '6px',
                    backgroundColor: '#1E40AF',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {formSubmitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{formSubmitting ? 'Saving Changes...' : 'Save Job Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
