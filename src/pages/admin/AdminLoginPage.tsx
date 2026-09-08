// ==============================================================================
// File: src/pages/admin/AdminLoginPage.tsx
// Description: Official Administrator Secure Login Gateway for TIGER GROUPS
// Features: Supabase Auth Password Login, Email OTP / Magic Link Access,
//           Role-based Admin Profile Verification, Quick-fill Helpers.
// Brand: TIGER GROUPS — Midnight Navy & Champagne Aesthetics
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { supabase, isSupabaseConfigured, supabaseDiagnostics } from '../../lib/supabaseClient';
import {
  Lock,
  Mail,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Send,
  Loader2
} from 'lucide-react';

type LoginMethod = 'PASSWORD' | 'EMAIL_OTP';

export const AdminLoginPage: React.FC = () => {
  const { signIn, refreshProfile, isAdmin, authLoading, profileLoading, error: authError } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [method, setMethod] = useState<LoginMethod>('PASSWORD');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState<boolean>(false);

  // If already authenticated and active admin, redirect immediately (safe from login loops)
  useEffect(() => {
    if (!authLoading && !profileLoading && isAdmin) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const destination = (!from || from === '/admin/login') ? '/admin' : from;
      navigate(destination, { replace: true });
    }
  }, [isAdmin, authLoading, profileLoading, navigate, location.state]);

  // Handle password submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    if (!isSupabaseConfigured) {
      setLocalError(
        'Supabase production environment variables are missing from this build. ' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) ' +
        'are configured in your Vercel Project Settings, then redeploy.'
      );
      return;
    }

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signIn(email.trim().toLowerCase(), password);
      if (res.success) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
        const destination = (!from || from === '/admin/login') ? '/admin' : from;
        navigate(destination, { replace: true });
      } else {
        setLocalError(res.error || 'Authentication failed. Please verify your email and password.');
      }
    } catch (err: unknown) {
      setLocalError('Invalid administrator credentials or unauthorized account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle send OTP / magic link
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setLocalError('Please enter your administrator email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      setSuccessNotice(`Access code and magic link sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to send access code. Please try again.';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    if (!otpCode.trim()) {
      setLocalError('Please enter the 6-digit access code from your email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'email'
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid or expired access code.');
      }

      // Ensure admin profile verification completes before navigating
      await refreshProfile();

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please check the code.';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DFD8',
          borderRadius: '16px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 10px 25px -5px rgba(25, 42, 86, 0.08), 0 0 0 1px rgba(247, 215, 148, 0.25)',
          position: 'relative'
        }}
      >
        {/* Top brand accent stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #192A56 0%, #F7D794 100%)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/assets/tiger-logo.jpeg"
            alt="TIGER GROUPS"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              objectFit: 'contain',
              backgroundColor: '#FFFFFF',
              padding: '4px',
              border: '1px solid #E2DFD8',
              boxShadow: '0 4px 12px rgba(25, 42, 86, 0.1)',
              marginBottom: '0.75rem',
              display: 'inline-block'
            }}
          />

          <h1
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#192A56',
              letterSpacing: '0.04em',
              margin: '0 0 0.25rem 0'
            }}
          >
            TIGER GROUPS
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#8C6400',
              backgroundColor: '#FDF3DB',
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            Internal Administration Portal
          </p>
        </div>

        {/* Method Toggle Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMethod('PASSWORD');
              setLocalError(null);
            }}
            style={{
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: method === 'PASSWORD' ? '#FFFFFF' : 'transparent',
              color: method === 'PASSWORD' ? '#192A56' : '#64748B',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: method === 'PASSWORD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Password Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('EMAIL_OTP');
              setLocalError(null);
            }}
            style={{
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: method === 'EMAIL_OTP' ? '#FFFFFF' : 'transparent',
              color: method === 'EMAIL_OTP' ? '#192A56' : '#64748B',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: method === 'EMAIL_OTP' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Email OTP / Link
          </button>
        </div>

        {/* Supabase Environment Missing Warning */}
        {!isSupabaseConfigured && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertTriangle size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#92400E', marginBottom: '0.2rem' }}>
                Vercel Configuration Required
              </div>
              <p style={{ fontSize: '0.78rem', color: '#78350F', margin: 0, lineHeight: 1.45 }}>
                Supabase client environment variables are not detected in this build.
                In your Vercel Project Settings &rarr; Environment Variables, add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> (or <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong>), then redeploy.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {(localError || authError) && (
          <div
            style={{
              backgroundColor: '#FBF0EF',
              border: '1px solid #EDA6A3',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertCircle size={18} color="#C9726F" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.825rem', color: '#C9726F', lineHeight: 1.4, fontWeight: 500 }}>
              {localError || authError}
            </div>
          </div>
        )}

        {/* Success Notice Box */}
        {successNotice && (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.825rem', color: '#166534', lineHeight: 1.4, fontWeight: 500 }}>
              {successNotice}
            </div>
          </div>
        )}

        {/* METHOD 1: PASSWORD LOGIN */}
        {method === 'PASSWORD' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Email field */}
            <div>
              <label
                htmlFor="admin-email"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#192A56',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Administrator Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B'
                  }}
                />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@atigergroups.com"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    backgroundColor: '#FCFBFB',
                    border: '1px solid #D2CECE',
                    borderRadius: '8px',
                    color: '#192A56',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#192A56')}
                  onBlur={(e) => (e.target.style.borderColor = '#D2CECE')}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="admin-password"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#192A56',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B'
                  }}
                />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem 2.75rem 0.75rem 2.5rem',
                    backgroundColor: '#FCFBFB',
                    border: '1px solid #D2CECE',
                    borderRadius: '8px',
                    color: '#192A56',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#192A56')}
                  onBlur={(e) => (e.target.style.borderColor = '#D2CECE')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-admin-primary"
              style={{
                marginTop: '0.25rem',
                padding: '0.85rem',
                fontSize: '0.9rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>SIGN IN TO ADMIN PANEL</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* METHOD 2: EMAIL OTP / MAGIC LINK */}
        {method === 'EMAIL_OTP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label
                    htmlFor="admin-email-otp"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Administrator Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B'
                      }}
                    />
                    <input
                      id="admin-email-otp"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@atigergroups.com"
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        backgroundColor: '#FCFBFB',
                        border: '1px solid #D2CECE',
                        borderRadius: '8px',
                        color: '#192A56',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-admin-primary"
                  style={{
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>SENDING CODE...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>SEND ACCESS CODE / MAGIC LINK</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label
                    htmlFor="otp-code"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#192A56',
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Enter 6-Digit Email Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B'
                      }}
                    />
                    <input
                      id="otp-code"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        backgroundColor: '#FCFBFB',
                        border: '1px solid #D2CECE',
                        borderRadius: '8px',
                        color: '#192A56',
                        fontSize: '1.1rem',
                        letterSpacing: '0.2em',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-admin-primary"
                  style={{
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>VERIFYING CODE...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>VERIFY CODE & SIGN IN</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Re-send code or use another email
                </button>
              </form>
            )}
          </div>
        )}

        {/* Safe Diagnostic Status Indicator (No secrets exposed) */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: '#64748B'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Supabase Target:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F1B38' }}>
              {supabaseDiagnostics.urlHost}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Client Credentials:</span>
            <span style={{ fontWeight: 700, color: isSupabaseConfigured ? '#16A34A' : '#DC2626' }}>
              {isSupabaseConfigured ? `Configured (${supabaseDiagnostics.configuredKeyVariable})` : 'MISSING IN BUILD'}
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.725rem',
            color: '#64748B',
            lineHeight: 1.5
          }}
        >
          Confidential System. TIGER GROUPS authorized personnel only. All access attempts and
          administrative operations are monitored and recorded.
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
