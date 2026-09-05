import { UserPlus, Building } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const FinalCTA: React.FC = () => {
  return (
    <section className="section" style={{ background: 'linear-gradient(180deg, #FAF7EE 0%, #FCFBFB 100%)' }}>
      <Container size="lg">
        <ScrollReveal direction="up">
          <div style={{
            textAlign: 'center',
            padding: 'clamp(3rem, 6vw, 5rem) var(--space-8)',
            borderRadius: 'var(--radius-2xl)',
            background: 'var(--color-pearl-white)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle Accent Glow */}
            <div style={{
              position: 'absolute',
              top: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '300px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(247, 215, 148, 0.35) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <span className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
              Next Steps
            </span>

            <h2 style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              lineHeight: 1.15,
              fontWeight: 800,
              color: 'var(--color-midnight-navy)',
              marginBottom: 'var(--space-4)'
            }}>
              YOUR NEXT OPPORTUNITY<br />STARTS HERE.
            </h2>

            <p style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--color-text-secondary)',
              maxWidth: '560px',
              margin: '0 auto var(--space-8)',
              lineHeight: 1.6
            }}>
              Whether you're looking for work or building a workforce, A Tiger Global is here to help you move forward.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-4)' }}>
              <Button to="/jobs" variant="primary" size="lg" icon={<UserPlus size={18} />}>
                I'M LOOKING FOR WORK
              </Button>
              <Button to="/employers" variant="navy" size="lg" icon={<Building size={18} />}>
                I NEED MANPOWER
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
};
