// ==============================================================================
// File: src/components/layout/LegalPageLayout.tsx
// Description: Dedicated Layout Architecture for Legal & Compliance Pages
// Ensures proper full-page document reading layout, centered container,
// responsive padding, and unified internal legal sub-navigation.
// ==============================================================================

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldAlert, Award, Lock } from 'lucide-react';

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const LEGAL_NAV_ITEMS = [
  { path: '/terms-and-conditions', label: 'Terms & Conditions', icon: <FileText size={13} /> },
  { path: '/consultancy-policy', label: 'Consultancy Policy', icon: <ShieldAlert size={13} /> },
  { path: '/legal-documents', label: 'Legal Documents', icon: <Award size={13} /> },
  { path: '/privacy-policy', label: 'Privacy Policy', icon: <Lock size={13} /> },
];

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  eyebrow,
  title,
  subtitle,
  children
}) => {
  return (
    <main className="legal-page-layout">
      {/* 1. Header with Breadcrumb, Title & Legal Sub-Navigation */}
      <section className="legal-page-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-back-link">
            <ArrowLeft size={16} />
            <span>Return to Homepage</span>
          </Link>

          <div className="legal-header-title-block">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="legal-header-title">{title}</h1>
            <p className="legal-header-desc">{subtitle}</p>
          </div>

          {/* Internal Legal Sub-Navigation Tabs */}
          <nav className="legal-nav-tabs-wrapper" aria-label="Legal documents navigation">
            <ul className="legal-nav-tabs">
              {LEGAL_NAV_ITEMS.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `legal-nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* 2. Dedicated Legal Content Container */}
      <section className="legal-content-container">
        {children}
      </section>
    </main>
  );
};

export default LegalPageLayout;
