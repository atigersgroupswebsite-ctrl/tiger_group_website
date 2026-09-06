import React from 'react';

interface FormStepProps {
  stepNumber: number;
  stepTitle: string;
  stepDescription?: string;
  children: React.ReactNode;
}

export const FormStep: React.FC<FormStepProps> = ({
  stepNumber,
  stepTitle,
  stepDescription,
  children
}) => {
  return (
    <div className="joining-step-wrapper">
      <div className="joining-step-header">
        <span className="joining-step-tag">
          STEP {stepNumber < 10 ? `0${stepNumber}` : stepNumber}
        </span>
        <h2 className="joining-step-title">{stepTitle}</h2>
        {stepDescription && (
          <p className="joining-step-desc">{stepDescription}</p>
        )}
      </div>
      <div className="joining-step-content">
        {children}
      </div>
    </div>
  );
};
