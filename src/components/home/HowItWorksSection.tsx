import React from 'react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { ScrollReveal } from '../common/ScrollReveal';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'EXPLORE',
      subtitle: 'Find an opportunity.',
      desc: 'Browse current vacancies across manufacturing, security, and industrial helper domains suited to your qualifications.'
    },
    {
      number: '02',
      title: 'APPLY',
      subtitle: 'Submit your details.',
      desc: 'Complete the verified candidate registration with basic personal, educational, and identity verification credentials.'
    },
    {
      number: '03',
      title: 'INTERVIEW',
      subtitle: 'Complete the required process.',
      desc: 'During your interview, we offer you a choice of three verified employer companies to select the best match.'
    },
    {
      number: '04',
      title: 'JOIN',
      subtitle: 'Complete joining formalities.',
      desc: 'Finalize official joining forms, complete background verification, and commence your structured employment journey.'
    }
  ];

  return (
    <section className="section section-pearl" id="how-it-works">
      <Container size="xl">
        <SectionHeading
          eyebrow="Candidate Roadmap"
          title="HOW IT WORKS"
          subtitle="A clear, transparent four-step pathway from registration to active workplace deployment."
        />

        <div className="steps-grid">
          {steps.map((step, index) => (
            <ScrollReveal key={step.number} delay={index * 0.12} direction="up">
              <div className="journey-step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-heading">{step.title}</h3>
                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-champagne-dark)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {step.subtitle}
                </h4>
                <p className="step-desc">{step.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
};
