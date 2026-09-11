// ==============================================================================
// File: src/pages/AuthCallbackPage.tsx
// Description: Dedicated Supabase Authentication Callback Gateway for Magic Links
// Features:
//   - Handles PKCE code exchange & implicit hash session restoration
//   - Strictly validates destination URL (blocks arbitrary open redirects)
//   - Seamlessly directs authenticated candidates to /joining
//   - Surfaces clear error states for expired/invalid magic links
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Container } from '../components/common/Container';
import { Loader2, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  // Sanitized redirect target: internal only, default /joining
  const resolveNextPath = (target: string | null): string => {
    if (!target) return '/joining';
    // Reject absolute URLs, protocol relative URLs, or unapproved paths
    if (target.startsWith('//') || target.includes('://') || !target.startsWith('/')) {
      return '/joining';
    }
    // Only allow candidate joining paths
    if (target.startsWith('/joining')) {
      return target;
    }
    return '/joining';
  };

  useEffect(() => {
    let isMounted = true;

    const processAuthCallback = async () => {
      try {
        // 1. Check for explicit error parameters in URL query or hash
        const errorParam = searchParams.get('error');
        const errorDescParam = searchParams.get('error_description');

        if (errorParam || errorDescParam) {
          throw new Error(errorDescParam || errorParam || 'Authentication failed or link expired.');
        }

        // Check hash for error description (e.g. #error=access_denied&error_description=...)
        const hash = window.location.hash;
        if (hash && hash.includes('error=')) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const desc = hashParams.get('error_description') || hashParams.get('error');
          throw new Error(desc || 'The authentication link has expired or has already been used.');
        }

        // 2. PKCE Code Exchange if present
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw new Error(exchangeError.message);
          }
        }

        // 3. Verify that a valid session now exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (session?.user) {
          // Success! Redirect to target
          const nextUrl = resolveNextPath(searchParams.get('next'));
          if (isMounted) {
            setIsProcessing(false);
            navigate(nextUrl, { replace: true });
          }
          return;
        }

        // 4. If session not immediately available, listen for authStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!isMounted) return;
          if (newSession?.user) {
            subscription.unsubscribe();
            setIsProcessing(false);
            const nextUrl = resolveNextPath(searchParams.get('next'));
            navigate(nextUrl, { replace: true });
          }
        });

        // 5. Fallback timeout in case no session is received
        setTimeout(async () => {
          if (!isMounted) return;
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const nextUrl = resolveNextPath(searchParams.get('next'));
            navigate(nextUrl, { replace: true });
          } else {
            subscription.unsubscribe();
            setErrorMsg('Unable to establish an authenticated session. Please log in with your candidate email and password.');
            setIsProcessing(false);
          }
        }, 4000);

      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Authentication failed. Please log in with your candidate email and password.');
          setIsProcessing(false);
        }
      }
    };

    processAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 3rem)', minHeight: '80vh', paddingBottom: '5rem', backgroundColor: '#FCFBFB' }}>
      <Container size="sm">
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2DFD8',
            boxShadow: '0 10px 25px -5px rgba(25, 42, 86, 0.08)',
            padding: 'clamp(2rem, 5vw, 3rem)',
            textAlign: 'center'
          }}
        >
          {isProcessing && (
            <div>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 42, 86, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto'
                }}
              >
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#192A56' }} />
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(25, 42, 86, 0.08)',
                  color: '#192A56',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '1rem'
                }}
              >
                <ShieldCheck size={14} color="#C59B27" />
                <span>Secure Verification</span>
              </span>

              <h1
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.5rem 0'
                }}
              >
                VERIFYING YOUR SECURE LINK
              </h1>

              <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                Authenticating your credentials and redirecting to your Candidate Joining Form...
              </p>
            </div>
          )}

          {!isProcessing && errorMsg && (
            <div>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FBF0EF',
                  border: '1px solid #EDA6A3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  color: '#DC2626'
                }}
              >
                <AlertCircle size={32} />
              </div>

              <h2
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#192A56',
                  margin: '0 0 0.75rem 0'
                }}
              >
                AUTHENTICATION LINK ISSUE
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 2rem auto' }}>
                {errorMsg}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/joining/login"
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
                  <span>GO TO CANDIDATE LOGIN</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/joining"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    minHeight: '44px',
                    backgroundColor: 'transparent',
                    border: '1px solid #D2CECE',
                    color: '#192A56',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <span>OPEN JOINING FORM</span>
                </Link>

                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    minHeight: '40px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Return to Homepage</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default AuthCallbackPage;
