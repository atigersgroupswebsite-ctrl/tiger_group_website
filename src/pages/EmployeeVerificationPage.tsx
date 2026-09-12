// ==============================================================================
// File: src/pages/EmployeeVerificationPage.tsx
// Description: Public Employee Identity Verification Page (Scanned via QR Code)
// Security:
//   - Strictly non-sensitive data display (No Aadhaar, PAN, Bank, Address, Personal Phone)
//   - Resolves token via public.verify_employee_by_token(token) RPC
//   - Protects against enumeration and private data leakage
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Building2,
  User,
  Briefcase,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface VerificationResult {
  is_valid: boolean;
  is_active?: boolean;
  employee_name?: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  company_name?: string;
  location?: string;
  employment_status?: string;
  joining_date?: string;
  id_card_number?: string;
  id_card_issued_at?: string;
  verification_status?: string;
  error?: string;
}

export const EmployeeVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyToken() {
      if (!token || !token.trim()) {
        if (isMounted) {
          setResult({ is_valid: false, error: 'No verification token was provided in the scan URL.' });
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await (supabase.rpc as any)('verify_employee_by_token', {
          p_token: token.trim()
        });

        if (error) {
          throw new Error(error.message || 'Verification service temporarily unavailable.');
        }

        if (isMounted) {
          setResult(data as unknown as VerificationResult);
        }
      } catch (err: any) {
        if (isMounted) {
          setResult({
            is_valid: false,
            error: err?.message || 'Unable to complete employee verification.'
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem', maxWidth: '520px' }}>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: '#C5A880',
            textTransform: 'uppercase',
            marginBottom: '0.25rem'
          }}
        >
          A TIGER GROUPS
        </div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: '#0F1B38',
            margin: '0 0 0.4rem 0',
            letterSpacing: '0.02em'
          }}
        >
          OFFICIAL EMPLOYEE VERIFICATION
        </h1>
        <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
          Workforce Registry & Digital Identity Attestation
        </p>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(15, 27, 56, 0.08)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      >
        {/* Loading State */}
        {loading && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Loader2
              size={40}
              style={{
                animation: 'spin 1s linear infinite',
                color: '#0F1B38',
                margin: '0 auto 1.25rem auto'
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38', marginBottom: '0.4rem' }}>
              VERIFYING EMPLOYEE CREDENTIALS
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
              Connecting to secure workforce registry and checking cryptographic verification token...
            </p>
          </div>
        )}

        {/* Valid Active Employee */}
        {!loading && result?.is_valid && result?.is_active && (
          <div>
            {/* Top Status Banner */}
            <div
              style={{
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <ShieldCheck size={32} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                  OFFICIALLY VERIFIED ACTIVE EMPLOYEE
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Authenticated via A TIGER GLOBAL Recruitment Cell
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              {/* Employee Summary Cardlet */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#0F1B38',
                    color: '#C5A880',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    flexShrink: 0
                  }}
                >
                  {result.employee_name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38', margin: '0 0 0.25rem 0' }}>
                    {result.employee_name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        backgroundColor: '#E2E8F0',
                        color: '#0F1B38',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {result.employee_code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      {result.employment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Records Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <Briefcase size={12} /> Designation
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38' }}>
                    {result.designation}
                  </span>
                </div>

                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <User size={12} /> Department
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38' }}>
                    {result.department}
                  </span>
                </div>

                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <Building2 size={12} /> Enterprise / Company
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38' }}>
                    {result.company_name}
                  </span>
                </div>

                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <MapPin size={12} /> Work Location
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38' }}>
                    {result.location}
                  </span>
                </div>

                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <CreditCard size={12} /> ID Card Reference
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38', fontFamily: 'monospace' }}>
                    {result.id_card_number}
                  </span>
                </div>

                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                    <Calendar size={12} /> Joining / Issue Date
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1B38' }}>
                    {result.joining_date || 'On Record'}
                  </span>
                </div>
              </div>

              {/* Statutory Notice */}
              <div
                style={{
                  padding: '0.85rem',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#475569',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={16} style={{ color: '#166534', flexShrink: 0, marginTop: '0.1rem' }} />
                <span>
                  This identity record has been verified against the official statutory workforce database of{' '}
                  <strong>A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY</strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Valid but Inactive/Departed Employee */}
        {!loading && result?.is_valid && !result?.is_active && (
          <div>
            <div
              style={{
                backgroundColor: '#B45309',
                color: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <AlertTriangle size={32} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                  INACTIVE OR DEPARTED EMPLOYEE
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Employment Status: {result.employment_status}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                The employee <strong>{result.employee_name}</strong> ({result.employee_code}) was registered on our records, but their employment status is currently marked as <strong>{result.employment_status}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Invalid Token / Revoked */}
        {!loading && !result?.is_valid && (
          <div>
            <div
              style={{
                backgroundColor: '#991B1B',
                color: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <ShieldAlert size={32} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                  INVALID OR UNVERIFIED CREDENTIAL
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Identity Card Verification Failed
                </div>
              </div>
            </div>

            <div style={{ padding: '1.75rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#1E293B', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {result?.error || 'No official employee record matches this verification token. The identity card may be obsolete, revoked, or counterfeit.'}
              </p>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ fontSize: '0.775rem', fontWeight: 800, color: '#991B1B', marginBottom: '0.35rem' }}>
                  REPORT FRAUDULENT USE
                </div>
                <p style={{ fontSize: '0.75rem', color: '#7F1D1D', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                  If you suspect identity tampering or unauthorized presentation of an A TIGER GLOBAL card, please contact our compliance desk immediately.
                </p>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} /> Helpline: +91 8349353946
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={13} /> Email: atigerglobal@gmail.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Back button */}
        <div
          style={{
            padding: '1rem 1.75rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0F1B38',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={14} /> Back to A TIGER GROUPS Home
          </Link>

          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Ref: {token ? token.substring(0, 12) + '...' : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
};
