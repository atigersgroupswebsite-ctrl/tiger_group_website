// ==============================================================================
// File: src/pages/CandidatePaymentPage.tsx
// Description: Secure candidate-facing payment interface for A Tiger Global
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Gated by candidate authentication (getAuthorizedApplication)
//   - Amount and purpose come dynamically from server configuration (500 INR)
//   - Official Cashfree Web Checkout (V3 JS SDK) in SANDBOX mode
//   - Immediate digital receipt download upon verified success
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  Lock,
  Loader2,
  FileText,
  Briefcase
} from 'lucide-react';
import { getAuthorizedApplication } from '../services/joiningService';
import {
  getPaymentConfig,
  createPaymentOrder,
  loadCashfreeCheckoutScript,
  launchCashfreeCheckout,
  type PaymentConfigResponse
} from '../services/paymentService';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../utils/paymentReceiptGenerator';
import type { ApplicationRow, PaymentRow } from '../types/database';

export const CandidatePaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appIdParam = searchParams.get('appId');
  const returnOrderId = searchParams.get('order_id') || searchParams.get('orderId');

  // Page state
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Checkout process state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    paymentReference: string;
    receiptNumber: string;
    applicationNumber: string;
    amount: number;
    currency: string;
    paidAt: string;
    gatewayPaymentId?: string;
    candidateName: string;
    candidateEmail: string;
    purpose: string;
  } | null>(null);

  // If redirected with order_id, automatically forward to /payment/result
  useEffect(() => {
    if (returnOrderId) {
      navigate(`/payment/result?order_id=${encodeURIComponent(returnOrderId)}`, { replace: true });
    }
  }, [returnOrderId, navigate]);

  // 1. Resolve authorized application & payment config
  useEffect(() => {
    let isMounted = true;

    async function initPayment() {
      setLoading(true);
      setError(null);

      // Security check: Candidate must have valid session and authorized application
      const appResult = await getAuthorizedApplication(appIdParam);
      if (!isMounted) return;

      if (!appResult.success || !appResult.data) {
        if (appResult.accessDenied) {
          navigate('/joining/access', { replace: true });
          return;
        }
        setError(appResult.error || 'Failed to load application context.');
        setLoading(false);
        return;
      }

      const application = appResult.data;
      setApp(application);

      // Preload Cashfree V3 SDK
      loadCashfreeCheckoutScript().catch(() => {});

      // Fetch payment configuration for this application
      const configRes = await getPaymentConfig(application.id);
      if (!isMounted) return;

      if (!configRes.success) {
        setError(configRes.error || 'Unable to retrieve fee schedule.');
        setLoading(false);
        return;
      }

      setPaymentConfig(configRes);

      // Check if an existing SUCCESS payment already exists
      const existingSuccess = configRes.payments?.find(
        (p: PaymentRow) => p.status === 'SUCCESS' && p.purpose === (configRes.purpose || 'REGISTRATION')
      );

      if (existingSuccess) {
        setPaymentSuccessData({
          paymentReference: existingSuccess.payment_reference,
          receiptNumber: existingSuccess.receipt_number || existingSuccess.payment_reference,
          applicationNumber: application.application_number,
          amount: Number(existingSuccess.amount),
          currency: existingSuccess.currency,
          paidAt: existingSuccess.paid_at || existingSuccess.created_at,
          gatewayPaymentId: existingSuccess.gateway_payment_id || undefined,
          candidateName: application.full_name,
          candidateEmail: application.email,
          purpose: existingSuccess.purpose
        });
      }

      setLoading(false);
    }

    initPayment();

    return () => {
      isMounted = false;
    };
  }, [appIdParam, navigate]);

  // 2. Trigger Cashfree Web Checkout (Sandbox)
  const handleInitiatePayment = async () => {
    if (!app || !paymentConfig) return;

    setIsProcessing(true);
    setProcessStep('Preparing payment order...');
    setError(null);

    try {
      // Step A: Load Cashfree SDK
      const isScriptLoaded = await loadCashfreeCheckoutScript();
      if (!isScriptLoaded) {
        throw new Error('Could not load Cashfree payment gateway SDK. Please check your internet connection.');
      }

      // Step B: Request server to create atomic payment order
      setProcessStep('Connecting to Cashfree Sandbox...');
      const orderRes = await createPaymentOrder(
        app.id,
        paymentConfig.purpose || 'REGISTRATION'
      );

      if (!orderRes.success) {
        throw new Error(orderRes.error || 'Unable to create payment order.');
      }

      // If already paid
      if (orderRes.alreadyPaid) {
        setPaymentSuccessData({
          paymentReference: orderRes.paymentReference || 'N/A',
          receiptNumber: orderRes.receiptNumber || 'N/A',
          applicationNumber: app.application_number,
          amount: orderRes.amount || paymentConfig.amount || 0,
          currency: orderRes.currency || 'INR',
          paidAt: new Date().toISOString(),
          gatewayPaymentId: (orderRes as any).gatewayPaymentId,
          candidateName: app.full_name,
          candidateEmail: app.email,
          purpose: paymentConfig.purpose || 'REGISTRATION'
        });
        setIsProcessing(false);
        return;
      }

      const paymentSessionId = orderRes.payment_session_id;
      if (!paymentSessionId) {
        throw new Error('Cashfree did not return a valid payment session ID.');
      }

      setProcessStep('Launching Cashfree Checkout...');

      // Step C: Trigger Cashfree V3 Web Checkout in SANDBOX
      await launchCashfreeCheckout(paymentSessionId);
    } catch (err: any) {
      console.error('[CASHFREE_CHECKOUT_ERROR]', err);
      setError(err.message || 'Payment initiation encountered an issue.');
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  // 3. Download Receipt Handler
  const handleDownloadReceipt = () => {
    if (!paymentSuccessData) return;

    const receiptPayload: PaymentReceiptData = {
      applicationNumber: paymentSuccessData.applicationNumber,
      paymentReference: paymentSuccessData.paymentReference,
      receiptNumber: paymentSuccessData.receiptNumber,
      candidateName: paymentSuccessData.candidateName,
      candidateEmail: paymentSuccessData.candidateEmail,
      paymentPurpose: paymentSuccessData.purpose,
      amount: paymentSuccessData.amount,
      currency: paymentSuccessData.currency,
      paymentDate: paymentSuccessData.paidAt,
      paymentStatus: 'SUCCESS',
      paymentMethod: 'ONLINE / CASHFREE (SANDBOX)',
      gateway: 'CASHFREE',
      gatewayPaymentId: paymentSuccessData.gatewayPaymentId
    };

    downloadPaymentReceiptPdf(receiptPayload);
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 size={36} color="#192A56" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <h3 style={{ margin: 0, color: '#192A56', fontSize: '1.1rem', fontWeight: 700 }}>
          Loading Application Payment Schedule...
        </h3>
        <p style={{ margin: '0.35rem 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
          Verifying candidate authorization and security credentials
        </p>
      </div>
    );
  }

  // Error State
  if (error && !app) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <AlertCircle size={42} color="#DC2626" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#192A56', margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 800 }}>
          Payment Access Denied
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          {error}
        </p>
        <Link
          to="/joining/access"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#192A56',
            color: '#FFFFFF',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          <span>Go to Access Portal</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: PAYMENT COMPLETED / SUCCESS SCREEN
  // =========================================================================
  if (paymentSuccessData) {
    return (
      <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1rem' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #A7F3D0',
            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.1)',
            overflow: 'hidden'
          }}
        >
          {/* Header Ribbon */}
          <div style={{ backgroundColor: '#047857', padding: '2rem', textAlign: 'center', color: '#FFFFFF' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', marginBottom: '1rem' }}>
              <CheckCircle2 size={32} color="#FFFFFF" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Payment Verified Successfully!
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#D1FAE5', fontSize: '0.9rem' }}>
              Dossier registration fee confirmed via Cashfree Sandbox
            </p>
          </div>

          {/* Receipt Content */}
          <div style={{ padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Receipt Number
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                    {paymentSuccessData.receiptNumber}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Reference
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace', marginTop: '2px' }}>
                    {paymentSuccessData.paymentReference}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Candidate Name
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56', marginTop: '2px' }}>
                    {paymentSuccessData.candidateName}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Application Number
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                    {paymentSuccessData.applicationNumber}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Amount Paid
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                    ₹{paymentSuccessData.amount.toFixed(2)} {paymentSuccessData.currency}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Date
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {new Date(paymentSuccessData.paidAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Reference Slip Notice */}
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={24} color="#2563EB" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.825rem', color: '#1E40AF', lineHeight: 1.4 }}>
                <strong>Official Reference Slip:</strong> Your verified Reference Slip PDF has been generated and dispatched to your email via Resend.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#192A56',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(25, 42, 86, 0.15)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={18} />
                <span>DOWNLOAD RECEIPT (PDF)</span>
              </button>

              <Link
                to="/joining"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#FFFFFF',
                  color: '#192A56',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.75rem 1.35rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>CONTINUE TO DOSSIER</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: PAYMENT PENDING SCREEN (Checkout Entry)
  // =========================================================================
  return (
    <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1rem' }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 30px -5px rgba(25, 42, 86, 0.08)',
          overflow: 'hidden'
        }}
      >
        {/* Header Ribbon */}
        <div style={{ backgroundColor: '#192A56', padding: '1.75rem 2rem', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C5A059', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                CASHFREE GATEWAY • SANDBOX MODE
              </span>
              <h1 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Candidate Registration Fee
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255,255,255,0.12)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              <Lock size={14} color="#C5A059" />
              <span>SSL 256-Bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#991B1B', fontSize: '0.85rem', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate & Application Snapshot */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Application Number
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>
                  {app?.application_number}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Candidate Name
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56', marginTop: '2px' }}>
                  {app?.full_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Registered Email
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '2px', wordBreak: 'break-all' }}>
                  {app?.email}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Payment Purpose
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#192A56', marginTop: '2px' }}>
                  {paymentConfig?.purposeTitle || 'Registration & Verification'}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Breakdown Box */}
          <div style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#64748B" />
                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>Candidate Registration & Dossier Verification</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56' }}>
                {paymentConfig?.amount ? `₹${Number(paymentConfig.amount).toFixed(2)}` : '—'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>Total Payable Now</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#192A56' }}>
                {paymentConfig?.amount ? `₹${Number(paymentConfig.amount).toFixed(2)}` : '—'}
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '4px', fontWeight: 600 }}>INR</span>
              </span>
            </div>
          </div>

          {/* Consultancy Policy Notice */}
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '1rem', marginBottom: '1.75rem', display: 'flex', gap: '0.75rem' }}>
            <FileText size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.775rem', color: '#92400E', lineHeight: 1.5 }}>
              <strong>A Tiger Global Consultancy Fee Policy:</strong><br />
              {paymentConfig?.policyNote || `Authoritative registration fee of ₹${paymentConfig?.amount ?? 500} is payable upon joining form submission.`}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleInitiatePayment}
            disabled={isProcessing}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              backgroundColor: isProcessing ? '#94A3B8' : '#192A56',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.9rem',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(25, 42, 86, 0.2)',
              transition: 'background-color 0.15s ease',
              lineHeight: 1.35,
              whiteSpace: 'normal'
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{processStep || 'Processing Payment...'}</span>
              </>
            ) : (
              <>
                <CreditCard size={20} color="#C5A059" />
                <span>PAY NOW WITH CASHFREE — {paymentConfig?.amount ? `₹${Number(paymentConfig.amount).toFixed(2)}` : 'PROCEED'}</span>
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#64748B', flexWrap: 'wrap' }}>
            <span>Cashfree Sandbox Checkout</span>
            <span>•</span>
            <span>UPI / Cards / Net Banking</span>
            <span>•</span>
            <span>Official Reference Slip Issued On Success</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePaymentPage;
