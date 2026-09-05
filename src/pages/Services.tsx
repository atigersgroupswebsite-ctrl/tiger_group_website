import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const Services: React.FC = () => {
  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Header */}
      <section className="section section-pearl" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '3.5rem' }}>
        <Container size="xl">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <span className="eyebrow">Enterprise Solutions</span>
            <h1 style={{ marginBottom: 'var(--space-4)' }}>
              OUR PRIMARY SERVICES
            </h1>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              Comprehensive recruitment consultancy, specialized industrial manpower supply, and vigilant security personnel contracting across Central India.
            </p>
          </div>
        </Container>
      </section>

      {/* Service 1: Job Placement Consultancy */}
      <section className="section" id="placement">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid">
            <style>{`
              @media (min-width: 992px) {
                .service-detail-grid {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>

            <ScrollReveal direction="left">
              <div>
                <span className="eyebrow">Service 01</span>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  Job Placement Consultancy
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  We bridge the gap between job seekers and established industrial employers across Maharashtra, Madhya Pradesh, and Chhattisgarh. Our placement procedure provides candidates with structured interview opportunities, verified credentials, and genuine career pathways.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Ideal Use Case
                  </h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    Individuals (freshers or experienced) seeking verified positions in production plants, warehouse operations, packaging units, and commercial establishments.
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Placement Process
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>01. Registration & Document Review:</strong> Submit application and original KYC documents at our Nagpur office (11:00 AM – 4:00 PM).</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>02. Three-Company Choice:</strong> Candidates are provided options across 3 partner companies during interview selection.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>03. Transparent Fee Structure:</strong> ₹500 at registration; remaining ₹500 deducted post-1st month work via company coordination.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>04. Direct Joining:</strong> Free of charge joining at the referred company premises.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/jobs" variant="primary" icon={<ArrowRight size={16} />}>
                  BROWSE CURRENT OPENINGS
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/service_consultancy.jpg"
                  alt="Job placement consultancy interview session"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Service 2: Labour & Manpower Supply */}
      <section className="section section-pearl" id="manpower">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid-reverse">
            <style>{`
              @media (min-width: 992px) {
                .service-detail-grid-reverse {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>

            <ScrollReveal direction="left">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/service_manpower.jpg"
                  alt="Industrial manufacturing and warehouse manpower supply"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div>
                <span className="eyebrow">Service 02</span>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  Labour & Manpower Supply
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Providing structured workforce contracting for industrial plants, logistics warehouses, processing mills, and assembly units. We handle workforce sourcing, shift deployment, attendance rosters, and compliance administration.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Ideal Use Case
                  </h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    Food & snacks manufacturing, glass processing, logistics loading/unloading, mechanical assembly lines, and seasonal production surges.
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Key Enterprise Benefits
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Complete Background Verification:</strong> Police, civil, and identity checking for every deployed worker.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Statutory PF / ESIC Administration:</strong> Systematic compliance with Indian labour regulations.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Multi-Shift Flexibility:</strong> Rotational shift staffing with dedicated on-site supervisor coordination.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/enquiry/employer" variant="navy" icon={<ArrowRight size={16} />}>
                  REQUEST MANPOWER QUOTE
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Service 3: Security Guard Supply */}
      <section className="section section-surface" id="security">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid">
            <ScrollReveal direction="left">
              <div>
                <span className="eyebrow">Service 03</span>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  Security Guard Supply
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Deploying disciplined, physically fit, and thoroughly verified security personnel for industrial perimeters, commercial complexes, corporate offices, and logistics hubs.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Security Standards
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Vetted Personnel:</strong> Strict height, fitness, and verified police background checks.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Professional Uniforms & Gear:</strong> Standardized badges, logs, and perimeter discipline.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Supervisor Audits:</strong> Periodic unannounced shift inspections to ensure alert performance.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/enquiry/employer" variant="primary" icon={<ArrowRight size={16} />}>
                  HIRE SECURITY GUARDS
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/service_security.jpg"
                  alt="Professional facility security guard supply"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>
    </main>
  );
};
