// ==============================================================================
// File: src/pages/admin/AdminPaymentDetailPage.tsx
// Description: Detailed Payment Transaction Dossier & Audit History
// Brand: A Tiger Group's — Operational Administrative Review
// Security:
//   - Zero KYC PII exposure (Aadhaar/PAN/Bank numbers strictly excluded)
//   - Official cryptographic verification state
//   - Activity logs audit trail (entity_type = 'PAYMENT')
//   - Receipt rendering, download, and email dispatch
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getPaymentById,
  type PaymentLedgerItem
} from '../../services/adminPaymentService';
import type { ActivityLogRow, PaymentStatus } from '../../types/database';
import { PaymentReceiptModal } from '../../components/admin/PaymentReceiptModal';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../../utils/paymentReceiptGenerator';
import { resendPaymentReceiptEmail } from '../../services/paymentService';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  Building2,
  FileText,
  Download,
  Mail,
  ExternalLink,
  ShieldCheck,
  User,
  Loader2
} from 'lucide-react';

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  SUCCESS: {
    label: 'Verified / Paid',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: CheckCircle2
  },
  PENDING: {
    label: 'Pending Verification',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: Clock
  },
  FAILED: {
    label: 'Failed',
    color: '#B91C1C',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    icon: XCircle
  },
  REFUNDED: {
    label: 'Refunded',
    color: '#6B21A8',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    icon: RotateCcw
  },
  OFFLINE: {
    label: 'Offline Recorded',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: Building2
  }
};

const PURPOSE_LABELS: Record<string, string> = {
  REGISTRATION: 'Registration & Candidate Dossier Verification',
  CONSULTANCY: 'Placement Consultancy Fee',
  OTHER: 'Administrative Service Fee'
};

