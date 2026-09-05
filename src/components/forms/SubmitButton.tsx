import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SubmitButtonProps {
  label: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  isLoading = false,
  disabled = false
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="form-submit-btn"
    >
      {isLoading ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </>
      )}
    </button>
  );
};
