// ==============================================================================
// File: src/components/joining/CandidateEmailEntry.tsx
// Description: Secure Candidate Account Creation Gate for Joining Form
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Specifications:
//   - Email + Password + Confirm Password collection
//   - Supabase Auth integration (zero plaintext passwords stored in database)
//   - Zero OTP, zero Magic Links
//   - Graceful existing account detection redirecting to /joining/login
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, FileCheck2, Eye, EyeOff, LogIn, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { registerCandidateAccount } from '../../services/joiningService';

interface CandidateEmailEntryProps {
  initialEmail?: string;
  onContinue: (email: string, user?: any) => void;
}

export const CandidateEmailEntry: React.FC<CandidateEmailEntryProps> = ({
  initialEmail = '',
  onContinue
}) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [existingUserDetected, setExistingUserDetected] = useState<boolean>(false);

  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingUserDetected(false);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Email validation
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. candidate@example.com).');
      return;
    }

    // 2. Password validation
    if (!password) {
      setError('Please create a secure password for your candidate account.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasLetter || !hasNumber) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    // 3. Confirm Password validation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerCandidateAccount({
        email: cleanEmail,
        password
      });

      if (!res.success) {
        if (res.code === 'USER_EXISTS') {
          setExistingUserDetected(true);
          setError(res.error || 'An account with this email already exists. Please log in.');
        } else {
          setError(res.error || 'Unable to create candidate account. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Account created and authenticated successfully
      onContinue(cleanEmail, res.user);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="candidate-auth-card"
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
          CREATE CANDIDATE ACCOUNT
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
          Create your secure candidate credentials to begin your official Joining Dossier.
          Your account allows you to track verification status and safely re-upload documents if requested by compliance.
        </p>
      </div>

      {/* Existing User Callout */}
      {existingUserDetected ? (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#EFF6FF',
            border: '1px solid #93C5FD',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#1E40AF', fontWeight: 700, marginBottom: '0.35rem' }}>
            <LogIn size={18} />
            <span>Account Already Exists</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: '#1E3A8A', margin: '0 0 1rem 0' }}>
            An account is already registered for <strong>{email}</strong>. Please log in with your password to view or continue your submission.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate(`/joining/login?email=${encodeURIComponent(email)}&next=/joining`)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            LOG IN TO CANDIDATE ACCOUNT &rarr;
          </Button>
        </div>
      ) : null}

      {/* Form Input */}
      <form onSubmit={handleSubmit} noValidate>
        {error && !existingUserDetected && (
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

        {/* Candidate Email */}
        <div style={{ marginBottom: '1.25rem' }}>
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
                if (existingUserDetected) setExistingUserDetected(false);
              }}
              placeholder="e.g. rahul.patil@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.85rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: error && !email ? '2px solid #EF4444' : '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-midnight-navy)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-midnight-navy)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
              }}
            />
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Your login identifier and receipt delivery address.
          </p>
        </div>

        {/* Password */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="candidate-password-input"
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--color-midnight-navy)',
              marginBottom: '0.5rem'
            }}
          >
            Create Account Password <span style={{ color: '#DC2626' }}>*</span>
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
              <Lock size={18} />
            </div>

            <input
              id="candidate-password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Minimum 8 characters (letters & numbers)"
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '0.85rem 2.85rem 0.85rem 2.85rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: error && !password ? '2px solid #EF4444' : '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-midnight-navy)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-midnight-navy)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Real-time Password Rules Feedback */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: hasMinLength ? '#16A34A' : '#94A3B8' }}>
              <CheckCircle2 size={12} /> 8+ Characters
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: hasLetter && hasNumber ? '#16A34A' : '#94A3B8' }}>
              <CheckCircle2 size={12} /> Letters & Numbers
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label
            htmlFor="candidate-confirm-password-input"
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--color-midnight-navy)',
              marginBottom: '0.5rem'
            }}
          >
            Confirm Password <span style={{ color: '#DC2626' }}>*</span>
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
              <Lock size={18} />
            </div>

            <input
              id="candidate-confirm-password-input"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '0.85rem 2.85rem 0.85rem 2.85rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: error && confirmPassword !== password ? '2px solid #EF4444' : '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-midnight-navy)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-midnight-navy)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
              }}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          icon={<ArrowRight size={18} />}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isSubmitting ? 'CREATING SECURE ACCOUNT...' : 'CREATE ACCOUNT & CONTINUE TO FORM'}
        </Button>
      </form>

      {/* Returning Candidate Link */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Already have a candidate account?{' '}
          <button
            type="button"
            onClick={() => navigate('/joining/login?next=/joining')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-midnight-navy)',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0
            }}
          >
            Log in to view or update your Joining Form
          </button>
        </p>
      </div>

      {/* Security Assurance */}
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
          Encrypted Authentication • Passwords securely managed via Supabase Auth • Zero OTPs or Magic Links needed.
        </span>
      </div>
    </div>
  );
};
