// ==============================================================================
// File: src/pages/admin/AdminEmployerEnquiriesPage.tsx
// Description: Employer Corporate Manpower Requests Management
// Brand: A TIGER GROUPS — Branded Table System
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminNotifications } from '../../contexts/AdminNotificationContext';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import type { EmployerEnquiryRow, EmployerEnquiryStatus } from '../../types/database';
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
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Loader2
} from 'lucide-react';

const PAGE_SIZE = 15;

const ALL_EMPLOYER_STATUSES: { value: EmployerEnquiryStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'CONTRACTED', label: 'Contracted' },
  { value: 'CLOSED', label: 'Closed' }
];

export const AdminEmployerEnquiriesPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const { markEmployerEnquiryNotificationsAsRead } = useAdminNotifications();

  // Data states
  const [enquiries, setEnquiries] = useState<EmployerEnquiryRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View / Edit Modal State
  const [selectedEnquiry, setSelectedEnquiry] = useState<EmployerEnquiryRow | null>(null);
  const [editingStatus, setEditingStatus] = useState<EmployerEnquiryStatus>('NEW');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query employer enquiries
  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('employer_enquiries')
        .select('*', { count: 'exact' });

      // Apply Search (across company_name, email, phone, district, state, job_role)
      if (debouncedSearch) {
        query = query.or(
          `company_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,district.ilike.%${debouncedSearch}%,state.ilike.%${debouncedSearch}%,job_role.ilike.%${debouncedSearch}%`
        );
      }

      // Apply Status filter
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter as EmployerEnquiryStatus);
      }

      // Order by created_at DESC
      query = query.order('created_at', { ascending: false });

      // Apply Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      if (queryError) {
        console.error('[EmployerEnquiries] Query error:', queryError);
        setError(`Failed to retrieve enquiries: ${queryError.message}`);
        setEnquiries([]);
        setTotalCount(0);
      } else {
        setEnquiries((data as EmployerEnquiryRow[]) || []);
        setTotalCount(count ?? 0);
      }
    } catch (err: unknown) {
      console.error('[EmployerEnquiries] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, currentPage]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // When id param is present (e.g. opened directly or via notification link), auto-mark read and open modal
  useEffect(() => {
    if (!id) return;

    markEmployerEnquiryNotificationsAsRead(id);

    const found = enquiries.find((e) => e.id === id);
    if (found) {
      setSelectedEnquiry(found);
      setEditingStatus(found.status);
    } else {
      supabase
        .from('employer_enquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const row = data as EmployerEnquiryRow;
            setSelectedEnquiry(row);
            setEditingStatus(row.status);
          }
        });
    }
  }, [id, enquiries, markEmployerEnquiryNotificationsAsRead]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleOpenDetail = (enquiry: EmployerEnquiryRow) => {
    markEmployerEnquiryNotificationsAsRead(enquiry.id);
    setSelectedEnquiry(enquiry);
    setEditingStatus(enquiry.status);
    setSuccessMsg(null);
  };

  const handleCloseDetail = () => {
    setSelectedEnquiry(null);
    setSuccessMsg(null);
    if (id) {
      navigate(ADMIN_ROUTES.employerEnquiries, { replace: true });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedEnquiry || editingStatus === selectedEnquiry.status) return;

    setIsUpdatingStatus(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateErr } = await supabase
        .from('employer_enquiries')
        .update({
          status: editingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEnquiry.id);

      if (updateErr) throw new Error(updateErr.message);

      // Log in activity_logs
      await supabase.from('activity_logs').insert({
        application_id: null,
        admin_user_id: user?.id || null,
        action: 'EMPLOYER_ENQUIRY_STATUS_UPDATED',
        description: `Coordinator updated employer enquiry (${selectedEnquiry.company_name}) status to ${editingStatus}.`,
        metadata: {
          enquiry_id: selectedEnquiry.id,
          company_name: selectedEnquiry.company_name,
          new_status: editingStatus
        }
      });

      setSelectedEnquiry({ ...selectedEnquiry, status: editingStatus });
      setSuccessMsg(`Status updated to ${editingStatus} successfully.`);
      fetchEnquiries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update enquiry status.');
    } finally {
      setIsUpdatingStatus(false);
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
            Employer Enquiries
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            Corporate manpower requests submitted by businesses seeking workforce placement
          </p>
        </div>

        <button
          onClick={() => fetchEnquiries()}
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
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <AdminTableToolbar>
        {/* Search */}
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
            placeholder="Search by company, phone, email, district..."
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

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
            {ALL_EMPLOYER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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

      {/* Data Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Required Staff</th>
                <th>Job Role</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                    Loading corporate manpower requests...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <AdminEmptyState
                      title="No Employer Enquiries"
                      message="No employer requests match your current search or filter criteria."
                      icon={Building2}
                    />
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => {
                  const formattedDate = new Date(enq.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={enq.id}
                      onClick={() => handleOpenDetail(enq)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 700, color: '#192A56' }}>
                        {enq.company_name}
                      </td>
                      <td style={{ color: '#4A5568', fontSize: '0.825rem' }}>
                        {enq.email}
                      </td>
                      <td style={{ color: '#4A5568', fontSize: '0.825rem' }}>
                        {enq.phone}
                      </td>
                      <td style={{ color: '#64748B' }}>
                        {enq.district ? `${enq.district}, ${enq.state}` : enq.state || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#192A56' }}>
                        {enq.employees_required}
                      </td>
                      <td style={{ color: '#4A5568' }}>
                        {enq.job_role}
                      </td>
                      <td>
                        <AdminStatusBadge status={enq.status} />
                      </td>
                      <td style={{ color: '#64748B', fontSize: '0.8rem' }}>
                        {formattedDate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(enq);
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

      {/* Detail Modal */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 42, 86, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={handleCloseDetail}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2DFD8',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 40px -10px rgba(25, 42, 86, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid #E2DFD8',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#192A56',
                    margin: '0 0 0.25rem 0'
                  }}
                >
                  {selectedEnquiry.company_name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Submitted on {new Date(selectedEnquiry.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Success message */}
            {successMsg && (
              <div
                style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid #A5D6A7',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                  color: '#2E7D32',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Official Email
                </div>
                <div style={{ fontSize: '0.875rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
                  {selectedEnquiry.email}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Contact Phone
                </div>
                <div style={{ fontSize: '0.875rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
                  {selectedEnquiry.phone}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Employees Required
                </div>
                <div style={{ fontSize: '1rem', color: '#192A56', fontWeight: 800, marginTop: '2px' }}>
                  {selectedEnquiry.employees_required} Persons
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Job Role / Function
                </div>
                <div style={{ fontSize: '0.875rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
                  {selectedEnquiry.job_role}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Office / Plant Address
                </div>
                <div style={{ fontSize: '0.875rem', color: '#192A56', marginTop: '2px' }}>
                  {selectedEnquiry.address}, {selectedEnquiry.district}, {selectedEnquiry.state}
                </div>
              </div>

              {selectedEnquiry.description && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Requirement Description
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#4A5568',
                      backgroundColor: '#F8F9FA',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #E2DFD8',
                      marginTop: '4px',
                      lineHeight: 1.5
                    }}
                  >
                    {selectedEnquiry.description}
                  </div>
                </div>
              )}
            </div>

            {/* Status Update Control */}
            <div
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E2DFD8',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase' }}>
                  Update Enquiry Status
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Current status:{' '}
                  <strong style={{ color: '#192A56' }}>{selectedEnquiry.status}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value as EmployerEnquiryStatus)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    color: '#192A56',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                >
                  {ALL_EMPLOYER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={isUpdatingStatus || editingStatus === selectedEnquiry.status}
                  className="btn-admin-primary"
                  style={{ padding: '0.55rem 0.85rem' }}
                >
                  {isUpdatingStatus ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
