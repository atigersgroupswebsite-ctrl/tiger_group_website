import React from 'react';
import { FileSignature } from 'lucide-react';
import type { DeclarationsInfo } from '../../types/joining';

interface DeclarationSectionProps {
  declarations: DeclarationsInfo;
  signatureDataUrl?: string;
  candidateName: string;
  onChange: (field: keyof DeclarationsInfo, value: any) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const DeclarationSection: React.FC<DeclarationSectionProps> = ({
  declarations,
  signatureDataUrl,
  candidateName,
  onChange,
  errors,
  readOnly = false
}) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 08</span>
        <h2 className="joining-step-title">DECLARATIONS & STATUTORY CONSENT</h2>
        <p className="joining-step-desc">
          Official statutory undertakings corresponding to Form-5 joining packet schedules, EPFO Form 11, and ESIC onboarding policies.
        </p>
      </div>

      <div style={{
        backgroundColor: 'rgba(25, 42, 86, 0.03)',
        border: '1px solid rgba(25, 42, 86, 0.1)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)'
      }}>
        {/* Declaration 1 */}
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
              I hereby declare that all particulars stated in this digital joining form, including demographic details, permanent address, bank accounts, academic credentials, and family dependents, are true, correct, and complete to the best of my knowledge and belief.
            </p>
            {errors.candidateDeclarationAcknowledged && (
              <span className="field-error-msg">{errors.candidateDeclarationAcknowledged}</span>
            )}
          </div>
        </label>

        {/* Declaration 2 */}
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
              I agree to abide by the workplace regulations, shift timings, industrial safety measures, and disciplinary codes enforced by the placement enterprise and A Tiger Global.
            </p>
            {errors.rulesAndConductAccepted && (
              <span className="field-error-msg">{errors.rulesAndConductAccepted}</span>
            )}
          </div>
        </label>

        {/* Declaration 3 */}
        <label className="form-checkbox-label" style={{ marginBottom: 0, alignItems: 'flex-start', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            className="form-checkbox-input"
            checked={declarations.backgroundVerificationConsent}
            disabled={readOnly}
            onChange={(e) => onChange('backgroundVerificationConsent', e.target.checked)}
          />
          <div>
            <strong>3. Statutory KYC & Police Verification Consent</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              I authorize A Tiger Global Career Solution & Consultancy and my employer to verify my identity documents, address proof, civil background records, and police verifications as required under statutory employment law.
            </p>
            {errors.backgroundVerificationConsent && (
              <span className="field-error-msg">{errors.backgroundVerificationConsent}</span>
            )}
          </div>
        </label>
      </div>

      {/* Signature Acknowledgment Box */}
      <div style={{
        border: '1px solid rgba(25, 42, 86, 0.12)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        backgroundColor: '#FFFFFF',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--space-6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
          <FileSignature size={20} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>SIGNATURE & SUBMISSION ATTESTATION</h3>
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
          <div style={{
            marginTop: '0.35rem',
            width: '180px',
            height: '75px',
            border: '1px solid rgba(25, 42, 86, 0.15)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-pearl-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {signatureDataUrl ? (
              <img
                src={signatureDataUrl}
                alt="Candidate Signature"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
              />
            ) : (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Uploaded in Step 07
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
