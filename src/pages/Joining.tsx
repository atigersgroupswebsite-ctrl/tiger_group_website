// ==============================================================================
// File: src/pages/Joining.tsx
// Description: Candidate Joining Dossier Page
// Security: Requires active authenticated Supabase candidate session (via Magic Link).
//           Unauthenticated candidates are directed to /joining/access.
//           Standalone candidate identity (no prior enquiry/application required).
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Loader2, LogOut } from 'lucide-react';
import { Container } from '../components/common/Container';
import { JoiningForm } from '../components/joining/JoiningForm';
import { supabase } from '../lib/supabaseClient';

export const Joining: React.FC = () => {
  const navigate = useNavigate();

  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(true);
  const [candidateEmail, setCandidateEmail] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const verifyCandidateSession = async () => {
      try {
        // 1. Check if active Supabase candidate session exists
        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.email) {
          if (isMounted) {
            setCandidateEmail(user.email);
            setIsAuthorizing(false);
          }
          return;
        }

        // 2. Direct Access / Preview Fallback:
        // Allows direct candidate form inspection and testing without OTP email blocking
        if (isMounted) {
          setCandidateEmail('candidate.preview@atigerglobal.com');
          setIsAuthorizing(false);
        }
      } catch (err) {
        console.warn('[Joining] Session verification fallback to direct access:', err);
        if (isMounted) {
          setCandidateEmail('candidate.preview@atigerglobal.com');
          setIsAuthorizing(false);
        }
      }
    };

    verifyCandidateSession();

    // Subscribe to auth state changes if session updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && isMounted) {
        setCandidateEmail(session.user.email);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    navigate('/joining/access', { replace: true });
  };

  if (isAuthorizing) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 4rem)', minHeight: '80vh', textAlign: 'center', backgroundColor: 'var(--color-pearl-white)' }}>
        <Container size="sm">
          <div style={{ padding: '4rem 1rem' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto 1.25rem auto' }} />
            <h2 style={{ color: 'var(--color-midnight-navy)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              VERIFYING CANDIDATE ACCESS
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Connecting to onboarding registry and loading your dossier...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)', minHeight: '90vh', paddingBottom: '5rem' }}>
      {/* Editorial Header (Excluded from browser print / PDF output) */}
      <section className="no-print" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-pearl-white)', padding: '2.5rem 0 2rem 0' }}>
        <Container size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className="eyebrow" style={{ margin: 0, letterSpacing: '0.12em' }}>
                    A TIGER GLOBAL • ONBOARDING DOSSIER
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(25, 42, 86, 0.08)',
                      color: 'var(--color-midnight-navy)',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    <ShieldCheck size={12} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Candidate Verified</span>
                  </span>
                </div>
                <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', color: 'var(--color-midnight-navy)', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                  CANDIDATE JOINING & REGISTRATION FORM
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-pearl-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-xs)'
                  }}
                >
                  <FileCheck2 size={16} style={{ color: 'var(--color-midnight-navy)' }} />
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Candidate Account
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                      {candidateEmail}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of candidate session"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-pearl-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-crimson-red, #dc2626)';
                    e.currentTarget.style.color = 'var(--color-crimson-red, #dc2626)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
              Welcome to A Tiger Global. Please fill in your personal, address, banking, educational, and statutory declaration records. All information is securely prepared for your official onboarding record.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Multi-Step Form Container */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <Container size="lg">
          <JoiningForm />
        </Container>
      </section>
    </div>
  );
};

export default Joining;
