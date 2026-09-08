// ==============================================================================
// File: src/pages/admin/AdminCompaniesPage.tsx
// Description: Company Directory Management for A Tiger Group's Admin Panel
// Access:
//   - SUPER_ADMIN: Full CRUD & status toggling
//   - COORDINATOR: Full CRUD & status toggling
//   - DOCUMENT_VERIFIER: Read-only view
//   - ACCOUNTANT: Read-only view
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getAllCompanies,
  createCompany,
  updateCompany,
  setCompanyActive,
  type CompanyRow,
  type CreateCompanyInput,
  type UpdateCompanyInput
} from '../../services/companyService';
import type { CompanyType } from '../../types/database';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Power,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Mail,
  Phone,
  MapPin
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

export const AdminCompaniesPage: React.FC = () => {
  const { role } = useAdminAuth();
  const canManage = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<CompanyType>('EMPLOYER_PARTNER');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deactivate/Activate target
  const [toggleStatusCompany, setToggleStatusCompany] = useState<CompanyRow | null>(null);
  const [toggling, setToggling] = useState<boolean>(false);

  // Data Fetching
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllCompanies({
        search: searchQuery,
        type: typeFilter,
        activeStatus: statusFilter
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load companies.');
      } else {
        setCompanies(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while fetching companies.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = companies.length;
    const groupBusinesses = companies.filter((c) => c.company_type === 'GROUP_BUSINESS').length;
    const employerPartners = companies.filter((c) => c.company_type === 'EMPLOYER_PARTNER').length;
    const activeCompanies = companies.filter((c) => c.active).length;
    return { total, groupBusinesses, employerPartners, activeCompanies };
  }, [companies]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormName('');
    setFormType('EMPLOYER_PARTNER');
    setFormAddress('');
    setFormEmail('');
    setFormPhone('');
    setFormActive(true);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (company: CompanyRow) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormType(company.company_type);
    setFormAddress(company.address || '');
    setFormEmail(company.contact_email || '');
    setFormPhone(company.contact_phone || '');
    setFormActive(company.active);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('Company Name is required (minimum 2 characters).');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const input: CreateCompanyInput = {
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

    const res = await createCompany(input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to create company.');
      return;
    }

    setSuccessMessage(`Company "${res.data.name}" created successfully.`);
    setIsCreateModalOpen(false);
    fetchCompanies();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !editingCompany) return;

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

    const res = await updateCompany(editingCompany.id, input);
    setFormSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to update company.');
      return;
    }

    setSuccessMessage(`Company "${res.data.name}" updated successfully.`);
    setIsEditModalOpen(false);
    fetchCompanies();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Execute Toggle Active Status
  const handleConfirmToggleStatus = async () => {
    if (!toggleStatusCompany || !canManage) return;

    setToggling(true);
    const nextStatus = !toggleStatusCompany.active;

    const res = await setCompanyActive(toggleStatusCompany.id, nextStatus);
    setToggling(false);

    if (!res.success || !res.data) {
      alert(res.error || 'Failed to update company status.');
      return;
    }

    setSuccessMessage(
      `Company "${toggleStatusCompany.name}" has been ${nextStatus ? 'activated' : 'deactivated'} successfully.`
    );
    setToggleStatusCompany(null);
    fetchCompanies();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
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
            <Building2 size={24} style={{ color: 'var(--color-champagne-dark)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
              COMPANIES DIRECTORY
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Manage A Tiger Group businesses, industrial manufacturing plants, and authorized employer partners.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
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
            <span>CREATE COMPANY</span>
          </button>
        )}
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

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
            Total Companies
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Registered ecosystem entities
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
            Group Businesses
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E40AF', marginTop: '0.25rem' }}>
            {stats.groupBusinesses}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            A Tiger Group subsidiaries
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
            Employer Partners
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#86198F', marginTop: '0.25rem' }}>
            {stats.employerPartners}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Approved manufacturing plants
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
            Active Facilities
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#065F46', marginTop: '0.25rem' }}>
            {stats.activeCompanies}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Available for candidate placement
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
            placeholder="Search company name, address, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Type Filter */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-control form-select"
            style={{ width: '100%' }}
          >
            <option value="ALL">All Company Types</option>
            <option value="GROUP_BUSINESS">Group Businesses</option>
            <option value="EMPLOYER_PARTNER">Employer Partners</option>
            <option value="OTHER">Other Facilities</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="form-control form-select"
            style={{ width: '100%' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Reset */}
        {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
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

      {/* Companies Table */}
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
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--color-champagne-dark)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading company records...</p>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Building2 size={48} style={{ color: '#CBD5E1', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0 0 0.5rem' }}>
              No Companies Found
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No company records match your current filter criteria. Try clearing filters.'
                : 'No companies have been added to the system yet.'}
            </p>
            {canManage && (
              <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                <Plus size={16} /> Create First Company
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Company Name
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Contact Information
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Address / Plant Location
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const typeCfg = COMPANY_TYPE_CONFIG[company.company_type] || COMPANY_TYPE_CONFIG.OTHER;
                  return (
                    <tr
                      key={company.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Name & ID */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <Link
                          to={`/admin/companies/${company.id}`}
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-midnight-navy)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Building2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
                          <span>{company.name}</span>
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                          ID: {company.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
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
                      </td>

                      {/* Contact info */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem' }}>
                        {company.contact_email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
                            <Mail size={13} style={{ color: '#94A3B8' }} />
                            <span>{company.contact_email}</span>
                          </div>
                        ) : null}
                        {company.contact_phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', marginTop: '0.2rem' }}>
                            <Phone size={13} style={{ color: '#94A3B8' }} />
                            <span>{formatIndianPhoneNumber(company.contact_phone)}</span>
                          </div>
                        ) : null}
                        {!company.contact_email && !company.contact_phone && (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No contact listed</span>
                        )}
                      </td>

                      {/* Address */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#475569', maxWidth: '280px' }}>
                        {company.address ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                            <MapPin size={14} style={{ color: '#94A3B8', flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {company.address}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Location not specified</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
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
                          {company.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Link
                            to={`/admin/companies/${company.id}`}
                            className="btn btn-outline"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="View Company Details & Linked Jobs/Employees"
                          >
                            <ExternalLink size={13} />
                            <span>Details</span>
                          </Link>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(company)}
                                className="btn btn-outline"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title="Edit Company Details"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => setToggleStatusCompany(company)}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${company.active ? '#FCA5A5' : '#86EFAC'}`,
                                  backgroundColor: company.active ? '#FEF2F2' : '#F0FDF4',
                                  color: company.active ? '#991B1B' : '#166534',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title={company.active ? 'Deactivate Company' : 'Activate Company'}
                              >
                                <Power size={13} />
                                <span>{company.active ? 'Deactivate' : 'Activate'}</span>
                              </button>
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

      {/* CREATE COMPANY MODAL */}
      {isCreateModalOpen && (
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
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
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
                <Building2 size={20} style={{ color: 'var(--color-champagne-dark)' }} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
                  CREATE NEW COMPANY
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  placeholder="e.g. Haldiram's Snacks Pvt. Ltd. or A Tiger Infrabuild"
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
                  placeholder="e.g. Plot No 68, Sector 68, IMT Manesar, Gurugram, Haryana"
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
                    placeholder="hr.plant@company.com"
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
                    placeholder="+91 98765 43210"
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
                  id="create_company_active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="create_company_active" style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  Active (Available for candidate placement and job postings)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  <span>Save Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMPANY MODAL */}
      {isEditModalOpen && editingCompany && (
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
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
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
                  EDIT COMPANY: {editingCompany.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
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
                  id="edit_company_active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="edit_company_active" style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
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
                  <span>Update Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE STATUS MODAL */}
      {toggleStatusCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: toggleStatusCompany.active ? '#FEF2F2' : '#F0FDF4',
                color: toggleStatusCompany.active ? '#DC2626' : '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}
            >
              <Power size={24} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)' }}>
              {toggleStatusCompany.active ? 'Deactivate Company?' : 'Activate Company?'}
            </h3>

            <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
              {toggleStatusCompany.active ? (
                <>
                  Are you sure you want to deactivate <strong>"{toggleStatusCompany.name}"</strong>? Deactivating will remove it from new candidate dossier assignments while preserving all historical employee and job records intact.
                </>
              ) : (
                <>
                  Are you sure you want to activate <strong>"{toggleStatusCompany.name}"</strong>? It will immediately become selectable for candidate deployments and job openings.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setToggleStatusCompany(null)}
                className="btn btn-outline"
                disabled={toggling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={toggling}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: toggleStatusCompany.active ? '#DC2626' : '#16A34A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {toggling && <Loader2 size={16} className="animate-spin" />}
                <span>{toggleStatusCompany.active ? 'Deactivate Now' : 'Activate Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
