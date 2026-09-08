import React from 'react';
import { normalizeIndianPhoneNumber } from '../../utils/phoneUtils';

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
      const norm = normalizeIndianPhoneNumber(pasted);
      if (norm.isValid) {
        e.preventDefault();
        onChange(norm.displayDigits);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');

    // If input has 12 digits starting with country code 91 (e.g. 918349353946):
    if (digits.length === 12 && digits.startsWith('91')) {
      const norm12 = normalizeIndianPhoneNumber(digits);
      if (norm12.isValid) {
        onChange(norm12.displayDigits);
        return;
      }
    }

    // Check if full input normalizes cleanly
    const norm = normalizeIndianPhoneNumber(raw);
    if (norm.isValid) {
      onChange(norm.displayDigits);
      return;
    }

    // Standard digit typing: limit to 10 digits
    onChange(digits.slice(0, 10));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw) {
      const norm = normalizeIndianPhoneNumber(raw);
      if (norm.isValid) {
        onChange(norm.displayDigits);
      }
    }
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
        onBlur={handleBlur}
        placeholder={placeholder}
        className="field-phone-input"
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      />
    </div>
  );
};
