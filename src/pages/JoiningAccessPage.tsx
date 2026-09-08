// ==============================================================================
// File: src/pages/JoiningAccessPage.tsx
// Description: Open Candidate Joining Gateway via Supabase Magic Link
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Workflow:
//   1. Candidate inputs email address.
//   2. Supabase Magic Link is dispatched (no application lookup or pre-requisite enquiry).
//   3. Candidate clicks email link -> /auth/callback -> /joining.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/common/Container';
import { supabase } from '../lib/supabaseClient';
import { getAuthRedirectUrl } from '../utils/authRedirect';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const JoiningAccessPage: React.FC = () => {
  useEffect(() => {
    document.title = "Candidate Joining Access | A TIGER GLOBAL";
  }, []);

  // Form & View States
  const [email, setEmail] = useState<string>('');
  const [isSent, setIsSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Email format validation
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  // Handle Resend Cooldown Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle Magic Link Dispatch
  const handleSendMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Canonical callback target (strictly derives from VITE_SITE_URL in production, never localhost)
      const redirectUrl = getAuthRedirectUrl('/joining');

      // Dispatch Supabase Magic Link passwordless authentication
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true
        }
      });

      if (otpError) {
        if (otpError.message.toLowerCase().includes('rate limit')) {
          throw new Error('Too many requests. Please wait a minute before requesting another magic link.');
        }
        throw new Error(otpError.message);
      }

      // Success
      setIsSent(true);
      setResendCooldown(45);
      setCanResend(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send magic link. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsSent(false);
    setErrorMsg(null);
  };

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh', paddingBottom: '5rem', backgroundColor: '#FCFBFB' }}>
      <Container size="sm">
        {/* Navigation back to home */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#192A56',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Card Container */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2DFD8',
            boxShadow: '0 10px 25px -5px rgba(25, 42, 86, 0.08)',
            padding: 'clamp(1.75rem, 4vw, 2.75rem)',
            position: 'relative'
          }}
        >
          {/* Header Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(25, 42, 86, 0.08)',
                color: '#192A56',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              <ShieldCheck size={14} color="#C59B27" />
              <span>Candidate Portal</span>
            </span>
          </div>

          {/* ==================================================================== */}
          {/* STATE 1: EMAIL ENTRY FORM                                            */}
          {/* ==================================================================== */}
          {!isSent && (
            <div>
              <h1
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 'clamp(1.5rem, 3vw, 1.85rem)',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '-0.02em'
                }}
              >
                ALREADY REGISTERED?
              </h1>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#C59B27',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem'
                }}
              >
                OR START YOUR JOINING PROCESS
              </span>
              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.55, margin: '0 0 1.75rem 0' }}>
                Enter your email address to receive a secure link to access the joining form.
              </p>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FBF0EF',
                    border: '1px solid #EDA6A3',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    color: '#DC2626'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSendMagicLink}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor="candidate-email"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.4rem'
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      color="#64748B"
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      id="candidate-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      disabled={loading}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        minHeight: '48px',
                        padding: '0.75rem 1rem 0.75rem 2.75rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D2CECE',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#192A56',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    backgroundColor: '#192A56',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>SENDING SECURE LINK...</span>
                    </>
                  ) : (
                    <>
                      <span>SEND SECURE LINK</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STATE 2: MAGIC LINK DISPATCHED CONFIRMATION                          */}
          {/* ==================================================================== */}
          {isSent && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#10B981'
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.5rem 0'
                }}
              >
                CHECK YOUR EMAIL
              </h2>

              <p style={{ fontSize: '0.92rem', color: '#4A5568', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                We have sent a secure link to <strong style={{ color: '#192A56' }}>{email}</strong>.
                <br />
                Click the link in your email to open and complete your Joining Form.
              </p>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FBF0EF',
                    border: '1px solid #EDA6A3',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    color: '#DC2626',
                    textAlign: 'left'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSendMagicLink()}
                  disabled={!canResend || loading}
                  style={{
                    minHeight: '44px',
                    backgroundColor: canResend && !loading ? '#192A56' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: canResend && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>{canResend ? 'Resend Secure Link' : `Resend available in ${resendCooldown}s`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    minHeight: '42px',
                    backgroundColor: 'transparent',
                    border: '1px solid #D2CECE',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Use a different email address
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default JoiningAccessPage;
