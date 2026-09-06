import React from 'react';
import type { PersonalInfo } from '../../types/joining';

interface PersonalSectionProps {
  data: PersonalInfo;
  onChange: (field: keyof PersonalInfo, value: string) => void;
  errors: Record<string, string>;
}

export const PersonalSection: React.FC<PersonalSectionProps> = ({
  data,
  onChange,
  errors
}) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 02</span>
        <h2 className="joining-step-title">PERSONAL INFORMATION</h2>
        <p className="joining-step-desc">
          Official identity and demographic records required for statutory KYC registration.
        </p>
      </div>

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="employeeName">
            <span>FULL NAME (AS PER AADHAAR)</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="employeeName"
            type="text"
            className={`field-input ${errors.employeeName ? 'has-error' : ''}`}
            placeholder="e.g. Rahul Manohar Patil"
            value={data.employeeName}
            onChange={(e) => onChange('employeeName', e.target.value)}
          />
          {errors.employeeName && <span className="field-error-msg">{errors.employeeName}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="dateOfBirth">
            <span>DATE OF BIRTH</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="dateOfBirth"
            type="date"
            className={`field-input ${errors.dateOfBirth ? 'has-error' : ''}`}
            value={data.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
          />
          {errors.dateOfBirth && <span className="field-error-msg">{errors.dateOfBirth}</span>}
        </div>
      </div>

      <div className="joining-grid-3">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="gender">
            <span>GENDER</span>
            <span className="field-required-star">*</span>
          </label>
          <select
            id="gender"
            className={`field-select ${errors.gender ? 'has-error' : ''}`}
            value={data.gender}
            onChange={(e) => onChange('gender', e.target.value)}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <span className="field-error-msg">{errors.gender}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="maritalStatus">
            <span>MARITAL STATUS</span>
            <span className="field-required-star">*</span>
          </label>
          <select
            id="maritalStatus"
            className={`field-select ${errors.maritalStatus ? 'has-error' : ''}`}
            value={data.maritalStatus}
            onChange={(e) => onChange('maritalStatus', e.target.value)}
          >
            <option value="">Select Status</option>
            <option value="Single">Single / Unmarried</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
          {errors.maritalStatus && <span className="field-error-msg">{errors.maritalStatus}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="bloodGroup">
            <span>BLOOD GROUP</span>
            <span className="field-optional-tag">(Optional)</span>
          </label>
          <select
            id="bloodGroup"
            className="field-select"
            value={data.bloodGroup}
            onChange={(e) => onChange('bloodGroup', e.target.value)}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="fatherName">
            <span>FATHER'S FULL NAME</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="fatherName"
            type="text"
            className={`field-input ${errors.fatherName ? 'has-error' : ''}`}
            placeholder="Father's full name"
            value={data.fatherName}
            onChange={(e) => onChange('fatherName', e.target.value)}
          />
          {errors.fatherName && <span className="field-error-msg">{errors.fatherName}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="motherOrHusbandName">
            <span>MOTHER'S / HUSBAND'S NAME</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="motherOrHusbandName"
            type="text"
            className={`field-input ${errors.motherOrHusbandName ? 'has-error' : ''}`}
            placeholder="Mother's or husband's name"
            value={data.motherOrHusbandName}
            onChange={(e) => onChange('motherOrHusbandName', e.target.value)}
          />
          {errors.motherOrHusbandName && <span className="field-error-msg">{errors.motherOrHusbandName}</span>}
        </div>
      </div>

      {data.maritalStatus === 'Married' && (
        <div className="field-wrapper">
          <label className="field-label" htmlFor="spouseName">
            <span>SPOUSE NAME</span>
          </label>
          <input
            id="spouseName"
            type="text"
            className="field-input"
            placeholder="Full name of spouse"
            value={data.spouseName || ''}
            onChange={(e) => onChange('spouseName', e.target.value)}
          />
        </div>
      )}

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="aadhaarNumber">
            <span>AADHAAR NUMBER (12 DIGITS)</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="aadhaarNumber"
            type="text"
            maxLength={14}
            className={`field-input ${errors.aadhaarNumber ? 'has-error' : ''}`}
            placeholder="XXXX XXXX XXXX"
            value={data.aadhaarNumber}
            onChange={(e) => onChange('aadhaarNumber', e.target.value)}
          />
          {errors.aadhaarNumber && <span className="field-error-msg">{errors.aadhaarNumber}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="panNumber">
            <span>PAN NUMBER (10 CHARACTERS)</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="panNumber"
            type="text"
            maxLength={10}
            style={{ textTransform: 'uppercase' }}
            className={`field-input ${errors.panNumber ? 'has-error' : ''}`}
            placeholder="ABCDE1234F"
            value={data.panNumber}
            onChange={(e) => onChange('panNumber', e.target.value.toUpperCase())}
          />
          {errors.panNumber && <span className="field-error-msg">{errors.panNumber}</span>}
        </div>
      </div>

      <div className="joining-grid-3">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="employeeContactNumber">
            <span>MOBILE NUMBER</span>
            <span className="field-required-star">*</span>
          </label>
          <div className="field-phone-box">
            <span className="field-phone-prefix">+91</span>
            <input
              id="employeeContactNumber"
              type="tel"
              maxLength={10}
              className={`field-phone-input ${errors.employeeContactNumber ? 'has-error' : ''}`}
              placeholder="10-digit mobile"
              value={data.employeeContactNumber}
              onChange={(e) => onChange('employeeContactNumber', e.target.value)}
            />
          </div>
          {errors.employeeContactNumber && <span className="field-error-msg">{errors.employeeContactNumber}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="otherContactNumber">
            <span>ALTERNATE CONTACT</span>
            <span className="field-optional-tag">(Optional)</span>
          </label>
          <div className="field-phone-box">
            <span className="field-phone-prefix">+91</span>
            <input
              id="otherContactNumber"
              type="tel"
              maxLength={10}
              className="field-phone-input"
              placeholder="Alternative phone"
              value={data.otherContactNumber || ''}
              onChange={(e) => onChange('otherContactNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="emailId">
            <span>EMAIL ADDRESS</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="emailId"
            type="email"
            className={`field-input ${errors.emailId ? 'has-error' : ''}`}
            placeholder="candidate@example.com"
            value={data.emailId}
            onChange={(e) => onChange('emailId', e.target.value)}
          />
          {errors.emailId && <span className="field-error-msg">{errors.emailId}</span>}
        </div>
      </div>
    </div>
  );
};
