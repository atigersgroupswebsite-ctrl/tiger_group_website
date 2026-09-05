import React from 'react';
import { ArrowRight, PhoneCall, ShieldCheck, Clock, Users } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const EmployerCTA: React.FC = () => {
  return (
    <section className="section section-navy" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Gold Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '-5%',
        transform: 'translateY(-50%)',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(247, 215, 148, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <Container size="xl">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-10)',
          alignItems: 'center'
        }} className="employer-cta-grid">
          <style>{`
            @media (min-width: 992px) {
              .employer-cta-grid {
                grid-template-columns: 1.2fr 0.8fr !important;
              }
            }
          `}</style>

          <ScrollReveal direction="left">
            <div>
              <span className="eyebrow eyebrow-navy" style={{ marginBottom: 'var(--space-4)' }}>
                Enterprise Workforce Contracting
              </span>
              <h2 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.25rem)', color: 'var(--color-pearl-white)', marginBottom: 'var(--space-4)', lineHeight: 1.15 }}>
                NEED A RELIABLE WORKFORCE?
              </h2>
              <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-inverse-muted)', lineHeight: 1.65, marginBottom: 'var(--space-8)', maxWidth: '580px' }}>
                Tell us what your business needs. We'll help you connect with vetted, dependable industrial labour, technical operators, and facility security personnel tailored to your operational shifts.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
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
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(247, 215, 148, 0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-5)'
            }}>
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
