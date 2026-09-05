import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const AboutPreview: React.FC = () => {
  return (
    <section className="section" id="about-preview">
      <Container size="xl">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-12)',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-10)',
            alignItems: 'center'
          }} className="about-preview-inner">
            <style>{`
              @media (min-width: 992px) {
                .about-preview-inner {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>

            {/* Left: Asymmetric Editorial Visual */}
            <ScrollReveal direction="left">
              <div style={{ position: 'relative' }}>
                <div style={{
                  borderRadius: 'var(--radius-2xl)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--color-border)'
                }}>
                  <img
                    src="/assets/about_operations.jpg"
                    alt="A Tiger Global professional workforce operations and recruitment planning meeting"
                    className="about-preview-image"
                    loading="lazy"
                  />
                </div>

                {/* Floating Metric Badge */}
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  background: 'rgba(25, 42, 86, 0.94)',
                  backdropFilter: 'blur(8px)',
                  color: 'var(--color-pearl-white)',
                  padding: '1rem 1.4rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(247, 215, 148, 0.4)',
                  boxShadow: 'var(--shadow-navy)'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-champagne)', lineHeight: 1 }}>
                    800+
                  </div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Candidates Placed
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Editorial Narrative */}
            <ScrollReveal direction="right">
              <div>
                <span className="eyebrow">Enterprise Profile</span>
                <h2 style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3rem)', lineHeight: 1.15, marginBottom: 'var(--space-6)' }}>
                  MORE THAN RECRUITMENT.
                </h2>

                <p style={{ fontSize: 'var(--text-lg)', lineHeight: 1.65, color: 'var(--color-midnight-navy)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
                  A Tiger Global Career Solution & Consultancy works at the intersection of people and business — helping candidates discover opportunities while helping organizations access the manpower they need.
                </p>

                <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
                  Based in Nagpur, Maharashtra, our proprietorship operations bridge the employment divide across Central India. With over <strong>800+ people placed</strong> and <strong>400+ active employees</strong> deployed across <strong>3 states</strong>, we combine personalized candidate guidance with industrial-grade compliance, verification, and reliable workforce management.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Transparent ₹1,000 Model</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>3-Company Selection Choice</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Rigorous KYC Verification</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Full Statutory Compliance</span>
                  </div>
                </div>

                <div>
                  <Button to="/about" variant="navy" size="lg" icon={<ArrowRight size={18} />}>
                    ABOUT A TIGER GLOBAL
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </Container>
    </section>
  );
};
