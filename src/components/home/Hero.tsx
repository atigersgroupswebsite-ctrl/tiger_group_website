import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Users, ShieldCheck, MapPin } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';

export const Hero: React.FC = () => {
  return (
    <section className="hero-section">
      {/* Decorative Tiger-Inspired Geometry */}
      <div className="hero-geometry" aria-hidden="true" />

      <Container size="xl">
        <div className="hero-grid">
          {/* Left: Text Content & Staggered Reveal */}
          <div className="hero-content">
            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              BUILDING WORKFORCES.<br />
              <span className="hero-title-highlight">CREATING OPPORTUNITIES.</span>
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              A TIGER GROUPS is a diversified enterprise ecosystem delivering trusted career placement, industrial workforce contracting, infrastructure properties, and retail ventures across Central India.
            </motion.p>

            <motion.div
              className="hero-cta-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Button to="/businesses" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                EXPLORE BUSINESSES
              </Button>
              <Button to="/careers" variant="navy" size="lg" icon={<Briefcase size={18} />}>
                CAREER SOLUTIONS
              </Button>
            </motion.div>

            <motion.div
              className="hero-highlights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="hero-highlight-item">
                <Briefcase size={15} style={{ color: 'var(--color-midnight-navy)' }} />
                <span>Careers & Manpower</span>
              </div>
              <div className="hero-highlight-item">
                <span className="hero-highlight-dot" />
                <Users size={15} style={{ color: 'var(--color-midnight-navy)' }} />
                <span>Properties</span>
              </div>
              <div className="hero-highlight-item">
                <span className="hero-highlight-dot" />
                <ShieldCheck size={15} style={{ color: 'var(--color-midnight-navy)' }} />
                <span>Footwear & Fashion</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Editorial Visual */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-image-wrapper">
              <img
                src="/assets/hero_workforce.jpg"
                alt="A Tiger Global professional industrial workforce, technicians and security personnel"
                className="hero-image"
              />
            </div>

            {/* Floating Credibility Card */}
            <div className="hero-floating-card">
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(247, 215, 148, 0.15)',
                border: '1px solid rgba(247, 215, 148, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-champagne)'
              }}>
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-champagne)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Regional Presence
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-pearl-white)' }}>
                  Maharashtra • MP • Chhattisgarh
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
