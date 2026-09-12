// ==============================================================================
// File: src/pages/Joining.tsx
// Description: Public Candidate Joining Dossier Page
// Security: Fully public onboarding dossier. No candidate authentication, OTP,
//           or magic link required. Email collected strictly for receipt delivery.
// ==============================================================================

import React from 'react';
import { FileCheck2, FileText } from 'lucide-react';
import { Container } from '../components/common/Container';
import { JoiningForm } from '../components/joining/JoiningForm';

export const Joining: React.FC = () => {
  return (
    <div className="joining-page-container" style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)', minHeight: '90vh', paddingBottom: '5rem' }}>
      {/* Editorial Header (Excluded from browser print / PDF output) */}
      <section className="joining-editorial-header no-print" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-pearl-white)', padding: '2.5rem 0 2rem 0' }}>
        <Container size="lg" className="joining-header-container">
          <div className="joining-header-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="joining-header-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="joining-header-title-box">
                <div className="joining-header-badge-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className="eyebrow joining-eyebrow-text" style={{ margin: 0, letterSpacing: '0.12em' }}>
                    A TIGER GLOBAL • ONBOARDING DOSSIER
                  </span>
                  <span
                    className="joining-portal-tag"
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
                    <FileCheck2 size={12} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Official Joining Portal</span>
                  </span>
                </div>
                <h1 className="joining-page-title" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', color: 'var(--color-midnight-navy)', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                  CANDIDATE JOINING & REGISTRATION FORM
                </h1>
              </div>

              <div className="joining-header-registry-box" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div
                  className="joining-registry-pill"
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
                  <FileText size={16} style={{ color: 'var(--color-midnight-navy)' }} />
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Registry Mode
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
                      Public Onboarding
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="joining-editorial-desc" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
              Welcome to A Tiger Global. Please fill in your personal, address, banking, educational, and statutory declaration records. All information is securely prepared for your official onboarding record.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Multi-Step Form Container */}
      <section className="joining-form-wrapper-section" style={{ marginTop: 'var(--space-6)' }}>
        <Container size="lg" className="joining-form-container">
          <JoiningForm />
        </Container>
      </section>
    </div>
  );
};

export default Joining;
