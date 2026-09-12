// ==============================================================================
// File: src/pages/PaymentResultPage.tsx
// Description: Cashfree Sandbox Payment Verification & Result Page
// Route: /payment/result?order_id=...
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Never trusts browser redirect; queries server for authoritative Cashfree state
//   - Shows verified receipt details only after server confirms SUCCESS
//   - Direct access to Candidate Portal and Reference Slip download
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { verifyPaymentWithServer, downloadReferenceSlipPdf, type VerifyPaymentResponse } from '../services/paymentService';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';

  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<VerifyPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retryUrl = verificationData?.applicationId
    ? `/joining/payment?appId=${encodeURIComponent(verificationData.applicationId)}`
    : '/joining/payment';

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided in return URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyPaymentWithServer({ orderId });
      setVerificationData(res);
      if (!res.success && res.paymentStatus !== 'PENDING' && res.paymentStatus !== 'FAILED' && res.paymentStatus !== 'USER_DROPPED') {
        setError(res.error || 'Unable to verify payment with server.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification network error.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadReferenceSlip = async () => {
    if (!verificationData || verificationData.paymentStatus !== 'SUCCESS') return;
    setDownloadingSlip(true);
    setDownloadNotice(null);

    const fileName = verificationData.referenceSlipFileName ||
      `${(verificationData.applicationNumber || verificationData.paymentReference || 'ATG').replace(/[^a-zA-Z0-9_-]/g, '_')}-REFERENCE-SLIP.pdf`;

    const res = await downloadReferenceSlipPdf({
      paymentId: verificationData.paymentId,
      signedUrl: verificationData.referenceSlipDownloadUrl,
      fileName,
    });

    if (!res.success) {
      setDownloadNotice(res.error || 'Unable to download Reference Slip automatically. You can also access it in your Candidate Portal.');
    }
    setDownloadingSlip(false);
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        backgroundColor: '#F8FAFC',
        padding: '3rem 1rem 5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full, 9999px)',
              backgroundColor: 'rgba(25, 42, 86, 0.08)',
              border: '1px solid var(--color-border, #E2DFD8)',
              color: 'var(--color-midnight-navy, #192A56)',
              fontSize: 'var(--text-xs, 0.75rem)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.75rem'
            }}
          >
            <ShieldCheck size={16} color="#192A56" />
            <span>Cashfree Gateway &bull; Sandbox Mode</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 800,
              color: 'var(--color-midnight-navy, #192A56)',
              margin: '0 0 0.35rem 0',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-heading)'
            }}
          >
            Payment Status Verification
          </h1>
          <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', margin: 0 }}>
            Authoritative transaction status confirmed directly with Cashfree
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 20px)',
              border: '1px solid var(--color-border, #E2DFD8)',
              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(25, 42, 86, 0.04))',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}
          >
            <Loader2 size={44} color="#192A56" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', margin: '0 0 0.5rem 0' }}>
              Verifying with Cashfree...
            </h2>
            <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
              Please wait while our server cryptographically queries the Cashfree Sandbox API to confirm your payment state.
            </p>
            {orderId && (
              <div style={{ marginTop: '1.25rem', display: 'inline-block', fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.35rem 0.75rem', borderRadius: '4px', color: '#334155' }}>
                Order ID: {orderId}
              </div>
            )}
          </div>
        )}

        {/* Error without status */}
        {!loading && error && !verificationData?.paymentStatus && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 20px)',
              border: '1px solid #FECACA',
              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(25, 42, 86, 0.04))',
              padding: '2.5rem 2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <AlertCircle size={26} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', margin: '0 0 0.5rem 0' }}>
              Verification Error
            </h2>
            <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', marginBottom: '1.75rem' }}>{error}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={checkStatus}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'var(--color-midnight-navy, #192A56)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Retry Verification</span>
              </button>
              <Link
                to="/joining/payment"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  textDecoration: 'none'
                }}
              >
                Return to Payment Page
              </Link>
            </div>
          </div>
        )}

        {/* SUCCESS State */}
        {!loading && verificationData?.paymentStatus === 'SUCCESS' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 24px)',
              border: '1px solid #A7F3D0',
              boxShadow: '0 12px 32px -4px rgba(16, 185, 129, 0.12), 0 4px 12px rgba(25, 42, 86, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Header Ribbon - Deep Emerald & Teal with White Accent */}
            <div
              style={{
                background: 'linear-gradient(135deg, #047857 0%, #0D9488 100%)',
                padding: '2.25rem 2rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}
              >
                <CheckCircle2 size={34} color="#FFFFFF" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                Payment Successful
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#D1FAE5', fontSize: 'var(--text-sm, 0.875rem)', lineHeight: 1.5 }}>
                Your dossier registration fee has been received and verified.
              </p>
            </div>

            <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Receipt & Payment Verification Grid */}
              <div
                style={{
                  backgroundColor: 'var(--color-pearl-surface, #F5F3EF)',
                  borderRadius: 'var(--radius-xl, 16px)',
                  border: '1px solid var(--color-border, #E2DFD8)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Payment Reference</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', fontSize: '0.95rem', wordBreak: 'break-all', textAlign: 'right' }}>
                    {verificationData.paymentReference || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Receipt Number</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-midnight-navy, #192A56)', wordBreak: 'break-all', textAlign: 'right' }}>
                    {verificationData.receiptNumber || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Amount Paid</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                    ₹{Number(verificationData.amount || 500).toFixed(2)} {verificationData.currency || 'INR'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Verified Status</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      fontSize: 'var(--text-xs, 0.75rem)',
                      fontWeight: 800,
                      letterSpacing: '0.04em'
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>PAID &amp; VERIFIED</span>
                  </span>
                </div>

                {verificationData.referenceSlipNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Reference Slip No.</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 'var(--text-xs, 0.75rem)',
                        fontWeight: 800,
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        wordBreak: 'break-all',
                        textAlign: 'right'
                      }}
                    >
                      {verificationData.referenceSlipNumber}
                    </span>
                  </div>
                )}

                {verificationData.gatewayPaymentId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted, #718096)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span>Cashfree Txn ID</span>
                    <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'right' }}>{verificationData.gatewayPaymentId}</span>
                  </div>
                )}
              </div>

              {/* Reference Slip Callout */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <FileCheck size={20} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: 'var(--text-xs, 0.75rem)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#1E3A8A' }}>Official Reference Slip Issued: </strong>
                  <span style={{ color: '#1E40AF' }}>
                    Your candidate-specific 2-Page Reference Slip &amp; Consultancy Return Form has been verified and attached to your confirmation email. Carry this document when reporting to orientation.
                  </span>
                </div>
              </div>

              {downloadNotice && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '0.75rem 1rem',
                    color: '#92400E',
                    fontSize: 'var(--text-xs, 0.75rem)',
                    lineHeight: 1.4
                  }}
                >
                  {downloadNotice}
                </div>
              )}

              {/* Candidate Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={handleDownloadReferenceSlip}
                  disabled={downloadingSlip}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem 1.5rem',
                    backgroundColor: downloadingSlip ? '#059669' : '#047857',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-md, 10px)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    cursor: downloadingSlip ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(4, 120, 87, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {downloadingSlip ? (
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>{downloadingSlip ? 'Downloading Reference Slip...' : 'Download Reference Slip (PDF)'}</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <Link
                    to="/joining/portal"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.25rem',
                      backgroundColor: 'var(--color-midnight-navy, #192A56)',
                      color: 'var(--color-pearl-white, #FCFBFB)',
                      borderRadius: 'var(--radius-md, 10px)',
                      fontSize: 'var(--text-sm, 0.875rem)',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(25, 42, 86, 0.04))',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Go to Candidate Portal</span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-midnight-navy, #192A56)',
                      border: '1px solid var(--color-border, #E2DFD8)',
                      borderRadius: 'var(--radius-md, 10px)',
                      fontSize: 'var(--text-sm, 0.875rem)',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING State */}
        {!loading && verificationData?.paymentStatus === 'PENDING' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 24px)',
              border: '1px solid #FDE68A',
              boxShadow: '0 12px 32px -4px rgba(217, 119, 6, 0.12), 0 4px 12px rgba(25, 42, 86, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Header Ribbon - Rich Amber & Ochre */}
            <div
              style={{
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                padding: '2.25rem 2rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}
              >
                <Clock size={34} color="#FFFFFF" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                Payment Verification Pending
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#FEF3C7', fontSize: 'var(--text-sm, 0.875rem)', lineHeight: 1.5 }}>
                Your payment status has not yet been conclusively confirmed by your bank or Cashfree.
              </p>
            </div>

            <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Caution Callout Banner - Do not make duplicate payment */}
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-xl, 16px)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}
              >
                <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: 'var(--text-sm, 0.875rem)', color: '#92400E', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#78350F' }}>
                    Please do not make another payment while verification is pending
                  </strong>
                  Payment confirmation can take 2 to 5 minutes as banking networks reconcile settlement status. Please click &ldquo;Refresh Status&rdquo; below to re-check your order without initiating a new charge.
                </div>
              </div>

              {/* Order Reference & Payment Details Grid */}
              <div
                style={{
                  backgroundColor: 'var(--color-pearl-surface, #F5F3EF)',
                  borderRadius: 'var(--radius-xl, 16px)',
                  border: '1px solid var(--color-border, #E2DFD8)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Order Reference</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', fontSize: '0.95rem', wordBreak: 'break-all', textAlign: 'right' }}>
                    {orderId || 'N/A'}
                  </span>
                </div>

                {verificationData.paymentReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Payment Reference</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-midnight-navy, #192A56)', wordBreak: 'break-all', textAlign: 'right' }}>
                      {verificationData.paymentReference}
                    </span>
                  </div>
                )}

                {typeof verificationData.amount === 'number' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Registration Fee</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)' }}>
                      ₹{verificationData.amount}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Verification Status</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    <Clock size={13} />
                    <span>PENDING VERIFICATION</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={checkStatus}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)'
                  }}
                >
                  <RefreshCw size={16} />
                  <span>Refresh Status</span>
                </button>

                <Link
                  to="/joining/portal"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#F1F5F9',
                    color: '#334155',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    textDecoration: 'none',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <span>Go to Candidate Portal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* USER_DROPPED State / PAYMENT ABANDONED */}
        {!loading && verificationData?.paymentStatus === 'USER_DROPPED' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 24px)',
              border: '1px solid #CBD5E1',
              boxShadow: '0 12px 32px -4px rgba(71, 85, 105, 0.10), 0 4px 12px rgba(25, 42, 86, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Header Ribbon - Slate & Navy Tone (Non-Error) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
                padding: '2.25rem 2rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}
              >
                <RotateCcw size={32} color="#FFFFFF" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                Payment Not Completed
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#CBD5E1', fontSize: 'var(--text-sm, 0.875rem)', lineHeight: 1.5 }}>
                You cancelled or exited the checkout process before completion.
              </p>
            </div>

            <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Dossier Safe Reassurance Callout */}
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 'var(--radius-xl, 16px)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}
              >
                <ShieldCheck size={22} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: 'var(--text-sm, 0.875rem)', color: '#166534', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#14532D' }}>
                    Your joining application and records are safe
                  </strong>
                  Your candidate submission remains securely saved in our system. No charges were finalized for this attempt. You can resume and complete your payment whenever you are ready.
                </div>
              </div>

              {/* Order Reference Details Grid */}
              <div
                style={{
                  backgroundColor: 'var(--color-pearl-surface, #F5F3EF)',
                  borderRadius: 'var(--radius-xl, 16px)',
                  border: '1px solid var(--color-border, #E2DFD8)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Order Reference</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', fontSize: '0.95rem', wordBreak: 'break-all', textAlign: 'right' }}>
                    {orderId || 'N/A'}
                  </span>
                </div>

                {typeof verificationData.amount === 'number' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Registration Fee</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)' }}>
                      ₹{verificationData.amount}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Status</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>NOT COMPLETED</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
                <Link
                  to={retryUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--color-midnight-navy, #192A56)',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(25, 42, 86, 0.25)'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Try Payment Again</span>
                </Link>

                <Link
                  to="/joining/portal"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#F1F5F9',
                    color: '#334155',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    textDecoration: 'none',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <span>Go to Candidate Portal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* FAILED State */}
        {!loading && verificationData?.paymentStatus === 'FAILED' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 24px)',
              border: '1px solid #FECACA',
              boxShadow: '0 12px 32px -4px rgba(220, 38, 38, 0.12), 0 4px 12px rgba(25, 42, 86, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Header Ribbon - Deep Crimson */}
            <div
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                padding: '2.25rem 2rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}
              >
                <XCircle size={34} color="#FFFFFF" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                Payment Failed
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#FEE2E2', fontSize: 'var(--text-sm, 0.875rem)', lineHeight: 1.5 }}>
                The payment could not be completed or verified by the payment gateway.
              </p>
            </div>

            <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Important Deduction Warning Callout */}
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-xl, 16px)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}
              >
                <AlertTriangle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: 'var(--text-sm, 0.875rem)', color: '#92400E', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#78350F' }}>
                    Notice regarding bank account deductions
                  </strong>
                  If money was deducted from your bank account, please do not make another payment immediately. Allow the payment status to reconcile or contact support with your Order Reference.
                </div>
              </div>

              {/* Order Details & Failure Reason Grid */}
              <div
                style={{
                  backgroundColor: 'var(--color-pearl-surface, #F5F3EF)',
                  borderRadius: 'var(--radius-xl, 16px)',
                  border: '1px solid var(--color-border, #E2DFD8)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Order Reference</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', fontSize: '0.95rem', wordBreak: 'break-all', textAlign: 'right' }}>
                    {orderId || 'N/A'}
                  </span>
                </div>

                {verificationData.paymentReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Payment Reference</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-midnight-navy, #192A56)', wordBreak: 'break-all', textAlign: 'right' }}>
                      {verificationData.paymentReference}
                    </span>
                  </div>
                )}

                {typeof verificationData.amount === 'number' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Registration Fee</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)' }}>
                      ₹{verificationData.amount}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Gateway Message</span>
                  <span style={{ color: '#DC2626', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', maxWidth: '100%', wordBreak: 'break-word' }}>
                    {verificationData.error || verificationData.message || 'Transaction could not be processed.'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Payment Status</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    <XCircle size={13} />
                    <span>PAYMENT FAILED</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
                <Link
                  to={retryUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Try Payment Again</span>
                </Link>

                <Link
                  to="/joining/portal"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#F1F5F9',
                    color: '#334155',
                    borderRadius: 'var(--radius-lg, 12px)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm, 0.875rem)',
                    textDecoration: 'none',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <span>Go to Candidate Portal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
