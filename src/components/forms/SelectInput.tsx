import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  options: (string | Option)[];
  placeholder?: string;
  hasError?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  id,
  options,
  placeholder,
  hasError = false,
  className = '',
  ...props
}) => {
  return (
    <select
      id={id}
      className={`field-select ${hasError ? 'has-error' : ''} ${className}`}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${id}-error` : undefined}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
};