export const AdminPaymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [payment, setPayment] = useState<PaymentLedgerItem | null>(null);
  const [activities, setActivities] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPayment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPaymentById(id);
      if (!res.payment) {
        setError('Payment transaction record not found.');
      } else {
        setPayment(res.payment);
        setActivities(res.activities);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: '#192A56' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading transaction dossier...</div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div style={{ padding: '3rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#DC2626', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem 0' }}>
            {error || 'Payment Record Not Found'}
          </h2>
          <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            The requested payment transaction does not exist or may have been deleted.
          </p>
          <Link
            to="/admin/payments"
            className="btn-admin-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={16} />
            <span>Return to Payments Ledger</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConf.icon;

  const receiptData: PaymentReceiptData = {
    applicationNumber: payment.sourceReference,
    paymentReference: payment.payment_reference,
    receiptNumber: payment.receipt_number || payment.payment_reference,
    candidateName: payment.candidateName,
    candidateEmail: payment.candidateEmail,
    candidateMobile: payment.candidateMobile,
    paymentPurpose: payment.purpose,
    amount: Number(payment.amount),
    currency: payment.currency || 'INR',
    paymentDate: payment.paid_at || payment.created_at,
    paymentStatus: payment.status,
    paymentMethod: payment.payment_method || 'ONLINE',
    gateway: payment.gateway || 'RAZORPAY',
    gatewayOrderId: payment.gateway_order_id,
    gatewayPaymentId: payment.gateway_payment_id
  };

  const handleDownloadReceipt = () => {
    downloadPaymentReceiptPdf(receiptData);
  };

  const handleResendReceipt = async () => {
    setIsResending(true);
    setActionNotice(null);
    try {
      const res = await resendPaymentReceiptEmail(payment.id);
      if (res.success) {
        setActionNotice({
          type: 'success',
          text: `Payment receipt email re-dispatched to ${payment.candidateEmail}.`
        });
      } else {
        setActionNotice({
          type: 'error',
          text: res.error || 'Failed to dispatch receipt email.'
        });
      }
    } catch {
      setActionNotice({
        type: 'error',
        text: 'Failed to send receipt email. Please check server logs.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.75rem' }}>
          <Link to="/admin" style={{ color: '#64748B', textDecoration: 'none' }}>Admin</Link>
          <span>/</span>
          <Link to="/admin/payments" style={{ color: '#64748B', textDecoration: 'none' }}>Payments</Link>
          <span>/</span>
          <span style={{ color: '#192A56', fontWeight: 700, fontFamily: 'monospace' }}>{payment.payment_reference}</span>
        </div>

        <Link
          to="/admin/payments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#192A56',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Payments Ledger</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#192A56', margin: 0, fontFamily: 'monospace' }}>
                {payment.payment_reference}
              </h1>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: statusConf.color,
                  backgroundColor: statusConf.bg,
                  border: `1px solid ${statusConf.border}`
                }}
              >
                <StatusIcon size={14} />
                <span>{statusConf.label}</span>
              </span>
            </div>

            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>
              Candidate:{' '}
              <strong style={{ color: '#1E293B' }}>{payment.candidateName}</strong> • Purpose:{' '}
              <strong style={{ color: '#1E293B' }}>{PURPOSE_LABELS[payment.purpose] || payment.purpose}</strong>
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {payment.status === 'SUCCESS' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="btn-admin-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem' }}
                >
                  <FileText size={16} color="#047857" />
                  <span>View Official Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="btn-admin-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem' }}
                >
                  <Download size={16} color="#1D4ED8" />
                  <span>Download PDF</span>
                </button>

                {payment.candidateEmail && (
                  <button
                    type="button"
                    onClick={handleResendReceipt}
                    disabled={isResending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: '#192A56',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.625rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isResending ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isResending ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Mail size={16} color="#C5A059" />
                    )}
                    <span>Resend Receipt Email</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {actionNotice && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: actionNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${actionNotice.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
              color: actionNotice.type === 'success' ? '#065F46' : '#991B1B',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {actionNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{actionNotice.text}</span>
          </div>
        )}
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Left Column: Transaction Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Financial Summary */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} color="#C5A059" />
              <span>Transaction Summary</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Amount Charged</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#192A56', marginTop: '2px' }}>
                  ₹{Number(payment.amount).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Receipt Number</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800, color: payment.receipt_number ? '#047857' : '#94A3B8', marginTop: '4px' }}>
                  {payment.receipt_number || 'Pending'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Payment Purpose:</span>
                <strong style={{ color: '#1E293B' }}>{PURPOSE_LABELS[payment.purpose] || payment.purpose}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Payment Method:</span>
                <strong style={{ color: '#1E293B' }}>{payment.payment_method || 'ONLINE'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Gateway Provider:</span>
                <strong style={{ color: '#1E293B' }}>{payment.gateway || 'RAZORPAY'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Currency:</span>
                <strong style={{ color: '#1E293B' }}>{payment.currency || 'INR'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Initiated At:</span>
                <span style={{ color: '#1E293B' }}>
                  {new Date(payment.created_at).toLocaleString('en-IN')}
                </span>
              </div>

              {payment.paid_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Paid & Verified At:</span>
                  <span style={{ color: '#047857', fontWeight: 700 }}>
                    {new Date(payment.paid_at).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Gateway & Verification Audit */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#C5A059" />
              <span>Gateway & Cryptographic Verification</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Razorpay Order ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#192A56', backgroundColor: '#F8FAFC', padding: '0.4rem 0.65rem', borderRadius: '6px', marginTop: '2px', wordBreak: 'break-all' }}>
                  {payment.gateway_order_id || 'Not generated (Offline / Direct)'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Razorpay Payment ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#192A56', backgroundColor: '#F8FAFC', padding: '0.4rem 0.65rem', borderRadius: '6px', marginTop: '2px', wordBreak: 'break-all' }}>
                  {payment.gateway_payment_id || 'Not available'}
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: payment.status === 'SUCCESS' ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${payment.status === 'SUCCESS' ? '#BBF7D0' : '#FEF3C7'}`, fontSize: '0.8rem', color: payment.status === 'SUCCESS' ? '#166534' : '#92400E' }}>
                {payment.status === 'SUCCESS' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Cryptographic signature verified & completed atomically via complete_verified_payment RPC.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} />
                    <span>Awaiting trusted server-side signature validation from Razorpay checkout.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Candidate Attribution & Activity Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Candidate & Source Attribution */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="#C5A059" />
              <span>Candidate Ownership & Attribution</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#64748B' }}>Candidate Full Name:</span>
                <strong style={{ color: '#192A56', fontSize: '0.95rem' }}>{payment.candidateName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#64748B' }}>Candidate Email:</span>
                <span style={{ color: '#1E293B' }}>{payment.candidateEmail || 'Not on file'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#64748B' }}>Candidate Mobile:</span>
                <span style={{ color: '#1E293B' }}>{payment.candidateMobile ? formatIndianPhoneNumber(payment.candidateMobile) : 'Not on file'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#64748B' }}>Corporate Placement:</span>
                <strong style={{ color: '#192A56' }}>{payment.companyName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Source Stream:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: payment.sourceType === 'APPLICATION' ? '#EFF6FF' : '#F5F3FF',
                      color: payment.sourceType === 'APPLICATION' ? '#1D4ED8' : '#6B21A8'
                    }}
                  >
                    {payment.sourceType === 'APPLICATION' ? 'APPLICATION FLOW' : 'STANDALONE JOINING'}
                  </span>

                  {payment.sourceType === 'APPLICATION' ? (
                    <Link
                      to={`/admin/applications/${payment.sourceId}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#1D4ED8',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.825rem'
                      }}
                    >
                      <span>{payment.sourceReference}</span>
                      <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <Link
                      to={`/admin/joining/${payment.sourceId}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#6B21A8',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.825rem'
                      }}
                    >
                      <span>{payment.sourceReference}</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Audit & Activity History */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#192A56', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#C5A059" />
              <span>Audit Trail & Activity Log</span>
            </h3>

            {activities.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: '0.85rem', padding: '1rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                No audit events recorded for this payment yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                      backgroundColor: '#F8FAFC',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, color: '#192A56', fontSize: '0.75rem' }}>
                        {act.action}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>
                        {new Date(act.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ color: '#475569' }}>
                      {act.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Receipt Modal */}
      {showReceiptModal && (
        <PaymentReceiptModal
          receiptData={receiptData}
          paymentId={payment.id}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
