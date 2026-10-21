// ==============================================================================
// File: src/pages/admin/AdminOperatorDashboardPage.tsx
// Description: Dedicated, Restricted Dashboard for Regular Joining Operators
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Strictly scoped to regular joining workflow (zero access to general apps, finance, etc.)
// ==============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  FileCheck2,
  FilePlus2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  FileText,
  Eye,
  Edit3
} from 'lucide-react';

interface RecentRegularSubmission {
  id: string;
  candidateName: string;
  employeeCode: string;
  department: string;
  designation: string;
  submissionStatus: string;
  createdAt: string;
}

export const AdminOperatorDashboardPage: React.FC = () => {
  const { user, profile } = useAdminAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Scoped metrics
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [draftSubmissions, setDraftSubmissions] = useState<number>(0);
  const [verifiedSubmissions, setVerifiedSubmissions] = useState<number>(0);
  const [mySubmissionsCount, setMySubmissionsCount] = useState<number>(0);

  // Recent regular joinings
  const [recentRecords, setRecentRecords] = useState<RecentRegularSubmission[]>([]);

  const fetchOperatorDashboard = useCallback(async () => {
    setError(null);
    try {
      // 1. Fetch count of total regular joinings
      const totalQuery = supabase
        .from('joining_forms')
        .select('*', { count: 'exact', head: true })
        .or('workflow_type.eq.REGULAR,joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%');

      // 2. Draft count
      const draftQuery = supabase
        .from('joining_forms')
        .select('*', { count: 'exact', head: true })
        .or('workflow_type.eq.REGULAR,joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%')
        .eq('submission_status', 'DRAFT');

      // 3. Verified count (ready for reference slips & ID cards)
      const verifiedQuery = supabase
        .from('joining_forms')
        .select('*', { count: 'exact', head: true })
        .or('workflow_type.eq.REGULAR,joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%')
        .eq('submission_status', 'VERIFIED');

      // 4. Fetch recent 6 regular joining records
      const recentQuery = supabase
        .from('joining_forms')
        .select('id, candidate_name, employee_code, joining_reference, department, designation, submission_status, created_at, custom_fields')
        .or('workflow_type.eq.REGULAR,joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%')
        .order('created_at', { ascending: false })
        .limit(6);

      const [totalRes, draftRes, verifiedRes, recentRes] = await Promise.all([
        totalQuery,
        draftQuery,
        verifiedQuery,
        recentQuery
      ]);

      if (totalRes.error) throw totalRes.error;

      setTotalSubmissions(totalRes.count ?? 0);
      setDraftSubmissions(draftRes.count ?? 0);
      setVerifiedSubmissions(verifiedRes.count ?? 0);

      // Map recent records
      const mapped: RecentRegularSubmission[] = (recentRes.data || []).map((row: any) => ({
        id: row.id,
        candidateName: row.candidate_name || 'Unnamed Candidate',
        employeeCode: row.employee_code || row.joining_reference || 'ATG-PENDING',
        department: row.department || 'Operations',
        designation: row.designation || 'Associate',
        submissionStatus: (row.submission_status || 'DRAFT').toUpperCase(),
        createdAt: row.created_at
      }));

      setRecentRecords(mapped);

      // Calculate my submissions if tracked
      if (user?.id) {
        const myCount = (recentRes.data || []).filter((r: any) => {
          const cust = r.custom_fields || {};
          return cust.created_by_admin_id === user.id || cust.operator_id === user.id;
        }).length;
        setMySubmissionsCount(myCount);
      }
    } catch (err: any) {
      console.error('[OperatorDashboard] Fetch error:', err);
      setError(err?.message || 'Failed to load operator metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOperatorDashboard();
  }, [fetchOperatorDashboard]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchOperatorDashboard();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F1B38 0%, #192A56 100%)',
          borderRadius: '14px',
          padding: '1.75rem 2rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 4px 20px rgba(15, 27, 56, 0.15)',
          border: '1px solid rgba(247, 215, 148, 0.2)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#192A56',
                backgroundColor: '#F7D794',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.04em'
              }}
            >
              OPERATOR WORKSPACE
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(252, 251, 251, 0.65)' }}>
              A TIGER GROUPS Internal Administration
            </span>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FCFBFB', margin: '0 0 0.35rem 0' }}>
            Welcome, {profile?.full_name || 'Joining Operator'}
          </h1>

          <p style={{ fontSize: '0.875rem', color: 'rgba(252, 251, 251, 0.75)', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            You have secure, dedicated access to the <strong>Regular Joining Form workflow</strong>. Create candidate joining records, upload statutory documentation, and generate official Reference Slips and Employee ID Cards.
          </p>
        </div>

        {/* Quick Action in Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to={ADMIN_ROUTES.regularJoining}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#F7D794',
              color: '#192A56',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(247, 215, 148, 0.3)',
              transition: 'transform 0.15s ease'
            }}
          >
            <FilePlus2 size={16} />
            <span>New Joining Form</span>
          </Link>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Total Regular Joinings */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Regular Joinings
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F1B38', marginTop: '0.25rem' }}>
              {loading ? '—' : totalSubmissions}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
              Registered ATG employee dossiers
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FileCheck2 size={22} />
          </div>
        </div>

        {/* Draft Records */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Drafts & Pending
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#D97706', marginTop: '0.25rem' }}>
              {loading ? '—' : draftSubmissions}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
              Incomplete or draft submissions
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Clock size={22} />
          </div>
        </div>

        {/* Verified Records */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Verified Candidates
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803D', marginTop: '0.25rem' }}>
              {loading ? '—' : verifiedSubmissions}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
              Reference Slips & ID Cards Ready
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Workflow Security Badge */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              My Submissions Logged
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F1B38', marginTop: '0.25rem' }}>
              {loading ? '—' : mySubmissionsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, marginTop: '0.35rem' }}>
              ● Operator Access Active
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              color: '#0F1B38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Action Gateway Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Gateway 1: New Regular Joining Form */}
        <div
          onClick={() => navigate(ADMIN_ROUTES.regularJoining)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0F1B38';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 27, 56, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#0F1B38',
                  color: '#F7D794',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FilePlus2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38', margin: 0 }}>
                Regular Joining Form
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Register a new candidate, generate a collision-safe sequential ATG employee code (ATG-501-2026), capture live camera photos, and upload Aadhaar, Bank Passbook, and Signature documents.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1E40AF', fontSize: '0.85rem', fontWeight: 700 }}>
            <span>Open Candidate Entry Form</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Gateway 2: Joining Submissions Register */}
        <div
          onClick={() => navigate(ADMIN_ROUTES.regularJoiningList)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0F1B38';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 27, 56, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#1E40AF',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileCheck2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38', margin: 0 }}>
                Joining Submissions Register
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Inspect candidate submissions, view uploaded verification documents, generate official 1-page Employee Reference Slips, and produce authoritative Employee Identity Cards.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1E40AF', fontSize: '0.85rem', fontWeight: 700 }}>
            <span>View Submissions Directory</span>
            <ArrowRight size={15} />
          </div>
        </div>
      </div>

      {/* Recent Regular Submissions Table */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1B38', margin: 0 }}>
              Recent Joining Submissions
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Recently processed regular candidate records and generation readiness
            </div>
          </div>

          <Link
            to={ADMIN_ROUTES.regularJoiningList}
            style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              color: '#1E40AF',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>View All Records</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
            <FileText size={40} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1rem', color: '#1E293B', marginBottom: '0.25rem' }}>No Submissions Yet</h3>
            <p style={{ fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              Start by creating the first candidate regular joining form.
            </p>
            <Link
              to={ADMIN_ROUTES.regularJoining}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <FilePlus2 size={15} />
              <span>Create Joining Form</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1.25rem' }}>Candidate</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department & Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((item) => {
                  const isVerified = item.submissionStatus === 'VERIFIED';
                  const isDraft = item.submissionStatus === 'DRAFT';
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Candidate Name */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F1B38' }}>{item.candidateName}</div>
                      </td>

                      {/* Employee Code */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#0F1B38',
                            backgroundColor: '#F1F5F9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          {item.employeeCode}
                        </span>
                      </td>

                      {/* Department / Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ color: '#1E293B', fontWeight: 600 }}>{item.designation}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.department}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isVerified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <CheckCircle2 size={11} />
                            <span>VERIFIED</span>
                          </span>
                        ) : isDraft ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Clock size={11} />
                            <span>DRAFT</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <FileCheck2 size={11} />
                            <span>{item.submissionStatus}</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/regular-joining?id=${item.id}`)}
                            title="Edit or review joining form"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '4px 8px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#0F1B38',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/admin/joining/${item.id}`)}
                            title="View dossier & documents"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '4px 8px',
                              backgroundColor: '#0F1B38',
                              border: '1px solid #0F1B38',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#FFFFFF',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={12} />
                            <span>Dossier</span>
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
    </div>
  );
};
