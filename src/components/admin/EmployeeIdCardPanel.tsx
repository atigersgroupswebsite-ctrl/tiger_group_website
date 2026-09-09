// ==============================================================================
// File: src/components/admin/EmployeeIdCardPanel.tsx
// Description: Admin Panel for Employee Record Governance & ID Card Management
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Features:
//   - Creates / views authoritative employee records (application or standalone joining)
//   - Generates authentic 1-page Employee Identity Card PDF
//   - Previews & prints official ID Card
//   - Sends ID Card PDF directly to employee's authoritative email
//   - Audits all actions in activity_logs
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Mail,
  User,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Download
} from 'lucide-react';
import type { EmployeeRow, GeneratedFileRow } from '../../types/database';
import {
  createOrUpdateEmployeeRecord,
  processEmployeeIdCardGeneration,
  dispatchEmployeeIdCardToEmail,
  getLatestGeneratedIdCard
} from '../../services/employeeService';
import { getGeneratedDocumentSignedUrl } from '../../services/filePersistenceService';
import {
  getCompanySignatureSettings,
  type CompanySignatureMetadata
} from '../../services/companySignatureService';

interface EmployeeIdCardPanelProps {
  applicationId?: string | null;
  joiningFormId?: string | null;
  candidateName: string;
  candidateEmail?: string | null;
  candidateMobile?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  dob?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  existingEmployee?: EmployeeRow | null;
  onEmployeeUpdated?: (employee: EmployeeRow) => void;
}

