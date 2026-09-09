import React from 'react';
import { ArrowRight, UserCheck } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const AlreadyRegisteredCTA: React.FC = () => {
  return (
    <section style={{ backgroundColor: '#FAF7EE', padding: '2.25rem 0', borderTop: '1px solid #E2DFD8', borderBottom: '1px solid #E2DFD8' }}>
      <Container size="xl">
        <ScrollReveal direction="up" delay={0.1}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2DFD8',
              padding: '1.75rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
              boxShadow: '0 4px 12px rgba(25, 42, 86, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(25, 42, 86, 0.06)',
                  color: '#192A56',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <UserCheck size={24} color="#C59B27" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C59B27', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Candidate Onboarding Gateway
                </div>
                <h3
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#192A56',
                    margin: '0 0 0.25rem 0'
                  }}
                >
                  ALREADY REGISTERED?
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                  Complete your joining process using your registered email.
                </p>
              </div>
            </div>

            <div>
              <Button to="/joining" variant="primary" size="md" icon={<ArrowRight size={16} />}>
                ACCESS JOINING FORM →
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
};
