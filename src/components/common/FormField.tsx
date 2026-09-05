import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  error?: string;
  hint?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  options = [],
  rows = 4,
  error,
  hint,
  onChange,
  className = ''
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={name} className="form-label">
        {label} {required ? <span style={{ color: 'var(--color-dusty-rose-dark)' }}>*</span> : <span className="form-label-optional">(Optional)</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          rows={rows}
          placeholder={placeholder}
          required={required}
          onChange={onChange}
          className="form-control"
          style={{ resize: 'vertical' }}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          required={required}
          onChange={onChange}
          className="form-control form-select"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={onChange}
          className="form-control"
        />
      )}

      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};
