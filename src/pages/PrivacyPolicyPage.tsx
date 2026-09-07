// ==============================================================================
// File: src/pages/PrivacyPolicyPage.tsx
// Description: Official Privacy Policy Document Page
// Features:
//   - Dedicated LegalPageLayout container
//   - Structured data privacy, processing, and document security clauses
//   - Does NOT redirect to Terms & Conditions
// ==============================================================================

import React, { useEffect } from 'react';
import { Printer, Lock, ShieldCheck, Building2 } from 'lucide-react';
import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { PRIVACY_POLICY_CONTENT } from '../data/policyData';

export const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = "Privacy Policy | A TIGER GLOBAL";
  }, []);

  return (
    <LegalPageLayout
      eyebrow="Data Protection & Privacy"
      title="PRIVACY POLICY"
      subtitle="Information handling policies, candidate data protection standards, and document security guidelines for A TIGER GLOBAL Career Solution and Consultancy."
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
            <span className="badge badge-navy">Data Protection Standards</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              aria-label="Print privacy policy document"
            >
              <Printer size={14} />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* Introduction */}
        <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4) var(--space-5)', backgroundColor: 'rgba(25, 42, 86, 0.03)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-midnight-navy)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            <strong>Commitment to Privacy:</strong> A TIGER GLOBAL Career Solution and Consultancy values your privacy and is dedicated to handling all candidate credentials, personal documents, and employer records with strict digital security and ethical governance.
          </p>
        </div>

        {/* Structured Privacy Sections */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PRIVACY_POLICY_CONTENT.map((section) => (
            <div key={section.number} className="legal-terms-section">
              <h3 className="legal-terms-heading">
                <Lock size={17} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
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

        {/* Document Storage Notice */}
        <div className="legal-notice-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', fontSize: 'var(--text-sm)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Digital Document Retention & Storage Security</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            Uploaded candidate documents (identity proofs, joining forms, bank records) are held in encrypted cloud storage with restricted administrative access. Personal identification numbers are safeguarded in compliance with Indian information technology regulations.
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
            <span>Registered Office: Plot No. 440, Subhan Nagar, Nagpur, Maharashtra — 440035</span>
          </div>
          <span>Compliance Contact: atigerglobal@gmail.com</span>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
