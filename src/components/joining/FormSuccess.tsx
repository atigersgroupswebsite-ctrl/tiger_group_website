import React from 'react';
import { CheckCircle, Download, Eye, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import type { JoiningFormData } from '../../types/joining';

interface FormSuccessProps {
  formData: JoiningFormData;
  onViewSubmission?: () => void;
  onReset?: () => void;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({
  formData,
  onViewSubmission,
  onReset
}) => {
  const handleDownloadSummary = () => {
    alert(
      `Summary Download (Phase 2 Preview):\nApplication: ${formData.applicationId}\nCandidate: ${formData.personal.employeeName}\nCompany: ${formData.employment.companyName}\nDesignation: ${formData.employment.designation}\nStatus: SUBMITTED\n\nThe 14-page PDF joining packet generator will be activated in the next backend phase.`
    );
  };

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 3.5rem)',
        backgroundColor: 'var(--color-pearl-white)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(247, 215, 148, 0.3)',
          color: 'var(--color-midnight-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-6)'
        }}
      >
        <CheckCircle size={40} style={{ color: 'var(--color-midnight-navy)' }} />
      </div>

      <span className="eyebrow" style={{ letterSpacing: '0.15em' }}>
        VERIFICATION COMPLETE
      </span>
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
          color: 'var(--color-midnight-navy)',
          marginBottom: 'var(--space-3)',
          letterSpacing: '-0.01em'
        }}
      >
        JOINING FORM SUBMITTED
      </h1>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          maxWidth: '520px',
          margin: '0 auto var(--space-8)',
          lineHeight: 1.6
        }}
      >
        Your joining information has been submitted successfully to the corporate onboarding and HR compliance division.
      </p>

      {/* Application Snapshot Card */}
      <div
        style={{
          backgroundColor: 'var(--color-pearl-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          textAlign: 'left',
          marginBottom: 'var(--space-8)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Application Number
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '2px', fontFamily: 'monospace' }}>
              {formData.applicationId}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(25, 42, 86, 0.1)',
                  color: 'var(--color-midnight-navy)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.05em'
                }}
              >
                ● SUBMITTED
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Name
            </span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)', marginTop: '2px' }}>
              {formData.personal.employeeName || 'Candidate'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Designated Company
            </span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)', marginTop: '2px' }}>
              {formData.employment.companyName}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px dashed var(--color-border)',
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={14} style={{ color: 'var(--color-champagne-dark)' }} />
          <span>
            Physical verification of original educational and KYC certificates will take place on reporting day at the plant HR division.
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)'
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Eye size={16} />}
          onClick={onViewSubmission}
        >
          VIEW SUBMISSION
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Download size={16} />}
          onClick={handleDownloadSummary}
        >
          DOWNLOAD SUMMARY
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button
          to="/"
          variant="outline"
          size="sm"
          icon={<ArrowRight size={14} />}
        >
          RETURN TO HOMEPAGE
        </Button>

        {onReset && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onReset}
            style={{ fontSize: 'var(--text-xs)' }}
          >
            START NEW FORM
          </button>
        )}
      </div>
    </div>
  );
};
