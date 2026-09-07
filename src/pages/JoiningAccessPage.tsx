// ==============================================================================
// File: src/pages/JoiningAccessPage.tsx
// Description: Candidate Joining Access & Passwordless Email OTP Verification Gateway
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security: Privacy-preserving lookup (no candidate enumeration), passwordless OTP,
//           multi-factor authorization against applications table.
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '../components/common/Container';
import { supabase } from '../lib/supabaseClient';
import { getAuthorizedApplication } from '../services/joiningService';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2,
  Lock,
  PhoneCall,
  FileText
} from 'lucide-react';

type AccessStep = 'EMAIL_INPUT' | 'NO_APPLICATION' | 'ACCESS_NOT_YET_ENABLED' | 'OTP_INPUT' | 'SUCCESS_REDIRECT';

export const JoiningAccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Access Joining Form | A TIGER GLOBAL";
  }, []);

  // Flow & Form States
  const [step, setStep] = useState<AccessStep>('EMAIL_INPUT');
  const [email, setEmail] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Email validation regex
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  // Handle Resend Cooldown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Step 1: Candidate submits email for verification check
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // 1. Call privacy-preserving pre-check RPC (does not return candidate name or application number)
      const { data: statusRes, error: rpcErr } = await supabase.rpc('check_joining_access_status', {
        candidate_email: cleanEmail
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      const result = statusRes as { status?: string };

      if (result?.status === 'NOT_FOUND') {
        // No application found for this email
        setStep('NO_APPLICATION');
        return;
      }

      if (result?.status === 'ACCESS_NOT_ENABLED') {
        // Application exists but joining access is not enabled by admin yet
        setStep('ACCESS_NOT_YET_ENABLED');
        return;
      }

      if (result?.status === 'ACCESS_ENABLED') {
        // 2. Application exists and joining access is enabled -> send passwordless OTP
        const { error: otpSendErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true
          }
        });

        if (otpSendErr) {
          if (otpSendErr.message.toLowerCase().includes('rate limit')) {
            throw new Error('Too many requests. Please wait a minute before requesting another code.');
          }
          throw new Error(otpSendErr.message);
        }

        setStep('OTP_INPUT');
        setResendCooldown(45);
        setCanResend(false);
      } else {
        throw new Error('Unable to verify application status. Please try again.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input digit-by-digit & paste support
  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[focusIndex]?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error: resendErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true }
      });

      if (resendErr) throw new Error(resendErr.message);

      setResendCooldown(45);
      setCanResend(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resend code. Please wait a moment.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP & Authorize Application Access
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpDigits.join('');
    if (token.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Verify OTP with Supabase Auth
      const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: token,
        type: 'email'
      });

      if (verifyErr || !authData.user) {
        throw new Error('Invalid or expired verification code. Please check and try again.');
      }

      // 2. Authoritative Database Gate: Verify that authenticated user email matches application with joining_access_enabled
      const authRes = await getAuthorizedApplication();
      if (!authRes.success || !authRes.data) {
        throw new Error(authRes.error || 'Authorization check failed: No active application with joining access enabled was found for this authenticated account.');
      }

      const appData = authRes.data;

      // 3. Authorization succeeded — show success state then route to /joining
      setStep('SUCCESS_REDIRECT');

      setTimeout(() => {
        navigate(`/joining?appId=${appData.id}`, { replace: true });
      }, 1200);

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToEmail = () => {
    setStep('EMAIL_INPUT');
    setOtpDigits(['', '', '', '', '', '']);
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
            padding: 'clamp(1.75rem, 4vw, 2.5rem)',
            position: 'relative'
          }}
        >
          {/* Header Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
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
          {/* STATE 1: EMAIL ENTRY                                                 */}
          {/* ==================================================================== */}
          {step === 'EMAIL_INPUT' && (
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
              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.75rem 0' }}>
                Enter the email address you used when submitting your enquiry to verify access to your Candidate Joining Form.
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

              <form onSubmit={handleEmailSubmit}>
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
                      <span>CHECKING APPLICATION...</span>
                    </>
                  ) : (
                    <>
                      <span>CONTINUE</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #EAE8E4' }}>
                  <Link
                    to="/joining"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      minHeight: '44px',
                      backgroundColor: '#F8FAFC',
                      border: '1px dashed #94A3B8',
                      borderRadius: '8px',
                      color: '#192A56',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>⚡ Test Joining Form (Direct Preview / No OTP Needed)</span>
                    <ArrowRight size={14} />
                  </Link>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0 0' }}>
                    Opens the full 9-step Joining Dossier form directly for evaluation and testing.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STATE 2: NO APPLICATION FOUND                                        */}
          {/* ==================================================================== */}
          {step === 'NO_APPLICATION' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#EA580C'
                }}
              >
                <FileText size={28} />
              </div>

              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.75rem 0'
                }}
              >
                WE COULDN'T FIND AN ACTIVE APPLICATION
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#4A5568', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.75rem auto' }}>
                Please submit a Job Seeker Enquiry first. Once your enquiry has been reviewed and joining access is enabled, you can return here to continue your application.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/enquiry/job-seeker"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minHeight: '48px',
                    backgroundColor: '#192A56',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  <span>SUBMIT JOB ENQUIRY →</span>
                </Link>

                <button
                  type="button"
                  onClick={handleResetToEmail}
                  style={{
                    minHeight: '44px',
                    background: 'transparent',
                    border: '1px solid #D2CECE',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  TRY ANOTHER EMAIL
                </button>

                <Link
                  to="/joining"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #94A3B8',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  ⚡ Test Joining Form (Demo Mode) →
                </Link>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STATE 3: APPLICATION FOUND BUT ACCESS NOT YET ENABLED                */}
          {/* ==================================================================== */}
          {step === 'ACCESS_NOT_YET_ENABLED' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#D97706'
                }}
              >
                <Clock size={28} />
              </div>

              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.75rem 0'
                }}
              >
                JOINING ACCESS NOT YET ENABLED
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#4A5568', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.75rem auto' }}>
                Your enquiry has been received. The joining form becomes available once A Tiger Global enables access for your application.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '48px',
                    backgroundColor: '#192A56',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  BACK TO HOME
                </Link>

                <Link
                  to="/contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    minHeight: '44px',
                    background: 'transparent',
                    border: '1px solid #D2CECE',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <PhoneCall size={15} />
                  <span>CONTACT SUPPORT</span>
                </Link>

                <Link
                  to="/joining"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #94A3B8',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  ⚡ Test Joining Form (Demo Mode) →
                </Link>

                <button
                  type="button"
                  onClick={handleResetToEmail}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                >
                  Use a different email address
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STATE 4: PASSWORDLESS EMAIL OTP ENTRY                                */}
          {/* ==================================================================== */}
          {step === 'OTP_INPUT' && (
            <div>
              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.5rem 0'
                }}
              >
                VERIFY YOUR EMAIL
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                We sent a 6-digit verification code to <strong style={{ color: '#192A56' }}>{email}</strong>. Enter it below to unlock your joining dossier.
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

              <form onSubmit={handleVerifyOtp}>
                {/* 6-Digit OTP Box Grid */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'clamp(0.4rem, 2vw, 0.75rem)',
                    marginBottom: '1.5rem'
                  }}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePasteOtp}
                      disabled={loading}
                      style={{
                        width: 'clamp(42px, 12vw, 54px)',
                        height: 'clamp(48px, 14vw, 60px)',
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: '#192A56',
                        backgroundColor: '#FCFBFB',
                        border: '2px solid',
                        borderColor: digit ? '#192A56' : '#D2CECE',
                        borderRadius: '10px',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    backgroundColor: otpDigits.join('').length === 6 ? '#192A56' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    cursor: otpDigits.join('').length === 6 && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.25rem',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>VERIFYING CODE...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>VERIFY & ACCESS DOSSIER</span>
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                  <button
                    type="button"
                    onClick={handleResetToEmail}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                  >
                    Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: canResend ? '#192A56' : '#94A3B8',
                      fontWeight: 700,
                      cursor: canResend ? 'pointer' : 'not-allowed',
                      padding: 0
                    }}
                  >
                    {canResend ? 'Resend Code' : `Resend code in ${resendCooldown}s`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STATE 5: AUTHORIZATION SUCCESS & REDIRECT                           */}
          {/* ==================================================================== */}
          {step === 'SUCCESS_REDIRECT' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
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
                <CheckCircle2 size={36} />
              </div>

              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.5rem 0'
                }}
              >
                ACCESS AUTHORIZED
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '0 0 1.5rem 0' }}>
                Identity confirmed. Loading your Candidate Joining & Statutory Dossier...
              </p>

              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#192A56', margin: '0 auto' }} />
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default JoiningAccessPage;
