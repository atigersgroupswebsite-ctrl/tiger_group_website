// ==============================================================================
// File: src/pages/CandidateResetPasswordPage.tsx
// Description: Candidate Password Reset & Recovery Page (/joining/reset-password)
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Specifications:
//   - Forgot password recovery dispatch via Supabase Auth
//   - Account existence protection (does not reveal if email exists)
//   - Secure password update callback handler
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, FileCheck2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabaseClient';

export const CandidateResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine mode: 'REQUEST' (Forgot Password) vs 'RESET' (Setting new password after link click)
  const [mode, setMode] = useState<'REQUEST' | 'RESET'>('REQUEST');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) setEmail(qEmail);

    // Check if the current URL contains access token or recovery hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setMode('RESET');
    }

    // Also check onAuthStateChange for PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('RESET');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  // Handler: Request Password Reset Link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cleanEmail)) {
      setError('Please enter a valid candidate email address.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/joining/reset-password`;
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      // Generic success notice to prevent user enumeration
      setSuccessMessage(
        'If an account is associated with this email address, password reset instructions have been dispatched. Please check your inbox.'
      );
    } catch (err: any) {
      // Even on error, provide a safe generic response unless system failure
      console.warn('[RESET_PASSWORD_NOTICE]', err);
      setSuccessMessage(
        'If an account is associated with this email address, password reset instructions have been dispatched. Please check your inbox.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler: Set New Password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password
      });

      if (updateErr) {
        setError(updateErr.message || 'Failed to update password.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Your password has been successfully updated! You can now log in.');
      setTimeout(() => {
        navigate('/joining/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '90vh', paddingBottom: '5rem' }}>
      <Container size="sm">
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            padding: 'clamp(2rem, 5vw, 3rem)'
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
              A TIGER GLOBAL • CANDIDATE ACCOUNT
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
              {mode === 'REQUEST' ? 'RESET PASSWORD' : 'SET NEW PASSWORD'}
            </h1>

            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                maxWidth: '460px',
                margin: '0 auto'
              }}
            >
              {mode === 'REQUEST'
                ? 'Enter your registered candidate email address to receive password recovery instructions.'
                : 'Enter your new secure password for your candidate account.'}
            </p>
          </div>

          {/* Success Message Alert */}
          {successMessage && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: 'var(--radius-lg)',
                color: '#166534',
                fontSize: 'var(--text-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '1.75rem'
              }}
            >
              <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Error Message Alert */}
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

          {/* Mode 1: Request Reset Link */}
          {mode === 'REQUEST' && !successMessage && (
            <form onSubmit={handleRequestReset} noValidate>
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="reset-email"
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
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="candidate@example.com"
                    autoComplete="email"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.85rem',
                      fontSize: '1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: error ? '2px solid #EF4444' : '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-midnight-navy)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                icon={<ArrowRight size={18} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'SENDING INSTRUCTIONS...' : 'SEND PASSWORD RESET LINK'}
              </Button>
            </form>
          )}

          {/* Mode 2: Set New Password */}
          {mode === 'RESET' && (
            <form onSubmit={handleSetNewPassword} noValidate>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="new-password"
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--color-midnight-navy)',
                    marginBottom: '0.5rem'
                  }}
                >
                  New Password <span style={{ color: '#DC2626' }}>*</span>
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
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.85rem 2.85rem 0.85rem 2.85rem',
                      fontSize: '1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: error ? '2px solid #EF4444' : '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-midnight-navy)',
                      outline: 'none',
                      boxSizing: 'border-box'
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
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  htmlFor="confirm-new-password"
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--color-midnight-navy)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Confirm New Password <span style={{ color: '#DC2626' }}>*</span>
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
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.85rem',
                      fontSize: '1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: error ? '2px solid #EF4444' : '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-midnight-navy)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                icon={<ArrowRight size={18} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'UPDATING PASSWORD...' : 'SAVE NEW PASSWORD & PROCEED'}
              </Button>
            </form>
          )}

          {/* Navigation Links */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center'
            }}
          >
            <Link
              to="/joining/login"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-midnight-navy)',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              &larr; Return to Candidate Login
            </Link>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
            <span>Secure Supabase Auth Recovery &bull; Encrypted Password Transit</span>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CandidateResetPasswordPage;
