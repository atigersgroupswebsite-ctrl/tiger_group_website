// ==============================================================================
// File: src/pages/admin/AdminJobsPage.tsx
// Description: Operational Job Directory Management for A Tiger Group's Admin Panel
// Access:
//   - SUPER_ADMIN: Full CRUD & status toggling
//   - COORDINATOR: Full CRUD & status toggling
//   - DOCUMENT_VERIFIER: Read-only view
//   - ACCOUNTANT: Read-only view
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getAllJobs,
  createJob,
  updateJob,
  setJobStatus,
  deleteJobPermanently,
  type JobWithCompany,
  type CreateJobInput,
  type UpdateJobInput
} from '../../services/jobService';
import { getAllCompanies, type CompanyRow } from '../../services/companyService';
import type { JobStatus } from '../../types/database';
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  MapPin,
  Building2,
  Users,
  Eye,
  PauseCircle,
  PlayCircle,
  Archive,
  Ban
} from 'lucide-react';

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

export const AdminJobsPage: React.FC = () => {
  const location = useLocation();
  const { role } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion Modal State
  const [deleteTargetJob, setDeleteTargetJob] = useState<JobWithCompany | null>(null);
  const [confirmTitleInput, setConfirmTitleInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notification from detail page
  useEffect(() => {
    if (location.state && (location.state as any).deletedNotification) {
      setSuccessMessage((location.state as any).deletedNotification);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<JobWithCompany | null>(null);

  // Form State
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

  // Status Change Confirmation
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ job: JobWithCompany; newStatus: JobStatus } | null>(null);
  const [statusChanging, setStatusChanging] = useState<boolean>(false);

  // Execute Permanent Job Deletion
  const handleExecuteDelete = async () => {
    if (!deleteTargetJob || !isSuperAdmin) return;
    if (confirmTitleInput !== deleteTargetJob.title) {
      setDeleteError(`Please type exact job title "${deleteTargetJob.title}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteJobPermanently(deleteTargetJob.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete job.');
      }

      setJobs((prev) => prev.filter((j) => j.id !== deleteTargetJob.id));
      setSuccessMessage(`Job posting "${deleteTargetJob.title}" was permanently deleted.`);
      setDeleteTargetJob(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete job.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load Companies for Dropdowns
  useEffect(() => {
    getAllCompanies().then((res) => {
      if (res.success && res.data) {
        setCompanies(res.data);
      }
    });
  }, []);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllJobs({
        search: searchQuery,
        status: statusFilter,
        companyId: companyFilter,
        employmentType: typeFilter
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load jobs directory.');
      } else {
        setJobs(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while fetching jobs.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, companyFilter, typeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === 'ACTIVE').length;
    const pausedOrClosed = jobs.filter((j) => j.status === 'PAUSED' || j.status === 'CLOSED').length;
    const totalVacancies = jobs.reduce((acc, j) => acc + (j.vacancies || 0), 0);
    return { total, active, pausedOrClosed, totalVacancies };
  }, [jobs]);

  // Active companies for creation dropdown
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.active);
  }, [companies]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormCompanyId(activeCompanies[0]?.id || '');
    setFormLocation('');
    setFormEmploymentType('Full-Time');
    setFormDepartment('');
    setFormSalaryRange('');
    setFormVacancies(1);
    setFormExperienceLevel('0 - 2 Years');
    setFormStatus('ACTIVE');
    setFormDescription('');
    setFormResponsibilities('');
    setFormRequirements('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;

    if (!formTitle.trim()) {
      setFormError('Job title is required.');
      return;
    }
    if (!formCompanyId) {
      setFormError('Please select a company.');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('Location is required.');
      return;
    }
    if (Number(formVacancies) < 1) {
      setFormError('Vacancies must be at least 1.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Job description is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const input: CreateJobInput = {
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

    const res = await createJob(input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to create job.');
    } else {
      setIsCreateModalOpen(false);
      setSuccessMessage(`Job "${res.data.title}" has been created successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchJobs();
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (job: JobWithCompany) => {
    setEditingJob(job);
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
    if (!editingJob || formSubmitting) return;

    if (!formTitle.trim()) {
      setFormError('Job title cannot be empty.');
      return;
    }
    if (!formCompanyId) {
      setFormError('Please select a company.');
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
      setFormError('Job description is required.');
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

    const res = await updateJob(editingJob.id, input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to update job.');
    } else {
      setIsEditModalOpen(false);
      setEditingJob(null);
      setSuccessMessage(`Job "${res.data.title}" updated successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchJobs();
    }
  };

  // Execute Status Change
  const confirmStatusChange = async () => {
    if (!statusChangeTarget || statusChanging) return;
    setStatusChanging(true);

    const { job, newStatus } = statusChangeTarget;
    const res = await setJobStatus(job.id, newStatus);
    setStatusChanging(false);

    if (!res.success || !res.data) {
      setError(res.error || 'Failed to update job status.');
    } else {
      setStatusChangeTarget(null);
      setSuccessMessage(`Job "${job.title}" status changed to ${newStatus}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchJobs();
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              backgroundColor: '#EFF6FF',
              padding: '0.6rem',
              borderRadius: '8px',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Briefcase size={24} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Job Openings & Vacancies
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                Operational Job Management, live portal synchronization & candidate placement tracking
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="btn-admin-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#192A56',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(25, 42, 86, 0.15)'
            }}
          >
            <Plus size={16} />
            <span>Create New Job</span>
          </button>
        )}
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

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          color: '#991B1B',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchJobs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: '1px solid #DC2626',
              color: '#DC2626',
              padding: '0.25rem 0.65rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Total Jobs</span>
            <Briefcase size={18} style={{ color: '#192A56' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#192A56' }}>{stats.total}</div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>Active Openings</span>
            <CheckCircle2 size={18} style={{ color: '#047857' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>{stats.active}</div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#B45309', textTransform: 'uppercase' }}>Paused / Closed</span>
            <PauseCircle size={18} style={{ color: '#B45309' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309' }}>{stats.pausedOrClosed}</div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase' }}>Total Vacancies</span>
            <Users size={18} style={{ color: '#1E40AF' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1E40AF' }}>{stats.totalVacancies}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search job title, dept, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'ALL')}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active & Hiring</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Company Filter */}
        <div style={{ flex: '0 1 220px', minWidth: '180px' }}>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {!c.active ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Filter */}
        <div style={{ flex: '0 1 170px', minWidth: '140px' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Types</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Contract">Contract</option>
            <option value="Rotational Shift">Rotational Shift</option>
            <option value="Temporary">Temporary</option>
          </select>
        </div>

        {/* Reset */}
        {(searchQuery || statusFilter !== 'ALL' || companyFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setCompanyFilter('ALL');
              setTypeFilter('ALL');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#991B1B',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem'
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Directory Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem', color: '#192A56' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading jobs directory from database...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <Briefcase size={40} style={{ color: '#94A3B8', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#192A56', margin: '0 0 0.5rem 0' }}>No Jobs Found</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              {searchQuery || statusFilter !== 'ALL' || companyFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'No job openings match your current search and filter criteria.'
                : 'No job openings are configured in the database yet.'}
            </p>
            {canManage && (
              <button
                onClick={handleOpenCreateModal}
                className="btn-admin-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#192A56',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> Add First Job
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Job Title & Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Company</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Location</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Type & Level</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Vacancies</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Salary Range</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Posted</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const statusConfig = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.ACTIVE;

                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Title & Department */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#192A56', fontSize: '0.875rem' }}>
                          <Link
                            to={`/admin/jobs/${job.id}`}
                            style={{ color: '#192A56', textDecoration: 'none' }}
                          >
                            {job.title}
                          </Link>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          {job.department && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              {job.department}
                            </span>
                          )}
                          <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94A3B8' }}>
                            #{job.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        {job.company ? (
                          <Link
                            to={`/admin/companies/${job.company.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: '#1E40AF',
                              fontWeight: 600,
                              textDecoration: 'none'
                            }}
                          >
                            <Building2 size={13} />
                            <span>{job.company.name}</span>
                          </Link>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Location */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                          <span>{job.location}</span>
                        </div>
                      </td>

                      {/* Type & Level */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#475569' }}>
                        <div>{job.employment_type}</div>
                        {job.experience_level && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                            Exp: {job.experience_level}
                          </div>
                        )}
                      </td>

                      {/* Vacancies */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '24px',
                          height: '24px',
                          padding: '0 6px',
                          borderRadius: '12px',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {job.vacancies}
                        </span>
                      </td>

                      {/* Salary Range */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#475569' }}>
                        {job.salary_range ? (
                          <span style={{ fontWeight: 600, color: '#334155' }}>{job.salary_range}</span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Not specified</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          color: statusConfig.color,
                          backgroundColor: statusConfig.bg,
                          border: `1px solid ${statusConfig.border}`
                        }}>
                          {job.status === 'ACTIVE' && <CheckCircle2 size={11} />}
                          {job.status === 'PAUSED' && <PauseCircle size={11} />}
                          {job.status === 'CLOSED' && <Ban size={11} />}
                          {job.status === 'ARCHIVED' && <Archive size={11} />}
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', color: '#64748B', fontSize: '0.8rem' }}>
                        {new Date(job.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Link
                            to={`/admin/jobs/${job.id}`}
                            title="View Job Details"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Eye size={14} />
                          </Link>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(job)}
                                title="Edit Job"
                                style={{
                                  padding: '5px',
                                  borderRadius: '4px',
                                  border: '1px solid #CBD5E1',
                                  color: '#1E40AF',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit2 size={14} />
                              </button>

                              {job.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => setStatusChangeTarget({ job, newStatus: 'PAUSED' })}
                                  title="Pause Job Opening"
                                  style={{
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #FDE68A',
                                    color: '#B45309',
                                    backgroundColor: '#FFFBEB',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <PauseCircle size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setStatusChangeTarget({ job, newStatus: 'ACTIVE' })}
                                  title="Activate Job Opening"
                                  style={{
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #A7F3D0',
                                    color: '#047857',
                                    backgroundColor: '#ECFDF5',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <PlayCircle size={14} />
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    setDeleteTargetJob(job);
                                    setConfirmTitleInput('');
                                    setDeleteError(null);
                                  }}
                                  title="Permanently Delete Job (Super Admin)"
                                  style={{
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    backgroundColor: '#FEF2F2',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE JOB MODAL */}
      {isCreateModalOpen && (
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={20} style={{ color: '#192A56' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#192A56', margin: 0 }}>Create Job Opening</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Line Associate"
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

                {/* Company Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Assigned Company *
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
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Select Active Company --</option>
                    {activeCompanies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.company_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Job Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nagpur, Maharashtra"
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

                {/* Department */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Operations & Packaging"
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

                {/* Employment Type */}
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

                {/* Vacancies */}
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

                {/* Salary Range */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Salary Range
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹18,000 - ₹24,000 / month"
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

                {/* Experience Level */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Experience Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Freshers / 0 - 2 Years"
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

                {/* Initial Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Initial Status
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
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Job Description / Role Overview *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide an overview of the role, department goals and operating conditions..."
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

              {/* Responsibilities */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Responsibilities (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="• Execute machine operations according to plant SOPs&#10;• Ensure hygiene and safety adherence&#10;• Report daily batch outputs to supervisor"
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

              {/* Requirements */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Requirements & Eligibility (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="• 10th / 12th Pass or ITI qualification&#10;• Physical stamina for rotational plant shifts&#10;• Valid KYC verification documents (Aadhaar/Bank)"
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
                  onClick={() => setIsCreateModalOpen(false)}
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
                    backgroundColor: '#192A56',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {formSubmitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{formSubmitting ? 'Creating...' : 'Publish Job Opening'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT JOB MODAL */}
      {isEditModalOpen && editingJob && (
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
                  Edit Job: {editingJob.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingJob(null);
                }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Title */}
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

                {/* Company Dropdown */}
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
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {!comp.active ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
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

                {/* Department */}
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

                {/* Employment Type */}
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

                {/* Vacancies */}
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

                {/* Salary Range */}
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

                {/* Experience Level */}
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

                {/* Status */}
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

              {/* Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Job Description / Role Overview *
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

              {/* Responsibilities */}
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

              {/* Requirements */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Requirements & Eligibility (One per line)
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
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingJob(null);
                  }}
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

      {/* STATUS CHANGE CONFIRMATION MODAL */}
      {statusChangeTarget && (
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
            maxWidth: '450px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '50%',
                backgroundColor: statusChangeTarget.newStatus === 'ACTIVE' ? '#ECFDF5' : '#FFFBEB',
                color: statusChangeTarget.newStatus === 'ACTIVE' ? '#047857' : '#B45309'
              }}>
                {statusChangeTarget.newStatus === 'ACTIVE' ? <PlayCircle size={22} /> : <PauseCircle size={22} />}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                {statusChangeTarget.newStatus === 'ACTIVE' ? 'Activate Job Vacancy' : `Change Status to ${statusChangeTarget.newStatus}`}
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
              {statusChangeTarget.newStatus === 'ACTIVE'
                ? `Activating "${statusChangeTarget.job.title}" will make it immediately visible on the public career portal for candidate enquiries.`
                : `Setting "${statusChangeTarget.job.title}" to ${statusChangeTarget.newStatus} will remove it from the public portal. All past candidate applications linked to this role will be safely preserved.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStatusChangeTarget(null)}
                style={{
                  padding: '0.5rem 1rem',
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
                type="button"
                onClick={confirmStatusChange}
                disabled={statusChanging}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1.2rem',
                  borderRadius: '6px',
                  backgroundColor: statusChangeTarget.newStatus === 'ACTIVE' ? '#047857' : '#192A56',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {statusChanging && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetJob && (
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
          onClick={() => !isDeleting && setDeleteTargetJob(null)}
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
                  Delete Job Opening
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '2px' }}>
                  Irreversible Destructive Action
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.5, marginBottom: '1rem' }}>
              This will permanently delete the job opening from the operational database and remove it immediately from all public job listings.
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
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Job Title:</div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#192A56',
                  marginTop: '2px'
                }}
              >
                {deleteTargetJob.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4A5568', marginTop: '4px' }}>
                Company: <strong>{deleteTargetJob.company?.name || 'Unassigned'}</strong> • Location: <strong>{deleteTargetJob.location}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, marginTop: '6px' }}>
                Protected History: Candidate applications will remain preserved and safely decoupled.
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
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={18} color="#C9726F" />
                <span style={{ fontSize: '0.825rem', color: '#C9726F', fontWeight: 600 }}>
                  {deleteError}
                </span>
              </div>
            )}

            <p style={{ fontSize: '0.825rem', color: '#192A56', fontWeight: 600, marginBottom: '0.5rem' }}>
              Please type <code style={{ backgroundColor: '#F1F5F9', padding: '2px 5px', borderRadius: '4px', color: '#DC2626' }}>{deleteTargetJob.title}</code> to confirm:
            </p>

            <input
              type="text"
              value={confirmTitleInput}
              onChange={(e) => setConfirmTitleInput(e.target.value)}
              placeholder={deleteTargetJob.title}
              disabled={isDeleting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid',
                borderColor: confirmTitleInput === deleteTargetJob.title ? '#10B981' : '#D2CECE',
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
                  setDeleteTargetJob(null);
                  setConfirmTitleInput('');
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
                disabled={isDeleting || confirmTitleInput !== deleteTargetJob.title}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: confirmTitleInput === deleteTargetJob.title ? '#DC2626' : '#FCA5A5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: confirmTitleInput === deleteTargetJob.title && !isDeleting ? 'pointer' : 'not-allowed',
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
