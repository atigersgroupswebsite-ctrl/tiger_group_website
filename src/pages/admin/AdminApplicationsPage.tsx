// ==============================================================================
// File: src/pages/admin/AdminApplicationsPage.tsx
// Description: Applications Management with Server-Side Search, Filter, & Pagination
// Brand: A TIGER GROUPS — Operational Table System
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { ApplicationRow, ApplicationStatus, CompanyRow } from '../../types/database';
import { AdminTableToolbar } from '../../components/admin/AdminTableToolbar';
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

const PAGE_SIZE = 15;

const ALL_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'NEW_ENQUIRY', label: 'New Enquiry' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
  { value: 'INTERVIEW_SELECTED', label: 'Interview Selected' },
  { value: 'JOINING_ACCESS_GRANTED', label: 'Joining Access Granted' },
  { value: 'JOINING_SUBMITTED', label: 'Joining Submitted' },
  { value: 'VERIFICATION_PENDING', label: 'Verification Pending' },
  { value: 'VERIFIED_ACTIVE', label: 'Verified Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' }
];

export const AdminApplicationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch active company list for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error: compErr } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (compErr) {
        console.error('[Applications] Error fetching companies for filter:', compErr);
      } else if (data) {
        setCompanies(data as CompanyRow[]);
      }
    };
    fetchCompanies();
  }, []);

  // Server-side query with filters and pagination
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('applications')
        .select('*', { count: 'exact' });

      // Apply Search (across application_number, full_name, mobile, email)
      if (debouncedSearch) {
        query = query.or(
          `application_number.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%,mobile.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        );
      }

      // Apply Status filter
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter as ApplicationStatus);
      }

      // Apply Company filter
      if (companyFilter !== 'ALL') {
        query = query.eq('desired_company', companyFilter);
      }

      // Apply Date filter (All, Today, Last 7 Days, Last 30 Days)
      if (dateFilter !== 'ALL') {
        const now = new Date();
        if (dateFilter === 'TODAY') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte('created_at', startOfDay);
        } else if (dateFilter === 'WEEK') {
          const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', pastWeek);
        } else if (dateFilter === 'MONTH') {
          const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', pastMonth);
        }
      }

      // Order by created_at DESC
      query = query.order('created_at', { ascending: false });

      // Apply Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      if (queryError) {
        console.error('[Applications] Query error:', queryError);
        setError(`Failed to retrieve applications: ${queryError.message}`);
        setApplications([]);
        setTotalCount(0);
      } else {
        setApplications((data as ApplicationRow[]) || []);
        setTotalCount(count ?? 0);
      }
    } catch (err: unknown) {
      console.error('[Applications] Unexpected query failure:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, companyFilter, dateFilter, currentPage]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleRowClick = (id: string) => {
    navigate(`/admin/applications/${id}`);
  };

  return (
    <div>
      {/* Page Title Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#192A56',
              letterSpacing: '-0.02em',
              margin: '0 0 0.25rem 0'
            }}
          >
            Candidate Applications
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            Operational recruitment directory for A TIGER GROUPS registered candidates
          </p>
        </div>

        <button
          onClick={() => fetchApplications()}
          disabled={loading}
          className="btn-admin-secondary"
        >
          <RefreshCw
            size={15}
            style={{
              animation: loading ? 'spin 1s linear infinite' : 'none',
              color: '#192A56'
            }}
          />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <AdminTableToolbar>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
          <Search
            size={17}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B'
            }}
          />
          <input
            type="text"
            placeholder="Search by app #, name, mobile, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.6rem 0.75rem 0.6rem 2.3rem',
              backgroundColor: '#FCFBFB',
              border: '1px solid #D2CECE',
              borderRadius: '6px',
              color: '#192A56',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={15} color="#64748B" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                color: '#192A56',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building2 size={15} color="#64748B" />
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                color: '#192A56',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} color="#64748B" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                color: '#192A56',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
        </div>
      </AdminTableToolbar>

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#C9726F" />
          <span style={{ fontSize: '0.875rem', color: '#C9726F', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Applications Data Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Application No.</th>
                <th>Candidate</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Company</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                    Loading candidate applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <AdminEmptyState
                      title="No Matching Applications"
                      message="No candidate registrations match your active search and filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const formattedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={app.id}
                      onClick={() => handleRowClick(app.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 800, color: '#192A56', fontFamily: 'monospace' }}>
                        {app.application_number}
                      </td>
                      <td style={{ fontWeight: 700, color: '#192A56' }}>
                        {app.full_name}
                      </td>
                      <td style={{ color: '#4A5568', fontSize: '0.825rem' }}>
                        {app.email}
                      </td>
                      <td style={{ color: '#4A5568', fontSize: '0.825rem' }}>
                        {app.mobile}
                      </td>
                      <td style={{ color: '#192A56', fontWeight: 600 }}>
                        {app.desired_company || '—'}
                      </td>
                      <td style={{ color: '#64748B' }}>
                        {app.designation || '—'}
                      </td>
                      <td>
                        <AdminStatusBadge status={app.status} />
                      </td>
                      <td style={{ color: '#64748B', fontSize: '0.8rem' }}>
                        {formattedDate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(app.id);
                          }}
                          className="btn-admin-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>VIEW</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => setCurrentPage(p)}
          loading={loading}
        />
      </div>
    </div>
  );
};
