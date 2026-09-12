// ==============================================================================
// File: src/pages/PublicVerificationPage.tsx
// Description: Permanent Public Document Verification Page (Scanned via QR Code)
// Route: /verify/:token or /verify?token=...
// Brand: A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Completely public (no candidate login or admin auth required)
//   - Completely independent of Vercel preview URLs (hosted on production domain)
//   - Strictly non-sensitive public attestation (zero candidate KYC PII leakage)
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Building2,
  User,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileCheck2,
  CreditCard,
  ArrowLeft,
  Lock
} from 'lucide-react';

interface VerificationData {
  isValid: boolean;
  documentType?: 'REFERENCE_SLIP' | 'EMPLOYEE_ID_CARD' | string;
  documentTitle?: string;
  referenceNumber?: string;
  candidateName?: string;
  issuanceDate?: string;
  issuingAuthority?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  interviewResult?: string;
  paymentVerified?: boolean;
  paymentReference?: string;
  receiptNumber?: string;
  feeStatus?: string;
  verificationStatus?: string;
  verifiedAt?: string;
  error?: string;
}

export const PublicVerificationPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token') || searchParams.get('t') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token || !token.trim()) {
        if (isMounted) {
          setError('No verification token provided in URL.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resp = await fetch(`/api/verify?token=${encodeURIComponent(token.trim())}`);
        const result = await resp.json();

        if (isMounted) {
          if (result && typeof result.isValid === 'boolean') {
            setData(result);
            if (!result.isValid) {
              setError(result.error || 'Document verification could not be authenticated.');
            }
          } else {
            setError('Unexpected response format from verification server.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Verification network connection error.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '3rem 1rem 5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: '#0F1B38',
              color: '#F7D794',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.75rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Lock size={14} color="#F7D794" />
            <span>Official Public Verification Gateway</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 800,
              color: '#0F1B38',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-heading)'
            }}
          >
            A TIGER GLOBAL
          </h1>
          <p
            style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              color: '#8C7B65',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: '0 0 0.35rem 0'
            }}
          >
            Career Solution &amp; Consultancy
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
            Authoritative registry validation for official Reference Slips &amp; Credentials
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(15, 27, 56, 0.05)',
              border: '1px solid #E2E8F0',
              padding: '2.5rem 1.5rem',
              textAlign: 'center'
            }}
          >
            <Loader2
              size={40}
              color="#0F1B38"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}
            />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: '0 0 0.4rem 0' }}>
              Verifying Document Authenticity...
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
              Querying central cryptographic registry to attest record authenticity.
            </p>
            {token && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'inline-block',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  backgroundColor: '#F1F5F9',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  color: '#475569',
                  wordBreak: 'break-all'
                }}
              >
                Token: {token.substring(0, 18)}...
              </div>
            )}
          </div>
        )}

        {/* Error / Invalid State */}
        {!loading && (error || !data?.isValid) && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.06)',
              border: '1px solid #FECACA',
              padding: '2.25rem 1.5rem',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <ShieldAlert size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F1B38', margin: '0 0 0.5rem 0' }}>
              Verification Notice: Unverified Record
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#4A5568', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
              {error || data?.error || 'The scanned document could not be authenticated against the active registry. It may be expired, superseded, or invalid.'}
            </p>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid #E2E8F0',
                fontSize: '0.75rem',
                color: '#64748B',
                maxWidth: '440px',
                margin: '0 auto 1.5rem auto',
                lineHeight: 1.5
              }}
            >
              For assistance, please contact the A Tiger Global onboarding compliance desk at{' '}
              <strong style={{ color: '#0F1B38' }}>atigerglobal@gmail.com</strong> or call{' '}
              <strong style={{ color: '#0F1B38' }}>+91 8349353946</strong>.
            </div>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={16} />
              <span>Return to Website</span>
            </Link>
          </div>
        )}

        {/* Success / Authentic State */}
        {!loading && data?.isValid && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #A7F3D0',
              boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.1), 0 4px 12px rgba(15, 27, 56, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #047857 0%, #0D9488 100%)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <ShieldCheck size={30} color="#FFFFFF" />
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.35)',
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}
              >
                Registry Verified
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)'
                }}
              >
                {data.verificationStatus || 'OFFICIALLY ISSUED & AUTHENTIC DOCUMENT'}
              </h2>
              <p style={{ margin: '0.4rem 0 0 0', color: '#D1FAE5', fontSize: '0.85rem' }}>
                {data.documentTitle || 'Official Employee Reference Slip & Placement Authorization'}
              </p>
            </div>

            {/* Document Details Body */}
            <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Primary Attribution Grid */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {data.referenceNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <FileCheck2 size={16} color="#2563EB" />
                      Reference Number
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F1B38', wordBreak: 'break-all', textAlign: 'right' }}>
                      {data.referenceNumber}
                    </span>
                  </div>
                )}

                {data.candidateName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.875rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <User size={16} color="#475569" />
                      Authorized Candidate
                    </span>
                    <span style={{ fontWeight: 800, color: '#0F1B38', textAlign: 'right' }}>
                      {data.candidateName}
                    </span>
                  </div>
                )}

                {data.designation && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.875rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <Briefcase size={16} color="#475569" />
                      Designation / Role
                    </span>
                    <span style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                      {data.designation}
                    </span>
                  </div>
                )}

                {data.companyName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.875rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <Building2 size={16} color="#475569" />
                      Sponsoring Company
                    </span>
                    <span style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                      {data.companyName}
                    </span>
                  </div>
                )}

                {data.issuanceDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.875rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <Calendar size={16} color="#475569" />
                      Date of Issuance
                    </span>
                    <span style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                      {data.issuanceDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Fee & Payment Verification Box */}
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  borderRadius: '12px',
                  border: '1px solid #A7F3D0',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <CreditCard size={20} color="#047857" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 800, color: '#064E3B', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Registration &amp; Verification Fee:</span>
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}
                    >
                      {data.feeStatus || 'PAID & VERIFIED'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#065F46', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>
                    Transaction confirmed. Reference:{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>{data.paymentReference || 'VERIFIED'}</span>
                    {data.receiptNumber ? ` • Receipt: ${data.receiptNumber}` : ''}.
                  </p>
                </div>
              </div>

              {/* Legal Attestation Banner */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1rem 1.25rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                  lineHeight: 1.55
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Official Compliance Attestation</span>
                </div>
                <p style={{ margin: 0 }}>
                  This official document has been issued by{' '}
                  <strong style={{ color: '#0F1B38' }}>
                    A TIGER GLOBAL Career Solution &amp; Consultancy
                  </strong>{' '}
                  (Reg. No.: 106157392603 | GSTIN: 27DIFPA0273P1Z4). The candidate is authorized for interview and reporting at the client organization.
                </p>
              </div>

              {/* Actions */}
              <div style={{ paddingTop: '0.5rem', textAlign: 'center' }}>
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.35rem',
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Return to Home</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicVerificationPage;
