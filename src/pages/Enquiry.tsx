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
          <motion.span
            className="enquiry-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            LET'S GET STARTED
          </motion.span>

          <motion.h1
            className="enquiry-heading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            WHAT CAN WE HELP YOU WITH?
          </motion.h1>

          <motion.p
            className="enquiry-subtext"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
          >
            Whether you're looking for your next opportunity or need dependable manpower for your business, tell us what you need and our team will take it from there.
          </motion.p>
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
