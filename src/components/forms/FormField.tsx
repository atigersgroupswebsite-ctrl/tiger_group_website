import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  className = ''
}) => {
  return (
    <div className={`field-wrapper ${className}`}>
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
        {required ? (
          <span className="field-required-star" aria-hidden="true">*</span>
        ) : (
          <span className="field-optional-tag">(Optional)</span>
        )}
      </label>

      {children}

      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error-msg" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
