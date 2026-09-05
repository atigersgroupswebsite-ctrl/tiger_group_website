import React from 'react';
import { ArrowRight, Briefcase, Users, ShieldCheck } from 'lucide-react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { ScrollReveal } from '../common/ScrollReveal';
import { Button } from '../common/Button';

export const ServicesOverview: React.FC = () => {
  const services = [
    {
      id: 'placement',
      tag: 'Candidate Placement',
      title: 'Job Placement Consultancy',
      description: 'Connect candidates with employment opportunities suited to their profile, skills, and aspirations while conducting ethical interview procedures.',
      icon: <Briefcase size={26} />,
      image: '/assets/service_consultancy.jpg',
      ctaText: 'Explore Placement',
      link: '/services#placement'
    },
    {
      id: 'manpower',
      tag: 'Workforce Contracting',
      title: 'Labour & Manpower Supply',
      description: 'Provide end-to-end workforce solutions based on business requirements, factory operations, logistics loading, and specialized industrial shifts.',
      icon: <Users size={26} />,
      image: '/assets/service_manpower.jpg',
      ctaText: 'Explore Manpower',
      link: '/services#manpower'
    },
    {
      id: 'security',
      tag: 'Facility Protection',
      title: 'Security Guard Supply',
      description: 'Provide disciplined, verified security manpower for manufacturing units, commercial facilities, and institutions requiring dependable vigilance.',
      icon: <ShieldCheck size={26} />,
      image: '/assets/service_security.jpg',
      ctaText: 'Explore Security',
      link: '/services#security'
    }
  ];

  return (
    <section className="section" id="services-overview">
      <Container size="xl">
        <SectionHeading
          eyebrow="Core Competencies"
          title="WHAT WE DO"
          subtitle="Specialized workforce and placement solutions tailored for candidates and enterprises across Central India."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
          {services.map((service, index) => (
            <ScrollReveal key={service.id} delay={index * 0.15} direction="up">
              <div className="service-card">
                <div className="service-card-media">
                  <img src={service.image} alt={service.title} loading="lazy" />
                  <span className="service-card-tag">{service.tag}</span>
                </div>

                <div className="service-card-body">
                  <div className="service-card-icon">
                    {service.icon}
                  </div>

                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-text">{service.description}</p>

                  <div className="service-card-footer">
                    <Button to={service.link} variant="outline" size="sm" icon={<ArrowRight size={14} />}>
                      {service.ctaText}
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
