import React from 'react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { ScrollReveal } from '../common/ScrollReveal';
import { PARTNER_ORGANIZATIONS } from '../../data/partnersData';

export const TrustedEmployers: React.FC = () => {
  return (
    <section className="section section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Container size="xl">
        <SectionHeading
          eyebrow="Corporate Partnerships"
          title="TRUSTED BY BUSINESSES"
          subtitle="Building workforce relationships with established organizations."
        />

        <div className="partner-grid">
          {PARTNER_ORGANIZATIONS.map((partner, index) => (
            <ScrollReveal key={partner.id} delay={index * 0.1} direction="up">
              <div className="partner-card">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="partner-logo-img"
                  loading="lazy"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', fontWeight: 500 }}>
                  {partner.name}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
};
