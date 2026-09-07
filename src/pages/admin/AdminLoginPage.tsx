// ==============================================================================
// File: src/pages/admin/AdminLoginPage.tsx
// Description: Official Administrator Secure Login Gateway for A TIGER GROUPS
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { signIn, isAdmin, loading: authLoading, error: authError } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If already authenticated and active admin, redirect immediately
  useEffect(() => {
    if (!authLoading && isAdmin) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAdmin, authLoading, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signIn(email, password);
      if (res.success) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      } else {
        setLocalError(res.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
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
          maxWidth: '440px',
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

        {/* Brand Header with A TIGER GROUPS Client Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/assets/tiger-logo.jpeg"
            alt="TIGER GROUPS"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              objectFit: 'contain',
              backgroundColor: '#FFFFFF',
              padding: '4px',
              border: '1px solid #E2DFD8',
              boxShadow: '0 4px 12px rgba(25, 42, 86, 0.1)',
              marginBottom: '1rem',
              display: 'inline-block'
            }}
          />

          <h1
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#192A56',
              letterSpacing: '0.04em',
              margin: '0 0 0.35rem 0'
            }}
          >
            TIGER GROUPS
          </h1>
          <p
            style={{
              fontSize: '0.775rem',
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

        {/* Error Alert Box (using Dusty Rose) */}
        {(localError || authError) && (
          <div
            style={{
              backgroundColor: '#FBF0EF',
              border: '1px solid #EDA6A3',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email field */}
          <div>
            <label
              htmlFor="admin-email"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#192A56',
                marginBottom: '0.5rem',
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
                marginBottom: '0.5rem',
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

          {/* Submit Button (Champagne highlight button) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-admin-primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              fontSize: '0.9rem',
              width: '100%'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>SIGN IN TO ADMIN PANEL</span>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #E2DFD8',
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
