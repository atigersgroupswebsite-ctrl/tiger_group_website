// ==============================================================================
// File: src/pages/admin/AdminApplicationDetailPage.tsx
// Description: Candidate Application Dossier Workspace:
//              Overview, Joining Review, Document Verification, Payment, and Audit Trails
// Brand: A TIGER GROUPS — Operational Administrative System
// Security:
//   - Strict Role-Based Access Controls (SUPER_ADMIN, DOCUMENT_VERIFIER, COORDINATOR, ACCOUNTANT)
//   - Sensitive PII (Aadhaar, PAN, Bank) masked with audited SUPER_ADMIN unmask action
//   - Private Storage retrieval via temporary signed URLs
//   - Audited actions recorded in activity_logs
// ==============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminNotifications } from '../../contexts/AdminNotificationContext';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import type {
  ApplicationRow,
  ApplicationStatus,
  JoiningFormRow,
  CompanyRow,
  DocumentRow,
  PaymentRow,
  EmployeeRow,
  ActivityLogRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  DeclarationRow,
  JobRow
} from '../../types/database';
import {
  getApplicationJoiningBundle,
  calculateDocumentVerificationStats
} from '../../services/adminDocumentService';
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge';
import { JoiningReview } from '../../components/admin/JoiningReview';
import { DocumentVerificationPanel } from '../../components/admin/DocumentVerificationPanel';
import { AdminPaymentPanel } from '../../components/admin/AdminPaymentPanel';
import {
  ArrowLeft,
  Lock,
  Unlock,
  User,
  FileText,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  LayoutDashboard,
  ShieldCheck,
  FileCheck,
  Briefcase
} from 'lucide-react';

export type ApplicationDetailTab =
  | 'overview'
  | 'joining'
  | 'documents'
  | 'payment'
  | 'reference-slip'
  | 'employee'
  | 'activity';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
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

interface AdminApplicationDetailPageProps {
  defaultTab?: ApplicationDetailTab;
}

