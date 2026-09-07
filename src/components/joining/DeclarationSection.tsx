import React from 'react';
import { FileSignature, ShieldCheck, AlertCircle, Users, Moon } from 'lucide-react';
import type { DeclarationsInfo } from '../../types/joining';

interface DeclarationSectionProps {
  declarations: DeclarationsInfo;
  signatureDataUrl?: string;
  candidateName: string;
  candidateGender?: string;
  candidateAddress?: string;
  candidateDesignation?: string;
  onChange: (field: keyof DeclarationsInfo, value: any) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const DeclarationSection: React.FC<DeclarationSectionProps> = ({
  declarations,
  signatureDataUrl,
  candidateName,
  candidateGender = '',
  candidateAddress = '',
  candidateDesignation = '',
  onChange,
  errors,
  readOnly = false
}) => {
  const isFemale = candidateGender.toLowerCase() === 'female';

  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 07</span>
        <h2 className="joining-step-title">STATUTORY DECLARATIONS & ONBOARDING CONSENT</h2>
        <p className="joining-step-desc">
          Formal undertakings corresponding to Form-5 joining schedules, Self Declaration (Page 07), Relative Employment Policy (Page 08), and applicable statutory rules.
        </p>
      </div>

      {/* 1. Standard General Undertakings */}
      <div
        style={{
          backgroundColor: 'rgba(25, 42, 86, 0.03)',
          border: '1px solid rgba(25, 42, 86, 0.12)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
          <ShieldCheck size={20} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            STATUTORY UNDERTAKINGS & CODE OF CONDUCT
          </h3>
        </div>

        {/* Declaration 1: Truth & Accuracy */}
        <label className="form-checkbox-label" style={{ marginBottom: 'var(--space-5)', alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.candidateDeclarationAcknowledged}
            disabled={readOnly}
            onChange={(e) => onChange('candidateDeclarationAcknowledged', e.target.checked)}
          />
          <div>
            <strong>1. Truth & Accuracy Undertaking</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              I hereby declare that all particulars stated in this digital joining dossier, including demographic details, permanent address, bank accounts, academic qualifications, and family dependents, are true, correct, and complete to the best of my knowledge and belief.
            </p>
            {errors.candidateDeclarationAcknowledged && (
              <span className="field-error-msg">{errors.candidateDeclarationAcknowledged}</span>
            )}
          </div>
        </label>

        {/* Declaration 2: Workplace Safety & Guidelines */}
        <label className="form-checkbox-label" style={{ marginBottom: 'var(--space-5)', alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.rulesAndConductAccepted}
            disabled={readOnly}
            onChange={(e) => onChange('rulesAndConductAccepted', e.target.checked)}
          />
          <div>
            <strong>2. Workplace Guidelines & Safety Protocols</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              I agree to abide by the workplace regulations, shift timings, industrial safety measures, hygiene requirements, and disciplinary codes enforced by the placement enterprise and A TIGER GLOBAL.
            </p>
            {errors.rulesAndConductAccepted && (
              <span className="field-error-msg">{errors.rulesAndConductAccepted}</span>
            )}
          </div>
        </label>

        {/* Declaration 3: Verification Consent */}
        <label className="form-checkbox-label" style={{ marginBottom: 0, alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.backgroundVerificationConsent}
            disabled={readOnly}
            onChange={(e) => onChange('backgroundVerificationConsent', e.target.checked)}
          />
          <div>
            <strong>3. Statutory KYC & Verification Consent</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              I authorize A TIGER GLOBAL Career Solution & Consultancy and my employer to verify my identity documents, address credentials, civil background records, and police verifications as required under statutory employment law.
            </p>
            {errors.backgroundVerificationConsent && (
              <span className="field-error-msg">{errors.backgroundVerificationConsent}</span>
            )}
          </div>
        </label>
      </div>

      {/* 2. Page 06: Form - 'L' Women Worker Night Shift Consent (CONDITIONALLY FOR FEMALE CANDIDATES ONLY) */}
      {isFemale && (
        <div
          style={{
            backgroundColor: '#FDFCF7',
            border: '1.5px solid #F59E0B',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#92400E' }}>
            <Moon size={20} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              FORM - 'L' (RULE 13) — CONSENT OF WOMEN WORKER TO WORK IN NIGHT SHIFT
            </h3>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: '#B45309', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Applicable strictly to female employees in accordance with Maharashtra Factories Rules (Rule 13).
          </p>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.65,
              color: '#451A03',
              marginBottom: '1rem'
            }}
          >
            I, <strong>{candidateName || 'Candidate'}</strong>, residing at{' '}
            <strong>{candidateAddress || '[Address on Record]'}</strong>, working as{' '}
            <strong>{candidateDesignation || 'Associate'}</strong> in M/s A TIGER GLOBAL Career Solution & Consultancy,
            hereby state that I am aware that:
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>The employer will provide separate, safe, and secure transport facility from the doorstep of my residence to the place of work and vice-versa;</li>
              <li>There will be at least three women workers working together during the night shift;</li>
              <li>There is an Internal Committee to prevent sexual harassment at the workplace.</li>
            </ul>
            I am therefore willing to work on night shifts during my tenure.
          </div>

          <label className="form-checkbox-label" style={{ alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              className="form-checkbox-input"
              checked={Boolean(declarations.womenNightShiftConsent)}
              disabled={readOnly}
              onChange={(e) => onChange('womenNightShiftConsent', e.target.checked)}
            />
            <div>
              <strong>Accept Night Shift Consent (Form 'L')</strong>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                I give my formal consent to participate in night-shift operational schedules with safe transport provided.
              </p>
            </div>
          </label>

          <div style={{ marginTop: '0.85rem', maxWidth: '240px' }}>
            <label className="field-label" style={{ fontSize: '0.75rem' }}>
              PLACE OF CONSENT
            </label>
            <input
              type="text"
              className="field-input"
              style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
              value={declarations.womenNightShiftPlace || 'Nagpur'}
              disabled={readOnly}
              onChange={(e) => onChange('womenNightShiftPlace', e.target.value)}
              placeholder="e.g. Nagpur"
            />
          </div>
        </div>
      )}

      {/* 3. Page 07: Self Declaration (Dual Employment & Relieving Formalities) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid rgba(25, 42, 86, 0.15)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
            SELF DECLARATION — DUAL EMPLOYMENT & PREVIOUS FORMALITIES (PAGE 07)
          </h3>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '1.15rem',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.65,
            color: '#334155',
            marginBottom: '1.25rem'
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#0F1B38' }}>
            TO: The HR Department, A TIGER GLOBAL Career Solution & Consultancy
          </p>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Dear Sir/Madam, This is to certify that prior to joining, I have completed all necessary relieving formalities with any previous employers. To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities (legal, financial, professional, or personal) which I have with any previous employer, if any.
          </p>
          <p style={{ margin: 0 }}>
            I agree to submit formal relieving records if requested by the HR department. I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action by the company, including termination of service.
          </p>
        </div>

        <div className="joining-grid-2" style={{ marginBottom: '1rem' }}>
          <div className="field-wrapper">
            <label className="field-label" style={{ fontSize: '0.75rem' }}>
              PREVIOUS EMPLOYER NAME (IF APPLICABLE)
            </label>
            <input
              type="text"
              className="field-input"
              style={{ fontSize: '0.875rem' }}
              placeholder="e.g. None (Fresher) or Company Name"
              value={declarations.previousEmployerName || ''}
              disabled={readOnly}
              onChange={(e) => onChange('previousEmployerName', e.target.value)}
            />
          </div>

          <div className="field-wrapper">
            <label className="field-label" style={{ fontSize: '0.75rem' }}>
              LAST WORKING DAY WITH PREVIOUS EMPLOYER
            </label>
            <input
              type="date"
              className="field-input"
              style={{ fontSize: '0.875rem' }}
              value={declarations.previousEmployerLastWorkingDay || ''}
              disabled={readOnly}
              onChange={(e) => onChange('previousEmployerLastWorkingDay', e.target.value)}
            />
          </div>
        </div>

        <label className="form-checkbox-label" style={{ alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.selfDeclarationAcknowledged}
            disabled={readOnly}
            onChange={(e) => onChange('selfDeclarationAcknowledged', e.target.checked)}
          />
          <div>
            <strong>I acknowledge and confirm the Self Declaration (Page 07)</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
              I confirm no dual employment exists and all information stated is legally binding.
            </p>
            {errors.selfDeclarationAcknowledged && (
              <span className="field-error-msg">{errors.selfDeclarationAcknowledged}</span>
            )}
          </div>
        </label>
      </div>

      {/* 4. Page 08: Declaration (Relative Employment Policy) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid rgba(25, 42, 86, 0.15)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
          <Users size={20} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
            DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PAGE 08)
          </h3>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '1.15rem',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.65,
            color: '#334155',
            marginBottom: '1.25rem'
          }}
        >
          As per Internal Policy, the Organization does not encourage employment of 'relatives' to prevent favoritism, conflicts of interest, and scheduling issues. The term 'relatives' includes mother, father, husband, wife, son, daughter, sister, brother, in-laws, stepchildren, aunt, uncle, nephew, niece, or cousin.
        </div>

        {/* Radio: Has Relative in Organization */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', cursor: readOnly ? 'default' : 'pointer', fontSize: '0.875rem' }}>
            <input
              type="radio"
              name="hasRelative"
              checked={!declarations.hasRelativeInOrganization}
              disabled={readOnly}
              onChange={() => onChange('hasRelativeInOrganization', false)}
            />
            <span>
              <strong>(I-a)</strong> I am NOT directly or distantly related to any employee working in the Organization.
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: readOnly ? 'default' : 'pointer', fontSize: '0.875rem' }}>
            <input
              type="radio"
              name="hasRelative"
              checked={Boolean(declarations.hasRelativeInOrganization)}
              disabled={readOnly}
              onChange={() => onChange('hasRelativeInOrganization', true)}
            />
            <span>
              <strong>(I-b)</strong> I AM related to an employee working in the Organization (Specify below).
            </span>
          </label>
        </div>

        {/* Conditional Relative Details */}
        {declarations.hasRelativeInOrganization && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div className="joining-grid-3">
              <div className="field-wrapper">
                <label className="field-label" style={{ fontSize: '0.75rem' }}>
                  <span>RELATIVE EMPLOYEE NAME</span>
                  <span className="field-required-star">*</span>
                </label>
                <input
                  type="text"
                  className={`field-input ${errors.relativeName ? 'has-error' : ''}`}
                  placeholder="Full name of relative"
                  value={declarations.relativeName || ''}
                  disabled={readOnly}
                  onChange={(e) => onChange('relativeName', e.target.value)}
                />
                {errors.relativeName && <span className="field-error-msg">{errors.relativeName}</span>}
              </div>

              <div className="field-wrapper">
                <label className="field-label" style={{ fontSize: '0.75rem' }}>
                  <span>RELATIONSHIP</span>
                  <span className="field-required-star">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Brother / Uncle"
                  value={declarations.relativeRelationship || ''}
                  disabled={readOnly}
                  onChange={(e) => onChange('relativeRelationship', e.target.value)}
                />
              </div>

              <div className="field-wrapper">
                <label className="field-label" style={{ fontSize: '0.75rem' }}>
                  <span>DEPARTMENT / UNIT</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Operations / Logistics"
                  value={declarations.relativeDepartment || ''}
                  disabled={readOnly}
                  onChange={(e) => onChange('relativeDepartment', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <label className="form-checkbox-label" style={{ alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.relativeDeclarationAcknowledged}
            disabled={readOnly}
            onChange={(e) => onChange('relativeDeclarationAcknowledged', e.target.checked)}
          />
          <div>
            <strong>I acknowledge and confirm the Relative Employment Declaration (Page 08)</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
              I understand false information can result in disciplinary action up to termination of service.
            </p>
            {errors.relativeDeclarationAcknowledged && (
              <span className="field-error-msg">{errors.relativeDeclarationAcknowledged}</span>
            )}
          </div>
        </label>
      </div>

      {/* 5. Signature & Signatory Attestation */}
      <div
        style={{
          border: '1.5px solid rgba(25, 42, 86, 0.15)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          backgroundColor: '#FFFFFF',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
          <FileSignature size={20} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            SIGNATURE & SUBMISSION ATTESTATION
          </h3>
        </div>

        <div className="joining-grid-2">
          <div className="field-wrapper">
            <label className="field-label">
              <span>SIGNATORY CANDIDATE NAME</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors.signatoryName ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder="Type your full legal name"
              value={declarations.signatoryName || candidateName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onChange('signatoryName', e.target.value)}
            />
            {errors.signatoryName && <span className="field-error-msg">{errors.signatoryName}</span>}
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>DECLARATION DATE</span>
            </label>
            <input
              type="date"
              className="field-input read-only-field"
              value={declarations.declarationDate}
              readOnly
            />
          </div>
        </div>

        {/* Specimen Signature Reference */}
        <div>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Attached Specimen Signature:
          </span>
          <div
            style={{
              marginTop: '0.35rem',
              width: '200px',
              height: '80px',
              border: '1px solid rgba(25, 42, 86, 0.15)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {signatureDataUrl ? (
              <img
                src={signatureDataUrl}
                alt="Candidate Signature"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
              />
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
                Uploaded in Step 06
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
