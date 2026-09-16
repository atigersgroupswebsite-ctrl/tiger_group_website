import React from 'react';
import { ArrowRight, PhoneCall, ShieldCheck, Clock, Users } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const EmployerCTA: React.FC = () => {
  return (
    <section className="section section-navy employer-cta-section">
      {/* Decorative Gold Glow */}
      <div className="employer-cta-glow" aria-hidden="true" />

      <Container size="xl">
        <div className="employer-cta-grid">
          <ScrollReveal direction="left">
            <div>
              <span className="eyebrow eyebrow-navy" style={{ marginBottom: 'var(--space-4)' }}>
                Enterprise Workforce Contracting
              </span>
              <h2 className="employer-cta-title">
                NEED A RELIABLE WORKFORCE?
              </h2>
              <p className="employer-cta-desc">
                Tell us what your business needs. We'll help you connect with vetted, dependable industrial labour, technical operators, and facility security personnel tailored to your operational shifts.
              </p>

              <div className="employer-cta-actions">
                <Button to="/enquiry/employer" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                  SUBMIT MANPOWER REQUIREMENT
                </Button>
                <Button to="/contact" variant="outline-light" size="lg" icon={<PhoneCall size={18} />}>
                  CONTACT OUR TEAM
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {/* Quick Metrics & Badges */}
          <ScrollReveal direction="right">
            <div className="employer-cta-card">
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(247, 215, 148, 0.15)', color: 'var(--color-champagne)' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--color-pearl-white)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                    100% KYC & Background Vetted
                  </h4>
                  <p style={{ color: 'var(--color-text-inverse-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Legal, civil, and police background verifications carried out prior to reporting.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(247, 215, 148, 0.15)', color: 'var(--color-champagne)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--color-pearl-white)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                    Rapid Scalability & Deployment
                  </h4>
                  <p style={{ color: 'var(--color-text-inverse-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Flexible workforce scaling for seasonal demand surges and multi-shift rosters.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(247, 215, 148, 0.15)', color: 'var(--color-champagne)' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--color-pearl-white)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                    Prompt Response & Local Support
                  </h4>
                  <p style={{ color: 'var(--color-text-inverse-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Direct desk support based in Nagpur servicing Maharashtra, MP, and CG.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
};
