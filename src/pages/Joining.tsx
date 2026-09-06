// ==============================================================================
// File: src/pages/Joining.tsx
// Description: Candidate Joining & Statutory Dossier Form
// Security: Protected route requiring active Supabase candidate authentication
//           AND application joining_access_enabled = true. Direct unverified
//           visitors are automatically redirected to /joining/access.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Loader2 } from 'lucide-react';
import { Container } from '../components/common/Container';
import { JoiningForm } from '../components/joining/JoiningForm';
import { supabase } from '../lib/supabaseClient';

export const Joining: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appIdParam = searchParams.get('appId');

  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(true);
  const [authorizedAppNumber, setAuthorizedAppNumber] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const verifyCandidateAccess = async () => {
      try {
        // 1. Verify active Supabase auth session
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user || !user.email) {
          // Unauthenticated -> redirect to access gateway
          navigate('/joining/access', { replace: true });
          return;
        }

        const candidateEmail = user.email.toLowerCase().trim();

        // 2. Query application record for this candidate
        // Database RLS guarantees only applications where:
        // lower(trim(email)) = jwt_email AND joining_access_enabled = true
        // are returned
        let query = supabase
          .from('applications')
          .select('id, application_number, email, joining_access_enabled')
          .eq('joining_access_enabled', true);

        if (appIdParam) {
          query = query.eq('id', appIdParam);
        } else {
          query = query.order('created_at', { ascending: false }).limit(1);
        }

        const { data: appData, error: appErr } = await query.maybeSingle();

        if (appErr || !appData) {
          // No authorized application or joining_access_enabled = false
          navigate('/joining/access', { replace: true });
          return;
        }

        // Additional identity and gate validation
        if (appData.email.toLowerCase().trim() !== candidateEmail || !appData.joining_access_enabled) {
          navigate('/joining/access', { replace: true });
          return;
        }

        if (isMounted) {
          setAuthorizedAppNumber(appData.application_number || 'ATG-APP-VERIFIED');
          setIsAuthorizing(false);
        }
      } catch (err) {
        console.error('[Joining] Authorization check failed:', err);
        navigate('/joining/access', { replace: true });
      }
    };

    verifyCandidateAccess();

    return () => {
      isMounted = false;
    };
  }, [appIdParam, navigate]);

  if (isAuthorizing) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 4rem)', minHeight: '80vh', textAlign: 'center', backgroundColor: 'var(--color-pearl-white)' }}>
        <Container size="sm">
          <div style={{ padding: '4rem 1rem' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto 1.25rem auto' }} />
            <h2 style={{ color: 'var(--color-midnight-navy)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              VERIFYING CANDIDATE AUTHORIZATION
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Connecting to secure onboarding registry and loading your dossier...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)', minHeight: '90vh', paddingBottom: '5rem' }}>
      {/* Editorial Header */}
      <section style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-pearl-white)', padding: '2.5rem 0 2rem 0' }}>
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
                  CANDIDATE JOINING & STATUTORY PACKET
                </h1>
              </div>

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
                    Authorized Application ID
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--color-midnight-navy)', fontFamily: 'monospace' }}>
                    {authorizedAppNumber}
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
              Welcome to A Tiger Global. Please fill in your personal, banking, educational, and statutory declaration records. All information is securely prepared for your official 14-page physical onboarding dossier.
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
