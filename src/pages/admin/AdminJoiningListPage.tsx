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
  AlertCircle
} from 'lucide-react';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';

interface JoiningListItem {
  id: string;
  joiningReference: string;
  candidateName: string;
  email: string;
  mobile: string;
  submissionStatus: string;
  submittedAt: string | null;
  createdAt: string;
}

export const AdminJoiningListPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<JoiningListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchJoiningList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('joining_forms')
        .select(`
          id,
          joining_reference,
          candidate_name,
          email,
          employee_contact_number,
          submission_status,
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

      const mapped: JoiningListItem[] = (data || []).map((row: any) => ({
        id: row.id,
        joiningReference: row.joining_reference || 'PENDING',
        candidateName: row.candidate_name || 'Candidate',
        email: row.email || 'N/A',
        mobile: row.employee_contact_number ? formatIndianPhoneNumber(row.employee_contact_number) : 'N/A',
        submissionStatus: row.submission_status || 'DRAFT',
        submittedAt: row.submitted_at,
        createdAt: row.created_at
      }));

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

  // Client search filter across fields
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.joiningReference.toLowerCase().includes(q) ||
      item.candidateName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.mobile.toLowerCase().includes(q)
    );
  });

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
            <option value="SUBMITTED">Submitted</option>
            <option value="DRAFT">Draft / In Progress</option>
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
              {searchQuery || statusFilter !== 'ALL'
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
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mobile</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Submission Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSubmitted = item.submissionStatus === 'SUBMITTED';

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
                        {isSubmitted ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>SUBMITTED</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '0.75rem',
                              fontWeight: 700
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
