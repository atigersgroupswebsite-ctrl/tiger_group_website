import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, PhoneCall } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Jobs', path: '/jobs' },
    { label: 'Enquiry', path: '/enquiry' },
    { label: 'Joining', path: '/joining/access' },
    { label: 'For Employers', path: '/for-employers' },
    { label: 'Contact', path: '/contact' }
  ];

  const isLinkActive = (linkPath: string) => {
    if (linkPath === '/joining/access') {
      return location.pathname === '/joining/access' || location.pathname === '/joining';
    }
    if (linkPath === '/for-employers') {
      return location.pathname === '/for-employers' || location.pathname === '/employers';
    }
    return location.pathname === linkPath;
  };

  return (
    <>
      <header className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <Container size="xl">
          <div className="navbar-inner">
            {/* Logo */}
            <Link to="/" className="navbar-brand" aria-label="Tiger Groups Homepage">
              <img
                src="/assets/tiger-logo.jpeg"
                alt="TIGER GROUPS Logo"
                className="navbar-logo"
              />
              <div className="navbar-brand-text">
                <span className="navbar-brand-title">TIGER GROUPS</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="navbar-nav" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Action & Mobile Toggle */}
            <div className="navbar-actions">
              <div style={{ display: 'none' }} className="d-lg-flex">
                <Button to="/enquiry/job-seeker" variant="primary" size="sm" icon={<ArrowRight size={15} />}>
                  APPLY NOW
                </Button>
              </div>

              {/* Explicit Apply Button visible on desktop */}
              <div className="desktop-cta" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <a
                  href="tel:+918349353946"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'none' }}
                  id="nav-call-btn"
                >
                  <PhoneCall size={14} />
                  <span>+91 8349353946</span>
                </a>
                <Button to="/enquiry/job-seeker" variant="primary" size="sm" icon={<ArrowRight size={15} />}>
                  APPLY NOW
                </Button>
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                className="menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-drawer">
            <div className="mobile-drawer-header">
              <div className="navbar-brand-text">
                <span className="navbar-brand-title">TIGER GROUPS</span>
              </div>
              <button
                type="button"
                className="menu-toggle"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-nav-links">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link to="/terms-and-conditions" className="mobile-nav-link">
                Policy & Terms
              </Link>
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button to="/enquiry/job-seeker" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                APPLY NOW
              </Button>
              <a
                href="tel:+918349353946"
                className="btn btn-navy btn-lg"
                style={{ textAlign: 'center' }}
              >
                <PhoneCall size={16} />
                <span>Call +91 8349353946</span>
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
};
