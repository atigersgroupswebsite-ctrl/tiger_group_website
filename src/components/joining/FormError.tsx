import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
  errors?: string[];
  onDismiss?: () => void;
}

export const FormError: React.FC<FormErrorProps> = ({
  message = 'Please correct the highlighted errors before proceeding.',
  errors = []
}) => {
  if (!message && (!errors || errors.length === 0)) return null;

  return (
    <div
      role="alert"
      style={{
        backgroundColor: 'var(--color-dusty-rose-light)',
        border: '1px solid var(--color-dusty-rose)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1.15rem',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        color: 'var(--color-midnight-navy)',
        fontSize: 'var(--text-sm)'
      }}
    >
      <AlertCircle
        size={18}
        style={{
          color: 'var(--color-dusty-rose-dark)',
          flexShrink: 0,
          marginTop: '2px'
        }}
      />
      <div>
        <div style={{ fontWeight: 600, marginBottom: errors.length > 0 ? '0.25rem' : 0 }}>
          {message}
        </div>
        {errors.length > 0 && (
          <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: 'var(--text-xs)' }}>
            {errors.map((err, idx) => (
              <li key={idx} style={{ marginBottom: '0.15rem', color: 'var(--color-text-secondary)' }}>
                {err}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
