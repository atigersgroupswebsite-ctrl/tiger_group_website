import React from 'react';
import { Lock } from 'lucide-react';
import type { EmploymentInfo } from '../../types/joining';

interface EmploymentSectionProps {
  employment: EmploymentInfo;
}

export const EmploymentSection: React.FC<EmploymentSectionProps> = ({ employment }) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 01</span>
        <h2 className="joining-step-title">EMPLOYMENT INFORMATION</h2>
        <p className="joining-step-desc">
          Official assignment details assigned by A Tiger Global and your designated employer.
        </p>
      </div>

      <div className="admin-controlled-banner">
        <Lock size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-midnight-navy)' }} />
        <div>
          <strong>ADMIN / COMPANY PROVIDED DETAILS (READ-ONLY)</strong>
          <br />
          These employment parameters have been confirmed by our corporate administrative team based on your interview confirmation and contract allocation. Candidates cannot modify these values.
        </div>
      </div>

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label">
            <span>COMPANY NAME</span>
            <span className="admin-lock-tag"><Lock size={10} /> Admin Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.companyName}
            readOnly
          />
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>UNIT / PLANT</span>
            <span className="admin-lock-tag"><Lock size={10} /> Admin Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.unit}
            readOnly
          />
        </div>
      </div>

      <div className="field-wrapper">
        <label className="field-label">
          <span>PLANT / WORKPLACE ADDRESS</span>
          <span className="admin-lock-tag"><Lock size={10} /> Company Provided</span>
        </label>
        <input
          type="text"
          className="field-input read-only-field"
          value={employment.address}
          readOnly
        />
      </div>

      <div className="joining-grid-3">
        <div className="field-wrapper">
          <label className="field-label">
            <span>EMPLOYEE CODE</span>
            <span className="admin-lock-tag"><Lock size={10} /> Admin Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.employeeCode}
            readOnly
          />
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>DESIGNATION</span>
            <span className="admin-lock-tag"><Lock size={10} /> Company Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.designation}
            readOnly
          />
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>DEPARTMENT</span>
            <span className="admin-lock-tag"><Lock size={10} /> Company Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.department}
            readOnly
          />
        </div>
      </div>

      <div className="joining-grid-3">
        <div className="field-wrapper">
          <label className="field-label">
            <span>SUB DEPARTMENT</span>
            <span className="admin-lock-tag"><Lock size={10} /> Company Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.subDepartment}
            readOnly
          />
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>WORK LOCATION</span>
            <span className="admin-lock-tag"><Lock size={10} /> Admin Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.location}
            readOnly
          />
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>DATE OF JOINING</span>
            <span className="admin-lock-tag"><Lock size={10} /> Admin Provided</span>
          </label>
          <input
            type="date"
            className="field-input read-only-field"
            value={employment.dateOfJoining}
            readOnly
          />
        </div>
      </div>

      {employment.grossSalaryCTC && (
        <div className="field-wrapper">
          <label className="field-label">
            <span>CONFIRMED SALARY PACKAGE / STIPEND</span>
            <span className="admin-lock-tag"><Lock size={10} /> Company Provided</span>
          </label>
          <input
            type="text"
            className="field-input read-only-field"
            value={employment.grossSalaryCTC}
            readOnly
          />
        </div>
      )}
    </div>
  );
};
