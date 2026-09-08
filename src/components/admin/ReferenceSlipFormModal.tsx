// ==============================================================================
// File: src/components/admin/ReferenceSlipFormModal.tsx
// Description: Admin Modal for Completing/Updating Interview & Company Allotment
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Calendar,
  Briefcase,
  UserCheck,
  FileCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import type { CompanyRow } from '../../types/database';
import type { ReferenceSlipFormData, CandidateSourceInfo } from '../../services/referenceSlipService';

interface ReferenceSlipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReferenceSlipFormData) => Promise<boolean>;
  initialData?: Partial<ReferenceSlipFormData> | null;
  candidateInfo?: CandidateSourceInfo | null;
  isSaving?: boolean;
}

export const ReferenceSlipFormModal: React.FC<ReferenceSlipFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  candidateInfo,
  isSaving = false
}) => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [reportingDate, setReportingDate] = useState<string>('');
  const [reportingTime, setReportingTime] = useState<string>('09:30 AM');
  const [department, setDepartment] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [salaryCtc, setSalaryCtc] = useState<string>('');
  const [interviewConductedBy, setInterviewConductedBy] = useState<string>('');
  const [interviewResult, setInterviewResult] = useState<'SELECTED' | 'HOLD' | 'REJECTED'>('SELECTED');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load companies for dropdown
  useEffect(() => {
    async function loadCompanies() {
      if (!isSupabaseConfigured) return;
      try {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('active', true)
          .order('name');
        if (data) setCompanies(data);
      } catch (err) {
        console.warn('Could not load companies list:', err);
      }
    }
    loadCompanies();
  }, []);

  // Sync initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (initialData) {
        setSelectedCompanyId(initialData.companyId || '');
        setCustomCompanyName(initialData.companyName || '');
        setInterviewDate(initialData.interviewDate || new Date().toISOString().split('T')[0]);
        setReportingDate(initialData.reportingDate || '');
        setReportingTime(initialData.reportingTime || '09:30 AM');
        setDepartment(initialData.department || '');
        setDesignation(initialData.designation || candidateInfo?.positionApplied || '');
        setSalaryCtc(initialData.salaryCtc ? String(initialData.salaryCtc) : '');
        setInterviewConductedBy(initialData.interviewConductedBy || '');
        const res = (initialData.interviewResult || 'SELECTED').toUpperCase();
        setInterviewResult(res === 'HOLD' ? 'HOLD' : res === 'REJECTED' ? 'REJECTED' : 'SELECTED');
        setSelectedDesignation(initialData.selectedDesignation || initialData.designation || '');
        setJoiningDate(initialData.joiningDate || candidateInfo?.expectedJoiningDate || '');
        setRemarks(initialData.remarks || '');
      } else {
        // Defaults for new slip
        setInterviewDate(new Date().toISOString().split('T')[0]);
        setReportingTime('09:30 AM');
        setDesignation(candidateInfo?.positionApplied || '');
        setSelectedDesignation(candidateInfo?.positionApplied || '');
        setJoiningDate(candidateInfo?.expectedJoiningDate || '');
        setInterviewResult('SELECTED');
      }
    }
  }, [isOpen, initialData, candidateInfo]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Resolve company name
    let resolvedCompanyName = customCompanyName.trim();
    if (selectedCompanyId && selectedCompanyId !== 'CUSTOM') {
      const found = companies.find((c) => c.id === selectedCompanyId);
      if (found) resolvedCompanyName = found.name;
    }

    if (!resolvedCompanyName) {
      setFormError('Please select or specify the employer / client company.');
      return;
    }

    const payload: ReferenceSlipFormData = {
      companyId: selectedCompanyId && selectedCompanyId !== 'CUSTOM' ? selectedCompanyId : null,
      companyName: resolvedCompanyName,
      interviewDate: interviewDate || null,
      reportingDate: reportingDate || null,
      reportingTime: reportingTime.trim() || null,
      department: department.trim() || null,
      designation: designation.trim() || null,
      salaryCtc: salaryCtc ? Number(salaryCtc) : null,
      interviewConductedBy: interviewConductedBy.trim() || null,
      interviewResult,
      selectedDesignation: selectedDesignation.trim() || designation.trim() || null,
      joiningDate: joiningDate || null,
      remarks: remarks.trim() || null
    };

    const success = await onSubmit(payload);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0F172A' }}>
                {initialData ? 'Edit Reference Slip Details' : 'Prepare Employee Reference Slip'}
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                {candidateInfo ? `${candidateInfo.fullName} (${candidateInfo.sourceReference})` : 'Company & Interview Allotment Record'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          {formError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Employer / Company Information */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={15} />
              <span>1. Employer / Referring Company</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Partner Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      const found = companies.find((c) => c.id === e.target.value);
                      if (found) setCustomCompanyName(found.name);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A'
                  }}
                >
                  <option value="">-- Choose From Companies Directory --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_type})
                    </option>
                  ))}
                  <option value="CUSTOM">+ Specify Other Company</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Company Name on Slip *
                </label>
                <input
                  type="text"
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  placeholder="e.g. Adani Power / JSW Steel"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Interview & Reporting Schedule */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} />
              <span>2. Interview & Reporting Schedule</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Date of Interview
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Reporting Date
                </label>
                <input
                  type="date"
                  value={reportingDate}
                  onChange={(e) => setReportingDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Reporting Time
                </label>
                <input
                  type="text"
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  placeholder="e.g. 09:30 AM"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Job Role & Compensation */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Briefcase size={15} />
              <span>3. Department, Role & Salary (CTC)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations / Logistics"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Production Supervisor"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Salary (CTC in INR/mo)
                </label>
                <input
                  type="number"
                  value={salaryCtc}
                  onChange={(e) => setSalaryCtc(e.target.value)}
                  placeholder="e.g. 22500"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Interview Result & Official Acknowledgment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={15} />
              <span>4. Interview Result & Company Acknowledgment</span>
            </div>

            {/* Result Radio Options */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Interview Decision *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: `2px solid ${interviewResult === 'SELECTED' ? '#10B981' : '#E2E8F0'}`,
                    backgroundColor: interviewResult === 'SELECTED' ? '#ECFDF5' : '#FFFFFF',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: interviewResult === 'SELECTED' ? '#065F46' : '#475569'
                  }}
                >
                  <input
                    type="radio"
                    name="interviewResult"
                    value="SELECTED"
                    checked={interviewResult === 'SELECTED'}
                    onChange={() => setInterviewResult('SELECTED')}
                  />
                  <span>Selected</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: `2px solid ${interviewResult === 'HOLD' ? '#F59E0B' : '#E2E8F0'}`,
                    backgroundColor: interviewResult === 'HOLD' ? '#FFFBEB' : '#FFFFFF',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: interviewResult === 'HOLD' ? '#92400E' : '#475569'
                  }}
                >
                  <input
                    type="radio"
                    name="interviewResult"
                    value="HOLD"
                    checked={interviewResult === 'HOLD'}
                    onChange={() => setInterviewResult('HOLD')}
                  />
                  <span>Hold</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: `2px solid ${interviewResult === 'REJECTED' ? '#EF4444' : '#E2E8F0'}`,
                    backgroundColor: interviewResult === 'REJECTED' ? '#FEF2F2' : '#FFFFFF',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: interviewResult === 'REJECTED' ? '#991B1B' : '#475569'
                  }}
                >
                  <input
                    type="radio"
                    name="interviewResult"
                    value="REJECTED"
                    checked={interviewResult === 'REJECTED'}
                    onChange={() => setInterviewResult('REJECTED')}
                  />
                  <span>Rejected</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Interview Conducted By
                </label>
                <input
                  type="text"
                  value={interviewConductedBy}
                  onChange={(e) => setInterviewConductedBy(e.target.value)}
                  placeholder="e.g. HR Manager / Mr. Verma"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Selected Designation
                </label>
                <input
                  type="text"
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  placeholder="e.g. Junior Machine Operator"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Final Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Administrative Remarks / Instructions
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal notes regarding interview performance, documents required on joining date, etc."
              rows={2}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid #E2E8F0'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              <span>{initialData ? 'Update Slip Details' : 'Save Reference Slip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
