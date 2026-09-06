import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { BankDetails } from '../../types/joining';

interface BankSectionProps {
  data: BankDetails;
  onChange: (field: keyof BankDetails, value: string) => void;
  errors: Record<string, string>;
}

export const BankSection: React.FC<BankSectionProps> = ({
  data,
  onChange,
  errors
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
        <div className="field-wrapper">
          <label className="field-label" htmlFor="accountHolderName">
            <span>ACCOUNT HOLDER NAME</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="accountHolderName"
            type="text"
            className={`field-input ${errors.accountHolderName ? 'has-error' : ''}`}
            placeholder="As recorded in bank passbook"
            value={data.accountHolderName}
            onChange={(e) => onChange('accountHolderName', e.target.value)}
          />
          {errors.accountHolderName && <span className="field-error-msg">{errors.accountHolderName}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="ifscCode">
            <span>IFSC CODE (11 CHARACTERS)</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="ifscCode"
            type="text"
            maxLength={11}
            style={{ textTransform: 'uppercase' }}
            className={`field-input ${errors.ifscCode ? 'has-error' : ''}`}
            placeholder="e.g. SBIN0001234"
            value={data.ifscCode}
            onChange={(e) => onChange('ifscCode', e.target.value.toUpperCase())}
          />
          {errors.ifscCode && <span className="field-error-msg">{errors.ifscCode}</span>}
        </div>
      </div>

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="bankAccountNumber">
            <span>BANK ACCOUNT NUMBER</span>
            <span className="field-required-star">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="bankAccountNumber"
              type={showAccount ? 'text' : 'password'}
              className={`field-input ${errors.bankAccountNumber ? 'has-error' : ''}`}
              placeholder="Enter bank account number"
              value={data.bankAccountNumber}
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

        <div className="field-wrapper">
          <label className="field-label" htmlFor="confirmBankAccountNumber">
            <span>CONFIRM BANK ACCOUNT NUMBER</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="confirmBankAccountNumber"
            type="text"
            className={`field-input ${errors.confirmBankAccountNumber ? 'has-error' : ''}`}
            placeholder="Re-enter bank account number"
            value={data.confirmBankAccountNumber}
            onChange={(e) => onChange('confirmBankAccountNumber', e.target.value)}
          />
          {errors.confirmBankAccountNumber && <span className="field-error-msg">{errors.confirmBankAccountNumber}</span>}
        </div>
      </div>

      <div className="joining-grid-2">
        <div className="field-wrapper">
          <label className="field-label" htmlFor="bankName">
            <span>BANK NAME</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="bankName"
            type="text"
            className={`field-input ${errors.bankName ? 'has-error' : ''}`}
            placeholder="e.g. State Bank of India, Bank of Maharashtra, HDFC"
            value={data.bankName}
            onChange={(e) => onChange('bankName', e.target.value)}
          />
          {errors.bankName && <span className="field-error-msg">{errors.bankName}</span>}
        </div>

        <div className="field-wrapper">
          <label className="field-label" htmlFor="branchName">
            <span>BRANCH NAME</span>
            <span className="field-required-star">*</span>
          </label>
          <input
            id="branchName"
            type="text"
            className={`field-input ${errors.branchName ? 'has-error' : ''}`}
            placeholder="e.g. Nagpur Main Branch, Hingna"
            value={data.branchName}
            onChange={(e) => onChange('branchName', e.target.value)}
          />
          {errors.branchName && <span className="field-error-msg">{errors.branchName}</span>}
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid rgba(25, 42, 86, 0.08)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-3)' }}>
          PREVIOUS STATUTORY IDENTIFIERS (IF PREVIOUSLY ENROLLED)
        </h3>

        <div className="joining-grid-3">
          <div className="field-wrapper">
            <label className="field-label" htmlFor="uanNumber">
              <span>UAN (PROVIDENT FUND)</span>
              <span className="field-optional-tag">(Optional)</span>
            </label>
            <input
              id="uanNumber"
              type="text"
              maxLength={12}
              className="field-input"
              placeholder="12-digit UAN"
              value={data.uanNumber || ''}
              onChange={(e) => onChange('uanNumber', e.target.value)}
            />
          </div>

          <div className="field-wrapper">
            <label className="field-label" htmlFor="esicNumber">
              <span>ESIC NUMBER</span>
              <span className="field-optional-tag">(Optional)</span>
            </label>
            <input
              id="esicNumber"
              type="text"
              className="field-input"
              placeholder="17-digit IP Number"
              value={data.esicNumber || ''}
              onChange={(e) => onChange('esicNumber', e.target.value)}
            />
          </div>

          <div className="field-wrapper">
            <label className="field-label" htmlFor="ptNumber">
              <span>PT NUMBER</span>
              <span className="field-optional-tag">(Optional)</span>
            </label>
            <input
              id="ptNumber"
              type="text"
              className="field-input"
              placeholder="Profession Tax number"
              value={data.ptNumber || ''}
              onChange={(e) => onChange('ptNumber', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
