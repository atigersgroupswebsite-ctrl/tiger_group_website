// ==============================================================================
// File: src/pages/admin/AdminEmployeesPage.tsx
// Description: Employee Master Directory for A TIGER GROUPS Admin Panel
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Styling: Native Admin Panel Design System (Vanilla CSS, CSS Tokens, Custom Controls)
// Access:
//   - SUPER_ADMIN: Full Employee Management & Promotion
//   - COORDINATOR: Operational Employee Management & Promotion
//   - DOCUMENT_VERIFIER: Read-Only Directory View
//   - ACCOUNTANT: Read-Only Directory View
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getAllEmployees,
  generateNextEmployeeCode,
  createOrPromoteEmployee,
  getEligibleCandidatesForPromotion,
  type EmployeeWithRelations,
  type EligiblePromotionCandidates
} from '../../services/employeeService';
import { getAllCompanies, type CompanyRow } from '../../services/companyService';
import type { EmploymentStatus } from '../../types/database';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Building2,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  FileCheck2,
  UserCheck
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

export const AdminEmployeesPage: React.FC = () => {
  const { role, user } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Promotion / Creation Modal State
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState<boolean>(false);
  const [eligibleCandidates, setEligibleCandidates] = useState<EligiblePromotionCandidates>({
    standaloneJoiningCandidates: [],
    applicationCandidates: []
  });
  const [candidateSourceTab, setCandidateSourceTab] = useState<'JOINING' | 'APPLICATION'>('JOINING');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');

  // Form Fields for Promotion
  const [formEmployeeCode, setFormEmployeeCode] = useState<string>('');
  const [formCandidateName, setFormCandidateName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formMobile, setFormMobile] = useState<string>('');
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formDesignation, setFormDesignation] = useState<string>('Associate');
  const [formDepartment, setFormDepartment] = useState<string>('Operations');
  const [formLocation, setFormLocation] = useState<string>('Nagpur, Maharashtra');
  const [formJoiningDate, setFormJoiningDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formStatus, setFormStatus] = useState<EmploymentStatus>('ACTIVE');
  const [formJoiningRef, setFormJoiningRef] = useState<string>('');
  const [formApplicationId, setFormApplicationId] = useState<string | null>(null);
  const [formJoiningFormId, setFormJoiningFormId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Directory Data
  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, compRes] = await Promise.all([
        getAllEmployees({
          search: searchQuery,
          companyId: companyFilter,
          status: statusFilter,
          department: departmentFilter
        }),
        getAllCompanies()
      ]);

      if (!empRes.success) {
        throw new Error(empRes.error || 'Failed to load employees.');
      }
      setEmployees(empRes.data);

      if (compRes.success && compRes.data) {
        setCompanies(compRes.data);
      }
    } catch (err: any) {
      console.error('[AdminEmployeesPage] Error:', err);
      setError(err.message || 'Failed to load employee records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, companyFilter, statusFilter, departmentFilter]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Distinct departments for filter
  const distinctDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department?.trim()) {
        depts.add(emp.department.trim());
      }
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.employment_status === 'ACTIVE').length;
    const probation = employees.filter((e) => e.employment_status === 'PROBATION').length;
    const onLeave = employees.filter((e) => e.employment_status === 'ON_LEAVE').length;
    const resignedOrTerminated = employees.filter(
      (e) => e.employment_status === 'RESIGNED' || e.employment_status === 'TERMINATED'
    ).length;
    return { total, active, probation, onLeave, resignedOrTerminated };
  }, [employees]);

  const resetFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
  };

  // Open Promotion Modal
  const handleOpenPromoteModal = async () => {
    setFormError(null);
    setSelectedCandidateId('');
    setFormCandidateName('');
    setFormEmail('');
    setFormMobile('');
    setFormJoiningRef('');
    setFormApplicationId(null);
    setFormJoiningFormId(null);
    setFormDesignation('Associate');
    setFormDepartment('Operations');
    setFormLocation('Nagpur, Maharashtra');
    setFormStatus('ACTIVE');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);

    // Pre-generate collision-safe employee code
    const nextCode = await generateNextEmployeeCode();
    setFormEmployeeCode(nextCode);

    // Fetch eligible candidates
    const eligible = await getEligibleCandidatesForPromotion();
    setEligibleCandidates(eligible);

    // Default to active company if available
    const firstActiveComp = companies.find((c) => c.active);
    if (firstActiveComp) {
      setFormCompanyId(firstActiveComp.id);
    }

    setIsPromoteModalOpen(true);
  };

  // Candidate selected in modal
  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setFormError(null);

    if (candidateSourceTab === 'JOINING') {
      const candidate = eligibleCandidates.standaloneJoiningCandidates.find(
        (c) => c.id === candidateId
      );
      if (candidate) {
        setFormJoiningFormId(candidate.id);
        setFormApplicationId(null);
        setFormCandidateName(candidate.employee_name);
        setFormEmail(candidate.email);
        setFormMobile(candidate.mobile);
        setFormJoiningRef(candidate.joining_reference);
        if (candidate.designation) setFormDesignation(candidate.designation);
        if (candidate.department) setFormDepartment(candidate.department);
      }
    } else {
      const candidate = eligibleCandidates.applicationCandidates.find(
        (c) => c.id === candidateId
      );
      if (candidate) {
        setFormApplicationId(candidate.id);
        setFormJoiningFormId(null);
        setFormCandidateName(candidate.full_name);
        setFormEmail(candidate.email);
        setFormMobile(candidate.mobile);
        setFormJoiningRef('');
        if (candidate.designation) setFormDesignation(candidate.designation);
        if (candidate.desired_company) {
          const match = companies.find(
            (c) => c.name.toLowerCase() === candidate.desired_company.toLowerCase()
          );
          if (match) setFormCompanyId(match.id);
        }
      }
    }
  };

  // Submit Promotion
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeCode.trim()) {
      setFormError('Employee Code is required.');
      return;
    }
    if (!formCandidateName.trim()) {
      setFormError('Candidate name is required.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Destination email is required.');
      return;
    }
    if (!formApplicationId && !formJoiningFormId) {
      setFormError('Please select an eligible candidate to promote.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const res = await createOrPromoteEmployee(
        {
          applicationId: formApplicationId,
          joiningFormId: formJoiningFormId,
          companyId: formCompanyId || null,
          employeeCode: formEmployeeCode.trim(),
          candidateName: formCandidateName.trim(),
          email: formEmail.trim(),
          mobile: formMobile.trim() || null,
          joiningReference: formJoiningRef || null,
          designation: formDesignation.trim(),
          department: formDepartment.trim(),
          location: formLocation.trim(),
          joiningDate: formJoiningDate,
          employmentStatus: formStatus
        },
        user?.id
      );

      if (!res.success || !res.employee) {
        throw new Error(res.error || 'Failed to create official employee record.');
      }

      setSuccessMessage(
        `Successfully promoted ${res.employee.candidate_name} to official Employee (${res.employee.employee_code}).`
      );
      setIsPromoteModalOpen(false);
      fetchDirectory();
    } catch (err: any) {
      setFormError(err.message || 'Promotion failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={24} style={{ color: 'var(--color-champagne-dark)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
              EMPLOYEE MASTER DIRECTORY
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Operational workforce register, company deployment tracking, and separate Identity Card governance.
          </p>
        </div>

        {/* Primary Action Button */}
        {canManage && (
          <button
            type="button"
            onClick={handleOpenPromoteModal}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.875rem'
            }}
          >
            <Plus size={16} />
            <span>ADD / PROMOTE EMPLOYEE</span>
          </button>
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

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Headcount
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Official master records
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
            Active Workforce
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            On active duty
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
            Probation
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E40AF', marginTop: '0.25rem' }}>
            {stats.probation}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Evaluation phase
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FEF08A',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854D0E', textTransform: 'uppercase' }}>
            On Leave
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#854D0E', marginTop: '0.25rem' }}>
            {stats.onLeave}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Approved leave of absence
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Exited / Archived
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#64748B', marginTop: '0.25rem' }}>
            {stats.resignedOrTerminated}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Non-destructive separation
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }}
          />
          <input
            type="text"
            placeholder="Search employee code, name, designation, dept, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Company Filter */}
        <div style={{ flex: '0 1 220px' }}>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="form-control form-select"
            style={{ width: '100%' }}
          >
            <option value="ALL">All Companies</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} {!comp.active ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmploymentStatus | 'ALL')}
            className="form-control form-select"
            style={{ width: '100%' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Department Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="form-control form-select"
            style={{ width: '100%' }}
          >
            <option value="ALL">All Departments</option>
            {distinctDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {(searchQuery || companyFilter !== 'ALL' || statusFilter !== 'ALL' || departmentFilter !== 'ALL') && (
          <button
            onClick={resetFilters}
            type="button"
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              padding: '0.5rem 0.85rem'
            }}
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Directory Table / Empty State Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2
              size={32}
              className="animate-spin"
              style={{ margin: '0 auto 1rem', color: 'var(--color-champagne-dark)' }}
            />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Loading employee master records...
            </p>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={48} style={{ color: '#CBD5E1', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0 0 0.5rem' }}>
              No Employee Records Found
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {searchQuery || companyFilter !== 'ALL' || statusFilter !== 'ALL' || departmentFilter !== 'ALL'
                ? 'No employee records match your current filter criteria. Try clearing filters.'
                : 'No candidates have been promoted to official employee records yet.'}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenPromoteModal}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Promote First Employee</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Employee Code
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Candidate Name
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Origin / Source
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Assigned Company
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Designation & Dept
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Location
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Joining Date
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    ID Card
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const statusInfo = STATUS_CONFIG[emp.employment_status] || {
                    label: emp.employment_status,
                    color: '#475569',
                    bg: '#F1F5F9',
                    border: '#CBD5E1'
                  };

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Code */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <Link
                          to={ADMIN_ROUTES.employeeDetail(emp.id)}
                          style={{
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: 'var(--color-midnight-navy)',
                            textDecoration: 'none'
                          }}
                        >
                          {emp.employee_code}
                        </Link>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>
                          {emp.candidate_name || 'Unnamed Employee'}
                        </div>
                        {emp.mobile && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                            {formatIndianPhoneNumber(emp.mobile)}
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {emp.joining_form_id ? (
                          <Link
                            to={ADMIN_ROUTES.joiningDetail(emp.joining_form_id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              textDecoration: 'none'
                            }}
                            title="Standalone Joining Candidate"
                          >
                            <FileCheck2 size={12} />
                            <span>{emp.joining_reference || 'Joining Form'}</span>
                          </Link>
                        ) : emp.application_id ? (
                          <Link
                            to={ADMIN_ROUTES.applicationDetail(emp.application_id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                              textDecoration: 'none'
                            }}
                            title="Application Candidate"
                          >
                            <UserCheck size={12} />
                            <span>{emp.application?.application_number || 'Application'}</span>
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                        )}
                      </td>

                      {/* Company */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem' }}>
                        {emp.company ? (
                          <Link
                            to={ADMIN_ROUTES.companyDetail(emp.company.id)}
                            style={{
                              color: 'var(--color-midnight-navy)',
                              textDecoration: 'none',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Building2 size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            <span>{emp.company.name}</span>
                          </Link>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Designation & Dept */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.8125rem' }}>
                          {emp.designation || 'Associate'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                          {emp.department || 'Operations'}
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={13} style={{ color: '#94A3B8' }} />
                          <span>{emp.location || 'Nagpur'}</span>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#475569', fontFamily: 'monospace' }}>
                        {emp.joining_date || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: statusInfo.color,
                            backgroundColor: statusInfo.bg,
                            border: `1px solid ${statusInfo.border}`
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* ID Card Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {emp.id_card_number ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#166534',
                              backgroundColor: '#DCFCE7',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #BBF7D0'
                            }}
                          >
                            <CreditCard size={12} />
                            <span>{emp.id_card_number}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#854D0E',
                              backgroundColor: '#FEF9C3',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #FEF08A'
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          to={ADMIN_ROUTES.employeeDetail(emp.id)}
                          className="btn btn-outline"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion / Creation Modal */}
      {isPromoteModalOpen && (
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0'
            }}
          >
            {/* Modal Header */}
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
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  PROMOTE CANDIDATE TO OFFICIAL EMPLOYEE
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  Select candidate source (Standalone Joining Form or Application) to generate official Master Record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Modal Error Alert */}
              {formError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Source Selection Tabs */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  1. Candidate Origin Source
                </label>
                <div className="admin-modal-grid-2col" style={{ gap: '0.5rem', backgroundColor: '#F1F5F9', padding: '0.35rem', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateSourceTab('JOINING');
                      setSelectedCandidateId('');
                    }}
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: candidateSourceTab === 'JOINING' ? '#FFFFFF' : 'transparent',
                      color: candidateSourceTab === 'JOINING' ? 'var(--color-midnight-navy)' : '#64748B',
                      boxShadow: candidateSourceTab === 'JOINING' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Standalone Joining Form ({eligibleCandidates.standaloneJoiningCandidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateSourceTab('APPLICATION');
                      setSelectedCandidateId('');
                    }}
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: candidateSourceTab === 'APPLICATION' ? '#FFFFFF' : 'transparent',
                      color: candidateSourceTab === 'APPLICATION' ? 'var(--color-midnight-navy)' : '#64748B',
                      boxShadow: candidateSourceTab === 'APPLICATION' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Application Candidate ({eligibleCandidates.applicationCandidates.length})
                  </button>
                </div>
              </div>

              {/* Candidate Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  2. Select Eligible Candidate *
                </label>
                {candidateSourceTab === 'JOINING' ? (
                  eligibleCandidates.standaloneJoiningCandidates.length === 0 ? (
                    <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.8125rem', color: '#64748B', fontStyle: 'italic' }}>
                      No un-promoted submitted standalone joining forms available.
                    </div>
                  ) : (
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => handleSelectCandidate(e.target.value)}
                      required
                      className="form-control form-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Choose Candidate from Submitted Joining Forms --</option>
                      {eligibleCandidates.standaloneJoiningCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.joining_reference} — {c.employee_name} ({c.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  )
                ) : eligibleCandidates.applicationCandidates.length === 0 ? (
                  <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.8125rem', color: '#64748B', fontStyle: 'italic' }}>
                    No un-promoted ready application candidates available.
                  </div>
                ) : (
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => handleSelectCandidate(e.target.value)}
                    required
                    className="form-control form-select"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Choose Candidate from Applications --</option>
                    {eligibleCandidates.applicationCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.application_number} — {c.full_name} ({c.desired_company} | {c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Operational Fields Grid */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  3. Operational Master Fields
                </label>

                <div className="admin-modal-grid-2col" style={{ gap: '0.85rem' }}>
                  {/* Code */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Employee Code *
                    </label>
                    <input
                      type="text"
                      value={formEmployeeCode}
                      onChange={(e) => setFormEmployeeCode(e.target.value)}
                      placeholder="e.g. ATG-EMP-2026-0001"
                      required
                      className="form-control"
                      style={{ fontWeight: 800, fontFamily: 'monospace' }}
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Candidate Name *
                    </label>
                    <input
                      type="text"
                      value={formCandidateName}
                      onChange={(e) => setFormCandidateName(e.target.value)}
                      placeholder="Official employee name"
                      required
                      className="form-control"
                      style={{ fontWeight: 600 }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Authoritative Email *
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="employee@domain.com"
                      required
                      className="form-control"
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Official Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="form-control"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Company Assignment
                    </label>
                    <select
                      value={formCompanyId}
                      onChange={(e) => setFormCompanyId(e.target.value)}
                      className="form-control form-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- No Specific Company (General Operations) --</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} {!comp.active ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Designation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                      placeholder="e.g. Senior Associate"
                      className="form-control"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Department
                    </label>
                    <input
                      type="text"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      placeholder="e.g. Operations, IT"
                      className="form-control"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Work Location
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Nagpur, Maharashtra"
                      className="form-control"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Official Joining Date
                    </label>
                    <input
                      type="date"
                      value={formJoiningDate}
                      onChange={(e) => setFormJoiningDate(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Initial Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as EmploymentStatus)}
                      className="form-control form-select"
                      style={{ width: '100%' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PROBATION">PROBATION</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  disabled={formSubmitting}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !selectedCandidateId}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8125rem',
                    padding: '0.55rem 1.25rem'
                  }}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creating Master Record...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 size={14} />
                      <span>Confirm & Create Employee Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
