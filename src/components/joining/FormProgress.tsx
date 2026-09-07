import React from 'react';
import { Check } from 'lucide-react';
import { JOINING_STEPS } from '../../data/mockJoiningData';

interface FormProgressProps {
  currentStep: number;
  applicationId: string;
  onSelectStep: (step: number) => void;
  completedSteps: number[];
}

export const FormProgress: React.FC<FormProgressProps> = ({
  currentStep,
  applicationId,
  onSelectStep,
  completedSteps
}) => {
  const currentStepObj = JOINING_STEPS.find((s) => s.step === currentStep);
  const progressPercent = ((currentStep - 1) / (JOINING_STEPS.length - 1)) * 100;

  return (
    <>
      {/* Mobile Bar */}
      <div className="joining-mobile-progress">
        <span className="joining-mobile-step-text">
          Step {currentStep} of {JOINING_STEPS.length}: {currentStepObj?.label}
        </span>
        <div className="joining-mobile-progress-bar">
          <div
            className="joining-mobile-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Desktop Sidebar */}
      <aside className="joining-progress-sidebar">
        <div className="joining-progress-card">
          <div className="joining-app-info">
            <span className="joining-app-label">Joining Dossier</span>
            <div className="joining-app-id">{applicationId || 'Active Session'}</div>
          </div>

          <ol className="joining-step-list">
            {JOINING_STEPS.map((stepItem) => {
              const isCurrent = stepItem.step === currentStep;
              const isCompleted = completedSteps.includes(stepItem.step);

              return (
                <li
                  key={stepItem.step}
                  className={`joining-step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => {
                    // Allow navigating to any previously visited or completed step, or next step
                    if (isCompleted || stepItem.step <= currentStep) {
                      onSelectStep(stepItem.step);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectStep(stepItem.step);
                    }
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div className="joining-step-circle">
                    {isCompleted && !isCurrent ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      stepItem.step
                    )}
                  </div>
                  <span>{stepItem.shortLabel}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </>
  );
};
