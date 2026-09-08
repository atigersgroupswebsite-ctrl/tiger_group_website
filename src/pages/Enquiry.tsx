import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCheck, Building2, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { Container } from '../components/common/Container';

export const Enquiry: React.FC = () => {
  useEffect(() => {
    document.title = "Enquiry & Consultation | A TIGER GLOBAL";
  }, []);

  return (
    <div className="enquiry-landing-hero">
      <Container>
        <div className="enquiry-header-center">
          {/* Transition Pill from A TIGER GROUP'S to Career Vertical */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(25, 42, 86, 0.05)',
              border: '1px solid rgba(25, 42, 86, 0.1)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-midnight-navy)'
            }}
          >
            <span>A TIGER GROUP'S</span>
            <span style={{ color: 'var(--color-champagne-dark)' }}>→</span>
            <span style={{ color: 'var(--color-champagne-dark)' }}>CAREER SOLUTION VERTICAL</span>
          </motion.div>

          {/* Dedicated A TIGER GLOBAL Logo & Heading */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem',
              marginBottom: 'var(--space-4)'
            }}
          >
            <div style={{
              width: '82px',
              height: '82px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid rgba(247, 215, 148, 0.6)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/assets/tiger-logo.jpeg"
                alt="A TIGER GLOBAL Career Solution & Consultancy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(2.1rem, 4vw, 3.2rem)',
                fontWeight: 800,
                color: 'var(--color-midnight-navy)',
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: '-0.025em'
              }}>
                A TIGER GLOBAL
              </h1>
              <div style={{
                fontSize: 'clamp(1rem, 1.5vw, 1.3rem)',
                fontWeight: 700,
                color: 'var(--color-champagne-dark)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '0.2rem'
              }}>
                Career Solution & Consultancy
              </div>
            </div>
          </motion.div>

          <motion.p
            className="enquiry-subtext"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            style={{ fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)', color: 'var(--color-text-secondary)' }}
          >
            Find employment opportunities, connect with employers, and begin your application.
          </motion.p>

          <motion.h2
            className="enquiry-heading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
            style={{ marginTop: 'var(--space-6)', marginBottom: '0' }}
          >
            WHAT CAN WE HELP YOU WITH?
          </motion.h2>
        </div>

        {/* Two Large Interactive Path Selection Cards */}
        <div className="enquiry-selection-grid">
          {/* Card 1: Job Seeker */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/enquiry/job-seeker" className="enquiry-path-card" id="enquiry-path-job-seeker">
              <div>
                <div className="enquiry-path-icon">
                  <UserCheck size={28} />
                </div>
                <span className="enquiry-path-badge">Candidate Path</span>
                <h2 className="enquiry-path-title">I'M LOOKING FOR A JOB</h2>
                <p className="enquiry-path-desc">
                  Find employment opportunities through A Tiger Global across Nagpur, Maharashtra, MP, and Chhattisgarh.
                </p>
              </div>

              <div className="enquiry-path-action">
                <span>START JOB ENQUIRY</span>
                <ArrowRight size={18} />
              </div>
            </Link>
          </motion.div>

          {/* Card 2: Employer */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/enquiry/employer" className="enquiry-path-card" id="enquiry-path-employer">
              <div>
                <div className="enquiry-path-icon">
                  <Building2 size={28} />
                </div>
                <span className="enquiry-path-badge">Enterprise Path</span>
                <h2 className="enquiry-path-title">I NEED MANPOWER</h2>
                <p className="enquiry-path-desc">
                  Tell us about your workforce requirements and connect with our team for certified staffing and security deployment.
                </p>
              </div>

              <div className="enquiry-path-action">
                <span>REQUEST MANPOWER</span>
                <ArrowRight size={18} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Small reassurance strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          style={{
            marginTop: '3.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={14} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Maharashtra • Madhya Pradesh • Chhattisgarh</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Zero Advance Fee For Inquiry • Prompt Response</span>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};
