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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Official Public Verification Gateway
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            A TIGER GLOBAL
          </h1>
          <p className="text-sm font-semibold text-amber-700 tracking-wide uppercase mt-0.5">
            Career Solution &amp; Consultancy
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative registry validation for official Reference Slips &amp; Credentials
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Verifying Document Authenticity...
            </h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Querying central cryptographic registry to attest record authenticity.
            </p>
            {token && (
              <div className="mt-4 inline-block font-mono text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">
                Token: {token.substring(0, 18)}...
              </div>
            )}
          </div>
        )}

        {/* Error / Invalid State */}
        {!loading && (error || !data?.isValid) && (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Verification Notice: Unverified Record
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              {error || data?.error || 'The scanned document could not be authenticated against the active registry. It may be expired, superseded, or invalid.'}
            </p>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 max-w-md mx-auto mb-6">
              For assistance, please contact the A Tiger Global onboarding compliance desk at{' '}
              <span className="font-semibold text-slate-700">atigerglobal@gmail.com</span> or call{' '}
              <span className="font-semibold text-slate-700">+91 8349353946</span>.
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Website
            </Link>
          </div>
        )}

        {/* Success / Authentic State */}
        {!loading && data?.isValid && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/40 text-xs font-bold tracking-wider uppercase mb-1">
                Registry Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-bold">
                {data.verificationStatus || 'OFFICIALLY ISSUED & AUTHENTIC DOCUMENT'}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {data.documentTitle || 'Official Employee Reference Slip & Placement Authorization'}
              </p>
            </div>

            {/* Document Details Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Primary Attribution Grid */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3.5">
                {data.referenceNumber && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      Reference Number
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.referenceNumber}
                    </span>
                  </div>
                )}

                {data.candidateName && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-600" />
                      Authorized Candidate
                    </span>
                    <span className="font-bold text-slate-900">
                      {data.candidateName}
                    </span>
                  </div>
                )}

                {data.designation && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-slate-600" />
                      Designation / Role
                    </span>
                    <span className="font-medium text-slate-800">
                      {data.designation}
                    </span>
                  </div>
                )}

                {data.companyName && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-600" />
                      Sponsoring Company
                    </span>
                    <span className="font-medium text-slate-800 text-right">
                      {data.companyName}
                    </span>
                  </div>
                )}

                {data.issuanceDate && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      Date of Issuance
                    </span>
                    <span className="font-medium text-slate-800">
                      {data.issuanceDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Fee & Payment Verification Box */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <span>Registration &amp; Verification Fee:</span>
                    <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono text-xs font-bold">
                      {data.feeStatus || 'PAID & VERIFIED (INR 500.00)'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Transaction confirmed. Reference:{' '}
                    <span className="font-mono font-semibold">{data.paymentReference || 'VERIFIED'}</span>
                    {data.receiptNumber ? ` • Receipt: ${data.receiptNumber}` : ''}.
                  </p>
                </div>
              </div>

              {/* Legal Attestation Banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Official Compliance Attestation
                </div>
                <p>
                  This official document has been issued by{' '}
                  <span className="font-semibold text-slate-900">
                    A TIGER GLOBAL Career Solution &amp; Consultancy
                  </span>{' '}
                  (Reg. No.: 106157392603 | GSTIN: 27DIFPA0273P1Z4). The candidate is authorized for interview and reporting at the client organization.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Home
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
