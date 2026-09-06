// ==============================================================================
// File: src/pages/admin/AdminDashboardPage.tsx
// Description: Live Aggregate Metric Dashboard and Recent Candidate Registrations
// Brand: A TIGER GROUPS — Unified Pearl White Canvas & Midnight Navy System
// ==============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { ApplicationRow } from '../../types/database';
import { AdminMetricCard } from '../../components/admin/AdminMetricCard';
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import {
  FileText,
  UserPlus,
  KeyRound,
  FileCheck,
  CreditCard,
  CheckCircle2,
  FileSearch,
  UserCheck2,
  Building,
  RefreshCw,
  ArrowRight,
  Download,
  AlertCircle,
  Eye
} from 'lucide-react';

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
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'NEW_ENQUIRY'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('joining_access_enabled', true),
        supabase.from('joining_forms').select('*', { count: 'exact', head: true }).eq('submission_status', 'SUBMITTED'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'SUCCESS'),
        supabase.from('documents').select('*', { count: 'exact', head: true }).in('verification_status', ['PENDING', 'UPLOADED']),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'INTERVIEW_SELECTED'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'ACTIVE'),
        supabase.from('applications').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

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

  return (
    <div>
      {/* Top Header & Fast Action Area */}
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
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#192A56',
              letterSpacing: '-0.02em',
              margin: '0 0 0.25rem 0'
            }}
          >
            Operational Overview
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            Real-time telemetry and candidate tracking across A TIGER GROUPS business units
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="btn-admin-secondary"
          >
            <RefreshCw
              size={15}
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                color: '#192A56'
              }}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link to="/admin/exports" className="btn-admin-secondary">
            <Download size={15} />
            <span>Exports</span>
          </Link>

          <Link to="/admin/applications" className="btn-admin-primary">
            <span>All Applications</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Error Alert if any (using Dusty Rose) */}
      {error && (
        <div
          style={{
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#C9726F" />
          <span style={{ fontSize: '0.875rem', color: '#C9726F', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Unified Metric Cards Grid (Pearl White Cards with Midnight Navy and Champagne accents) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        <AdminMetricCard
          label="Total Applications"
          count={totalApplications}
          icon={FileText}
          description="Cumulative candidate registrations"
          loading={loading}
        />
        <AdminMetricCard
          label="New Enquiries"
          count={newEnquiries}
          icon={UserPlus}
          description="Pending initial review"
          loading={loading}
        />
        <AdminMetricCard
          label="Joining Forms Submitted"
          count={joiningFormsSubmitted}
          icon={FileCheck}
          description="Completed digital packets"
          loading={loading}
        />
        <AdminMetricCard
          label="Joining Access Enabled"
          count={joiningAccessEnabled}
          icon={KeyRound}
          description="Candidates unlocked for submission"
          loading={loading}
        />
        <AdminMetricCard
          label="Payments"
          count={paymentsSuccessful}
          icon={paymentsSuccessful > 0 ? CheckCircle2 : CreditCard}
          description={paymentsPending > 0 ? `${paymentsPending} pending verification` : 'Verified candidate receipts'}
          loading={loading}
        />
        <AdminMetricCard
          label="Documents Pending"
          count={docsPendingVerification}
          icon={FileSearch}
          description="Files awaiting administrative verification"
          loading={loading}
        />
        <AdminMetricCard
          label="Selected Candidates"
          count={selectedCandidates}
          icon={UserCheck2}
          description="Cleared interview screening stage"
          loading={loading}
        />
        <AdminMetricCard
          label="Active Employees"
          count={activeEmployees}
          icon={Building}
          description="Corporate on-boarded personnel"
          loading={loading}
        />
      </div>

      {/* Recent Applications Section */}
      <div className="admin-table-container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2DFD8',
            backgroundColor: '#FFFFFF'
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#192A56',
                margin: '0 0 0.2rem 0'
              }}
            >
              Recent Candidate Registrations
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
              Latest 5 candidate entries ordered by creation date (DESC)
            </p>
          </div>

          <Link
            to="/admin/applications"
            style={{
              fontSize: '0.825rem',
              color: '#192A56',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>View Full Directory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>App No.</th>
                <th>Candidate</th>
                <th>Company</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    Loading recent applications...
                  </td>
                </tr>
              ) : recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState
                      title="No Applications Recorded"
                      message="When candidates submit an application through the website or career portal, they will appear here."
                    />
                  </td>
                </tr>
              ) : (
                recentApplications.map((app) => {
                  const formattedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 800, color: '#192A56', fontFamily: 'monospace' }}>
                        {app.application_number}
                      </td>
                      <td style={{ fontWeight: 700, color: '#192A56' }}>
                        {app.full_name}
                      </td>
                      <td style={{ color: '#4A5568' }}>
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
                        <Link
                          to={`/admin/applications/${app.id}`}
                          className="btn-admin-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>VIEW</span>
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
