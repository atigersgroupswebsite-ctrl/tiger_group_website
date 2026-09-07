// ==============================================================================
// File: src/pages/LegalDocumentsPage.tsx
// Description: Official Legal Documents & Statutory Compliance Registry Page
// Features:
//   - Uses dedicated LegalPageLayout container (no narrow/two-column restrictions)
//   - Displays all 6 approved public-facing statutory registration records:
//       1. Establishment Registration
//       2. GST Registration
//       3. EPFO Registration
//       4. ESIC Registration
//       5. Udyam Registration
//       6. Profession Tax Registration
//   - Each item features a "SHOW CERTIFICATE" action opening the verified
//     certificate detail modal (RegistrationModal)
//   - NO download option
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, CheckCircle2, FileCheck2, ExternalLink } from 'lucide-react';
import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { RegistrationModal } from '../components/compliance/RegistrationModal';
import { REGISTRATION_ITEMS } from '../data/complianceData';
import type { RegistrationItem } from '../types/compliance';

export const LegalDocumentsPage: React.FC = () => {
  const [selectedRecord, setSelectedRecord] = useState<RegistrationItem | null>(null);

  useEffect(() => {
    document.title = "Legal Documents & Registrations | A TIGER GLOBAL";
  }, []);

  const handleShowCertificate = (item: RegistrationItem) => {
    setSelectedRecord(item);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
  };

  return (
    <LegalPageLayout
      eyebrow="Statutory Business Records"
      title="LEGAL DOCUMENTS & REGISTRATIONS"
      subtitle="Public verification records, statutory labour establishment registrations, and government certifications for A TIGER GLOBAL Career Solution and Consultancy."
    >
      <div className="legal-document-card">
        {/* Document Header Bar */}
        <div className="legal-doc-info-bar">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-champagne-dark)', textTransform: 'uppercase' }}>
              TIGER GROUPS
            </span>
            <h2 className="legal-doc-brand-title" style={{ marginTop: '0.15rem' }}>
              A TIGER GLOBAL Career Solution & Consultancy
            </h2>
            <span className="legal-doc-brand-sub">
              Headquarters: Nagpur, Maharashtra • Statutory Compliance Registry
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-navy">Statutory Business Records</span>
          </div>
        </div>

        {/* Informational intro */}
        <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
          The following official registrations demonstrate our active regulatory compliance with central and state authorities. Click <strong>SHOW CERTIFICATE</strong> on any record to inspect statutory scope, registration identifiers, and verified administrative status.
        </div>

        {/* 6 Statutory Registration Records */}
        <div className="legal-records-grid">
          {REGISTRATION_ITEMS.map((item) => (
            <div key={item.id} className="legal-record-card">
              {/* Record Header */}
              <div className="legal-record-header">
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-champagne-dark)', textTransform: 'uppercase' }}>
                    RECORD 0{item.cardNumber} • {item.documentType}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0.2rem 0 0 0' }}>
                    {item.title}
                  </h3>
                </div>

                <div className="legal-record-badge-status">
                  <CheckCircle2 size={13} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span>{item.validityStatus || 'Active & Registered'}</span>
                </div>
              </div>

              {/* Data Fields Grid */}
              <div className="legal-record-fields-grid">
                <div>
                  <span className="legal-record-field-label">{item.entityLabel}</span>
                  <span className="legal-record-field-value">{item.entityName}</span>
                </div>

                <div>
                  <span className="legal-record-field-label">{item.referenceLabel}</span>
                  <span className="legal-record-ref-pill">{item.registrationReference}</span>
                </div>

                <div>
                  <span className="legal-record-field-label">Issuing Authority</span>
                  <span className="legal-record-field-value" style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    {item.authority}
                  </span>
                </div>

                {item.businessActivity && (
                  <div>
                    <span className="legal-record-field-label">Business Activity</span>
                    <span className="legal-record-field-value" style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      {item.businessActivity}
                    </span>
                  </div>
                )}

                <div>
                  <span className="legal-record-field-label">Jurisdiction</span>
                  <span className="legal-record-field-value" style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    {item.jurisdiction}
                  </span>
                </div>
              </div>

              {/* Statutory Scope & Action Row */}
              <div className="legal-record-actions-bar">
                <div style={{ flex: 1, minWidth: '220px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  <strong>Statutory Scope:</strong> {item.legalScope}
                </div>

                {/* SHOW CERTIFICATE ACTION BUTTON */}
                <button
                  type="button"
                  className="btn-show-certificate"
                  onClick={() => handleShowCertificate(item)}
                  aria-label={`Show Certificate for ${item.title}`}
                >
                  <FileCheck2 size={15} style={{ color: 'var(--color-champagne-dark)' }} />
                  <span>SHOW CERTIFICATE</span>
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy & Compliance Verification Notice */}
        <div className="legal-notice-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', fontSize: 'var(--text-sm)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-champagne-dark)' }} />
            <span>Statutory Privacy & Verification Standards</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
            In strict compliance with statutory regulations and digital security guidelines, complete certificate scans and sensitive proprietor identifiers (including personal PAN, Aadhaar, and private contact records) are retained in protected internal storage. Legitimate enterprise clients and statutory authorities may review official verified physical files during formal compliance audits at our registered Nagpur business headquarters.
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
            <span>Nagpur, Maharashtra — 440035</span>
          </div>
          <span>Enterprise Verification Registry</span>
        </div>
      </div>

      {/* Certificate Viewer Modal (Shows verified record details; strictly no download option) */}
      <RegistrationModal
        item={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={handleCloseModal}
      />
    </LegalPageLayout>
  );
};

export default LegalDocumentsPage;
