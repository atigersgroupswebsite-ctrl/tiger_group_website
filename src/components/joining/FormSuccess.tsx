import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Eye, FileText, ArrowRight, Loader2, RefreshCw, CreditCard, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import type { JoiningFormData } from '../../types/joining';
import { downloadJoiningPacketPdf } from '../../services/joiningPdfGenerator';
import { createPaymentOrder, launchCashfreeCheckout } from '../../services/paymentService';
import { supabase } from '../../lib/supabaseClient';
import { downloadPaymentReceiptPdf } from '../../utils/paymentReceiptGenerator';

interface FormSuccessProps {
  formData: JoiningFormData;
  onViewSubmission?: () => void;
  onReset?: () => void;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({
  formData,
  onViewSubmission,
  onReset
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState<boolean>(true);
  const [paymentRecord, setPaymentRecord] = useState<any | null>(null);

  // Check live payment state for this dossier
  useEffect(() => {
    let isMounted = true;

    async function checkPaymentStatus() {
      const targetId = formData.formId;
      const appId = formData.applicationId;
      if (!targetId && !appId) {
        setLoadingPayment(false);
        return;
      }

      try {
        let query = supabase.from('payments').select('*');
        if (targetId) {
          query = query.eq('joining_form_id', targetId);
        } else if (appId) {
          query = query.eq('application_id', appId);
        }

        const { data: payments } = await query.order('created_at', { ascending: false });
        if (!isMounted) return;

        if (payments && payments.length > 0) {
          const successPayment = payments.find((p: any) => p.status === 'SUCCESS');
          const pendingPayment = payments.find((p: any) => p.status === 'PENDING');
          setPaymentRecord(successPayment || pendingPayment || payments[0]);
        }
      } catch (err) {
        console.warn('Payment status query notice:', err);
      } finally {
        if (isMounted) setLoadingPayment(false);
      }
    }

    checkPaymentStatus();

    return () => {
      isMounted = false;
    };
  }, [formData.formId, formData.applicationId]);

  const handleDownloadReceipt = () => {
    if (!paymentRecord) return;
    downloadPaymentReceiptPdf({
      applicationNumber: formData.joiningReference || formData.applicationId || 'ATG-JOIN',
      paymentReference: paymentRecord.payment_reference || 'N/A',
      receiptNumber: paymentRecord.receipt_number || paymentRecord.payment_reference || 'REC',
      candidateName: formData.personal.employeeName || 'Candidate',
      candidateEmail: formData.personal.emailId || formData.userEmail || '',
      paymentPurpose: 'Candidate Registration & Dossier Verification Fee',
      amount: Number(paymentRecord.amount) || 500,
      currency: paymentRecord.currency || 'INR',
      paymentDate: paymentRecord.paid_at || paymentRecord.created_at || new Date().toISOString(),
      paymentStatus: 'SUCCESS',
      paymentMethod: paymentRecord.payment_method || 'ONLINE / CASHFREE (SANDBOX)',
      gateway: paymentRecord.gateway || 'CASHFREE',
      gatewayOrderId: paymentRecord.gateway_order_id,
      gatewayPaymentId: paymentRecord.gateway_payment_id
    });
  };

  const handleProceedPayment = async () => {
    if (isProcessingPayment) return;
    setPaymentError(null);
    setIsProcessingPayment(true);

    try {
      const targetJoiningFormId = formData.formId;
      const targetApplicationId = formData.applicationId;

      if (!targetJoiningFormId && !targetApplicationId) {
        throw new Error('No valid dossier reference found to initiate payment.');
      }

      const res = await createPaymentOrder(
        targetJoiningFormId
          ? { joiningFormId: targetJoiningFormId }
          : { applicationId: targetApplicationId }
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to initiate payment with Cashfree. Please try again.');
      }

      if (res.alreadyPaid) {
        setPaymentRecord({
          status: 'SUCCESS',
          payment_reference: res.paymentReference,
          receipt_number: res.receiptNumber,
          amount: res.amount || 500,
          currency: res.currency || 'INR',
          paid_at: (res as any).paidAt || new Date().toISOString()
        });
        setIsProcessingPayment(false);
        return;
      }

      if (!res.payment_session_id) {
        throw new Error('Cashfree payment session was not established. Please retry.');
      }

      // Launch Cashfree V3 SDK checkout in sandbox mode
      await launchCashfreeCheckout(res.payment_session_id);
    } catch (err: any) {
      console.error('[JOINING_PAYMENT_ERROR]', err);
      setPaymentError(err.message || 'Payment initiation failed. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadPacket = async () => {
    setIsDownloading(true);
    try {
      await downloadJoiningPacketPdf(formData);
    } catch (err: any) {
      alert('Unable to generate joining packet PDF. Please view and print your submission.');
    } finally {
      setIsDownloading(false);
    }
  };

  const referenceNumber = formData.joiningReference || formData.applicationId || 'JOIN-CONFIRMED';
  const isPaid = paymentRecord?.status === 'SUCCESS';

  return (
    <div
      style={{
        maxWidth: '740px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 3.5rem)',
        backgroundColor: 'var(--color-pearl-white)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(25, 42, 86, 0.08)',
          color: 'var(--color-midnight-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-6)'
        }}
      >
        <CheckCircle size={40} style={{ color: 'var(--color-midnight-navy)' }} />
      </div>

      <span className="eyebrow" style={{ letterSpacing: '0.15em', color: 'var(--color-champagne-dark)' }}>
        SUBMISSION CONFIRMED
      </span>
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
          color: 'var(--color-midnight-navy)',
          marginBottom: 'var(--space-3)',
          letterSpacing: '-0.01em',
          fontWeight: 800
        }}
      >
        JOINING FORM RECORDED
      </h1>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          maxWidth: '560px',
          margin: '0 auto var(--space-8)',
          lineHeight: 1.6
        }}
      >
        Your official joining dossier has been received and securely registered.
        {isPaid
          ? ' Your registration fee of ₹500 has been verified.'
          : ' Please complete the registration & verification fee of ₹500 to proceed with onboarding validation.'}
      </p>

      {/* Application Snapshot Card */}
      <div
        style={{
          backgroundColor: 'var(--color-pearl-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          textAlign: 'left',
          marginBottom: 'var(--space-8)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Joining Reference
            </span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '2px', fontFamily: 'monospace' }}>
              {referenceNumber}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dossier Status
            </span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#065F46',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.05em'
                }}
              >
                ● SUBMITTED / VALIDATION
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fee & Payment Status
            </span>
            <div style={{ marginTop: '4px' }}>
              {loadingPayment ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Checking status...</span>
              ) : isPaid ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.05em',
                    border: '1px solid #A7F3D0'
                  }}
                >
                  ● PAID & VERIFIED (₹500)
                </span>
              ) : paymentRecord?.status === 'PENDING' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    fontWeight: 700,
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.05em',
                    border: '1px solid #FDE68A'
                  }}
                >
                  ● PAYMENT PENDING (₹500)
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#FEF2F2',
                    color: '#B91C1C',
                    fontWeight: 700,
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.05em',
                    border: '1px solid #FECACA'
                  }}
                >
                  ● NOT PAID (₹500)
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Name
            </span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-midnight-navy)', marginTop: '2px' }}>
              {formData.personal.employeeName || 'Candidate'}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px dashed var(--color-border)',
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={14} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
          <span>
            Please retain your Joining Reference for all future HR correspondence and reporting day onboarding verification.
          </span>
        </div>
      </div>

      {/* Payment Action Section */}
      <div
        style={{
          marginBottom: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        {paymentError && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              borderRadius: 'var(--radius-lg)',
              color: '#991B1B',
              fontSize: '0.85rem',
              maxWidth: '540px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textAlign: 'left'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{paymentError}</span>
          </div>
        )}

        {isPaid ? (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#F0FDF4',
              border: '2px solid #16A34A',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '540px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.65rem',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 800, fontSize: '0.95rem' }}>
              <ShieldCheck size={20} />
              <span>REGISTRATION & VERIFICATION FEE PAID</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#14532D', lineHeight: 1.5 }}>
              Your ₹500 fee has been verified via Cashfree. Ref: <strong style={{ fontFamily: 'monospace' }}>{paymentRecord?.payment_reference || paymentRecord?.receipt_number || 'PAID'}</strong>. Your joining dossier is currently under HR onboarding validation.
            </p>
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="btn btn-navy btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                fontSize: '0.8rem',
                marginTop: '0.25rem'
              }}
            >
              <Download size={14} />
              <span>DOWNLOAD PAYMENT RECEIPT (PDF)</span>
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-midnight-navy)', fontWeight: 700, display: 'block' }}>
                Registration & Verification Fee: ₹500
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Cashfree Sandbox checkout supports UPI, Cards, Net Banking & Wallets
              </span>
            </div>

            <button
              type="button"
              onClick={handleProceedPayment}
              disabled={isProcessingPayment}
              className="btn btn-navy btn-md"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 800,
                padding: '0.85rem 1.85rem',
                fontSize: '0.9rem',
                letterSpacing: '0.03em',
                boxShadow: '0 4px 14px rgba(25, 42, 86, 0.2)',
                cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                opacity: isProcessingPayment ? 0.75 : 1
              }}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>CONNECTING TO CASHFREE...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>PAY REGISTRATION & VERIFICATION FEE (₹500)</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)'
        }}
      >
        <button
          type="button"
          onClick={handleDownloadPacket}
          disabled={isDownloading}
          className="btn btn-navy btn-md"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700
          }}
        >
          {isDownloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>GENERATING PACKET PDF...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>DOWNLOAD JOINING PACKET (PDF)</span>
            </>
          )}
        </button>

        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Eye size={16} />}
          onClick={onViewSubmission}
        >
          VIEW / PRINT DOSSIER
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button
          to="/"
          variant="outline"
          size="sm"
          icon={<ArrowRight size={14} />}
        >
          RETURN TO HOMEPAGE
        </Button>

        {onReset && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onReset}
            style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} />
            <span>START ANOTHER JOINING FORM</span>
          </button>
        )}
      </div>
    </div>
  );
};
