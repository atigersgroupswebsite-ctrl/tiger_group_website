// ==============================================================================
// File: src/pages/admin/AdminApplicationDetailPage.tsx
// Description: Detailed Candidate Application Record Management,
//              Joining Access Authorization, Company Assignment, and Audit Logs
// ==============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
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
  Loader2
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
  const { user } = useAdminAuth();

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

  // Company / Employment Editable Form State (Belongs in joining_forms)
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

  // Helper to record an activity log (strictly sanitized, never logging sensitive data)
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
        // Pre-fill designation from application
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
  }, [loadApplicationData]);

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

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Record Activity Log
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

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Log the action to activity_logs
      const actionType = willEnable ? 'JOINING_ACCESS_ENABLED' : 'JOINING_ACCESS_DISABLED';
      const actionDesc = willEnable
        ? 'Coordinator enabled joining form access.'
        : 'Coordinator disabled joining form access.';

      await logActivity(actionType, actionDesc, {
        timestamp: nowTimestamp
      });

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
        // Update existing joining_forms record
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
        // Create new joining_forms record linked to application_id
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

      // Log in activity_logs (safe metadata, no sensitive candidate data)
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

  // Mask sensitive values
  const maskSensitive = (val: string | null | undefined, visibleTail = 4): string => {
    if (!val) return '—';
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= visibleTail) return clean;
    const maskedPart = '•'.repeat(Math.max(4, clean.length - visibleTail));
    const visiblePart = clean.slice(-visibleTail);
    return `${maskedPart} ${visiblePart}`;
  };

  // Helper summary calculations
  const verifiedDocsCount = documents.filter((d) => d.verification_status === 'VERIFIED').length;
  const hasSuccessfulPayment = payments.some((p) => p.status === 'SUCCESS');
  const hasPendingPayment = payments.some((p) => p.status === 'PENDING');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94A3B8' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#F59E0B', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading candidate application record...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <AlertCircle size={48} color="#F87171" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#F8FAFC', marginBottom: '0.5rem' }}>Application Record Not Found</h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.5rem' }}>
          The requested application ID does not exist in the database.
        </p>
        <Link
          to="/admin/applications"
          style={{
            color: '#F59E0B',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
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
            gap: '0.5rem',
            color: '#94A3B8',
            fontSize: '0.85rem',
            textDecoration: 'none',
            marginBottom: '1rem',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F59E0B')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
        >
          <ArrowLeft size={16} />
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                {application.full_name}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                {application.application_number}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0 }}>
              Applied on {new Date(application.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
          </div>

          {/* Quick Status Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
              style={{
                padding: '0.6rem 0.85rem',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.875rem',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: selectedStatus === application.status ? '#1E293B' : '#D97706',
                color: selectedStatus === application.status ? '#64748B' : '#FFFFFF',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: selectedStatus === application.status || isUpdatingStatus ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isUpdatingStatus ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Save size={16} />
              )}
              <span>Update Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
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

      {successMsg && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <CheckCircle2 size={20} color="#10B981" />
          <span style={{ fontSize: '0.875rem', color: '#A7F3D0' }}>{successMsg}</span>
        </div>
      )}

      {/* 5 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        {/* Enquiry Card */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            ENQUIRY
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>✓</span>
            <span>Complete</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            {application.desired_company || 'A Tiger Global'}
          </div>
        </div>

        {/* Joining Form Card */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            JOINING FORM
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: joiningForm?.submission_status === 'SUBMITTED' ? '#10B981' : '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>●</span>
            <span>{joiningForm?.submission_status ? joiningForm.submission_status.replace(/_/g, ' ') : 'NOT STARTED'}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            {joiningForm?.submitted_at
              ? `Submitted ${new Date(joiningForm.submitted_at).toLocaleDateString()}`
              : 'Digital packet status'}
          </div>
        </div>

        {/* Documents Card */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            DOCUMENTS
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
            {documents.length > 0 ? `${verifiedDocsCount} / ${documents.length} Verified` : '0 Uploaded'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Identity & Education
          </div>
        </div>

        {/* Payment Card */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            PAYMENT
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: hasSuccessfulPayment ? '#10B981' : hasPendingPayment ? '#F59E0B' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {hasSuccessfulPayment ? '✓ Paid' : hasPendingPayment ? '● Pending' : 'Not Initiated'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Registration fee
          </div>
        </div>

        {/* Employee Card */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            EMPLOYEE
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: employee ? '#10B981' : '#64748B'
            }}
          >
            {employee ? `Active (${employee.employee_code})` : 'Not Created'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
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
            style={{
              backgroundColor: '#0F172A',
              border: application.joining_access_enabled
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
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
                      backgroundColor: application.joining_access_enabled
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {application.joining_access_enabled ? (
                      <Unlock size={18} color="#10B981" />
                    ) : (
                      <Lock size={18} color="#F87171" />
                    )}
                  </div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                    JOINING FORM ACCESS
                  </h2>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: application.joining_access_enabled
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      color: application.joining_access_enabled ? '#10B981' : '#F87171',
                      border: application.joining_access_enabled
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {application.joining_access_enabled ? 'ENABLED' : 'LOCKED'}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>
                  {application.joining_access_enabled ? (
                    <>
                      Enabled At:{' '}
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>
                        {application.joining_access_enabled_at
                          ? new Date(application.joining_access_enabled_at).toLocaleString('en-IN')
                          : 'Active'}
                      </span>
                    </>
                  ) : (
                    'Candidate is currently restricted from submitting or editing the digital joining packet.'
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleToggleJoiningAccess}
                disabled={isTogglingAccess}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: application.joining_access_enabled ? '#1E293B' : '#10B981',
                  color: application.joining_access_enabled ? '#F87171' : '#FFFFFF',
                  border: application.joining_access_enabled ? '1px solid #334155' : 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isTogglingAccess ? 'not-allowed' : 'pointer',
                  boxShadow: application.joining_access_enabled ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                {isTogglingAccess ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : application.joining_access_enabled ? (
                  <Lock size={16} />
                ) : (
                  <Unlock size={16} />
                )}
                <span>{application.joining_access_enabled ? 'DISABLE ACCESS' : 'ENABLE JOINING FORM'}</span>
              </button>
            </div>
          </div>

          {/* Candidate Information Card */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <User size={20} color="#F59E0B" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                Candidate Information
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Full Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 600, marginTop: '2px' }}>
                  {application.full_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Father's Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 600, marginTop: '2px' }}>
                  {application.father_name || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Mobile Contact
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 600, marginTop: '2px' }}>
                  {application.mobile}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Email Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 600, marginTop: '2px' }}>
                  {application.email}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Permanent Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginTop: '2px', lineHeight: 1.4 }}>
                  {application.address || '—'}
                </div>
              </div>

              {/* Masked Sensitive Information if available in joining_forms */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Aadhaar Number (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontFamily: 'monospace', marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.aadhaar_number, 4)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  PAN Card (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontFamily: 'monospace', marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.pan_number, 3)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Bank Account (Masked)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', fontFamily: 'monospace', marginTop: '2px' }}>
                  {maskSensitive(joiningForm?.bank_account_number, 4)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Bank IFSC / Name
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8FAFC', marginTop: '2px' }}>
                  {joiningForm?.ifsc_code ? `${joiningForm.bank_name || 'Bank'} (${joiningForm.ifsc_code})` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Company / Employment Information Form (Saves to joining_forms) */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Building2 size={20} color="#F59E0B" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                Company / Employment Assignment
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Corporate parameters assigned to the candidate. These values will populate the candidate's
              Joining Form and generated PDF packet.
            </p>

            <form onSubmit={handleSaveCompanyInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Company Select */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
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
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '0.4rem',
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
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isSavingCompanyInfo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSavingCompanyInfo ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
                  }}
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
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileText size={18} color="#F59E0B" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
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
                      backgroundColor: '#090D16',
                      border: '1px solid #1E293B',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                        {doc.document_type.replace(/_/g, ' ')} {doc.document_side ? `(${doc.document_side})` : ''}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        {doc.original_file_name || 'Uploaded document'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        fontWeight: 600,
                        backgroundColor:
                          doc.verification_status === 'VERIFIED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : doc.verification_status === 'REJECTED'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          doc.verification_status === 'VERIFIED'
                            ? '#10B981'
                            : doc.verification_status === 'REJECTED'
                            ? '#F87171'
                            : '#F59E0B'
                      }}
                    >
                      {doc.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Summary Card */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CreditCard size={18} color="#F59E0B" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
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
                      backgroundColor: '#090D16',
                      border: '1px solid #1E293B',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                        ₹{p.amount.toLocaleString()} — {p.purpose}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {p.payment_reference}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        fontWeight: 600,
                        backgroundColor:
                          p.status === 'SUCCESS'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : p.status === 'PENDING'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          p.status === 'SUCCESS'
                            ? '#10B981'
                            : p.status === 'PENDING'
                            ? '#F59E0B'
                            : '#F87171'
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Logs Audit Trail */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <History size={18} color="#F59E0B" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                Audit Activity Log ({activityLogs.length})
              </h3>
            </div>

            {activityLogs.length === 0 ? (
              <div style={{ fontSize: '0.825rem', color: '#64748B', textAlign: 'center', padding: '1.5rem 0' }}>
                No activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      borderLeft: '2px solid #F59E0B',
                      paddingLeft: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem'
                    }}
                  >
                    <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.3 }}>
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
    </div>
  );
};
