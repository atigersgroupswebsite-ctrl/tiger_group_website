import React from 'react';
import { ShieldAlert, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';

export const Joining: React.FC = () => {
  const documentChecklist = [
    { id: 1, name: 'Employee Personal Information Form', mandatory: true },
    { id: 2, name: 'Joining Report & Appointment Confirmation', mandatory: true },
    { id: 3, name: 'ID Card Format & 4 Passport Photos', mandatory: true },
    { id: 4, name: 'Photo ID & Address Proof (Aadhaar Card, PAN Card, Voter ID)', mandatory: true },
    { id: 5, name: 'EPFO (Form 2 / Form 11) Nomination Papers', mandatory: true },
    { id: 6, name: 'ESIC (Form 1) Social Security Registration', mandatory: true },
    { id: 7, name: 'Bank Account & IFSC Payment Information', mandatory: true },
    { id: 8, name: 'Copies of All Education & Experience Certificates', mandatory: true }
  ];

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <section className="section-sm section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Container size="md">
          <div style={{ textAlign: 'center' }}>
            <span className="eyebrow">Onboarding Gateway</span>
            <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: 'var(--space-2)' }}>
              JOINING FORM & VERIFICATION
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
              Official onboarding dossier and document verification gateway for candidates selected across partner companies.
            </p>
          </div>
        </Container>
      </section>

      {/* Placeholder Notice */}
      <section className="section-sm">
        <Container size="md">
          <div style={{
            background: 'var(--color-pearl-white)',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border)',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'rgba(25, 42, 86, 0.05)',
              border: '1px solid rgba(25, 42, 86, 0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: 'var(--space-8)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--color-midnight-navy)',
                color: 'var(--color-champagne)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.2rem' }}>
                  Stage-Restricted Process (Phase 1 Placeholder)
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  The digital joining workflow and automated Form-5 dossier submission become active once a candidate has completed registration, attended the interview, and selected their company choice.
                </p>
              </div>
            </div>

            {/* Joining Procedure Roadmap */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                Official Joining Protocol (Registration Form - 5)
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                Before reporting to company premises, every candidate must submit original documents for verification at the Nagpur office during official office hours (11:00 AM – 4:00 PM).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
                {documentChecklist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--color-pearl-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Required</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zero Tolerance Warning */}
            <div style={{
              background: 'var(--color-dusty-rose-light)',
              border: '1px solid rgba(237, 166, 163, 0.6)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: 'var(--space-8)'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-dusty-rose-dark)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                <ShieldAlert size={18} />
                <span>Statutory Compliance Notice</span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                If any candidate or worker is found working after submitting forged or fraudulent documents, disciplinary and legal action will be initiated immediately. Child labour is strictly prohibited.
              </p>
            </div>

            {/* Phase 2 Candidate Status Lookup Shell */}
            <div style={{
              background: 'var(--color-pearl-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              border: '1px solid var(--color-border)',
              marginBottom: 'var(--space-8)'
            }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem' }}>
                Check Application / Joining Status (Coming in Phase 2)
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Candidates will be able to enter their registered mobile number or Registration ID to track joining status, verify KYC documents, and download their company reporting pass.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <input
                  type="text"
                  placeholder="Enter 10-digit mobile number"
                  disabled
                  className="form-control"
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
                <Button disabled variant="navy" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                  Lookup
                </Button>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Button to="/enquiry" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                NEW CANDIDATE? SUBMIT ENQUIRY
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};
