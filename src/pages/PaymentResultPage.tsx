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
  Loader2,
  Download,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  FileCheck
} from 'lucide-react';
import { verifyPaymentWithServer, downloadReferenceSlipPdf, type VerifyPaymentResponse } from '../services/paymentService';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';

  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<VerifyPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm, 0.875rem)' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Payment Reference</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', fontSize: '0.95rem' }}>
                    {verificationData.paymentReference || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Receipt Number</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-midnight-navy, #192A56)' }}>
                    {verificationData.receiptNumber || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary, #4A5568)', fontWeight: 600 }}>Amount Paid</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                    ₹{Number(verificationData.amount || 500).toFixed(2)} {verificationData.currency || 'INR'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm, 0.875rem)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
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
                        borderRadius: 'var(--radius-sm, 4px)'
                      }}
                    >
                      {verificationData.referenceSlipNumber}
                    </span>
                  </div>
                )}

                {verificationData.gatewayPaymentId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted, #718096)', borderTop: '1px solid var(--color-border, #E2DFD8)', paddingTop: '0.75rem' }}>
                    <span>Cashfree Txn ID</span>
                    <span style={{ fontFamily: 'monospace' }}>{verificationData.gatewayPaymentId}</span>
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
              borderRadius: 'var(--radius-2xl, 20px)',
              border: '1px solid #FDE68A',
              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(25, 42, 86, 0.04))',
              padding: '2.5rem 2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Clock size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', margin: '0 0 0.5rem 0' }}>
              Payment Awaiting Confirmation
            </h2>
            <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', maxWidth: '440px', margin: '0 auto 1.75rem auto', lineHeight: 1.5 }}>
              Your transaction is currently active or pending confirmation from your bank or payment method.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={checkStatus}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Refresh Status</span>
              </button>
              <Link
                to="/joining/portal"
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
                Go to Portal
              </Link>
            </div>
          </div>
        )}

        {/* USER DROPPED State */}
        {!loading && verificationData?.paymentStatus === 'USER_DROPPED' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-2xl, 20px)',
              border: '1px solid var(--color-border, #E2DFD8)',
              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(25, 42, 86, 0.04))',
              padding: '2.5rem 2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <RotateCcw size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', margin: '0 0 0.5rem 0' }}>
              Checkout Cancelled &mdash; No funds charged
            </h2>
            <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', maxWidth: '440px', margin: '0 auto 0.5rem auto', lineHeight: 1.5 }}>
              {verificationData.message || 'You exited the Cashfree checkout window before completing the payment.'}
            </p>
            <p style={{ fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--color-text-muted, #718096)', margin: '0 auto 1.75rem auto' }}>
              Your Joining submission is securely saved and awaiting the ₹500 Registration &amp; Verification Fee.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                to="/joining/payment"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'var(--color-midnight-navy, #192A56)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  textDecoration: 'none'
                }}
              >
                <RotateCcw size={16} />
                <span>Resume Payment / Pay ₹500</span>
              </Link>
              <Link
                to="/joining/portal"
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
                Return to Portal
              </Link>
            </div>
          </div>
        )}

        {/* FAILED State */}
        {!loading && verificationData?.paymentStatus === 'FAILED' && (
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
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <XCircle size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy, #192A56)', margin: '0 0 0.5rem 0' }}>
              Payment Not Completed
            </h2>
            <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-secondary, #4A5568)', maxWidth: '440px', margin: '0 auto 0.5rem auto', lineHeight: 1.5 }}>
              {verificationData.error || 'The payment was cancelled or failed at Cashfree.'}
            </p>
            <p style={{ fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--color-text-muted, #718096)', margin: '0 auto 1.75rem auto' }}>
              No funds were charged. You can retry safely at any time.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                to="/joining/payment"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  textDecoration: 'none'
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
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm, 0.875rem)',
                  textDecoration: 'none'
                }}
              >
                Return to Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
