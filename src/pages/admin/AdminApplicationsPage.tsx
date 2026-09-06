// ==============================================================================
// File: src/pages/admin/AdminApplicationsPage.tsx
// Description: Candidate Applications Management with Server-Side Search,
//              Filtering, Pagination, and Route Navigation
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { ApplicationRow, ApplicationStatus, CompanyRow } from '../../types/database';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Building2,
  Users,
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
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch company list for filter dropdown
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
        // Supabase PostgREST ilike or filter
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
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading applications.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, companyFilter, currentPage]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleRowClick = (id: string) => {
    navigate(`/admin/applications/${id}`);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'NEW_ENQUIRY':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'JOINING_ACCESS_GRANTED':
      case 'JOINING_SUBMITTED':
      case 'VERIFIED_ACTIVE':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'INTERVIEW_SELECTED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#CBD5E1', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div>
      {/* Page Title Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              margin: '0 0 0.25rem 0'
            }}
          >
            Applications Directory
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
            Manage candidate submissions, joining access authorizations, and status lifecycles
          </p>
        </div>

        <button
          onClick={() => fetchApplications()}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            color: '#F8FAFC',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw
            size={15}
            style={{
              animation: loading ? 'spin 1s linear infinite' : 'none',
              color: '#F59E0B'
            }}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
          <Search
            size={18}
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
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              backgroundColor: '#090D16',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#64748B" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.65rem 0.75rem',
                backgroundColor: '#090D16',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.85rem',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} color="#64748B" />
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.65rem 0.75rem',
                backgroundColor: '#090D16',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.85rem',
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
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#F87171" />
          <span style={{ fontSize: '0.875rem', color: '#FCA5A5' }}>{error}</span>
        </div>
      )}

      {/* Applications Data Table */}
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: '#131D31', borderBottom: '1px solid #1E293B' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Application Number
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Candidate
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Email
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Mobile
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Desired Company
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Designation
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Created Date
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#F59E0B', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.875rem' }}>Loading applications from database...</div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B' }}>
                    <Users size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                    <div style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 600 }}>
                      No applications match your criteria
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      Try adjusting your search query, status filter, or company selection.
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const badge = getStatusBadgeStyle(app.status);
                  const formattedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={app.id}
                      onClick={() => handleRowClick(app.id)}
                      style={{
                        borderBottom: '1px solid #1E293B',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#131D31')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B', fontFamily: 'monospace' }}>
                        {app.application_number}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC' }}>
                        {app.full_name}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                        {app.email}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                        {app.mobile}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        {app.desired_company || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                        {app.designation || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                        {formattedDate}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(app.id);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            backgroundColor: '#1E293B',
                            color: '#F59E0B',
                            border: '1px solid #334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
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

        {/* Pagination Footer */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '0.825rem', color: '#64748B' }}>
            Showing {applications.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} applications
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: currentPage === 1 ? '#475569' : '#F8FAFC',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                color: '#94A3B8',
                fontWeight: 600
              }}
            >
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: currentPage >= totalPages ? '#475569' : '#F8FAFC',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
