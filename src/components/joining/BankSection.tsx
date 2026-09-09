import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { BankDetails, JoiningFieldConfig } from '../../types/joining';
import { isFieldRequired, isFieldEnabled } from '../../utils/joiningValidation';
import { CustomFieldsRenderer } from './CustomFieldsRenderer';

interface BankSectionProps {
  data: BankDetails;
  onChange: (field: keyof BankDetails, value: string) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
  configMap?: Record<string, JoiningFieldConfig>;
  customFields?: Record<string, any>;
  onCustomFieldChange?: (fieldKey: string, value: any) => void;
}

export const BankSection: React.FC<BankSectionProps> = ({
  data,
  onChange,
  errors,
  readOnly = false,
  configMap,
  customFields,
  onCustomFieldChange
}) => {
  const [showAccount, setShowAccount] = useState(false);

  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 04</span>
        <h2 className="joining-step-title">BANK & STATUTORY SALARY ACCOUNTS</h2>
        <p className="joining-step-desc">
          Official bank details for automated salary disbursement and statutory provident fund registration.
        </p>
      </div>

      <div style={{
        backgroundColor: 'rgba(247, 215, 148, 0.2)',
        border: '1px solid var(--color-champagne-dark)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1.15rem',
        marginBottom: 'var(--space-6)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-midnight-navy)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        lineHeight: 1.5
      }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--color-midnight-navy)' }} />
        <span>
          <strong>Banking Security & Verification:</strong> Salary will only be disbursed into an individual account belonging to the employee. (Bank passbook / cancelled cheque copy is uploaded in Step 07).
        </span>
      </div>

      <div className="joining-grid-2">
        {/* Account Holder Name */}
        {isFieldEnabled('bank.accountHolderName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="accountHolderName">
              <span>{configMap?.['bank.accountHolderName']?.label?.toUpperCase() || 'ACCOUNT HOLDER NAME'}</span>
              {isFieldRequired('bank.accountHolderName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="accountHolderName"
              type="text"
              className={`field-input ${errors.accountHolderName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['bank.accountHolderName']?.placeholder || 'As recorded in bank passbook'}
              value={data.accountHolderName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('accountHolderName', e.target.value)}
            />
            {errors.accountHolderName && <span className="field-error-msg">{errors.accountHolderName}</span>}
          </div>
        )}

        {/* IFSC Code */}
        {isFieldEnabled('bank.ifscCode', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="ifscCode">
              <span>{configMap?.['bank.ifscCode']?.label?.toUpperCase() || 'IFSC CODE (11 CHARACTERS)'}</span>
              {isFieldRequired('bank.ifscCode', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="ifscCode"
              type="text"
              maxLength={11}
              style={{ textTransform: 'uppercase' }}
              className={`field-input ${errors.ifscCode ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['bank.ifscCode']?.placeholder || 'e.g. SBIN0001234'}
              value={data.ifscCode}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('ifscCode', e.target.value.toUpperCase())}
            />
            {errors.ifscCode && <span className="field-error-msg">{errors.ifscCode}</span>}
          </div>
        )}
      </div>

      <div className="joining-grid-2">
        {/* Bank Account Number */}
        {isFieldEnabled('bank.bankAccountNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="bankAccountNumber">
              <span>{configMap?.['bank.bankAccountNumber']?.label?.toUpperCase() || 'BANK ACCOUNT NUMBER'}</span>
              {isFieldRequired('bank.bankAccountNumber', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="bankAccountNumber"
                type={showAccount ? 'text' : 'password'}
                className={`field-input ${errors.bankAccountNumber ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['bank.bankAccountNumber']?.placeholder || 'Enter bank account number'}
                value={data.bankAccountNumber}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onChange('bankAccountNumber', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowAccount(!showAccount)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)'
                }}
                title={showAccount ? 'Hide account number' : 'Show account number'}
              >
                {showAccount ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.bankAccountNumber && <span className="field-error-msg">{errors.bankAccountNumber}</span>}
          </div>
        )}

        {/* Confirm Account Number */}
        {isFieldEnabled('bank.confirmBankAccountNumber', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="confirmBankAccountNumber">
              <span>{configMap?.['bank.confirmBankAccountNumber']?.label?.toUpperCase() || 'CONFIRM BANK ACCOUNT NUMBER'}</span>
              {isFieldRequired('bank.confirmBankAccountNumber', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="confirmBankAccountNumber"
              type="text"
              className={`field-input ${errors.confirmBankAccountNumber ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['bank.confirmBankAccountNumber']?.placeholder || 'Re-enter bank account number'}
              value={data.confirmBankAccountNumber}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('confirmBankAccountNumber', e.target.value)}
            />
            {errors.confirmBankAccountNumber && <span className="field-error-msg">{errors.confirmBankAccountNumber}</span>}
          </div>
        )}
      </div>

      <div className="joining-grid-2">
        {/* Bank Name */}
        {isFieldEnabled('bank.bankName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="bankName">
              <span>{configMap?.['bank.bankName']?.label?.toUpperCase() || 'BANK NAME'}</span>
              {isFieldRequired('bank.bankName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="bankName"
              type="text"
              className={`field-input ${errors.bankName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['bank.bankName']?.placeholder || 'e.g. State Bank of India, Bank of Maharashtra, HDFC'}
              value={data.bankName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('bankName', e.target.value)}
            />
            {errors.bankName && <span className="field-error-msg">{errors.bankName}</span>}
          </div>
        )}

        {/* Branch Name */}
        {isFieldEnabled('bank.branchName', configMap) && (
          <div className="field-wrapper">
            <label className="field-label" htmlFor="branchName">
              <span>{configMap?.['bank.branchName']?.label?.toUpperCase() || 'BRANCH NAME'}</span>
              {isFieldRequired('bank.branchName', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <input
              id="branchName"
              type="text"
              className={`field-input ${errors.branchName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['bank.branchName']?.placeholder || 'e.g. Nagpur Main Branch, Hingna'}
              value={data.branchName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('branchName', e.target.value)}
            />
            {errors.branchName && <span className="field-error-msg">{errors.branchName}</span>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid rgba(25, 42, 86, 0.08)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-3)' }}>
          PREVIOUS STATUTORY IDENTIFIERS (IF PREVIOUSLY ENROLLED)
        </h3>

        <div className="joining-grid-3">
          {/* UAN */}
          {isFieldEnabled('bank.uanNumber', configMap) && (
            <div className="field-wrapper">
              <label className="field-label" htmlFor="uanNumber">
                <span>{configMap?.['bank.uanNumber']?.label?.toUpperCase() || 'UAN (PROVIDENT FUND)'}</span>
                {isFieldRequired('bank.uanNumber', configMap, false) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                id="uanNumber"
                type="text"
                maxLength={12}
                className={`field-input ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['bank.uanNumber']?.placeholder || '12-digit UAN'}
                value={data.uanNumber || ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onChange('uanNumber', e.target.value)}
              />
            </div>
          )}

          {/* ESIC */}
          {isFieldEnabled('bank.esicNumber', configMap) && (
            <div className="field-wrapper">
              <label className="field-label" htmlFor="esicNumber">
                <span>{configMap?.['bank.esicNumber']?.label?.toUpperCase() || 'ESIC NUMBER'}</span>
                {isFieldRequired('bank.esicNumber', configMap, false) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                id="esicNumber"
                type="text"
                className={`field-input ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['bank.esicNumber']?.placeholder || '17-digit IP Number'}
                value={data.esicNumber || ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onChange('esicNumber', e.target.value)}
              />
            </div>
          )}

          {/* PT */}
          {isFieldEnabled('bank.ptNumber', configMap) && (
            <div className="field-wrapper">
              <label className="field-label" htmlFor="ptNumber">
                <span>{configMap?.['bank.ptNumber']?.label?.toUpperCase() || 'PT NUMBER'}</span>
                {isFieldRequired('bank.ptNumber', configMap, false) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                id="ptNumber"
                type="text"
                className={`field-input ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['bank.ptNumber']?.placeholder || 'Profession Tax number'}
                value={data.ptNumber || ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onChange('ptNumber', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Custom Fields configured for Bank Section */}
      <CustomFieldsRenderer
        section="bank"
        configMap={configMap}
        customFields={customFields}
        onChange={onCustomFieldChange}
        errors={errors}
        readOnly={readOnly}
      />
    </div>
  );
};
