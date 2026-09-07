import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Award, MapPin } from 'lucide-react';
import { Container } from '../components/common/Container';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { StatCounter } from '../components/common/StatCounter';
import { PARTNER_ORGANIZATIONS } from '../data/partnersData';

export const About: React.FC = () => {
  useEffect(() => {
    document.title = "About Us | A Tiger Group's";
  }, []);

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Page Header */}
      <section className="section section-pearl" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '3.5rem' }}>
        <Container size="xl">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <span className="eyebrow">Enterprise Overview</span>
            <h1 style={{ marginBottom: 'var(--space-4)' }}>
              ABOUT A Tiger Group's
            </h1>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              A diversified parent enterprise headquartered in Nagpur, operating across Central India encompassing Career Solutions & Consultancy, Manpower Supply & Security Services, InfraBuild Properties, Footwear, and Fashion.
            </p>
          </div>
        </Container>
      </section>

      {/* Stats Bar */}
      <section className="stats-section">
        <Container size="xl">
          <div className="stats-grid">
            <StatCounter value={800} suffix="+" label="People Placed" />
            <StatCounter value={400} suffix="+" label="Active Employees" />
            <StatCounter value={5} label="Business Verticals" />
            <StatCounter value={3} suffix="+" label="States Served" />
          </div>
        </Container>
      </section>

      {/* Company Story & Identity */}
      <section className="section">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="about-grid">
            <style>{`
              @media (min-width: 992px) {
                .about-grid {
                  grid-template-columns: 1.1fr 0.9fr !important;
                }
              }
            `}</style>

            <ScrollReveal direction="left">
              <div>
                <span className="eyebrow">Who We Are</span>
                <h2 style={{ marginBottom: 'var(--space-5)' }}>
                  A Diversified Commercial Ecosystem in Central India.
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                  <strong>A Tiger Group's</strong> operates as a registered enterprise headquartered in Nagpur, Maharashtra. The group manages five specialized commercial verticals spanning recruitment consultancy, industrial manpower contracting, real estate brokerage, and lifestyle retail.
                </p>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Anchored by its cornerstone consultancy — <strong>A Tiger Global Career Solution & Consultancy</strong> — the group enforces formal operating standards: thorough document screening, child labour prevention, statutory PF/ESIC compliance, transparent terms, and direct coordination with leading industrial employers.
                </p>

                <div style={{
                  background: 'var(--color-pearl-surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  border: '1px solid var(--color-border)',
                  marginBottom: 'var(--space-8)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-midnight-navy)', fontWeight: 700 }}>
                    <MapPin size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                    <span>Registered Business Office</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur, Maharashtra — 440035.<br />
                    Official Office Hours: 11:00 AM to 4:00 PM.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <Button to="/businesses" variant="primary" icon={<ArrowRight size={16} />}>
                    EXPLORE BUSINESSES
                  </Button>
                  <Button to="/contact" variant="outline">
                    CONTACT US
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Image */}
            <ScrollReveal direction="right">
              <div style={{
                borderRadius: 'var(--radius-2xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)',
                position: 'relative'
              }}>
                <img
                  src="/assets/about_operations.jpg"
                  alt="A Tiger Global professional recruitment and consultation center"
                  className="about-preview-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Mission & Vision Cards */}
      <section className="section section-pearl">
        <Container size="xl">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
            <div className="card">
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-champagne-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-midnight-navy)',
                marginBottom: 'var(--space-4)',
                border: '1px solid rgba(247, 215, 148, 0.6)'
              }}>
                <Award size={24} />
              </div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Our Mission</h3>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                To connect candidates with legitimate, dignified career opportunities through ethical screening, transparent guidance, and strict adherence to statutory welfare, while furnishing enterprises with vetted, disciplined workforces.
              </p>
            </div>

            <div className="card">
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-champagne-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-midnight-navy)',
                marginBottom: 'var(--space-4)',
                border: '1px solid rgba(247, 215, 148, 0.6)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Our Vision</h3>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                To serve as Central India’s benchmark recruitment and workforce contracting partner — distinguished by uncompromising KYC integrity, compliance transparency, and long-term client retention.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Why Businesses Work With Us & Why Candidates Choose Us */}
      <section className="section">
        <Container size="xl">
          <SectionHeading
            eyebrow="Dual Commitment"
            title="A Tiger Group's ADVANTAGE"
            subtitle="Built on structured accountability for both employers and prospective employees."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
            {/* For Businesses */}
            <div className="card card-navy" style={{ padding: 'var(--space-8)' }}>
              <span className="eyebrow eyebrow-navy" style={{ marginBottom: 'var(--space-4)' }}>
                Enterprise Assurance
              </span>
              <h3 style={{ color: 'var(--color-pearl-white)', marginBottom: 'var(--space-4)' }}>
                Why Businesses Work With Us
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-champagne)', flexShrink: 0 }} />
                  <span><strong>Comprehensive Background Screening:</strong> Legal, civil, and police verification procedures completed prior to onboarding.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-champagne)', flexShrink: 0 }} />
                  <span><strong>Statutory Compliance:</strong> Complete coordination for PF and ESIC registration support.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-champagne)', flexShrink: 0 }} />
                  <span><strong>Flexible Scaling:</strong> Ability to supply 10 to 100+ vetted personnel for seasonal peaks or shifts.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-champagne)', flexShrink: 0 }} />
                  <span><strong>Zero Child Labour:</strong> Absolute compliance with statutory labor laws and age verification.</span>
                </li>
              </ul>
            </div>

            {/* For Candidates */}
            <div className="card" style={{ padding: 'var(--space-8)' }}>
              <span className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
                Candidate Assurance
              </span>
              <h3 style={{ color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-4)' }}>
                Why Candidates Choose Us
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0 }} />
                  <span><strong>Choice of Three Companies:</strong> During interviews, candidates are presented with options across 3 verified organizations.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0 }} />
                  <span><strong>Transparent Fee Structure:</strong> Clearly stated ₹1,000 consultancy fee (₹500 at registration, ₹500 from 1st month salary).</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0 }} />
                  <span><strong>No Fee at Placement Company:</strong> Joining the referred company is completely free of charge.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0 }} />
                  <span><strong>Direct Redressal & Help:</strong> Immediate support and escalation channels for any workplace grievances.</span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Partner Organizations */}
      <section className="section section-pearl">
        <Container size="xl">
          <SectionHeading
            eyebrow="Key Relationships"
            title="ESTABLISHED EMPLOYER ALLIANCES"
            subtitle="A Tiger Global maintains established recruitment and workforce contracting relationships with leading manufacturing and FMCG organizations."
          />

          <div className="partner-grid">
            {PARTNER_ORGANIZATIONS.map((partner) => (
              <div key={partner.id} className="partner-card">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="partner-logo-img"
                  loading="lazy"
                />
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                  {partner.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {partner.category}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
};
