// ==============================================================================
// File: src/pages/ConsultancyPolicyPage.tsx
// Description: Official Consultancy Policy Document Page
// Features:
//   - Dedicated LegalPageLayout container
//   - Interactive, accessible accordion for all 10 official operating rules
//   - Keyboard navigation (Enter / Space) & ARIA accessibility
//   - Preserves exact client policy wording and terminology
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Printer, ChevronDown, ShieldCheck, Building2 } from 'lucide-react';
import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { CONSULTANCY_POLICY_CONTENT } from '../data/policyData';

export const ConsultancyPolicyPage: React.FC = () => {
  // Single active accordion state; default item 1 ("Registration & Original Documents") expanded
  const [expandedItem, setExpandedItem] = useState<number | null>(1);

  useEffect(() => {
    document.title = "Consultancy Policy | A TIGER GLOBAL";
  }, []);

  const toggleItem = (number: number) => {
    setExpandedItem((prev) => (prev === number ? null : number));
  };

  const handleKeyDown = (e: React.KeyboardEvent, number: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleItem(number);
    }
  };

  return (
    <LegalPageLayout
      eyebrow="Client Document Record"
      title="CONSULTANCY OPERATING POLICY"
      subtitle="Official recruitment guidelines and candidate operating conditions established by A TIGER GLOBAL Career Solution and Consultancy."
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
            <span className="badge badge-navy">Official Operating Rules</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              aria-label="Print official policy document"
            >
              <Printer size={14} />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* Introduction Summary */}
        <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
          Please review the following ten mandatory rules governing registration, document verification, interview coordination, and placement terms. Click each policy title to inspect full statutory details.
        </div>

        {/* Interactive Policy Accordion List */}
        <div className="policy-accordion-list" role="presentation">
          {CONSULTANCY_POLICY_CONTENT.map((item) => {
            const isExpanded = expandedItem === item.number;
            const headerId = `policy-header-${item.number}`;
            const contentId = `policy-content-${item.number}`;

            return (
              <div
                key={item.number}
                className={`policy-accordion-item ${isExpanded ? 'is-expanded' : ''}`}
              >
                <button
                  id={headerId}
                  type="button"
                  className="policy-accordion-header"
                  onClick={() => toggleItem(item.number)}
                  onKeyDown={(e) => handleKeyDown(e, item.number)}
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  aria-label={`${item.number}. ${item.title}`}
                >
                  <div className="policy-accordion-title-group">
                    <span className="policy-number-pill">
                      {item.number < 10 ? `0${item.number}` : item.number}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <span className="policy-title-text">{item.title}</span>
                      <span style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        color: 'var(--color-text-muted)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginTop: '0.15rem'
                      }}>
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <ChevronDown size={18} className="policy-chevron-icon" aria-hidden="true" />
                </button>

                {isExpanded && (
                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={headerId}
                    className="policy-accordion-body"
                  >
                    <p className="policy-body-text">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notice Footer */}
        <div className="legal-notice-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', fontSize: 'var(--text-sm)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Important Operating Notice</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            These terms represent the client-provided operating policy of A Tiger Global Career Solution and Consultancy, Nagpur, MH. All candidates and employer partners are advised to review and adhere to these statutory conditions.
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
          <span>Office Hours: 11:00 AM – 4:00 PM</span>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default ConsultancyPolicyPage;
