import React from 'react';
import { ArrowRight, Briefcase, Users, Building, ShoppingBag, Sparkles } from 'lucide-react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { ScrollReveal } from '../common/ScrollReveal';
import { Button } from '../common/Button';
import { BUSINESS_VERTICALS } from '../../types';

export const ServicesOverview: React.FC = () => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'career-solutions':
        return <Briefcase size={24} />;
      case 'manpower-security':
        return <Users size={24} />;
      case 'infrabuild-properties':
        return <Building size={24} />;
      case 'footwear-store':
        return <ShoppingBag size={24} />;
      case 'fashion-hub':
        return <Sparkles size={24} />;
      default:
        return <Briefcase size={24} />;
    }
  };

  return (
    <section className="section" id="business-verticals">
      <Container size="xl">
        <SectionHeading
          eyebrow="A Tiger Group's ECOSYSTEM"
          title="BUSINESS VERTICALS"
          subtitle="Five specialized commercial ventures operating under the parent group across career solutions, industrial contracting, real estate, and lifestyle retail."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
          {BUSINESS_VERTICALS.map((vertical, index) => (
            <ScrollReveal key={vertical.id} delay={index * 0.1} direction="up">
              <div className="service-card">
                <div className="service-card-media">
                  <img src={vertical.image} alt={vertical.name} loading="lazy" />
                  <span className="service-card-tag">{vertical.verticalNumber}</span>
                </div>

                <div className="service-card-body">
                  <div className="service-card-icon">
                    {getIcon(vertical.id)}
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-champagne-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                    {vertical.categoryTag}
                    {vertical.associatedWith && ` • ${vertical.associatedWith}`}
                  </div>

                  <h3 className="service-card-title" style={{ fontSize: '1.2rem', minHeight: '3.2rem' }}>
                    {vertical.name}
                  </h3>
                  <p className="service-card-text">{vertical.description}</p>

                  <div className="service-card-footer">
                    <Button to={vertical.ctaLink} variant="outline" size="sm" icon={<ArrowRight size={14} />}>
                      {vertical.ctaText}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
};
