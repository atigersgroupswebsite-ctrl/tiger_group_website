import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isSubmitting?: boolean;
  saveNotice?: string | null;
  isReadOnly?: boolean;
}

export const FormNavigation: React.FC<FormNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onSaveDraft,
  isSubmitting = false,
  saveNotice = null,
  isReadOnly = false
}) => {
  return (
    <div>
      {saveNotice && !isReadOnly && (
        <div style={{
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-2)',
          padding: '0.65rem 1rem',
          backgroundColor: 'rgba(247, 215, 148, 0.25)',
          border: '1px solid var(--color-champagne-dark)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-midnight-navy)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={15} style={{ color: 'var(--color-midnight-navy)' }} />
          <span>{saveNotice}</span>
        </div>
      )}

      <div className="joining-navigation">
        <div className="joining-nav-prev">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onPrev}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={14} />
              <span>PREVIOUS</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="joining-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {!isReadOnly && (
            <button
              type="button"
              className="save-draft-btn"
              onClick={onSaveDraft}
            >
              <Bookmark size={14} />
              <span>SAVE & CONTINUE LATER</span>
            </button>
          )}

          {currentStep < totalSteps ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onNext}
              icon={<ArrowRight size={14} />}
            >
              {isReadOnly ? 'NEXT STEP' : 'CONTINUE'}
            </Button>
          ) : !isReadOnly ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onNext}
              disabled={isSubmitting}
              icon={<ArrowRight size={16} />}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT JOINING FORM'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
