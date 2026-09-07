import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Briefcase, Users, Building, ShoppingBag, Sparkles } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const Businesses: React.FC = () => {
  useEffect(() => {
    document.title = "Business Verticals | TIGER GROUPS";
  }, []);

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Header */}
      <section className="section section-pearl" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '3.5rem' }}>
        <Container size="xl">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <span className="eyebrow">Enterprise Ecosystem</span>
            <h1 style={{ marginBottom: 'var(--space-4)' }}>
              TIGER GROUPS BUSINESS VERTICALS
            </h1>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              A diversified portfolio of five specialized commercial ventures operating across career placement, industrial contracting, real estate development, and consumer retail.
            </p>
          </div>
        </Container>
      </section>

      {/* Vertical 01: Career Solution & Consultancy */}
      <section className="section" id="careers">
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
                .service-detail-grid-reverse {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>

            <ScrollReveal direction="left">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
                  <Briefcase size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>VERTICAL 01</span>
                </div>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  A TIGER GLOBAL<br />CAREER SOLUTION & CONSULTANCY
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Job placement consultancy and career-related recruitment services connecting candidate talent with verified regional employers across Maharashtra, Madhya Pradesh, and Chhattisgarh.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Core Services
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Verified Employer Placement:</strong> Partnered roles with Haldiram's, Signet Group, and Geeta Glass.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Candidate Choice:</strong> 3-company selection offered during personalized consultation.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Transparent ₹1,000 Structure:</strong> ₹500 upon registration and ₹500 post first month salary.</span>
                    </li>
                  </ul>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <Button to="/careers" variant="primary" icon={<ArrowRight size={16} />}>
                    EXPLORE CAREER SOLUTIONS
                  </Button>
                  <Button to="/enquiry/job-seeker" variant="outline" icon={<ArrowRight size={16} />}>
                    START JOB ENQUIRY
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/service_consultancy.jpg"
                  alt="A Tiger Global Career Solution and Consultancy interview session"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Vertical 02: Manpower Supply and Security Services */}
      <section className="section section-pearl" id="manpower">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid-reverse">
            <ScrollReveal direction="left">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/service_manpower.jpg"
                  alt="A Tiger Manpower Supply and Security Services industrial plant workforce"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
                  <Users size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>VERTICAL 02 • LABOUR CONTRACTOR</span>
                </div>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  A TIGER MANPOWER SUPPLY<br />AND SECURITY SERVICES
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Providing structured workforce contracting, industrial labour solutions, and disciplined security personnel for manufacturing plants, processing mills, warehouses, and commercial complexes.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Staffing Capabilities
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Industrial Labour Contracting:</strong> Factory production lines, loading/unloading crews, and machine helpers.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Trained Security Personnel:</strong> Strict height, fitness, background-vetted perimeter vigilance squads.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Full Compliance:</strong> ESIC, PF, and contractual statutory administrative management.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/enquiry/employer" variant="navy" icon={<ArrowRight size={16} />}>
                  EXPLORE MANPOWER SERVICES
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Vertical 03: InfraBuild Properties */}
      <section className="section" id="properties">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid">
            <ScrollReveal direction="left">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
                  <Building size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>VERTICAL 03</span>
                </div>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  A TIGER INFRABUILD PROPERTIES
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Property-related services and real-estate brokerage assisting clients with residential investments, commercial site acquisition, and industrial plot transactions in rapidly developing corridors.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Real Estate Advisory
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Commercial & Industrial Brokerage:</strong> Warehousing land, manufacturing plant sites, and retail spaces.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Residential Properties:</strong> Verified residential plots, apartment developments, and layout consulting.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Clear Documentation Support:</strong> Guidance through registration, verification, and boundary compliance.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/contact" variant="primary" icon={<ArrowRight size={16} />}>
                  EXPLORE PROPERTIES
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/vertical_properties.jpg"
                  alt="A Tiger InfraBuild Properties modern development architecture"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Vertical 04: Footwear Store */}
      <section className="section section-pearl" id="footwear">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid-reverse">
            <ScrollReveal direction="left">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/vertical_footwear.jpg"
                  alt="A Tiger Footwear Store premium retail collection"
                  className="service-detail-image"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
                  <ShoppingBag size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>VERTICAL 04</span>
                </div>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  A TIGER FOOTWEAR STORE
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  A retail destination dedicated to high-quality footwear for men, women, and children. Combining durability, comfort, and contemporary aesthetics across every category.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Product Collections
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Men's Formal & Daily Wear:</strong> Genuine leather shoes, work boots, sneakers, and sandals.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Women's Footwear:</strong> Elegant heels, comfortable flats, ethnic juttis, and casual shoes.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Kids & Sports Range:</strong> Resilient school footwear, sports trainers, and casual footwear.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/contact" variant="navy" icon={<ArrowRight size={16} />}>
                  VISIT FOOTWEAR STORE
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Vertical 05: Fashion Hub */}
      <section className="section" id="fashion">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'center'
          }} className="service-detail-grid">
            <ScrollReveal direction="left">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>VERTICAL 05</span>
                </div>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>
                  A TIGER FASHION HUB
                </h2>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Men’s and women’s fashion and apparel boutique offering curated wardrobe essentials, festive wear, and modern everyday lifestyle collections.
                </p>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Apparel Offerings
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: 'var(--text-sm)' }}>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Men's Fashion:</strong> Casual shirts, tailored trousers, jeans, jackets, and seasonal daily wear.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Women's Collection:</strong> Contemporary dresses, kurtis, tops, ethnic ensembles, and western wear.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Fabric Quality & Style:</strong> Premium fabrics, fine stitching, and on-trend color palettes.</span>
                    </li>
                  </ul>
                </div>

                <Button to="/contact" variant="primary" icon={<ArrowRight size={16} />}>
                  EXPLORE FASHION
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)' }}>
                <img
                  src="/assets/vertical_fashion.jpg"
                  alt="A Tiger Fashion Hub boutique and apparel collection"
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
