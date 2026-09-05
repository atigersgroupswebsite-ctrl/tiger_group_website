import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from '../components/common/Container';
import { OFFICIAL_POLICY_TERMS } from '../data/policyData';

export const Policy: React.FC = () => {
  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh', paddingBottom: '5rem' }}>
      {/* Header */}
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
            <span className="eyebrow">Client Document Record</span>
            <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: 'var(--space-2)' }}>
              POLICY — TERMS & CONDITIONS
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '620px', margin: '0 auto' }}>
              Official terms and conditions provided by A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Document Body */}
      <section className="section-sm">
        <Container size="md">
          <div className="policy-card">
            {/* Header info bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid var(--color-midnight-navy)',
              paddingBottom: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-midnight-navy)', margin: 0 }}>
                  A TIGER GLOBAL
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Career Solution & Consultancy • Nagpur, Maharashtra
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-navy">Official Business Terms</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={14} /> Print Document
                </button>
              </div>
            </div>

            {/* List of 10 items */}
            <div>
              {OFFICIAL_POLICY_TERMS.map((item) => (
                <div key={item.number} className="policy-item">
                  <div className="policy-item-number">{item.number}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-midnight-navy)', marginBottom: '0.25rem' }}>
                      {item.title}
                    </h4>
                    <p className="policy-item-text" style={{ margin: 0 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notice Footer */}
            <div style={{
              marginTop: 'var(--space-8)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6
            }}>
              <p>
                <strong>Important Notice:</strong> These terms represent the client-provided operating policy of A Tiger Global Career Solution and Consultancy, Nagpur, MH. All candidates and employer partners are advised to review and adhere to these statutory conditions.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};
