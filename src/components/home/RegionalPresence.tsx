import { ShieldCheck, Factory } from 'lucide-react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { ScrollReveal } from '../common/ScrollReveal';

export const RegionalPresence: React.FC = () => {
  return (
    <section className="section" id="regional-presence">
      <Container size="xl">
        <SectionHeading
          eyebrow="Focused Geography"
          title="SERVING CENTRAL INDIA"
          subtitle="Connecting people and businesses across three growing markets."
        />

        <div className="regional-grid">
          {/* Left: Interactive Regional Visual Representation */}
          <ScrollReveal direction="left">
            <div style={{
              background: 'linear-gradient(145deg, #192A56 0%, #101C3A 100%)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(2rem, 4vw, 3rem)',
              color: 'var(--color-pearl-white)',
              border: '1px solid rgba(247, 215, 148, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <span className="eyebrow eyebrow-navy" style={{ marginBottom: 'var(--space-2)' }}>
                  Operational Hub • Nagpur, MH
                </span>
                <h3 style={{ color: 'var(--color-pearl-white)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                  Strategic Tri-State Corridor
                </h3>
                <p style={{ color: 'var(--color-text-inverse-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                  Centrally headquartered in Nagpur, Maharashtra, A Tiger Global operates directly across key industrial and urban corridors in Maharashtra, Madhya Pradesh, and Chhattisgarh.
                </p>
              </div>

              {/* Regional Map Diagram */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                border: '1px solid rgba(247, 215, 148, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-champagne)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nagpur Headquarters</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-champagne)' }}>Central Operations</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(25, 42, 86, 0.6)', padding: '0.8rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(247, 215, 148, 0.3)' }}>
                    <div style={{ color: 'var(--color-champagne)', fontWeight: 800, fontSize: '1.1rem' }}>MH</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-pearl-white)', fontWeight: 600 }}>Maharashtra</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-inverse-muted)' }}>Nagpur & Vidarbha Hub</div>
                  </div>
                  <div style={{ background: 'rgba(25, 42, 86, 0.6)', padding: '0.8rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(247, 215, 148, 0.3)' }}>
                    <div style={{ color: 'var(--color-champagne)', fontWeight: 800, fontSize: '1.1rem' }}>MP</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-pearl-white)', fontWeight: 600 }}>Madhya Pradesh</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-inverse-muted)' }}>Indore / Bhopal Belt</div>
                  </div>
                  <div style={{ background: 'rgba(25, 42, 86, 0.6)', padding: '0.8rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(247, 215, 148, 0.3)' }}>
                    <div style={{ color: 'var(--color-champagne)', fontWeight: 800, fontSize: '1.1rem' }}>CG</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-pearl-white)', fontWeight: 600 }}>Chhattisgarh</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-inverse-muted)' }}>Raipur / Bilaspur Belt</div>
                  </div>
                </div>
              </div>

              {/* Compliance & Regional Delivery Note */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-pearl-white)' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-champagne)' }} />
                  <span>State Labor Law Compliant</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-pearl-white)' }}>
                  <Factory size={16} style={{ color: 'var(--color-champagne)' }} />
                  <span>Direct Industrial Deployment</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Detailed State Highlights */}
          <div className="state-cards-grid">
            <ScrollReveal direction="up" delay={0.1}>
              <div className="state-card">
                <div className="state-flag-accent" />
                <h4>Maharashtra</h4>
                <p>Primary headquarters in Nagpur. Industrial corridors, FMCG packaging, manufacturing facilities, and security guard deployment.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <div className="state-card">
                <div className="state-flag-accent" />
                <h4>Madhya Pradesh</h4>
                <p>Workforce placement for production units, warehouse logistics, packaging helpers, and technical industrial assistance.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <div className="state-card">
                <div className="state-flag-accent" />
                <h4>Chhattisgarh</h4>
                <p>Industrial staffing, security personnel, glass and fabrication helpers, and continuous-shift plant operations.</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </Container>
    </section>
  );
};
