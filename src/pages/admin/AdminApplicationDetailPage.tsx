// ==============================================================================
// File: src/pages/admin/AdminApplicationDetailPage.tsx
// Description: Detailed Candidate Application Record Management,
//              Joining Access Authorization, Company Assignment, and Audit Logs
// Brand: A TIGER GROUPS — Operational Recruitment System
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
  ActivityLogRow
} from '../../types/database';
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Building2,
  User,
  FileText,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

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

export const AdminApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAdminAuth();
  const { markApplicationNotificationsAsRead } = useAdminNotifications();
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';

  // Delete Modal & Action State
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

  // Page States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('NEW_ENQUIRY');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isTogglingAccess, setIsTogglingAccess] = useState<boolean>(false);
  const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState<boolean>(false);

  // Company / Employment Editable Form State
  const [companyForm, setCompanyForm] = useState({
    company_id: '',
    unit: '',
    company_address: '',
    employee_code: '',
    department: '',
    sub_department: '',
    designation: '',
    location: '',
    date_of_joining: '',
    gross_salary: ''
  });

  // Helper to record an activity log (strictly sanitized)
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

      // 2. Fetch Active Companies
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (compData) {
        setCompanies(compData as CompanyRow[]);
      }

      // 3. Fetch Joining Form (if exists)
      const { data: jData } = await supabase
        .from('joining_forms')
        .select('*')
        .eq('application_id', id)
        .maybeSingle();

      if (jData) {
        const jf = jData as JoiningFormRow;
        setJoiningForm(jf);
        setCompanyForm({
          company_id: jf.company_id || '',
          unit: jf.unit || '',
          company_address: jf.company_address || '',
          employee_code: jf.employee_code || '',
          department: jf.department || '',
          sub_department: jf.sub_department || '',
          designation: jf.designation || app.designation || '',
          location: jf.location || '',
          date_of_joining: jf.date_of_joining || '',
          gross_salary: jf.gross_salary ? String(jf.gross_salary) : ''
        });
      } else {
        setCompanyForm((prev) => ({
          ...prev,
          designation: app.designation || ''
        }));
      }

      // 4. Fetch Documents
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (docData) {
        setDocuments(docData as DocumentRow[]);
      }

      // 5. Fetch Payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (payData) {
        setPayments(payData as PaymentRow[]);
      }

      // 6. Fetch Employee record
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('application_id', id)
        .maybeSingle();

      if (empData) {
        setEmployee(empData as EmployeeRow);
      }

      // 7. Fetch Activity Logs
      const { data: actData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (actData) {
        setActivityLogs(actData as ActivityLogRow[]);
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
        ? 'Coordinator enabled joining form access.'
        : 'Coordinator disabled joining form access.';

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

  // Handle Save Company / Employment Information
  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    setIsSavingCompanyInfo(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const grossSalaryNum = companyForm.gross_salary ? parseFloat(companyForm.gross_salary) : null;

      if (joiningForm) {
        const { error: updateErr } = await supabase
          .from('joining_forms')
          .update({
            company_id: companyForm.company_id || null,
            unit: companyForm.unit || null,
            company_address: companyForm.company_address || null,
            employee_code: companyForm.employee_code || null,
            department: companyForm.department || null,
            sub_department: companyForm.sub_department || null,
            designation: companyForm.designation || null,
            location: companyForm.location || null,
            date_of_joining: companyForm.date_of_joining || null,
            gross_salary: grossSalaryNum,
            updated_at: new Date().toISOString()
          })
          .eq('id', joiningForm.id);

        if (updateErr) throw new Error(updateErr.message);
      } else {
        const { error: insertErr } = await supabase.from('joining_forms').insert({
          application_id: application.id,
          company_id: companyForm.company_id || null,
          unit: companyForm.unit || null,
          company_address: companyForm.company_address || null,
          employee_code: companyForm.employee_code || null,
          department: companyForm.department || null,
          sub_department: companyForm.sub_department || null,
          designation: companyForm.designation || null,
          location: companyForm.location || null,
          date_of_joining: companyForm.date_of_joining || null,
          gross_salary: grossSalaryNum,
          submission_status: 'DRAFT',
          same_as_permanent: true
        });

        if (insertErr) throw new Error(insertErr.message);
      }

      await logActivity(
        'COMPANY_INFO_UPDATED',
        'Coordinator updated company and employment assignment details.',
        {
          company_id: companyForm.company_id,
          unit: companyForm.unit,
          designation: companyForm.designation,
          employee_code: companyForm.employee_code
        }
      );

      setSuccessMsg('Company & employment assignment details successfully saved!');
      loadApplicationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save company information.');
    } finally {
      setIsSavingCompanyInfo(false);
    }
  };

  // Handle Permanent Application Deletion (SUPER_ADMIN only)
  const handleExecuteDelete = async () => {
    if (!application || confirmNumberInput !== application.application_number) return;

    if (!isSuperAdmin) {
      setDeleteError('Access Denied: Only SUPER_ADMIN users are authorized to permanently delete applications.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Gather any known storage paths to remove via Storage API
      const candidatePaths: string[] = [];
      const generatedPaths: string[] = [];

      documents.forEach((d) => {
        if (d.storage_path) candidatePaths.push(d.storage_path);
      });

      if (joiningForm?.photo_path) candidatePaths.push(joiningForm.photo_path);
      if (joiningForm?.candidate_signature_path) candidatePaths.push(joiningForm.candidate_signature_path);

      if (candidatePaths.length > 0) {
        await supabase.storage.from('candidate-documents').remove(candidatePaths);
      }
      if (generatedPaths.length > 0) {
        await supabase.storage.from('generated-documents').remove(generatedPaths);
      }

      // 2. Call the server-side SECURITY DEFINER atomic deletion function
      const { error: rpcError } = await supabase.rpc('delete_application_permanently', {
        target_app_id: application.id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // 3. Navigate back to applications list with success confirmation state
      navigate(ADMIN_ROUTES.applications, {
        replace: true,
        state: {
          successMessage: `Application ${application.application_number} (${application.full_name}) and all associated records have been permanently deleted.`
        }
      });
    } catch (err: unknown) {
      console.error('[ApplicationDetail] Delete failure:', err);
      setDeleteError(err instanceof Error ? err.message : 'An error occurred during application deletion.');
      setIsDeleting(false);
    }
  };

  // Mask sensitive values
  const maskSensitive = (val: string | null | undefined, visibleTail = 4): string => {
    if (!val) return '—';
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= visibleTail) return clean;
    const maskedPart = '•'.repeat(Math.max(4, clean.length - visibleTail));
    const visiblePart = clean.slice(-visibleTail);
    return `${maskedPart} ${visiblePart}`;
  };

  const verifiedDocsCount = documents.filter((d) => d.verification_status === 'VERIFIED').length;
  const hasSuccessfulPayment = payments.some((p) => p.status === 'SUCCESS');
  const hasPendingPayment = payments.some((p) => p.status === 'PENDING');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#192A56', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading candidate application record...</div>
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

  return (
    <div>
      {/* Top Breadcrumb & Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
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

        {/* Title and ID banner */}
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
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
              Applied on {new Date(application.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
          </div>

          {/* Quick Status Selector */}
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

      {/* Notices */}
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
        <div className="admin-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            JOINING FORM
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>
            {joiningForm?.submission_status ? joiningForm.submission_status.replace(/_/g, ' ') : 'NOT STARTED'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            {joiningForm?.submitted_at ? `Submitted ${new Date(joiningForm.submitted_at).toLocaleDateString()}` : 'Digital packet'}
          </div>
        </div>

        {/* Documents Card */}
        <div className="admin-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            DOCUMENTS
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>
            {documents.length > 0 ? `${verifiedDocsCount} / ${documents.length} Verified` : '0 Uploaded'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            Identity & Academic
          </div>
        </div>

        {/* Payment Card */}
        <div className="admin-card" style={{ padding: '1rem' }}>
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
            {hasSuccessfulPayment ? '✓ Paid' : hasPendingPayment ? '● Pending' : 'Not Initiated'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            Registration fees
          </div>
        </div>

        {/* Employee Card */}
        <div className="admin-card" style={{ padding: '1rem' }}>
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
            {employee ? `Active (${employee.employee_code})` : 'Not Created'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            Stage 3 Onboarding
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column Details & Right Column Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Joining Access Control Panel */}
          <div
            className="admin-card"
            style={{
              padding: '1.5rem',
              border: application.joining_access_enabled
                ? '1px solid #A5D6A7'
                : '1px solid #E2DFD8',
              backgroundColor: application.joining_access_enabled
                ? '#F1F8F4'
                : '#FFFFFF'
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
                      Enabled At:{' '}
                      <strong style={{ color: '#192A56' }}>
                        {application.joining_access_enabled_at
                          ? new Date(application.joining_access_enabled_at).toLocaleString('en-IN')
                          : 'Active'}
                      </strong>
                    </>
                  ) : (
                    'Candidate is currently locked from editing or completing the digital joining packet.'
                  )}
                </div>
              </div>

              {/* Action Button */}
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

          {/* Candidate Information Card */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <User size={18} color="#192A56" />
              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0
                }}
              >
                Candidate Information
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Full Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>
                  {application.full_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Father's Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>
                  {application.father_name || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Mobile Contact
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>
                  {application.mobile}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Email Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 700, marginTop: '2px' }}>
                  {application.email}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Permanent Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4A5568', marginTop: '2px', lineHeight: 1.4 }}>
                  {application.address || '—'}
                </div>
              </div>

              {/* Masked Sensitive Information */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Aadhaar Number (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.aadhaar_number, 4)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  PAN Card (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.pan_number, 3)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Bank Account (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.bank_account_number, 4)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Bank IFSC / Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#192A56', fontWeight: 600, marginTop: '2px' }}>
                  {joiningForm?.ifsc_code ? `${joiningForm.bank_name || 'Bank'} (${joiningForm.ifsc_code})` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Company / Employment Assignment Form */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Building2 size={18} color="#192A56" />
              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: 0
                }}
              >
                Company & Employment Assignment
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Assign employer partner and internal company parameters for the candidate's joining packet.
            </p>

            <form onSubmit={handleSaveCompanyInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Company Select */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Employer Partner / Company
                  </label>
                  <select
                    value={companyForm.company_id}
                    onChange={(e) => {
                      const comp = companies.find((c) => c.id === e.target.value);
                      setCompanyForm({
                        ...companyForm,
                        company_id: e.target.value,
                        company_address: comp?.address || companyForm.company_address
                      });
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Employer Partner...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company_type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Unit / Plant
                  </label>
                  <input
                    type="text"
                    value={companyForm.unit}
                    onChange={(e) => setCompanyForm({ ...companyForm, unit: e.target.value })}
                    placeholder="e.g. Unit 1 / Plant A"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Company Address */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Company Official Address
                  </label>
                  <input
                    type="text"
                    value={companyForm.company_address}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_address: e.target.value })}
                    placeholder="e.g. Plot No. 12, Industrial Area, Sector 5"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Employee Code */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Employee Code
                  </label>
                  <input
                    type="text"
                    value={companyForm.employee_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, employee_code: e.target.value })}
                    placeholder="e.g. EMP-2026-001"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Designation */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Designation
                  </label>
                  <input
                    type="text"
                    value={companyForm.designation}
                    onChange={(e) => setCompanyForm({ ...companyForm, designation: e.target.value })}
                    placeholder="e.g. Production Supervisor"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Department */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Department
                  </label>
                  <input
                    type="text"
                    value={companyForm.department}
                    onChange={(e) => setCompanyForm({ ...companyForm, department: e.target.value })}
                    placeholder="e.g. Operations / Quality"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Sub Department */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Sub Department
                  </label>
                  <input
                    type="text"
                    value={companyForm.sub_department}
                    onChange={(e) => setCompanyForm({ ...companyForm, sub_department: e.target.value })}
                    placeholder="e.g. Assembly Line 2"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Job Location / City
                  </label>
                  <input
                    type="text"
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    placeholder="e.g. Noida / Gurugram"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Date of Joining */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={companyForm.date_of_joining}
                    onChange={(e) => setCompanyForm({ ...companyForm, date_of_joining: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Gross Salary / CTC */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.35rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Gross Salary / CTC (₹ per month or annum)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={companyForm.gross_salary}
                    onChange={(e) => setCompanyForm({ ...companyForm, gross_salary: e.target.value })}
                    placeholder="e.g. 25000"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FCFBFB',
                      border: '1px solid #D2CECE',
                      borderRadius: '6px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isSavingCompanyInfo}
                  className="btn-admin-primary"
                  style={{ padding: '0.6rem 1.25rem' }}
                >
                  {isSavingCompanyInfo ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Save Assignment Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Documents, Payments, Activity Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Documents Summary Card */}
          <div className="admin-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileText size={17} color="#192A56" />
              <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Candidate Documents ({documents.length})
              </h3>
            </div>

            {documents.length === 0 ? (
              <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1.5rem 0' }}>
                No documents uploaded yet by the candidate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E2DFD8',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#192A56' }}>
                        {doc.document_type.replace(/_/g, ' ')} {doc.document_side ? `(${doc.document_side})` : ''}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        {doc.original_file_name || 'Uploaded document'}
                      </div>
                    </div>
                    <AdminStatusBadge status={doc.verification_status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Summary Card */}
          <div className="admin-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CreditCard size={17} color="#192A56" />
              <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Payments & Receipts ({payments.length})
              </h3>
            </div>

            {payments.length === 0 ? (
              <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1.5rem 0' }}>
                No payments registered for this candidate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E2DFD8',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#192A56' }}>
                        ₹{p.amount.toLocaleString()} — {p.purpose}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {p.payment_reference}
                      </div>
                    </div>
                    <AdminStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Logs Audit Trail */}
          <div className="admin-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <History size={17} color="#192A56" />
              <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
                Audit Activity Log ({activityLogs.length})
              </h3>
            </div>

            {activityLogs.length === 0 ? (
              <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1.5rem 0' }}>
                No activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      borderLeft: '3px solid #F7D794',
                      paddingLeft: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem'
                    }}
                  >
                    <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#192A56' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4A5568', lineHeight: 1.3 }}>
                      {log.description}
                    </div>
                    <div style={{ fontSize: '0.675rem', color: '#64748B' }}>
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
            <h3
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#991B1B',
                margin: 0
              }}
            >
              Danger Zone — Application Deletion
            </h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0, maxWidth: '600px' }}>
            Permanently delete this candidate application and all associated records (joining forms, documents, payments, reference slips, and uploaded storage files). This action is non-reversible and restricted exclusively to Super Administrators.
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
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#DC2626';
                (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
                (e.currentTarget as HTMLElement).style.color = '#DC2626';
              }}
            >
              <Trash2 size={15} />
              <span>DELETE APPLICATION</span>
            </button>
          ) : (
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94A3B8',
                backgroundColor: '#F1F5F9',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1'
              }}
            >
              SUPER_ADMIN ONLY
            </div>
          )}
        </div>
      </div>

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
            {/* Modal Header */}
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
              This will permanently delete the application and its associated records/files.
            </p>

            {/* Application info box */}
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

            {/* Error Banner in modal if deletion failed */}
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

            {/* Buttons */}
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