export const EmployeeIdCardPanel: React.FC<EmployeeIdCardPanelProps> = ({
  applicationId,
  joiningFormId,
  candidateName,
  candidateEmail,
  candidateMobile,
  bloodGroup,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelation,
  dob,
  address,
  photoUrl,
  signatureUrl,
  existingEmployee,
  onEmployeeUpdated
}) => {
  const [employee, setEmployee] = useState<EmployeeRow | null>(existingEmployee || null);
  const [employeeCode, setEmployeeCode] = useState<string>(
    existingEmployee?.employee_code || `ATG-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [designation, setDesignation] = useState<string>(
    existingEmployee?.designation || 'Associate'
  );
  const [department, setDepartment] = useState<string>(
    existingEmployee?.department || 'Operations'
  );
  const [location, setLocation] = useState<string>(
    existingEmployee?.location || 'Nagpur, Maharashtra'
  );
  const [email, setEmail] = useState<string>(
    existingEmployee?.email || candidateEmail || ''
  );

  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [latestCardFile, setLatestCardFile] = useState<GeneratedFileRow | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [companySignatureMeta, setCompanySignatureMeta] = useState<CompanySignatureMetadata | null>(null);

  // Load active company signature metadata
  useEffect(() => {
    let isMounted = true;
    const fetchCompanySig = async () => {
      const meta = await getCompanySignatureSettings();
      if (isMounted) setCompanySignatureMeta(meta);
    };
    fetchCompanySig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync with prop
  useEffect(() => {
    if (existingEmployee) {
      setEmployee(existingEmployee);
      setEmployeeCode(existingEmployee.employee_code);
      if (existingEmployee.designation) setDesignation(existingEmployee.designation);
      if (existingEmployee.department) setDepartment(existingEmployee.department);
      if (existingEmployee.location) setLocation(existingEmployee.location);
      if (existingEmployee.email) setEmail(existingEmployee.email);
    }
  }, [existingEmployee]);

  // Load latest ID card file
  useEffect(() => {
    let isMounted = true;
    const loadFile = async () => {
      const file = await getLatestGeneratedIdCard({ applicationId, joiningFormId });
      if (isMounted && file) {
        setLatestCardFile(file);
      }
    };
    loadFile();
    return () => {
      isMounted = false;
    };
  }, [applicationId, joiningFormId, employee]);

  // Handle Promoting / Saving Employee Record
  const handleSaveEmployeeRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Employee Code cannot be empty.' });
      return;
    }

    try {
      setIsPromoting(true);
      setStatusMessage(null);

      const res = await createOrUpdateEmployeeRecord({
        applicationId,
        joiningFormId,
        employeeCode: employeeCode.trim(),
        candidateName: candidateName.trim(),
        email: email.trim(),
        mobile: candidateMobile,
        designation: designation.trim(),
        department: department.trim(),
        location: location.trim(),
        employmentStatus: 'ACTIVE'
      });

      if (!res.success || !res.employee) {
        throw new Error(res.error || 'Failed to save employee record.');
      }

      setEmployee(res.employee);
      if (onEmployeeUpdated) onEmployeeUpdated(res.employee);

      setStatusMessage({
        type: 'success',
        text: `Official Employee Record active for ${res.employee.employee_code}.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setIsPromoting(false);
    }
  };

  // Handle Generate ID Card
  const handleGenerateIdCard = async () => {
    if (!employee) {
      setStatusMessage({
        type: 'error',
        text: 'Please create or activate the official employee record first.'
      });
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage(null);

      const res = await processEmployeeIdCardGeneration(employee, {
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        dob,
        mobile: candidateMobile || employee.mobile,
        email: email || candidateEmail || employee.email,
        address,
        photoUrl,
        signatureUrl
      });

      if (!res.success || !res.blob) {
        throw new Error(res.error || 'Failed to generate Employee ID Card PDF.');
      }

      const blobUrl = URL.createObjectURL(res.blob);
      setPreviewBlobUrl(blobUrl);

      // Refresh latest file record
      const refreshedFile = await getLatestGeneratedIdCard({ applicationId, joiningFormId });
      if (refreshedFile) setLatestCardFile(refreshedFile);

      setStatusMessage({
        type: 'success',
        text: `Official Employee ID Card generated and persisted to archive (${res.storagePath}).`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ID Card generation failed.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle View / Print
  const handleOpenPreview = async () => {
    if (previewBlobUrl) {
      window.open(previewBlobUrl, '_blank');
      return;
    }

    if (latestCardFile) {
      const signedRes = await getGeneratedDocumentSignedUrl(latestCardFile.storage_path, 3600);
      if (signedRes.url) {
        window.open(signedRes.url, '_blank');
        return;
      }
    }

    // Otherwise generate on the fly
    await handleGenerateIdCard();
  };

  // Handle Download ID Card
  const handleDownloadIdCard = async () => {
    if (!employee) {
      setStatusMessage({
        type: 'error',
        text: 'Please create or activate the official employee record first.'
      });
      return;
    }

    try {
      setStatusMessage(null);
      const res = await processEmployeeIdCardGeneration(employee, {
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        dob,
        mobile: candidateMobile || employee.mobile,
        email: email || candidateEmail || employee.email,
        address,
        photoUrl,
        signatureUrl
      });

      if (!res.success || !res.blob) {
        throw new Error(res.error || 'Failed to generate Employee ID Card for download.');
      }

      const link = document.createElement('a');
      link.href = URL.createObjectURL(res.blob);
      link.download = res.fileName || `${employee.employee_code}-ID-Card.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);

      setStatusMessage({
        type: 'success',
        text: `Downloaded official ID Card for ${employee.employee_code}.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ID Card download failed.' });
    }
  };

  // Handle Send to Employee Email
  const handleSendEmail = async () => {
    if (!employee) {
      setStatusMessage({
        type: 'error',
        text: 'Please create or activate the official employee record first.'
      });
      return;
    }

    if (!employee.email || !employee.email.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Employee record does not have a valid email address.'
      });
      return;
    }

    try {
      setIsSending(true);
      setStatusMessage(null);

      const res = await dispatchEmployeeIdCardToEmail(employee, {
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        dob,
        mobile: candidateMobile || employee.mobile,
        email: email || candidateEmail || employee.email,
        address,
        photoUrl,
        signatureUrl
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to send ID card email.');
      }

      setStatusMessage({
        type: 'success',
        text: res.simulated
          ? `ID Card email delivery simulated to ${employee.email} (SMTP not configured in local environment). Activity logged.`
          : `Official Employee ID Card successfully dispatched to ${employee.email}. Activity logged.`
      });

      // Refresh latest file record
      const refreshedFile = await getLatestGeneratedIdCard({ applicationId, joiningFormId });
      if (refreshedFile) setLatestCardFile(refreshedFile);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Email delivery failed.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#0F1B38',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CreditCard size={20} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0F1B38',
                letterSpacing: '0.02em'
              }}
            >
              Employee Identity Card & Administration
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Authoritative employee record management, separate ID card generation & email issuance
            </p>
          </div>
        </div>

        {employee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <CheckCircle2 size={13} />
              EMPLOYEE ACTIVE: {employee.employee_code}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor:
              statusMessage.type === 'success'
                ? '#F0FDF4'
                : statusMessage.type === 'error'
                ? '#FEF2F2'
                : '#F8FAFC',
            color:
              statusMessage.type === 'success'
                ? '#166534'
                : statusMessage.type === 'error'
                ? '#991B1B'
                : '#334155',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? '#BBF7D0'
                : statusMessage.type === 'error'
                ? '#FECACA'
                : '#E2E8F0'
            }`
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Employee Record Form / Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Left Column: Authoritative Details Form */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1.25rem',
            backgroundColor: '#FAFAFA'
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#0F1B38',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <User size={15} />
            Authoritative Employee Profile
          </div>

          <form onSubmit={handleSaveEmployeeRecord}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '0.25rem'
                }}
              >
                Candidate Name
              </label>
              <input
                type="text"
                value={candidateName}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F1F5F9',
                  color: '#0F172A',
                  fontWeight: 600
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '0.85rem'
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.25rem'
                  }}
                >
                  Employee Code *
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. ATG-1001"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.25rem'
                  }}
                >
                  Destination Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@domain.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1'
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '0.85rem'
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.25rem'
                  }}
                >
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.25rem'
                  }}
                >
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '0.25rem'
                }}
              >
                Work Location / Unit
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPromoting}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                backgroundColor: employee ? '#334155' : '#0F1B38',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <FileCheck size={16} />
              {isPromoting
                ? 'Saving Record...'
                : employee
                ? 'Update Authoritative Employee Record'
                : 'Create / Promote to Official Employee'}
            </button>
          </form>
        </div>

        {/* Right Column: ID Card Operations Card */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1.25rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#0F1B38',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <CreditCard size={15} />
              Identity Card Administrative Actions
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              The Employee Identity Card is separate from the candidate's joining packet. It is generated from authoritative employee data and uses the exact client-designed layout.
            </p>

            {/* ID Card Visual Pill / Status */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                border: '1px dashed #CBD5E1',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Card Standard:
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F1B38' }}>
                  ISO/IEC 7810 ID-1 (CR80) — 85.6mm × 54.0mm
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Card Architecture:
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                  Dynamic 2-Sided Vector Standard
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Founder/CEO Signature:
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: companySignatureMeta?.enabled && companySignatureMeta?.storage_path ? '#166534' : '#B45309'
                  }}
                >
                  {companySignatureMeta?.enabled && companySignatureMeta?.storage_path ? (
                    `✓ Active (v${companySignatureMeta.version || 1})`
                  ) : (
                    <Link to="/admin/settings" style={{ color: '#B45309', textDecoration: 'underline' }}>
                      ⚠ Not Configured (Configure)
                    </Link>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Passport Photo:
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: photoUrl ? '#166534' : '#94A3B8' }}>
                  {photoUrl ? '✓ Available on Record' : 'Pending Upload'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Archive Ledger Status:
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: latestCardFile ? '#166534' : '#EAB308' }}>
                  {latestCardFile ? `✓ Persisted (v${latestCardFile.version})` : 'Not Yet Generated'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={handleGenerateIdCard}
                disabled={isGenerating || !employee}
                style={{
                  padding: '0.55rem 0.5rem',
                  backgroundColor: '#0F1B38',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: employee ? 'pointer' : 'not-allowed',
                  opacity: employee ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <RefreshCw size={13} className={isGenerating ? 'spin' : ''} />
                {isGenerating ? 'Generating...' : 'Generate Card'}
              </button>

              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={!employee}
                style={{
                  padding: '0.55rem 0.5rem',
                  backgroundColor: '#FFFFFF',
                  color: '#0F1B38',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: employee ? 'pointer' : 'not-allowed',
                  opacity: employee ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ExternalLink size={13} />
                View / Print
              </button>

              <button
                type="button"
                onClick={handleDownloadIdCard}
                disabled={!employee}
                style={{
                  padding: '0.55rem 0.5rem',
                  backgroundColor: '#FFFFFF',
                  color: '#0F1B38',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: employee ? 'pointer' : 'not-allowed',
                  opacity: employee ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Download size={13} />
                Download PDF
              </button>
            </div>

            {/* Send ID Card to Employee Email Button */}
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending || !employee || !email}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                backgroundColor: '#166534',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: employee && email ? 'pointer' : 'not-allowed',
                opacity: employee && email ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Mail size={16} />
              {isSending ? 'Dispatching Email...' : 'Send ID Card to Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