export const AdminApplicationDetailPage: React.FC<AdminApplicationDetailPageProps> = ({ defaultTab }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAdminAuth();
  const { markApplicationNotificationsAsRead } = useAdminNotifications();

  // Role Permissions
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const canVerify = profile?.role === 'SUPER_ADMIN' || profile?.role === 'DOCUMENT_VERIFIER' || profile?.role === 'COORDINATOR';
  const canEditCompanyInfo = profile?.role === 'SUPER_ADMIN' || profile?.role === 'COORDINATOR';
  const canManagePayments = isSuperAdmin || profile?.role === 'COORDINATOR' || profile?.role === 'ACCOUNTANT';

  // Active Tab state synced with URL
  const [activeTab, setActiveTab] = useState<ApplicationDetailTab>(() => {
    if (defaultTab) return defaultTab;
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as ApplicationDetailTab | null;
    if (tabParam && ['overview', 'joining', 'documents', 'payment', 'reference-slip', 'employee', 'activity'].includes(tabParam)) {
      return tabParam;
    }
    if (window.location.pathname.endsWith('/documents')) return 'documents';
    if (window.location.pathname.endsWith('/joining')) return 'joining';
    return 'overview';
  });

  // Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [confirmNumberInput, setConfirmNumberInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Primary Data
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [joiningForm, setJoiningForm] = useState<JoiningFormRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  // Child joining tables
  const [education, setEducation] = useState<EducationRecordRow[]>([]);
  const [family, setFamily] = useState<FamilyDetailRow[]>([]);
  const [emergency, setEmergency] = useState<EmergencyContactRow[]>([]);
  const [declarations, setDeclarations] = useState<DeclarationRow | null>(null);
  const [linkedJob, setLinkedJob] = useState<JobRow | null>(null);

  // Page States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status & Access Controls
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('NEW_ENQUIRY');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isTogglingAccess, setIsTogglingAccess] = useState<boolean>(false);

  // Helper to record an activity log (strictly sanitized, PII never logged)
  const logActivity = useCallback(
    async (action: string, description: string, metadata?: Record<string, unknown>) => {
      if (!id) return;
      try {
        await supabase.from('activity_logs').insert({
          application_id: id,
          admin_user_id: user?.id || null,
          action,
          description,
          metadata: (metadata as Record<string, string | number | boolean | null>) || null
        });
      } catch (err) {
        console.error('[ActivityLog] Failed to insert log:', err);
      }
    },
    [id, user]
  );

  // Tab switcher synced with browser history
  const handleTabChange = (tab: ApplicationDetailTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Sync tab with external navigation or prop updates
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Load all application data
  const loadApplicationData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError) {
        throw new Error(`Application not found: ${appError.message}`);
      }

      const app = appData as ApplicationRow;
      setApplication(app);
      setSelectedStatus(app.status);

      // 1b. Fetch Linked Job if job_id is present
      if (app.job_id) {
        const { data: jData } = await supabase
          .from('jobs')
          .select('*, company:companies(*)')
          .eq('id', app.job_id)
          .maybeSingle();
        if (jData) {
          setLinkedJob(jData as JobRow);
        } else {
          setLinkedJob(null);
        }
      } else {
        setLinkedJob(null);
      }

      // 2. Fetch Active Companies
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (compData) {
        setCompanies(compData as CompanyRow[]);
      }

      // 3. Fetch Documents
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (docData) {
        setDocuments(docData as DocumentRow[]);
      }

      // 4. Fetch Payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (payData) {
        setPayments(payData as PaymentRow[]);
      }

      // 5. Fetch Employee record
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('application_id', id)
        .maybeSingle();

      if (empData) {
        setEmployee(empData as EmployeeRow);
      }

      // 6. Fetch Activity Logs
      const { data: actData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (actData) {
        setActivityLogs(actData as ActivityLogRow[]);
      }

      // 7. Fetch Joining Dossier Bundle
      const bundle = await getApplicationJoiningBundle(id);
      if (bundle.success) {
        setJoiningForm(bundle.joiningForm);
        setEducation(bundle.education);
        setFamily(bundle.family);
        setEmergency(bundle.emergency);
        setDeclarations(bundle.declarations);
      }
    } catch (err: unknown) {
      console.error('[ApplicationDetail] Error loading application:', err);
      setError(err instanceof Error ? err.message : 'Failed to load application record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplicationData();
    if (id) {
      markApplicationNotificationsAsRead(id);
    }
  }, [id, loadApplicationData, markApplicationNotificationsAsRead]);

  // Handle Application Status Update
  const handleStatusUpdate = async () => {
    if (!application || selectedStatus === application.status) return;

    setIsUpdatingStatus(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateErr) throw new Error(updateErr.message);

      await logActivity(
        'APPLICATION_STATUS_UPDATED',
        `Coordinator updated application status from ${application.status} to ${selectedStatus}.`,
        { previous_status: application.status, new_status: selectedStatus }
      );

      setApplication({ ...application, status: selectedStatus });
      setSuccessMsg(`Application status successfully updated to ${selectedStatus}.`);
      loadApplicationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update application status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Joining Access Toggle (ENABLE / DISABLE)
  const handleToggleJoiningAccess = async () => {
    if (!application) return;

    setIsTogglingAccess(true);
    setError(null);
    setSuccessMsg(null);

    const willEnable = !application.joining_access_enabled;
    const nowTimestamp = new Date().toISOString();

    try {
      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          joining_access_enabled: willEnable,
          joining_access_enabled_at: willEnable ? nowTimestamp : null,
          updated_at: nowTimestamp
        })
        .eq('id', application.id);

      if (updateErr) throw new Error(updateErr.message);

      const actionType = willEnable ? 'JOINING_ACCESS_ENABLED' : 'JOINING_ACCESS_DISABLED';
      const actionDesc = willEnable
        ? 'Coordinator enabled candidate joining form access.'
        : 'Coordinator disabled candidate joining form access.';

      await logActivity(actionType, actionDesc, { timestamp: nowTimestamp });

      setApplication({
        ...application,
        joining_access_enabled: willEnable,
        joining_access_enabled_at: willEnable ? nowTimestamp : null
      });

      setSuccessMsg(
        willEnable
          ? 'Joining Form Access has been ENABLED for this candidate.'
          : 'Joining Form Access has been DISABLED and LOCKED.'
      );
      loadApplicationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to modify joining access.');
    } finally {
      setIsTogglingAccess(false);
    }
  };

  // Handle Permanent Application Deletion
  const handleExecuteDelete = async () => {
    if (!application || !isSuperAdmin) return;
    if (confirmNumberInput !== application.application_number) {
      setDeleteError(`Please type exact application number ${application.application_number} to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('delete_application_permanently', {
        target_app_id: application.id
      });

      if (rpcErr) throw new Error(rpcErr.message);

      navigate(ADMIN_ROUTES.applications, {
        replace: true,
        state: {
          deletedNotification: `Application ${application.application_number} (${application.full_name}) was permanently deleted.`
        }
      });
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete application record.');
      setIsDeleting(false);
    }
  };

  const docStats = calculateDocumentVerificationStats(documents);
  const hasSuccessfulPayment = payments.some((p) => p.status === 'SUCCESS');
  const hasPendingPayment = payments.some((p) => p.status === 'PENDING');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#192A56', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading candidate application dossier...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <AlertCircle size={48} color="#C9726F" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#192A56', marginBottom: '0.5rem' }}>Application Record Not Found</h2>
        <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
          The requested application ID does not exist in the database.
        </p>
        <Link to="/admin/applications" className="btn-admin-primary">
          <ArrowLeft size={16} />
          <span>Back to Applications</span>
        </Link>
      </div>
    );
  }

  // Define tab navigation configuration
  const TABS: {
    id: ApplicationDetailTab;
    label: string;
    icon: React.FC<{ size?: number }>;
    badge?: string;
    badgeStyle?: React.CSSProperties;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'joining',
      label: 'Joining Review',
      icon: FileText,
      badge: joiningForm?.submission_status || 'NOT STARTED',
      badgeStyle: {
        backgroundColor: joiningForm?.submission_status === 'SUBMITTED' ? '#DCFCE7' : '#FEF3C7',
        color: joiningForm?.submission_status === 'SUBMITTED' ? '#166534' : '#92400E'
      }
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: ShieldCheck,
      badge: `${docStats.verifiedCount}/${docStats.totalRequired}`,
      badgeStyle: {
        backgroundColor: docStats.allRequiredVerified ? '#DCFCE7' : docStats.hasRejections ? '#FEE2E2' : '#EFF6FF',
        color: docStats.allRequiredVerified ? '#166534' : docStats.hasRejections ? '#991B1B' : '#1D4ED8'
      }
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: CreditCard,
      badge: hasSuccessfulPayment ? 'Paid' : hasPendingPayment ? 'Pending' : 'Pending Stage',
      badgeStyle: {
        backgroundColor: hasSuccessfulPayment ? '#DCFCE7' : '#F1F5F9',
        color: hasSuccessfulPayment ? '#166534' : '#64748B'
      }
    },
    {
      id: 'reference-slip',
      label: 'Reference Slip',
      icon: FileCheck
    },
    {
      id: 'employee',
      label: 'Employee',
      icon: Briefcase,
      badge: employee ? employee.employee_code : undefined,
      badgeStyle: {
        backgroundColor: '#DCFCE7',
        color: '#166534'
      }
    },
    {
      id: 'activity',
      label: 'Activity Log',
      icon: History,
      badge: String(activityLogs.length),
      badgeStyle: {
        backgroundColor: '#F1F5F9',
        color: '#475569'
      }
    }
  ];

  return (
    <div>
      {/* Top Breadcrumbs */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/admin/applications"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#192A56',
            fontSize: '0.825rem',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '0.75rem'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Applications Directory</span>
        </Link>

        {/* Candidate Header Banner */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0
                }}
              >
                {application.full_name}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  backgroundColor: '#FDF3DB',
                  color: '#8C6400',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid #F7D794'
                }}
              >
                {application.application_number}
              </span>
              <AdminStatusBadge status={application.status} />
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
              Applied on {new Date(application.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              {application.designation ? ` • ${application.designation}` : ''}
              {application.desired_company ? ` • ${application.desired_company}` : ''}
            </p>
            {linkedJob && (
              <div style={{ marginTop: '0.35rem' }}>
                <Link
                  to={`/admin/jobs/${linkedJob.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    backgroundColor: '#EFF6FF',
                    color: '#1E40AF',
                    border: '1px solid #BFDBFE',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Briefcase size={12} />
                  <span>Linked Job Opening: {linkedJob.title}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>({linkedJob.location})</span>
                </Link>
              </div>
            )}
          </div>

          {/* Application Status Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
              style={{
                padding: '0.55rem 0.75rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                color: '#192A56',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus || selectedStatus === application.status}
              className="btn-admin-primary"
              style={{ padding: '0.55rem 1rem' }}
            >
              {isUpdatingStatus ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Save size={15} />
              )}
              <span>Update Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Notice Banners */}
      {error && (
        <div
          style={{
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <AlertCircle size={18} color="#C9726F" />
          <span style={{ fontSize: '0.85rem', color: '#C9726F', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <CheckCircle2 size={18} color="#2E7D32" />
          <span style={{ fontSize: '0.85rem', color: '#2E7D32', fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {/* Modern Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '0.75rem 1.1rem',
                border: 'none',
                borderBottom: isActive ? '3px solid #192A56' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#192A56' : '#64748B',
                fontSize: '0.85rem',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    ...tab.badgeStyle
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* 5 Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}
          >
            {/* Enquiry Card */}
            <div className="admin-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                ENQUIRY
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>✓</span>
                <span>Complete</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                {application.desired_company || 'A Tiger Global'}
              </div>
            </div>

            {/* Joining Form Card */}
            <div
              className="admin-card"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => handleTabChange('joining')}
              title="Click to view full Joining Review"
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                JOINING FORM
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>
                {joiningForm?.submission_status ? joiningForm.submission_status.replace(/_/g, ' ') : 'NOT STARTED'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1D4ED8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span>{joiningForm?.submitted_at ? 'Submitted • View Review' : 'Open Joining Tab →'}</span>
              </div>
            </div>

            {/* Documents Card */}
            <div
              className="admin-card"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => handleTabChange('documents')}
              title="Click to open Document Verification Workspace"
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                DOCUMENTS
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: docStats.allRequiredVerified ? '#16A34A' : docStats.hasRejections ? '#DC2626' : '#192A56' }}>
                {docStats.verifiedCount} / {docStats.totalRequired} Verified
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1D4ED8', marginTop: '2px' }}>
                {docStats.hasRejections ? 'Action Required →' : 'Verify Documents →'}
              </div>
            </div>

            {/* Payment Card */}
            <div
              className="admin-card"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => handleTabChange('payment')}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                PAYMENT
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: hasSuccessfulPayment ? '#2E7D32' : hasPendingPayment ? '#8C6400' : '#64748B'
                }}
              >
                {hasSuccessfulPayment ? '✓ Paid' : hasPendingPayment ? '● Pending' : 'Stage 6 Pending'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                Registration fee gateway
              </div>
            </div>

            {/* Employee Card */}
            <div
              className="admin-card"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => handleTabChange('employee')}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                EMPLOYEE
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: employee ? '#2E7D32' : '#64748B'
                }}
              >
                {employee ? `Active (${employee.employee_code})` : 'Stage 8 Pending'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                ID card & onboarding
              </div>
            </div>
          </div>

          {/* Grid: Overview Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Joining Access Control Panel */}
              <div
                className="admin-card"
                style={{
                  padding: '1.5rem',
                  border: application.joining_access_enabled ? '1px solid #A5D6A7' : '1px solid #E2DFD8',
                  backgroundColor: application.joining_access_enabled ? '#F1F8F4' : '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: application.joining_access_enabled ? '#E8F5E9' : '#FBF0EF',
                          color: application.joining_access_enabled ? '#2E7D32' : '#C9726F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {application.joining_access_enabled ? <Unlock size={17} /> : <Lock size={17} />}
                      </div>
                      <h2
                        style={{
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: '#192A56',
                          margin: 0
                        }}
                      >
                        JOINING FORM ACCESS
                      </h2>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 800,
                          backgroundColor: application.joining_access_enabled ? '#E8F5E9' : '#FBF0EF',
                          color: application.joining_access_enabled ? '#2E7D32' : '#C9726F',
                          border: application.joining_access_enabled ? '1px solid #A5D6A7' : '1px solid #EDA6A3'
                        }}
                      >
                        {application.joining_access_enabled ? 'ENABLED' : 'LOCKED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.825rem', color: '#64748B' }}>
                      {application.joining_access_enabled ? (
                        <>
                          Enabled on{' '}
                          <strong style={{ color: '#192A56' }}>
                            {application.joining_access_enabled_at
                              ? new Date(application.joining_access_enabled_at).toLocaleString('en-IN')
                              : 'Active'}
                          </strong>{' '}
                          • Candidate can authenticate via OTP and complete form.
                        </>
                      ) : (
                        'Candidate is locked from authenticating or submitting their joining dossier.'
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleJoiningAccess}
                    disabled={isTogglingAccess}
                    className={application.joining_access_enabled ? 'btn-admin-danger' : 'btn-admin-primary'}
                    style={{ padding: '0.6rem 1.25rem' }}
                  >
                    {isTogglingAccess ? (
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : application.joining_access_enabled ? (
                      <Lock size={15} />
                    ) : (
                      <Unlock size={15} />
                    )}
                    <span>{application.joining_access_enabled ? 'DISABLE ACCESS' : 'ENABLE JOINING FORM'}</span>
                  </button>
                </div>
              </div>

              {/* Candidate Quick Information */}
              <div className="admin-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} color="#192A56" />
                    <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                      Candidate Profile Snapshot
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('joining')}
                    className="btn-admin-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    View Full Joining Dossier →
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</div>
                    <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{application.full_name}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Father's Name</div>
                    <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{application.father_name || '—'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Mobile Contact</div>
                    <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{application.mobile}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</div>
                    <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>{application.email}</div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Registered Address</div>
                    <div style={{ fontSize: '0.9rem', color: '#4A5568', marginTop: '2px', lineHeight: 1.4 }}>{application.address || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Status & Audit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Document Verification Snapshot Widget */}
              <div className="admin-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={17} color="#192A56" />
                    <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                      Document Verification
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: docStats.allRequiredVerified ? '#DCFCE7' : docStats.hasRejections ? '#FEE2E2' : '#FEF3C7',
                      color: docStats.allRequiredVerified ? '#166534' : docStats.hasRejections ? '#991B1B' : '#92400E'
                    }}
                  >
                    {docStats.readinessLabel}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                  <strong>{docStats.verifiedCount} of {docStats.totalRequired}</strong> statutory documents verified.
                  {docStats.rejectedCount > 0 && (
                    <span style={{ color: '#DC2626', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                      ⚠ {docStats.rejectedCount} document(s) marked as rejected.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleTabChange('documents')}
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  <span>Open Verification Workspace →</span>
                </button>
              </div>

              {/* Recent Activity Snapshot */}
              <div className="admin-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <History size={17} color="#192A56" />
                    <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                      Recent Activity
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('activity')}
                    style={{ border: 'none', background: 'transparent', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View All ({activityLogs.length})
                  </button>
                </div>

                {activityLogs.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#64748B', textAlign: 'center', padding: '1rem 0' }}>
                    No audit logs recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {activityLogs.slice(0, 4).map((log) => (
                      <div key={log.id} style={{ borderLeft: '3px solid #F7D794', paddingLeft: '0.6rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#192A56' }}>
                          {log.action.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#4A5568', lineHeight: 1.3 }}>
                          {log.description}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone — Admin Destructive Actions */}
          <div
            style={{
              marginTop: '2.5rem',
              padding: '1.5rem',
              backgroundColor: '#FFF8F8',
              border: '1px solid #EDA6A3',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <AlertTriangle size={18} color="#C9726F" />
                <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                  Danger Zone — Application Deletion
                </h3>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0, maxWidth: '600px' }}>
                Permanently delete this candidate application and all associated records (joining forms, documents, payments, reference slips, and storage files). Restricted exclusively to Super Administrators.
              </p>
            </div>

            <div>
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(true);
                    setConfirmNumberInput('');
                    setDeleteError(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    border: '1px solid #DC2626',
                    borderRadius: '8px',
                    padding: '0.65rem 1.15rem',
                    fontSize: '0.825rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} />
                  <span>DELETE APPLICATION</span>
                </button>
              ) : (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  SUPER_ADMIN ONLY
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: JOINING REVIEW (All 8 Sections + Company Assignment Editor)
          ========================================================================= */}
      {activeTab === 'joining' && (
        <JoiningReview
          application={application}
          joiningForm={joiningForm}
          education={education}
          family={family}
          emergency={emergency}
          declarations={declarations}
          companies={companies}
          isSuperAdmin={isSuperAdmin}
          canEditCompanyInfo={canEditCompanyInfo}
          onRefresh={loadApplicationData}
          logActivity={logActivity}
        />
      )}

      {/* =========================================================================
          TAB 3: DOCUMENTS & VERIFICATION WORKSPACE
          ========================================================================= */}
      {activeTab === 'documents' && (
        <DocumentVerificationPanel
          applicationId={application.id}
          documents={documents}
          canVerify={canVerify}
          onRefresh={loadApplicationData}
        />
      )}

      {/* =========================================================================
          TAB 4: PAYMENT (Stage 6 Functional Gateway & Ledger)
          ========================================================================= */}
      {activeTab === 'payment' && (
        <AdminPaymentPanel
          application={application}
          payments={payments}
          canManagePayments={canManagePayments}
          onRefresh={loadApplicationData}
        />
      )}

      {/* =========================================================================
          TAB 5: REFERENCE SLIP (Stage 7 Placeholder Shell)
          ========================================================================= */}
      {activeTab === 'reference-slip' && (
        <div className="admin-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F3E8FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <FileCheck size={24} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#192A56' }}>
            Candidate Reference Slip & Consultancy Return Dossier
          </h3>
          <p style={{ margin: '0 auto 1.5rem auto', maxWidth: '550px', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
            Official reference slips and signed employer return packets will be compiled and downloadable in <strong>Stage 7</strong> after candidate registration fee confirmation.
          </p>
          <div style={{ fontSize: '0.775rem', color: '#94A3B8' }}>
            Module scheduled for activation in Stage 7
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: EMPLOYEE ONBOARDING (Stage 8 Placeholder Shell)
          ========================================================================= */}
      {activeTab === 'employee' && (
        <div className="admin-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Briefcase size={24} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#192A56' }}>
            Official Employee Profile & Identity Card Generation
          </h3>
          <p style={{ margin: '0 auto 1.5rem auto', maxWidth: '550px', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
            Creation of official employee master records, issuance of Employee Code, and generation of the client's 14-page Joining Packet PDF and printable Employee ID Card will be enabled in <strong>Stage 8</strong>.
          </p>
          <div style={{ fontSize: '0.775rem', color: '#94A3B8' }}>
            Module scheduled for activation in Stage 8
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: ACTIVITY AUDIT LOG
          ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
                Complete Audit Trail & History ({activityLogs.length})
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Chronological record of status transitions, document verifications, administrative edits, and sensitive data access.
              </p>
            </div>
          </div>

          {activityLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.85rem' }}>
              No audit logs recorded for this application.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#192A56' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                    {log.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 42, 86, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2DFD8',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px -10px rgba(25, 42, 86, 0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#192A56',
                    margin: 0
                  }}
                >
                  Delete Application
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '2px' }}>
                  Irreversible Destructive Action
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.5, marginBottom: '1rem' }}>
              This will permanently delete the application and its associated records and uploaded storage files.
            </p>

            <div
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E2DFD8',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Application:</div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#192A56',
                  marginTop: '2px'
                }}
              >
                {application.application_number}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4A5568', marginTop: '2px' }}>
                Candidate: <strong>{application.full_name}</strong>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  backgroundColor: '#FBF0EF',
                  border: '1px solid #EDA6A3',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={18} color="#C9726F" />
                <span style={{ fontSize: '0.825rem', color: '#C9726F', fontWeight: 600 }}>
                  {deleteError}
                </span>
              </div>
            )}

            <p style={{ fontSize: '0.825rem', color: '#192A56', fontWeight: 600, marginBottom: '0.5rem' }}>
              Please type <code style={{ backgroundColor: '#F1F5F9', padding: '2px 5px', borderRadius: '4px', color: '#DC2626' }}>{application.application_number}</code> to confirm:
            </p>

            <input
              type="text"
              value={confirmNumberInput}
              onChange={(e) => setConfirmNumberInput(e.target.value.trim())}
              placeholder={application.application_number}
              disabled={isDeleting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid',
                borderColor: confirmNumberInput === application.application_number ? '#10B981' : '#D2CECE',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#192A56',
                outline: 'none',
                marginBottom: '1.5rem'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmNumberInput('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="btn-admin-secondary"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting || confirmNumberInput !== application.application_number}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: confirmNumberInput === application.application_number ? '#DC2626' : '#FCA5A5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: confirmNumberInput === application.application_number && !isDeleting ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <span>DELETE PERMANENTLY</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
