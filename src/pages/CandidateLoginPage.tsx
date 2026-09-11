// ==============================================================================
// File: src/pages/CandidateLoginPage.tsx
// Description: Secure Candidate Login Portal (/joining/login)
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Specifications:
//   - Email + Password authentication via Supabase Auth
//   - Zero Magic Links, zero OTPs
//   - Forgot Password navigation
//   - Directs authenticated candidate to their authorized Joining Dossier(s)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, FileCheck2, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabaseClient';

export const CandidateLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve target path (defaults to /joining/portal, or /joining if requested)
  const nextTarget = searchParams.get('next') || '/joining/portal';

  // Pre-fill email from query param if provided
  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

  // Check if candidate already has an active session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate(nextTarget, { replace: true });
      }
    });
  }, [navigate, nextTarget]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      let { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      // If login is blocked due to unconfirmed email, auto-confirm candidate account and retry once
      if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
        try {
          await fetch('/api/candidate/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'confirm_email', email: cleanEmail })
          });

          const retryResult = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          data = retryResult.data;
          authError = retryResult.error;
        } catch {
          // Continue to handle authError below
        }
      }

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid email or password. Please verify your credentials and try again.');
        } else {
          setError(authError.message || 'Unable to log in. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Authenticated successfully. Redirect to destination.
        navigate(nextTarget, { replace: true });
      } else {
        setError('Login failed to establish a secure session.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected connection error occurred.');
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
          {/* Header */}
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
              A TIGER GLOBAL • CANDIDATE PORTAL
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
              CANDIDATE LOG IN
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
              Log in with your candidate credentials to view your onboarding dossier status, review compliance feedback, and re-upload requested documents.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
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

            {/* Email Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="login-email"
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
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="candidate@example.com"
                  autoComplete="email"
                  autoFocus={!email}
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

            {/* Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--color-midnight-navy)'
                  }}
                >
                  Account Password <span style={{ color: '#DC2626' }}>*</span>
                </label>

                <Link
                  to={`/joining/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-midnight-navy)',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

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
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus={Boolean(email)}
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              icon={<ArrowRight size={18} />}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'AUTHENTICATING...' : 'LOG IN TO CANDIDATE PORTAL'}
            </Button>
          </form>

          {/* New Candidate Link */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem 0' }}>
              First-time candidate submitting a new dossier?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<UserPlus size={16} />}
              onClick={() => navigate('/joining')}
              style={{ justifyContent: 'center' }}
            >
              CREATE ACCOUNT & START JOINING FORM
            </Button>
          </div>

          {/* Security Assurance */}
          <div
            style={{
              marginTop: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
            <span>Secure Candidate Authorization &bull; Row Level Security Protected</span>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CandidateLoginPage;
