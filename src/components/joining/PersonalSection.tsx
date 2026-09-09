import React from 'react';
import type { PersonalInfo, JoiningFieldConfig } from '../../types/joining';
import { normalizeIndianPhoneNumber } from '../../utils/phoneUtils';
import { isFieldRequired, isFieldEnabled } from '../../utils/joiningValidation';
import { CustomFieldsRenderer } from './CustomFieldsRenderer';

interface PersonalSectionProps {
  data: PersonalInfo;
  onChange: (field: keyof PersonalInfo, value: string) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
  configMap?: Record<string, JoiningFieldConfig>;
  customFields?: Record<string, any>;
  onCustomFieldChange?: (fieldKey: string, value: any) => void;
}

export const PersonalSection: React.FC<PersonalSectionProps> = ({
  data,
  onChange,
  errors,
  readOnly = false,
  configMap,
  customFields,
  onCustomFieldChange
}) => {
  // Candidate must be at least 18 years old
  const maxDobDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();
  const minDobDate = '1950-01-01';

  const handlePhoneInputChange = (
    field: 'employeeContactNumber' | 'otherContactNumber',
    val: string
  ) => {
    const norm = normalizeIndianPhoneNumber(val);
    if (norm.isValid) {
      onChange(field, norm.displayDigits);
      return;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      const local = digits.slice(2);
      if (/^[6-9]\d{9}$/.test(local)) {
        onChange(field, local);
        return;
      }
    }
    onChange(field, digits.slice(0, 10));
  };

  const handlePhonePaste = (
    field: 'employeeContactNumber' | 'otherContactNumber',
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      const norm = normalizeIndianPhoneNumber(pasted);
      if (norm.isValid) {
        e.preventDefault();
        onChange(field, norm.displayDigits);
      }
    }
  };

  const handlePhoneBlur = (
    field: 'employeeContactNumber' | 'otherContactNumber'
  ) => {
    const currentVal = data[field];
    if (currentVal) {
      const norm = normalizeIndianPhoneNumber(currentVal);
      if (norm.isValid) {
        onChange(field, norm.displayDigits);
      }
    }
  };

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
        {/* Full Legal Name */}
        {isFieldEnabled('personal.employeeName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="employeeName">
              <span>{configMap?.['personal.employeeName']?.label?.toUpperCase() || 'FULL NAME (AS PER AADHAAR)'}</span>
              {isFieldRequired('personal.employeeName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="employeeName"
              type="text"
              className={`field-input ${errors.employeeName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.employeeName']?.placeholder || 'e.g. Rahul Manohar Patil'}
              value={data.employeeName}
              onChange={(e) => onChange('employeeName', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {configMap?.['personal.employeeName']?.help_text && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                {configMap['personal.employeeName'].help_text}
              </p>
            )}
            {errors.employeeName && <span className="field-error-msg">{errors.employeeName}</span>}
          </div>
        )}

        {/* Date of Birth */}
        {isFieldEnabled('personal.dateOfBirth', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="dateOfBirth">
              <span>{configMap?.['personal.dateOfBirth']?.label?.toUpperCase() || 'DATE OF BIRTH'}</span>
              {isFieldRequired('personal.dateOfBirth', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="dateOfBirth"
              type="date"
              min={minDobDate}
              max={maxDobDate}
              className={`field-input ${errors.dateOfBirth ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              value={data.dateOfBirth}
              onChange={(e) => onChange('dateOfBirth', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {configMap?.['personal.dateOfBirth']?.help_text && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                {configMap['personal.dateOfBirth'].help_text}
              </p>
            )}
            {errors.dateOfBirth && <span className="field-error-msg">{errors.dateOfBirth}</span>}
          </div>
        )}
      </div>

      <div className="joining-grid-3">
        {/* Gender */}
        {isFieldEnabled('personal.gender', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="gender">
              <span>{configMap?.['personal.gender']?.label?.toUpperCase() || 'GENDER'}</span>
              {isFieldRequired('personal.gender', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <select
              id="gender"
              className={`field-select ${errors.gender ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              value={data.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span className="field-error-msg">{errors.gender}</span>}
          </div>
        )}

        {/* Marital Status */}
        {isFieldEnabled('personal.maritalStatus', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="maritalStatus">
              <span>{configMap?.['personal.maritalStatus']?.label?.toUpperCase() || 'MARITAL STATUS'}</span>
              {isFieldRequired('personal.maritalStatus', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <select
              id="maritalStatus"
              className={`field-select ${errors.maritalStatus ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              value={data.maritalStatus}
              onChange={(e) => onChange('maritalStatus', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Status</option>
              <option value="Single">Single / Unmarried</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            {errors.maritalStatus && <span className="field-error-msg">{errors.maritalStatus}</span>}
          </div>
        )}

        {/* Blood Group */}
        {isFieldEnabled('personal.bloodGroup', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="bloodGroup">
              <span>{configMap?.['personal.bloodGroup']?.label?.toUpperCase() || 'BLOOD GROUP'}</span>
              {isFieldRequired('personal.bloodGroup', configMap, false) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <select
              id="bloodGroup"
              className={`field-select ${readOnly ? 'read-only-field' : ''}`}
              value={data.bloodGroup}
              onChange={(e) => onChange('bloodGroup', e.target.value)}
              disabled={readOnly}
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
        )}
      </div>

      <div className="joining-grid-2">
        {/* Father's Full Name (Configurable Requirement) */}
        {isFieldEnabled('personal.fatherName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="fatherName">
              <span>{configMap?.['personal.fatherName']?.label?.toUpperCase() || "FATHER'S FULL NAME"}</span>
              {isFieldRequired('personal.fatherName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="fatherName"
              type="text"
              className={`field-input ${errors.fatherName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.fatherName']?.placeholder || "Father's full name"}
              value={data.fatherName}
              onChange={(e) => onChange('fatherName', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {configMap?.['personal.fatherName']?.help_text && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                {configMap['personal.fatherName'].help_text}
              </p>
            )}
            {errors.fatherName && <span className="field-error-msg">{errors.fatherName}</span>}
          </div>
        )}

        {/* Mother's / Husband's Name */}
        {isFieldEnabled('personal.motherOrHusbandName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="motherOrHusbandName">
              <span>{configMap?.['personal.motherOrHusbandName']?.label?.toUpperCase() || "MOTHER'S / HUSBAND'S NAME"}</span>
              {isFieldRequired('personal.motherOrHusbandName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="motherOrHusbandName"
              type="text"
              className={`field-input ${errors.motherOrHusbandName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.motherOrHusbandName']?.placeholder || "Mother's or husband's name"}
              value={data.motherOrHusbandName}
              onChange={(e) => onChange('motherOrHusbandName', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {configMap?.['personal.motherOrHusbandName']?.help_text && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                {configMap['personal.motherOrHusbandName'].help_text}
              </p>
            )}
            {errors.motherOrHusbandName && <span className="field-error-msg">{errors.motherOrHusbandName}</span>}
          </div>
        )}
      </div>

      {/* Spouse Name (Conditional for Married candidates) */}
      {data.maritalStatus === 'Married' && isFieldEnabled('personal.spouseName', configMap) && (
        <div className="field-wrapper">
          <label className="field-label" htmlFor="spouseName">
            <span>{configMap?.['personal.spouseName']?.label?.toUpperCase() || 'SPOUSE NAME'}</span>
            {isFieldRequired('personal.spouseName', configMap, false) ? (
              <span className="field-required-star">*</span>
            ) : (
              <span className="field-optional-tag">(Optional)</span>
            )}
          </label>
          <input
            id="spouseName"
            type="text"
            className={`field-input ${errors.spouseName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
            placeholder={configMap?.['personal.spouseName']?.placeholder || 'Full name of spouse'}
            value={data.spouseName || ''}
            onChange={(e) => onChange('spouseName', e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {errors.spouseName && <span className="field-error-msg">{errors.spouseName}</span>}
        </div>
      )}

      <div className="joining-grid-2">
        {/* Aadhaar Number */}
        {isFieldEnabled('personal.aadhaarNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="aadhaarNumber">
              <span>{configMap?.['personal.aadhaarNumber']?.label?.toUpperCase() || 'AADHAAR NUMBER (12 DIGITS)'}</span>
              {isFieldRequired('personal.aadhaarNumber', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="aadhaarNumber"
              type="text"
              maxLength={14}
              className={`field-input ${errors.aadhaarNumber ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.aadhaarNumber']?.placeholder || 'XXXX XXXX XXXX'}
              value={data.aadhaarNumber}
              onChange={(e) => onChange('aadhaarNumber', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors.aadhaarNumber && <span className="field-error-msg">{errors.aadhaarNumber}</span>}
          </div>
        )}

        {/* PAN Number */}
        {isFieldEnabled('personal.panNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="panNumber">
              <span>{configMap?.['personal.panNumber']?.label?.toUpperCase() || 'PAN NUMBER (10 CHARACTERS)'}</span>
              {isFieldRequired('personal.panNumber', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="panNumber"
              type="text"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
              className={`field-input ${errors.panNumber ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.panNumber']?.placeholder || 'ABCDE1234F'}
              value={data.panNumber}
              onChange={(e) => onChange('panNumber', e.target.value.toUpperCase())}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors.panNumber && <span className="field-error-msg">{errors.panNumber}</span>}
          </div>
        )}
      </div>

      <div className="joining-grid-3">
        {/* Mobile Number */}
        {isFieldEnabled('personal.employeeContactNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="employeeContactNumber">
              <span>{configMap?.['personal.employeeContactNumber']?.label?.toUpperCase() || 'MOBILE NUMBER'}</span>
              {isFieldRequired('personal.employeeContactNumber', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <div className="field-phone-box">
              <span className="field-phone-prefix">+91</span>
              <input
                id="employeeContactNumber"
                type="tel"
                maxLength={16}
                className={`field-phone-input ${errors.employeeContactNumber ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['personal.employeeContactNumber']?.placeholder || '10-digit mobile'}
                value={data.employeeContactNumber}
                onChange={(e) => handlePhoneInputChange('employeeContactNumber', e.target.value)}
                onPaste={(e) => handlePhonePaste('employeeContactNumber', e)}
                onBlur={() => handlePhoneBlur('employeeContactNumber')}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
            {errors.employeeContactNumber && <span className="field-error-msg">{errors.employeeContactNumber}</span>}
          </div>
        )}

        {/* Alternate Contact */}
        {isFieldEnabled('personal.otherContactNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="otherContactNumber">
              <span>{configMap?.['personal.otherContactNumber']?.label?.toUpperCase() || 'ALTERNATE CONTACT'}</span>
              {isFieldRequired('personal.otherContactNumber', configMap, false) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <div className="field-phone-box">
              <span className="field-phone-prefix">+91</span>
              <input
                id="otherContactNumber"
                type="tel"
                maxLength={16}
                className={`field-phone-input ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['personal.otherContactNumber']?.placeholder || 'Alternative phone'}
                value={data.otherContactNumber || ''}
                onChange={(e) => handlePhoneInputChange('otherContactNumber', e.target.value)}
                onPaste={(e) => handlePhonePaste('otherContactNumber', e)}
                onBlur={() => handlePhoneBlur('otherContactNumber')}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {/* Email Address */}
        {isFieldEnabled('personal.emailId', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="emailId">
              <span>{configMap?.['personal.emailId']?.label?.toUpperCase() || 'EMAIL ADDRESS'}</span>
              {isFieldRequired('personal.emailId', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="emailId"
              type="email"
              className={`field-input ${errors.emailId ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['personal.emailId']?.placeholder || 'candidate@example.com'}
              value={data.emailId}
              onChange={(e) => onChange('emailId', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors.emailId && <span className="field-error-msg">{errors.emailId}</span>}
          </div>
        )}
      </div>

      {/* Dynamic Custom Fields configured for Personal Section */}
      <CustomFieldsRenderer
        section="personal"
        configMap={configMap}
        customFields={customFields}
        onChange={onCustomFieldChange}
        errors={errors}
        readOnly={readOnly}
      />
    </div>
  );
};
