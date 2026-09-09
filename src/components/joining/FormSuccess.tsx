import React, { useState } from 'react';
import { CheckCircle, Download, Eye, FileText, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import type { JoiningFormData } from '../../types/joining';
import { downloadJoiningPacketPdf } from '../../services/joiningPdfGenerator';

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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleDownloadPacket = async () => {
    setIsDownloading(true);
    try {
      await downloadJoiningPacketPdf(formData);
    } catch (err: any) {
      alert('Unable to generate joining packet PDF. Please view and print your submission.');
    } finally {
      setIsDownloading(false);
    }
  };

  const referenceNumber = formData.joiningReference || formData.applicationId || 'JOIN-CONFIRMED';

  return (
    <div
      style={{
        maxWidth: '740px',
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
          backgroundColor: 'rgba(25, 42, 86, 0.08)',
          color: 'var(--color-midnight-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-6)'
        }}
      >
        <CheckCircle size={40} style={{ color: 'var(--color-midnight-navy)' }} />
      </div>

      <span className="eyebrow" style={{ letterSpacing: '0.15em', color: 'var(--color-champagne-dark)' }}>
        SUBMISSION CONFIRMED
      </span>
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
          color: 'var(--color-midnight-navy)',
          marginBottom: 'var(--space-3)',
          letterSpacing: '-0.01em',
          fontWeight: 800
        }}
      >
        JOINING FORM RECORDED
      </h1>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          maxWidth: '560px',
          margin: '0 auto var(--space-8)',
          lineHeight: 1.6
        }}
      >
        Your official joining dossier has been received and securely registered. A confirmation receipt has been dispatched to your email address.
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
              Joining Reference
            </span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '2px', fontFamily: 'monospace' }}>
              {referenceNumber}
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
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#065F46',
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
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-midnight-navy)', marginTop: '2px' }}>
              {formData.personal.employeeName || 'Candidate'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Email
            </span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)', marginTop: '2px' }}>
              {formData.personal.emailId || 'Registered Contact'}
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
          <FileText size={14} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
          <span>
            Please retain your Joining Reference for all future HR correspondence and reporting day onboarding verification.
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
        <button
          type="button"
          onClick={handleDownloadPacket}
          disabled={isDownloading}
          className="btn btn-navy btn-md"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700
          }}
        >
          {isDownloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>GENERATING PACKET PDF...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>DOWNLOAD JOINING PACKET (PDF)</span>
            </>
          )}
        </button>

        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Eye size={16} />}
          onClick={onViewSubmission}
        >
          VIEW / PRINT DOSSIER
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
            style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} />
            <span>START ANOTHER JOINING FORM</span>
          </button>
        )}
      </div>
    </div>
  );
};
