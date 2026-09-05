import React from 'react';

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, maximum 10 digits
    const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
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
        maxLength={10}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="field-phone-input"
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      />
    </div>
  );
};
