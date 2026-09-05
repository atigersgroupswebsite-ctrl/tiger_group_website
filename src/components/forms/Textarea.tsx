import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  hasError?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  id,
  hasError = false,
  rows = 4,
  className = '',
  ...props
}) => {
  return (
    <textarea
      id={id}
      rows={rows}
      className={`field-textarea ${hasError ? 'has-error' : ''} ${className}`}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${id}-error` : undefined}
      style={{ resize: 'vertical' }}
      {...props}
    />
  );
};
