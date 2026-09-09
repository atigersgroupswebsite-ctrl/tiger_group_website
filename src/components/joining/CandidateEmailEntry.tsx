// ==============================================================================
// File: src/components/joining/CandidateEmailEntry.tsx
// Description: Initial Public Joining Form Entry Gate — Email Collection Step
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Specifications:
//   - Syntactic email format validation only
//   - Zero OTP, zero magic links, zero candidate authentication required
//   - Email collected solely for receipt delivery and reference confirmation
// ==============================================================================

import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, AlertCircle, FileCheck2 } from 'lucide-react';
import { Button } from '../common/Button';

interface CandidateEmailEntryProps {
  initialEmail?: string;
  onContinue: (email: string) => void;
}

export const CandidateEmailEntry: React.FC<CandidateEmailEntryProps> = ({
  initialEmail = '',
  onContinue
}) => {
  const [email, setEmail] = useState<string>(initialEmail);
  const [error, setError] = useState<string | null>(null);

  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address to continue.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. candidate@example.com).');
      return;
    }

    setError(null);
    onContinue(cleanEmail);
  };

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 3rem)',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      {/* Editorial Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(25, 42, 86, 0.08)',
            color: 'var(--color-midnight-navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}
        >
          <FileCheck2 size={30} style={{ color: 'var(--color-midnight-navy)' }} />
        </div>

        <span
          className="eyebrow"
          style={{ letterSpacing: '0.14em', color: 'var(--color-champagne-dark)', display: 'block', marginBottom: '0.35rem' }}
        >
          A TIGER GLOBAL • ONBOARDING DOSSIER
        </span>

        <h1
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--color-midnight-navy)',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            margin: '0 0 0.75rem 0'
          }}
        >
          START JOINING FORM
        </h1>

        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            maxWidth: '520px',
            margin: '0 auto'
          }}
        >
          Welcome to the candidate onboarding portal. Please provide your email address to begin your official Joining Dossier.
          Your official Joining Reference number and confirmation receipt will be delivered to this email.
        </p>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              borderRadius: 'var(--radius-md)',
              color: '#991B1B',
              fontSize: 'var(--text-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '1.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '1.75rem' }}>
          <label
            htmlFor="candidate-email-input"
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--color-midnight-navy)',
              marginBottom: '0.5rem'
            }}
          >
            Candidate Email Address <span style={{ color: '#DC2626' }}>*</span>
          </label>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}
            >
              <Mail size={18} />
            </div>

            <input
              id="candidate-email-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. rahul.patil@example.com"
              autoFocus
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.85rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: error ? '2px solid #EF4444' : '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-midnight-navy)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = 'var(--color-midnight-navy)';
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = '#D1D5DB';
              }}
            />
          </div>

          <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Used for delivery of your submission receipt, Joining Reference (JOIN-YYYY-XXXXXX), and reporting guidelines. No account creation or password needed.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<ArrowRight size={18} />}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          CONTINUE TO JOINING FORM
        </Button>
      </form>

      {/* Security & Non-Authentication Assurance */}
      <div
        style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '12px',
          color: 'var(--color-text-muted)'
        }}
      >
        <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
        <span>
          Public onboarding form • No login or OTP required • Enter your email and proceed directly.
        </span>
      </div>
    </div>
  );
};
