// ==============================================================================
// File: src/pages/admin/AdminJoiningListPage.tsx
// Description: Admin management table for standalone joining submissions
// Brand: A TIGER GROUPS — Candidate Joining Register
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileCheck2,
  Calendar,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';
import { exportJoiningFormsXlsx } from '../../services/adminJoiningExportService';
import { deleteJoiningForm } from '../../services/joiningService';

interface JoiningListItem {
  id: string;
  joiningReference: string;
  candidateName: string;
  email: string;
  mobile: string;
  submissionStatus: string;
  workflowType: 'REGULAR' | 'STANDARD';
  submittedAt: string | null;
  createdAt: string;
}

export const AdminJoiningListPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<JoiningListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);

  // Deletion modal state
  const [pendingDeleteItem, setPendingDeleteItem] = useState<JoiningListItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [workflowFilter, setWorkflowFilter] = useState<string>('ALL');

  const fetchJoiningList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('joining_forms')
        .select(`
          id,
          joining_reference,
          employee_code,
          candidate_name,
          email,
          employee_contact_number,
          submission_status,
          custom_fields,
          submitted_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('submission_status', statusFilter as any);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      const mapped: JoiningListItem[] = (data || []).map((row: any) => {
        const isRegular =
          row.workflow_type === 'REGULAR' ||
          row.custom_fields?.workflowType === 'REGULAR' ||
          (row.joining_reference && String(row.joining_reference).startsWith('ATG-')) ||
          (row.employee_code && String(row.employee_code).startsWith('ATG-'));

        return {
          id: row.id,
          joiningReference: row.employee_code || row.joining_reference || 'PENDING',
          candidateName: row.candidate_name || 'Candidate',
          email: row.email || 'N/A',
          mobile: row.employee_contact_number ? formatIndianPhoneNumber(row.employee_contact_number) : 'N/A',
          submissionStatus: row.submission_status || 'DRAFT',
          workflowType: isRegular ? 'REGULAR' : 'STANDARD',
          submittedAt: row.submitted_at,
          createdAt: row.created_at
        };
      });

      setItems(mapped);
    } catch (err: any) {
      console.error('[AdminJoiningList] Error fetching joining submissions:', err);
      setError(err.message || 'Failed to load joining submissions.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchJoiningList();
  }, [fetchJoiningList]);

  // Client search and workflow filter across fields
  const filteredItems = items.filter((item) => {
    if (workflowFilter !== 'ALL' && item.workflowType !== workflowFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.joiningReference.toLowerCase().includes(q) ||
      item.candidateName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.mobile.toLowerCase().includes(q)
    );
  });

  // Handler: Quick Export to Excel (5 Sheets)
  const handleQuickExportXlsx = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportSuccessNotice(null);
      const res = await exportJoiningFormsXlsx({
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setExportSuccessNotice(
        `Successfully exported ${res.recordCount} Joining Submission dossiers to ${res.filename} (5 worksheets).`
      );
      setTimeout(() => setExportSuccessNotice(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Failed to export joining submissions to Excel.');
    } finally {
      setExporting(false);
    }
  };

  // Handler: Confirm and execute permanent deletion of joining form
  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteJoiningForm(pendingDeleteItem.id);

      if (!res.success) {
        throw new Error(res.error || 'Failed to delete joining form.');
      }

      const deletedRef = pendingDeleteItem.joiningReference;
      setShowDeleteModal(false);
      setPendingDeleteItem(null);

      // Immediately filter out the deleted item from state
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteItem.id));

      // Show success notification
      setDeleteSuccessNotice(`Joining form ${deletedRef} deleted successfully.`);
      setTimeout(() => setDeleteSuccessNotice(null), 6000);
    } catch (err: any) {
      console.error('[AdminJoiningList] Deletion error:', err);
      setDeleteError(err?.message || 'Failed to delete joining form.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <FileCheck2 size={22} style={{ color: '#C5A880' }} />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F1B38' }}>
              JOINING SUBMISSIONS
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>
            Candidate onboarding dossiers and employee verification records received through magic link auth.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/admin/regular-joining')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              border: '1px solid #C5A059',
              borderRadius: '6px',
              backgroundColor: '#C5A059',
              color: '#0F1B38',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileCheck2 size={15} />
            <span>Regular Joining Form</span>
          </button>

          <button
            onClick={handleQuickExportXlsx}
            disabled={exporting || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              border: '1px solid #1E3A8A',
              borderRadius: '6px',
              backgroundColor: '#1E3A8A',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: exporting || loading ? 'not-allowed' : 'pointer',
              opacity: exporting || loading ? 0.7 : 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={14} />
            <span>{exporting ? 'Generating Excel...' : 'Export Excel (5 Sheets)'}</span>
          </button>

          <button
            onClick={fetchJoiningList}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.55rem 1rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Success alert */}
      {exportSuccessNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            color: '#2E7D32',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{exportSuccessNotice}</span>
        </div>
      )}

      {/* Delete success alert */}
      {deleteSuccessNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            color: '#2E7D32',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{deleteSuccessNotice}</span>
        </div>
      )}

      {/* Error alert */}
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
            fontSize: '0.875rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar / Search & Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid #E2E8F0'
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
          />
          <input
            type="text"
            placeholder="Search by ref (JOIN-...), name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} style={{ color: '#64748B' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                backgroundColor: '#FFFFFF',
                color: '#334155'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              backgroundColor: '#FFFFFF',
              color: '#334155'
            }}
          >
            <option value="ALL">All Workflows</option>
            <option value="REGULAR">Regular Joining Form</option>
            <option value="STANDARD">Standard Portal</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
          Showing {filteredItems.length} submission{filteredItems.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="admin-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>Loading joining submissions...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
            <FileCheck2 size={38} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1rem', color: '#1E293B', marginBottom: '0.25rem' }}>No Submissions Found</h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {searchQuery || statusFilter !== 'ALL' || workflowFilter !== 'ALL'
                ? 'Try adjusting your search criteria.'
                : 'No candidate joining submissions have been created yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Joining Reference</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Candidate Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Workflow</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mobile</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Submission Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.1s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/admin/joining/${item.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Reference */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0F1B38',
                            backgroundColor: '#F1F5F9',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            fontSize: '0.82rem'
                          }}
                        >
                          {item.joiningReference}
                        </span>
                      </td>

                      {/* Candidate Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={14} style={{ color: '#94A3B8' }} />
                          <span>{item.candidateName}</span>
                        </div>
                      </td>

                      {/* Workflow Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {item.workflowType === 'REGULAR' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#0F1B38',
                              color: '#C5A059',
                              border: '1px solid #C5A059',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              letterSpacing: '0.02em'
                            }}
                          >
                            Regular Joining
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                              fontSize: '0.72rem',
                              fontWeight: 600
                            }}
                          >
                            Standard Portal
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={13} style={{ color: '#94A3B8' }} />
                          <span>{item.email}</span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={13} style={{ color: '#94A3B8' }} />
                          <span>{item.mobile}</span>
                        </div>
                      </td>

                      {/* Submission Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {item.submissionStatus === 'VERIFIED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>VERIFIED</span>
                          </span>
                        ) : item.submissionStatus === 'REJECTED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                              border: '1px solid #FECACA',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <AlertCircle size={12} />
                            <span>REJECTED</span>
                          </span>
                        ) : item.submissionStatus === 'SUBMITTED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Clock size={12} />
                            <span>PENDING VERIFICATION</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            <Clock size={12} />
                            <span>DRAFT</span>
                          </span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} style={{ color: '#94A3B8' }} />
                          <span>
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleDateString()
                              : 'Not Submitted'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/joining/${item.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F1B38',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                            <span>REVIEW</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteItem(item);
                              setShowDeleteModal(true);
                              setDeleteError(null);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEE2E2';
                              e.currentTarget.style.borderColor = '#EF4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEF2F2';
                              e.currentTarget.style.borderColor = '#FCA5A5';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>DELETE</span>
                          </button>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && pendingDeleteItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setPendingDeleteItem(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#DC2626'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38' }}>
                  Delete Joining Form?
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
                  Are you sure you want to permanently delete this joining form?
                </p>
              </div>
            </div>

            {/* Candidate & Reference Card */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Candidate:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{pendingDeleteItem.candidateName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Reference:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0F1B38',
                    backgroundColor: '#E2E8F0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.82rem'
                  }}
                >
                  {pendingDeleteItem.joiningReference}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Status:</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: pendingDeleteItem.submissionStatus === 'SUBMITTED' ? '#15803D' : '#92400E'
                  }}
                >
                  {pendingDeleteItem.submissionStatus}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#DC2626', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertCircle size={14} />
              <span>This action cannot be undone.</span>
            </p>

            {deleteError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                  color: '#DC2626',
                  fontWeight: 600
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPendingDeleteItem(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isDeleting ? '#EF4444' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.75 : 1,
                  boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Deleting Permanently...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
