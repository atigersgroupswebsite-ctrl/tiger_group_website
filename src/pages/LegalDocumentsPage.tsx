import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';
import { Container } from '../components/common/Container';
import { REGISTRATION_ITEMS } from '../data/complianceData';

export const LegalDocumentsPage: React.FC = () => {
  useEffect(() => {
    document.title = "Legal Documents | TIGER GROUPS";
  }, []);

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh', paddingBottom: '5rem' }}>
      {/* Page Header */}
      <section className="section-sm section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Container size="md">
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-midnight-navy)',
              marginBottom: 'var(--space-4)'
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Homepage</span>
          </Link>

          <div style={{ textAlign: 'center' }}>
            <span className="eyebrow">Statutory Business Records</span>
            <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: 'var(--space-2)' }}>
              LEGAL DOCUMENTS
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              Information about A Tiger's registrations and statutory business records.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="section-sm">
        <Container size="md">
          <div className="policy-card">
            {/* Header info bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid var(--color-midnight-navy)',
                paddingBottom: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-champagne-dark)', textTransform: 'uppercase' }}>
                  TIGER GROUPS
                </span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--color-midnight-navy)', margin: '0.15rem 0 0 0' }}>
                  A TIGER GLOBAL Career Solution & Consultancy
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Headquarters: Nagpur, Maharashtra • Statutory Compliance Registry
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-navy">Statutory Business Records</span>
              </div>
            </div>

            {/* Registrations List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {REGISTRATION_ITEMS.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(25, 42, 86, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5) var(--space-6)',
                    boxShadow: '0 2px 8px rgba(25, 42, 86, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-champagne-dark)', textTransform: 'uppercase' }}>
                        RECORD 0{item.cardNumber} • {item.documentType}
                      </span>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0.2rem 0 0 0' }}>
                        {item.title}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-midnight-navy)', background: 'rgba(25, 42, 86, 0.05)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--color-champagne-dark)' }} />
                      <span>{item.validityStatus || 'Active'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', margin: 'var(--space-4) 0' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        {item.entityLabel}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                        {item.entityName}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        {item.referenceLabel}
                      </span>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--color-midnight-navy)',
                        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                        letterSpacing: '0.04em',
                        wordBreak: 'break-all',
                        background: 'rgba(25, 42, 86, 0.04)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {item.registrationReference}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        Issuing Authority
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        {item.authority}
                      </span>
                    </div>

                    {item.businessActivity && (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                          Business Activity
                        </span>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                          {item.businessActivity}
                        </span>
                      </div>
                    )}

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        Jurisdiction
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        {item.jurisdiction}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, borderTop: '1px solid rgba(25, 42, 86, 0.05)', paddingTop: 'var(--space-3)' }}>
                    <strong>Statutory Scope:</strong> {item.legalScope}
                  </p>
                </div>
              ))}
            </div>

            {/* Privacy & Compliance Verification Notice */}
            <div
              style={{
                marginTop: 'var(--space-8)',
                padding: 'var(--space-5) var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(25, 42, 86, 0.03)',
                border: '1px solid rgba(25, 42, 86, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', fontSize: 'var(--text-sm)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                <span>Statutory Privacy & Verification Standards</span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
                In strict compliance with statutory regulations and digital security guidelines, complete certificate scans and sensitive proprietor identifiers (including PAN, Aadhaar, and private contact records) are retained in protected internal storage. Legitimate enterprise clients and statutory authorities may review official verified physical files during formal compliance audits at our registered Nagpur business headquarters.
              </p>
            </div>

            {/* Related Legal Links */}
            <div
              style={{
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-5)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: 'var(--text-xs)'
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <Link to="/policy#terms" style={{ color: 'var(--color-midnight-navy)', fontWeight: 600 }}>
                  Terms & Conditions
                </Link>
                <Link to="/policy#consultancy" style={{ color: 'var(--color-midnight-navy)', fontWeight: 600 }}>
                  Consultancy Policy
                </Link>
                <Link to="/policy#privacy" style={{ color: 'var(--color-midnight-navy)', fontWeight: 600 }}>
                  Privacy Policy
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)' }}>
                <Building2 size={13} />
                <span>Nagpur, Maharashtra — 440035</span>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};

export default LegalDocumentsPage;
