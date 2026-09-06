import React from 'react';
import { normalizeIndianMobile } from '../../utils/phoneUtils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  value,
  onChange,
  hasError = false,
  placeholder = '10-digit mobile number',
  ...props
}) => {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      const norm = normalizeIndianMobile(pasted);
      if (norm.isValid) {
        e.preventDefault();
        onChange(norm.displayDigits);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Check if raw input contains +91 or more than 10 digits
    const norm = normalizeIndianMobile(raw);
    if (norm.isValid) {
      onChange(norm.displayDigits);
      return;
    }

    // Only accept numeric digits, maximum 10 digits
    const cleanDigits = raw.replace(/\D/g, '').slice(0, 10);
    onChange(cleanDigits);
  };

  return (
    <div className={`field-phone-box ${hasError ? 'has-error' : ''}`}>
      <span className="field-phone-prefix" aria-hidden="true">+91</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]{10}"
        maxLength={16}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="field-phone-input"
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      />
    </div>
  );
};
