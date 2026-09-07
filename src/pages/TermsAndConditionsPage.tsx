// ==============================================================================
// File: src/pages/TermsAndConditionsPage.tsx
// Description: Terms and Conditions Document Page
// Distinct from Consultancy Operating Policy.
// Uses dedicated LegalPageLayout and TERMS_AND_CONDITIONS_CONTENT model.
// ==============================================================================

import React, { useEffect } from 'react';
import { Printer, FileCheck, Building2, Shield } from 'lucide-react';
import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { TERMS_AND_CONDITIONS_CONTENT } from '../data/policyData';

export const TermsAndConditionsPage: React.FC = () => {
  useEffect(() => {
    document.title = "Terms & Conditions | A TIGER GLOBAL";
  }, []);

  return (
    <LegalPageLayout
      eyebrow="Commercial & Operational Framework"
      title="TERMS & CONDITIONS"
      subtitle="General terms of engagement, candidate registration conditions, and service facilitation guidelines for A TIGER GLOBAL Career Solution and Consultancy."
    >
      <div className="legal-document-card">
        {/* Document Header Bar */}
        <div className="legal-doc-info-bar">
          <div>
            <h2 className="legal-doc-brand-title">A TIGER GLOBAL</h2>
            <span className="legal-doc-brand-sub">
              Career Solution & Consultancy • Nagpur, Maharashtra
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-navy">Website & Service Terms</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              aria-label="Print terms and conditions document"
            >
              <Printer size={14} />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* Preamble */}
        <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4) var(--space-5)', backgroundColor: 'rgba(25, 42, 86, 0.03)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-midnight-navy)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            <strong>Notice to All Applicants & Enterprise Clients:</strong> Please read these Terms & Conditions carefully prior to submitting any enquiry or joining form. Your submission of data on this website or registration at our registered office constitutes agreement with these statutory terms.
          </p>
        </div>

        {/* Structured Terms Sections */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TERMS_AND_CONDITIONS_CONTENT.map((section) => (
            <div key={section.number} className="legal-terms-section">
              <h3 className="legal-terms-heading">
                <FileCheck size={18} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
                <span>{section.number}. {section.title}</span>
              </h3>

              <p className="legal-terms-paragraph" style={{ fontWeight: 500, color: 'var(--color-midnight-navy)' }}>
                {section.summary}
              </p>

              <ul className="legal-terms-list">
                {section.clauses.map((clause, idx) => (
                  <li key={idx}>{clause}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Notice Box */}
        <div className="legal-notice-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', fontSize: 'var(--text-sm)' }}>
            <Shield size={16} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Statutory Compliance & Legal Scope</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            A TIGER GLOBAL Career Solution and Consultancy is an established recruitment consultancy registered in Maharashtra, India. All contractual and consultancy engagements adhere to applicable labour regulations.
          </p>
        </div>

        {/* Registered Address Bar */}
        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Building2 size={13} />
            <span>Headquarters: Plot No. 440, Subhan Nagar, Nagpur, Maharashtra — 440035</span>
          </div>
          <span>Jurisdiction: Nagpur, MH, India</span>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default TermsAndConditionsPage;
