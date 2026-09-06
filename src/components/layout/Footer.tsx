import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import { Container } from '../common/Container';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <Container size="xl">
        <div className="footer-grid">
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-4)' }}>
              <img
                src="/assets/tiger-logo.jpeg"
                alt="A TIGER GROUPS Logo"
                className="footer-brand-logo"
              />
              <div>
                <h4 style={{ color: 'var(--color-pearl-white)', fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                  A TIGER GROUPS
                </h4>
                <span style={{ color: 'var(--color-champagne)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  Enterprise & Business Ecosystem
                </span>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(252, 251, 251, 0.7)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              A diversified enterprise ecosystem headquartered in Nagpur, operating across Central India encompassing Career Solutions & Consultancy, Manpower Supply & Security Services, InfraBuild Properties, Footwear, and Fashion.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {/* Instagram Icon */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-light btn-sm"
                aria-label="Instagram"
                style={{ padding: '0.45rem', borderRadius: '50%', width: '36px', height: '36px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              {/* Facebook Icon */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-light btn-sm"
                aria-label="Facebook"
                style={{ padding: '0.45rem', borderRadius: '50%', width: '36px', height: '36px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="footer-title">Navigation</h5>
            <ul className="footer-links">
              <li><Link to="/" className="footer-link"><ArrowRight size={12} /> Home</Link></li>
              <li><Link to="/about" className="footer-link"><ArrowRight size={12} /> About Us</Link></li>
              <li><Link to="/services" className="footer-link"><ArrowRight size={12} /> Services</Link></li>
              <li><Link to="/jobs" className="footer-link"><ArrowRight size={12} /> Jobs</Link></li>
              <li><Link to="/enquiry" className="footer-link"><ArrowRight size={12} /> Enquiry</Link></li>
              <li><Link to="/employers" className="footer-link"><ArrowRight size={12} /> For Employers</Link></li>
              <li><Link to="/contact" className="footer-link"><ArrowRight size={12} /> Contact</Link></li>
            </ul>
          </div>

          {/* Business Verticals */}
          <div>
            <h5 className="footer-title">Business Verticals</h5>
            <ul className="footer-links">
              <li><Link to="/careers" className="footer-link"><ArrowRight size={12} /> Career Solution & Consultancy</Link></li>
              <li><Link to="/businesses#manpower" className="footer-link"><ArrowRight size={12} /> Manpower Supply & Security</Link></li>
              <li><Link to="/businesses#properties" className="footer-link"><ArrowRight size={12} /> InfraBuild Properties</Link></li>
              <li><Link to="/businesses#footwear" className="footer-link"><ArrowRight size={12} /> A Tiger Footwear Store</Link></li>
              <li><Link to="/businesses#fashion" className="footer-link"><ArrowRight size={12} /> A Tiger Fashion Hub</Link></li>
            </ul>
          </div>

          {/* Legal / Compliance */}
          <div>
            <h5 className="footer-title">Legal / Compliance</h5>
            <ul className="footer-links">
              <li><Link to="/policy#terms" className="footer-link"><ArrowRight size={12} /> Terms & Conditions</Link></li>
              <li><Link to="/policy#consultancy" className="footer-link"><ArrowRight size={12} /> Consultancy Policy</Link></li>
              <li><Link to="/policy#privacy" className="footer-link"><ArrowRight size={12} /> Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Official Contact & Office Details */}
          <div>
            <h5 className="footer-title">Headquarters</h5>
            <div className="footer-contact-item">
              <MapPin size={18} />
              <span>
                Plot No. 440, Behind Royal Club,<br />
                Subhan Nagar, Nagpur,<br />
                Maharashtra — 440035
              </span>
            </div>

            <div className="footer-contact-item">
              <Phone size={18} />
              <a href="tel:+918349353946" style={{ color: 'var(--color-pearl-white)' }}>
                +91 8349353946
              </a>
            </div>

            <div className="footer-contact-item">
              <Mail size={18} />
              <a href="mailto:atigerglobal@gmail.com" style={{ color: 'var(--color-pearl-white)' }}>
                atigerglobal@gmail.com
              </a>
            </div>

            <div className="footer-contact-item">
              <Clock size={18} />
              <span>Office Hours: 11:00 AM – 4:00 PM</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} A TIGER GLOBAL Career Solution & Consultancy. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <Link to="/policy" style={{ color: 'inherit' }}>Policy & Terms</Link>
            <Link to="/joining" style={{ color: 'inherit' }}>Joining Guidelines</Link>
            <span>Proprietorship Enterprise</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};
