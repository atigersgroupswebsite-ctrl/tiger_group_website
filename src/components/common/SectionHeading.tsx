import React from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  highlightText?: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  theme?: 'light' | 'dark';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  highlightText,
  subtitle,
  align = 'center',
  theme = 'light',
  className = ''
}) => {
  return (
    <div
      className={`section-heading-wrapper ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        textAlign: align,
        marginBottom: 'var(--space-12)',
        maxWidth: align === 'center' ? '760px' : '650px',
        marginLeft: align === 'center' ? 'auto' : '0',
        marginRight: align === 'center' ? 'auto' : '0'
      }}
    >
      {eyebrow && (
        <span className={`eyebrow ${theme === 'dark' ? 'eyebrow-navy' : ''}`}>
          {eyebrow}
        </span>
      )}
      
      <h2
        style={{
          color: theme === 'dark' ? 'var(--color-pearl-white)' : 'var(--color-midnight-navy)',
          marginBottom: subtitle ? 'var(--space-4)' : 0
        }}
      >
        {title} {highlightText && <span style={{ color: 'var(--color-champagne-dark)' }}>{highlightText}</span>}
      </h2>

      {subtitle && (
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: theme === 'dark' ? 'var(--color-text-inverse-muted)' : 'var(--color-text-secondary)',
            lineHeight: 1.65,
            margin: 0
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
