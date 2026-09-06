// ==============================================================================
// File: src/components/admin/CompanyInformationEditor.tsx
// Description: Admin / Company Controlled Assignment Details Editor
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React, { useState } from 'react';
import { Building2, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { CompanyRow, JoiningFormRow } from '../../types/database';

interface CompanyInformationEditorProps {
  applicationId: string;
  joiningForm: JoiningFormRow | null;
  companies: CompanyRow[];
  canEdit: boolean;
  onSaved: () => void;
  logActivity: (action: string, description: string, metadata?: Record<string, unknown>) => Promise<void>;
}

export const CompanyInformationEditor: React.FC<CompanyInformationEditorProps> = ({
  applicationId,
  joiningForm,
  companies,
  canEdit,
  onSaved,
  logActivity
}) => {
  const [formData, setFormData] = useState({
    company_id: joiningForm?.company_id || '',
    unit: joiningForm?.unit || '',
    company_address: joiningForm?.company_address || '',
    employee_code: joiningForm?.employee_code || '',
    department: joiningForm?.department || '',
    sub_department: joiningForm?.sub_department || '',
    designation: joiningForm?.designation || '',
    location: joiningForm?.location || '',
    date_of_joining: joiningForm?.date_of_joining || '',
    gross_salary: joiningForm?.gross_salary ? String(joiningForm.gross_salary) : ''
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const grossSalaryNum = formData.gross_salary ? parseFloat(formData.gross_salary) : null;

      if (joiningForm) {
        const { error: updateErr } = await (supabase
          .from('joining_forms')
          .update({
            company_id: formData.company_id || null,
            unit: formData.unit || null,
            company_address: formData.company_address || null,
            employee_code: formData.employee_code || null,
            department: formData.department || null,
            sub_department: formData.sub_department || null,
            designation: formData.designation || null,
            location: formData.location || null,
            date_of_joining: formData.date_of_joining || null,
            gross_salary: grossSalaryNum,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', joiningForm.id) as any);

        if (updateErr) throw new Error(updateErr.message);
      } else {
        const { error: insertErr } = await (supabase.from('joining_forms').insert({
          application_id: applicationId,
          company_id: formData.company_id || null,
          unit: formData.unit || null,
          company_address: formData.company_address || null,
          employee_code: formData.employee_code || null,
          department: formData.department || null,
          sub_department: formData.sub_department || null,
          designation: formData.designation || null,
          location: formData.location || null,
          date_of_joining: formData.date_of_joining || null,
          gross_salary: grossSalaryNum,
          submission_status: 'DRAFT',
          same_as_permanent: true
        } as any) as any);

        if (insertErr) throw new Error(insertErr.message);
      }

      await logActivity(
        'COMPANY_INFO_UPDATED',
        'Administrator updated employer assignment and company-controlled parameters.',
        {
          company_id: formData.company_id,
          employee_code: formData.employee_code,
          designation: formData.designation
        }
      );

      setSuccessMsg('Company assignment details successfully saved.');
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save company information.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#192A56' }}>
              Company & Employment Assignment
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Official administrative parameters configured for candidate onboarding
            </div>
          </div>
        </div>

        <span
          style={{
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 800,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE'
          }}
        >
          ADMIN / COMPANY PROVIDED
        </span>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '0.7rem 1rem',
            borderRadius: '6px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            color: '#2E7D32',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.7rem 1rem',
            borderRadius: '6px',
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            color: '#C9726F',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Employer Partner / Company */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Employer Partner / Company
            </label>
            <select
              value={formData.company_id}
              disabled={!canEdit}
              onChange={(e) => {
                const comp = companies.find((c) => c.id === e.target.value);
                setFormData({
                  ...formData,
                  company_id: e.target.value,
                  company_address: comp?.address || formData.company_address
                });
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none',
                cursor: canEdit ? 'pointer' : 'not-allowed'
              }}
            >
              <option value="">Select Employer Partner...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_type.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Unit / Plant */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Unit / Plant
            </label>
            <input
              type="text"
              value={formData.unit}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g. Unit 1 / Plant A"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Official Company Address */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Official Company Address
            </label>
            <input
              type="text"
              value={formData.company_address}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              placeholder="e.g. Plot No. 12, Industrial Area, Sector 5"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Employee Code */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Employee Code
            </label>
            <input
              type="text"
              value={formData.employee_code}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              placeholder="e.g. EMP-2026-001"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Designation */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Designation
            </label>
            <input
              type="text"
              value={formData.designation}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g. Machine Operator"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. Production / Quality"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Sub Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Sub Department
            </label>
            <input
              type="text"
              value={formData.sub_department}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, sub_department: e.target.value })}
              placeholder="e.g. Assembly Line 2"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Work Location */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Work Location
            </label>
            <input
              type="text"
              value={formData.location}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Noida / Pune"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Date of Joining */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Date of Joining
            </label>
            <input
              type="date"
              value={formData.date_of_joining}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Gross Salary / CTC */}
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#192A56', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Gross Salary / CTC (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.gross_salary}
              disabled={!canEdit}
              onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
              placeholder="e.g. 25000"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.6rem 0.75rem',
                backgroundColor: canEdit ? '#FFFFFF' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-admin-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
            >
              {isSaving ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Save size={16} />
              )}
              <span>Save Company Assignment</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
