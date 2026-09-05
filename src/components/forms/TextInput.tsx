import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  hasError?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  hasError = false,
  className = '',
  ...props
}) => {
  return (
    <input
      id={id}
      className={`field-input ${hasError ? 'has-error' : ''} ${className}`}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${id}-error` : undefined}
      {...props}
    />
  );
};
