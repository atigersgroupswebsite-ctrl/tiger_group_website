// ==============================================================================
// File: src/pages/admin/AdminDashboardPage.tsx
// Description: Live Aggregate Metric Dashboard and Recent Applications
// ==============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { ApplicationRow } from '../../types/database';
import {
  FileText,
  UserPlus,
  KeyRound,
  FileCheck,
  Clock,
  CheckCircle2,
  FileSearch,
  UserCheck2,
  Building,
  RefreshCw,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface MetricCount {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Metrics State
  const [totalApplications, setTotalApplications] = useState<number>(0);
  const [newEnquiries, setNewEnquiries] = useState<number>(0);
  const [joiningAccessEnabled, setJoiningAccessEnabled] = useState<number>(0);
  const [joiningFormsSubmitted, setJoiningFormsSubmitted] = useState<number>(0);
  const [paymentsPending, setPaymentsPending] = useState<number>(0);
  const [paymentsSuccessful, setPaymentsSuccessful] = useState<number>(0);
  const [docsPendingVerification, setDocsPendingVerification] = useState<number>(0);
  const [selectedCandidates, setSelectedCandidates] = useState<number>(0);
  const [activeEmployees, setActiveEmployees] = useState<number>(0);

  // Recent Applications
  const [recentApplications, setRecentApplications] = useState<ApplicationRow[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setError(null);
    try {
      // 1. Parallel database queries for real counts
      const [
        totalAppsRes,
        newEnqRes,
        joiningAccessRes,
        joiningFormsRes,
        payPendingRes,
        paySuccessRes,
        docsPendingRes,
        selectedCandidatesRes,
        activeEmployeesRes,
        recentAppsRes
      ] = await Promise.all([
        // Total Applications
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        // New Enquiries
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'NEW_ENQUIRY'),
        // Joining Access Enabled
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('joining_access_enabled', true),
        // Joining Forms Submitted
        supabase.from('joining_forms').select('*', { count: 'exact', head: true }).eq('submission_status', 'SUBMITTED'),
        // Payments Pending
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        // Payments Successful
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'SUCCESS'),
        // Documents Pending Verification
        supabase.from('documents').select('*', { count: 'exact', head: true }).in('verification_status', ['PENDING', 'UPLOADED']),
        // Selected Candidates
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'INTERVIEW_SELECTED'),
        // Active Employees
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'ACTIVE'),
        // Recent 5 Applications
        supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Check for query errors
      const errors = [
        totalAppsRes.error,
        newEnqRes.error,
        joiningAccessRes.error,
        joiningFormsRes.error,
        payPendingRes.error,
        paySuccessRes.error,
        docsPendingRes.error,
        selectedCandidatesRes.error,
        activeEmployeesRes.error,
        recentAppsRes.error
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('[Dashboard] Query error encountered:', errors[0]);
        setError(`Database query error: ${errors[0]?.message || 'Failed to retrieve metrics'}`);
      }

      // Assign counts (default to 0 if null)
      setTotalApplications(totalAppsRes.count ?? 0);
      setNewEnquiries(newEnqRes.count ?? 0);
      setJoiningAccessEnabled(joiningAccessRes.count ?? 0);
      setJoiningFormsSubmitted(joiningFormsRes.count ?? 0);
      setPaymentsPending(payPendingRes.count ?? 0);
      setPaymentsSuccessful(paySuccessRes.count ?? 0);
      setDocsPendingVerification(docsPendingRes.count ?? 0);
      setSelectedCandidates(selectedCandidatesRes.count ?? 0);
      setActiveEmployees(activeEmployeesRes.count ?? 0);

      if (recentAppsRes.data) {
        setRecentApplications(recentAppsRes.data as ApplicationRow[]);
      }
    } catch (err: unknown) {
      console.error('[Dashboard] Unexpected error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const metricCards: MetricCount[] = [
    {
      label: 'Total Applications',
      count: totalApplications,
      icon: FileText,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.12)',
      description: 'Cumulative candidate registrations'
    },
    {
      label: 'New Enquiries',
      count: newEnquiries,
      icon: UserPlus,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      description: 'Pending initial coordinator review'
    },
    {
      label: 'Joining Access Enabled',
      count: joiningAccessEnabled,
      icon: KeyRound,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      description: 'Candidates with unlocked joining forms'
    },
    {
      label: 'Joining Forms Submitted',
      count: joiningFormsSubmitted,
      icon: FileCheck,
      color: '#06B6D4',
      bgColor: 'rgba(6, 182, 212, 0.12)',
      description: 'Forms completed and submitted'
    },
    {
      label: 'Payments Pending',
      count: paymentsPending,
      icon: Clock,
      color: '#EC4899',
      bgColor: 'rgba(236, 72, 153, 0.12)',
      description: 'Processing or awaiting confirmation'
    },
    {
      label: 'Payments Successful',
      count: paymentsSuccessful,
      icon: CheckCircle2,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      description: 'Verified candidate fee receipts'
    },
    {
      label: 'Documents Pending Verification',
      count: docsPendingVerification,
      icon: FileSearch,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.12)',
      description: 'Uploaded docs awaiting admin audit'
    },
    {
      label: 'Selected Candidates',
      count: selectedCandidates,
      icon: UserCheck2,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      description: 'Cleared interview stage'
    },
    {
      label: 'Active Employees',
      count: activeEmployees,
      icon: Building,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      description: 'Onboarded corporate staff'
    }
  ];

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
      {/* Top Header & Refresh */}
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
            Operational Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
            Live aggregate telemetry from A TIGER GLOBAL database
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
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
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                color: '#F59E0B'
              }}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>

          <Link
            to="/admin/applications"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
            }}
          >
            <span>View All Applications</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#F87171" />
          <span style={{ fontSize: '0.875rem', color: '#FCA5A5' }}>{error}</span>
        </div>
      )}

      {/* 9 Aggregate Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {m.label}
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: m.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={20} color={m.color} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    lineHeight: 1,
                    marginBottom: '0.5rem'
                  }}
                >
                  {loading ? '—' : m.count.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {m.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Applications Section */}
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #1E293B'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 0.25rem 0' }}>
              Recent Candidate Applications
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
              Latest entries ordered by registration date (DESC)
            </p>
          </div>

          <Link
            to="/admin/applications"
            style={{
              fontSize: '0.825rem',
              color: '#F59E0B',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Applications Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E293B' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  App Number
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Candidate Name
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Desired Company
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Designation
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Applied Date
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.875rem' }}>
                    Loading recent applications...
                  </td>
                </tr>
              ) : recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                    <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 500 }}>
                      No applications recorded yet.
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      When candidates submit through the enquiry or career portal, they will appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                recentApplications.map((app) => {
                  const badge = getStatusBadgeStyle(app.status);
                  const formattedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid #1E293B',
                        transition: 'background 0.1s ease'
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
                        <Link
                          to={`/admin/applications/${app.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            backgroundColor: '#1E293B',
                            color: '#F59E0B',
                            border: '1px solid #334155',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          VIEW
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
