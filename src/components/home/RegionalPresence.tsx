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
            <div className="regional-hub-card">
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

              {/* Regional Map Diagram with Scoped Horizontal Swipe Container */}
              <div
                className="regional-diagram-scroll-wrapper"
                role="region"
                aria-label="Central India operational corridor diagram"
                tabIndex={0}
              >
                <div className="regional-diagram-track">
                  <div className="regional-diagram-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-champagne)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nagpur Headquarters</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-champagne)' }}>Central Operations</span>
                  </div>

                  <div className="regional-diagram-grid">
                    <div className="regional-state-box">
                      <div className="regional-state-code">MH</div>
                      <div className="regional-state-name">Maharashtra</div>
                      <div className="regional-state-hub">Nagpur &amp; Vidarbha Hub</div>
                    </div>
                    <div className="regional-state-box">
                      <div className="regional-state-code">MP</div>
                      <div className="regional-state-name">Madhya Pradesh</div>
                      <div className="regional-state-hub">Indore / Bhopal Belt</div>
                    </div>
                    <div className="regional-state-box">
                      <div className="regional-state-code">CG</div>
                      <div className="regional-state-name">Chhattisgarh</div>
                      <div className="regional-state-hub">Raipur / Bilaspur Belt</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="regional-scroll-hint" aria-hidden="true">
                <span>← Swipe horizontally to view full corridor →</span>
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
