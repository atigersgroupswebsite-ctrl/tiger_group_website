// ==============================================================================
// File: src/components/admin/PaymentReceiptModal.tsx
// Description: Executive modal preview of official Payment Receipt for Admins
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import React, { useState } from 'react';
import { Download, Mail, X, CheckCircle2, Loader2 } from 'lucide-react';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../../utils/paymentReceiptGenerator';
import { resendPaymentReceiptEmail } from '../../services/paymentService';

interface PaymentReceiptModalProps {
  receiptData: PaymentReceiptData;
  paymentId: string;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  receiptData,
  paymentId,
  onClose
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleDownload = () => {
    downloadPaymentReceiptPdf(receiptData);
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendPaymentReceiptEmail(paymentId);
      if (res.success) {
        setResendStatus('Receipt email dispatched successfully!');
      } else {
        setResendStatus('Failed to send email. Please check server logs.');
      }
    } catch {
      setResendStatus('Failed to send email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 42, 86, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(25, 42, 86, 0.35)',
          border: '1px solid #E2E8F0',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header Ribbon */}
        <div style={{ backgroundColor: '#192A56', padding: '1.5rem 1.75rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C5A059', letterSpacing: '0.12em' }}>
              OFFICIAL PAYMENT RECEIPT
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
              {receiptData.receiptNumber}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Body */}
        <div style={{ padding: '1.75rem' }}>
          {resendStatus && (
            <div
              style={{
                backgroundColor: resendStatus.includes('success') ? '#DCFCE7' : '#FEE2E2',
                color: resendStatus.includes('success') ? '#166534' : '#991B1B',
                border: '1px solid',
                borderColor: resendStatus.includes('success') ? '#BBF7D0' : '#FCA5A5',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* Key Facts Card */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Candidate</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#192A56', marginTop: '2px' }}>{receiptData.candidateName}</div>
                <div style={{ fontSize: '0.775rem', color: '#64748B' }}>{receiptData.candidateEmail}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Application</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#192A56', fontFamily: 'monospace', marginTop: '2px' }}>
                  {receiptData.applicationNumber}
                </div>
                <div style={{ fontSize: '0.775rem', color: '#64748B' }}>Ref: {receiptData.paymentReference}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Amount Paid</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                  ₹{Number(receiptData.amount).toFixed(2)} {receiptData.currency}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={16} />
                  <span>VERIFIED SUCCESS</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Method / Gateway</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                  {receiptData.paymentMethod || 'ONLINE'} ({receiptData.gateway || 'RAZORPAY'})
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Date Paid</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {new Date(receiptData.paymentDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            {receiptData.gatewayPaymentId && (
              <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: '1rem', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Razorpay Payment ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.825rem', fontWeight: 700, color: '#192A56', marginLeft: '6px' }}>
                  {receiptData.gatewayPaymentId}
                </span>
              </div>
            )}
          </div>

          {/* Consultancy Policy Notice */}
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.775rem', color: '#92400E', lineHeight: 1.4 }}>
            <strong>Consultancy Fee Schedule:</strong> Rs. 500/- collected upon dossier registration. Remaining Rs. 500/- will be coordinated after one month of continuous placement.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#F1F5F9',
                color: '#192A56',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '0.6rem 1rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: isResending ? 'not-allowed' : 'pointer'
              }}
            >
              {isResending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
              <span>{isResending ? 'Sending...' : 'RESEND RECEIPT EMAIL'}</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-admin-secondary"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleDownload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#192A56',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Download size={16} color="#C5A059" />
                <span>DOWNLOAD PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
