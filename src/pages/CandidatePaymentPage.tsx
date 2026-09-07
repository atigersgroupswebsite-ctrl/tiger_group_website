// ==============================================================================
// File: src/pages/CandidatePaymentPage.tsx
// Description: Secure candidate-facing payment interface for A Tiger Global
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Gated by candidate authentication (getAuthorizedApplication)
//   - Amount and purpose come dynamically from server/database configuration
//   - Official Razorpay checkout with strict server-side HMAC verification
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
  verifyPaymentWithServer,
  loadRazorpayCheckoutScript,
  type PaymentConfigResponse
} from '../services/paymentService';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../utils/paymentReceiptGenerator';
import type { ApplicationRow, PaymentRow } from '../types/database';

export const CandidatePaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appIdParam = searchParams.get('appId');

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

  // 2. Trigger Razorpay Checkout
  const handleInitiatePayment = async () => {
    if (!app || !paymentConfig) return;

    setIsProcessing(true);
    setProcessStep('Preparing payment order...');
    setError(null);

    try {
      // Step A: Load Razorpay script
      const isScriptLoaded = await loadRazorpayCheckoutScript();
      if (!isScriptLoaded) {
        throw new Error('Could not load Razorpay payment gateway. Please check your internet connection.');
      }

      // Step B: Request server to create atomic payment order
      setProcessStep('Connecting to secure gateway...');
      const orderRes = await createPaymentOrder(
        app.id,
        paymentConfig.purpose || 'REGISTRATION',
        paymentConfig.amount || 500
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
          amount: orderRes.amount || 500,
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

      const paymentId = orderRes.paymentId!;
      const orderId = orderRes.orderId!;
      const keyId = orderRes.keyId || paymentConfig.keyId || 'rzp_test_TigerGlobal2026';

      setProcessStep('Awaiting payment completion...');

      // Step C: Initialize Razorpay Checkout Options
      const options = {
        key: keyId,
        amount: Math.round(Number(orderRes.amount || 500) * 100), // in paise
        currency: orderRes.currency || 'INR',
        name: 'A TIGER GLOBAL',
        description: `${paymentConfig.purposeTitle || 'Registration Fee'} • App #${app.application_number}`,
        image: '/assets/logo.png',
        order_id: orderId.startsWith('order_') && !orderId.includes('order_PAY') ? orderId : undefined,
        prefill: {
          name: app.full_name,
          email: app.email,
          contact: app.mobile
        },
        notes: {
          application_id: app.id,
          application_number: app.application_number,
          payment_reference: orderRes.paymentReference
        },
        theme: {
          color: '#192A56'
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setProcessStep('');
          }
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id?: string;
          razorpay_signature: string;
        }) => {
          setIsProcessing(true);
          setProcessStep('Verifying payment signature with server...');

          try {
            // Step D: Official Server-side cryptographic signature verification
            const verifyRes = await verifyPaymentWithServer({
              paymentId,
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (!verifyRes.success) {
              throw new Error(verifyRes.error || 'Server payment verification failed.');
            }

            setPaymentSuccessData({
              paymentReference: verifyRes.paymentReference || orderRes.paymentReference || 'N/A',
              receiptNumber: verifyRes.receiptNumber || 'N/A',
              applicationNumber: app.application_number,
              amount: verifyRes.amount || orderRes.amount || 500,
              currency: verifyRes.currency || 'INR',
              paidAt: verifyRes.paidAt || new Date().toISOString(),
              gatewayPaymentId: response.razorpay_payment_id,
              candidateName: app.full_name,
              candidateEmail: app.email,
              purpose: paymentConfig.purpose || 'REGISTRATION'
            });
          } catch (verErr: any) {
            setError(verErr.message || 'Payment verification encountered an issue.');
          } finally {
            setIsProcessing(false);
            setProcessStep('');
          }
        }
      };

      // In production, NEVER permit mock or simulated payments. Real Razorpay checkout is strictly required.
      if (import.meta.env.PROD) {
        if (!(window as any).Razorpay) {
          setError('Razorpay payment gateway script could not be loaded. Please verify your connection and refresh.');
          setIsProcessing(false);
          setProcessStep('');
          return;
        }
        if (keyId.includes('test_TigerGlobal')) {
          setError('Live payment gateway configuration is pending for this environment. Please contact support.');
          setIsProcessing(false);
          setProcessStep('');
          return;
        }
      }

      // Check if running in local development simulated mode (strictly DEV only)
      if (import.meta.env.DEV && (keyId.includes('test_TigerGlobal') || !(window as any).Razorpay)) {
        // Provide clear local testing fallback with server verification
        const simulatedPaymentId = `pay_sim_${Date.now()}`;
        const simulatedOrderId = orderId;
        const simulatedSignature = 'simulated_success';

        setTimeout(async () => {
          setProcessStep('Verifying transaction in test gateway...');
          const verifyRes = await verifyPaymentWithServer({
            paymentId,
            razorpay_order_id: simulatedOrderId,
            razorpay_payment_id: simulatedPaymentId,
            razorpay_signature: simulatedSignature
          });

          if (!verifyRes.success) {
            setError(verifyRes.error || 'Payment verification failed.');
            setIsProcessing(false);
            setProcessStep('');
            return;
          }

          setPaymentSuccessData({
            paymentReference: verifyRes.paymentReference || orderRes.paymentReference || 'N/A',
            receiptNumber: verifyRes.receiptNumber || 'N/A',
            applicationNumber: app.application_number,
            amount: verifyRes.amount || orderRes.amount || 500,
            currency: verifyRes.currency || 'INR',
            paidAt: verifyRes.paidAt || new Date().toISOString(),
            gatewayPaymentId: simulatedPaymentId,
            candidateName: app.full_name,
            candidateEmail: app.email,
            purpose: paymentConfig.purpose || 'REGISTRATION'
          });
          setIsProcessing(false);
          setProcessStep('');
        }, 800);
        return;
      }

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', (failRes: any) => {
        setIsProcessing(false);
        setProcessStep('');
        setError(failRes?.error?.description || 'Payment was declined or cancelled by bank.');
      });
      rzpInstance.open();
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during payment.');
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
      paymentMethod: 'ONLINE / RAZORPAY',
      gateway: 'RAZORPAY',
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
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          <span>Return to Access Portal</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: PAYMENT SUCCESS SCREEN
  // =========================================================================
  if (paymentSuccessData) {
    return (
      <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1rem' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px -5px rgba(25, 42, 86, 0.08)',
            padding: 'clamp(1.5rem, 5vw, 2.5rem)',
            textAlign: 'center'
          }}
        >
          {/* Success Check Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#166534',
              backgroundColor: '#F0FDF4',
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid #BBF7D0'
            }}
          >
            TRANSACTION VERIFIED
          </span>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 800,
              color: '#192A56',
              margin: '0.75rem 0 0.5rem 0'
            }}
          >
            PAYMENT SUCCESSFUL
          </h1>

          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
            Your registration fee has been successfully processed and recorded into the corporate placement ledger.
          </p>

          {/* Payment Detail Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.25rem 1.5rem',
              textAlign: 'left',
              marginBottom: '1.75rem'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Payment Reference
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                  {paymentSuccessData.paymentReference}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Receipt Number
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', fontFamily: 'monospace', marginTop: '2px' }}>
                  {paymentSuccessData.receiptNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Application Number
                </span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                  {paymentSuccessData.applicationNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Amount Paid
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#192A56', marginTop: '2px' }}>
                  ₹{Number(paymentSuccessData.amount).toFixed(2)} {paymentSuccessData.currency}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Payment Date
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {new Date(paymentSuccessData.paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              {paymentSuccessData.gatewayPaymentId && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Transaction ID
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                    {paymentSuccessData.gatewayPaymentId}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: '1rem', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#64748B' }}>
              <ShieldCheck size={16} color="#166534" />
              <span>A digital copy of this receipt has been dispatched to <strong>{paymentSuccessData.candidateEmail}</strong>.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
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
                ONBOARDING PAYMENT GATEWAY
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Application Number
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
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
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#64748B" />
                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>Candidate Registration & Dossier Verification</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56' }}>
                ₹{Number(paymentConfig?.amount || 500).toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>Total Payable Now</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#192A56' }}>
                ₹{Number(paymentConfig?.amount || 500).toFixed(2)}
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '4px', fontWeight: 600 }}>INR</span>
              </span>
            </div>
          </div>

          {/* Consultancy Policy Notice */}
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '1rem', marginBottom: '1.75rem', display: 'flex', gap: '0.75rem' }}>
            <FileText size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.775rem', color: '#92400E', lineHeight: 1.5 }}>
              <strong>A Tiger Global Consultancy Fee Policy:</strong><br />
              Total consultancy charge is ₹1,000/-. ₹500/- is collected upon registration and joining dossier submission.
              The remaining ₹500/- will be coordinated after one month of active placement at the assigned plant/firm.
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
              transition: 'background-color 0.15s ease'
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
                <span>PAY NOW — ₹{Number(paymentConfig?.amount || 500).toFixed(2)}</span>
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
            <span>Razorpay Secure Gateway</span>
            <span>•</span>
            <span>UPI / Debit / Credit / Net Banking</span>
            <span>•</span>
            <span>Instant Digital Receipt</span>
          </div>
        </div>
      </div>
    </div>
  );
};
