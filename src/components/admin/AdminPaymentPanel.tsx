// ==============================================================================
// File: src/components/admin/AdminPaymentPanel.tsx
// Description: Comprehensive Admin Payment Management Panel for Application Dossier
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security:
//   - Displays real Supabase payment records
//   - Official Razorpay IDs & internal references
//   - Secure PDF receipt generation and email resend
//   - Offline payment recording for authorized administrators
// ==============================================================================

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Mail,
  Plus,
  RefreshCw
} from 'lucide-react';
import type { PaymentRow, ApplicationRow } from '../../types/database';
import { RecordOfflinePaymentModal } from './RecordOfflinePaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../../utils/paymentReceiptGenerator';
import { resendPaymentReceiptEmail } from '../../services/paymentService';

interface AdminPaymentPanelProps {
  application: ApplicationRow;
  payments: PaymentRow[];
  canManagePayments: boolean; // SUPER_ADMIN, COORDINATOR, ACCOUNTANT
  onRefresh: () => void;
}

export const AdminPaymentPanel: React.FC<AdminPaymentPanelProps> = ({
  application,
  payments,
  canManagePayments,
  onRefresh
}) => {
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    receipt: PaymentReceiptData;
    paymentId: string;
  } | null>(null);

  const [isResendingId, setIsResendingId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fee calculations
  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const hasSuccessPayment = payments.some((p) => p.status === 'SUCCESS');

  const buildReceiptData = (payment: PaymentRow): PaymentReceiptData => ({
    applicationNumber: application.application_number,
    paymentReference: payment.payment_reference,
    receiptNumber: payment.receipt_number || payment.payment_reference,
    candidateName: application.full_name,
    candidateEmail: application.email,
    candidateMobile: application.mobile,
    paymentPurpose: payment.purpose,
    amount: Number(payment.amount),
    currency: payment.currency || 'INR',
    paymentDate: payment.paid_at || payment.created_at,
    paymentStatus: payment.status,
    paymentMethod: payment.payment_method || 'ONLINE',
    gateway: payment.gateway || 'RAZORPAY',
    gatewayOrderId: payment.gateway_order_id,
    gatewayPaymentId: payment.gateway_payment_id
  });

  const handleDownload = (payment: PaymentRow) => {
    const data = buildReceiptData(payment);
    downloadPaymentReceiptPdf(data);
  };

  const handleView = (payment: PaymentRow) => {
    const data = buildReceiptData(payment);
    setSelectedReceiptData({ receipt: data, paymentId: payment.id });
  };

  const handleResendEmail = async (payment: PaymentRow) => {
    setIsResendingId(payment.id);
    setNotificationMsg(null);

    try {
      const res = await resendPaymentReceiptEmail(payment.id);
      if (res.success) {
        setNotificationMsg({
          type: 'success',
          text: `Payment receipt dispatched successfully to ${application.email}.`
        });
      } else {
        setNotificationMsg({
          type: 'error',
          text: res.error || 'Failed to dispatch receipt email.'
        });
      }
    } catch {
      setNotificationMsg({
        type: 'error',
        text: 'Network error while attempting to resend email.'
      });
    } finally {
      setIsResendingId(null);
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          style={{
            backgroundColor: notificationMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            border: '1px solid',
            borderColor: notificationMsg.type === 'success' ? '#86EFAC' : '#FCA5A5',
            color: notificationMsg.type === 'success' ? '#166534' : '#991B1B',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notificationMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Top Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Total Collected */}
        <div className="admin-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            TOTAL FEES RECEIVED
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534' }}>
            ₹{totalPaid.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            {hasSuccessPayment ? 'Registration Fee Verified' : 'Awaiting Payment'}
          </div>
        </div>

        {/* Consultancy Policy Structure */}
        <div className="admin-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            CONSULTANCY FEE STRUCTURE
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#192A56' }}>
            ₹1,000.00 Total
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            Stage 1: ₹500 (Reg.) • Stage 2: ₹500 (Post-work)
          </div>
        </div>

        {/* Workflow Payment Readiness */}
        <div className="admin-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            NEXT STAGE READINESS
          </div>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: hasSuccessPayment ? '#166534' : '#B45309',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {hasSuccessPayment ? <CheckCircle2 size={16} /> : <Clock size={16} />}
            <span>{hasSuccessPayment ? 'READY FOR REFERENCE SLIP' : 'PAYMENT REQUIRED'}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
            {hasSuccessPayment ? 'Reference Slip & Return packet unlocked' : 'Pending registration fee confirmation'}
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#192A56' }}>
              Payment Records & Transaction Ledger ({payments.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Official gateway records, payment references, verified receipts, and offline collections.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={onRefresh}
              className="btn-admin-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            {canManagePayments && (
              <button
                type="button"
                onClick={() => setShowOfflineModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#192A56',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} color="#C5A059" />
                <span>Record Offline Payment</span>
              </button>
            )}
          </div>
        </div>

        {/* Payments Table / List */}
        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <CreditCard size={36} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ margin: 0, color: '#192A56', fontSize: '0.95rem', fontWeight: 700 }}>
              No Payment Records Found
            </h4>
            <p style={{ margin: '0.35rem auto 1.25rem auto', maxWidth: '400px', fontSize: '0.8rem', color: '#64748B' }}>
              The candidate has not initiated an online payment yet. Once the candidate pays at{' '}
              <code style={{ color: '#192A56' }}>/joining/payment</code> or an offline payment is recorded, the transaction details will appear here.
            </p>
            {canManagePayments && (
              <button
                type="button"
                onClick={() => setShowOfflineModal(true)}
                className="btn-admin-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                + Record Office / Cash Payment
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>STATUS</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>REFERENCE & RECEIPT</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>PURPOSE</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>AMOUNT</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>METHOD / GATEWAY</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>TRANSACTION ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B' }}>PAID DATE</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isSuccess = p.status === 'SUCCESS';
                  const isPending = p.status === 'PENDING';
                  const isFailed = p.status === 'FAILED';
                  const isOffline = p.payment_method === 'OFFLINE';

                  let statusBadgeBg = '#FEF3C7';
                  let statusBadgeColor = '#92400E';
                  if (isSuccess) {
                    statusBadgeBg = '#DCFCE7';
                    statusBadgeColor = '#166534';
                  } else if (isFailed) {
                    statusBadgeBg = '#FEE2E2';
                    statusBadgeColor = '#991B1B';
                  }

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #E2E8F0', verticalAlign: 'middle' }}>
                      {/* Status */}
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: statusBadgeBg,
                            color: statusBadgeColor,
                            fontSize: '0.725rem',
                            fontWeight: 800
                          }}
                        >
                          {isSuccess && '● VERIFIED'}
                          {isPending && '○ PENDING'}
                          {isFailed && '✕ FAILED'}
                          {!isSuccess && !isPending && !isFailed && p.status}
                        </span>
                      </td>

                      {/* Reference & Receipt */}
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#192A56' }}>
                          {p.payment_reference}
                        </div>
                        {p.receipt_number && (
                          <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                            {p.receipt_number}
                          </div>
                        )}
                      </td>

                      {/* Purpose */}
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        {p.purpose}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#192A56' }}>
                        ₹{Number(p.amount).toFixed(2)}
                      </td>

                      {/* Method / Gateway */}
                      <td style={{ padding: '0.75rem', color: '#475569' }}>
                        <div style={{ fontWeight: 600 }}>{p.payment_method || (isOffline ? 'OFFLINE' : 'ONLINE')}</div>
                        <div style={{ fontSize: '0.725rem', color: '#94A3B8' }}>{p.gateway || 'RAZORPAY'}</div>
                      </td>

                      {/* Gateway Payment ID */}
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#64748B', fontSize: '0.75rem' }}>
                        {p.gateway_payment_id || p.gateway_order_id || '—'}
                      </td>

                      {/* Paid Date */}
                      <td style={{ padding: '0.75rem', color: '#475569', fontSize: '0.775rem' }}>
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                          : new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {isSuccess ? (
                          <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleView(p)}
                              title="View Receipt"
                              style={{
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#192A56',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(p)}
                              title="Download Receipt PDF"
                              style={{
                                border: '1px solid #192A56',
                                background: '#192A56',
                                color: '#FFFFFF',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Download size={13} color="#C5A059" />
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResendEmail(p)}
                              disabled={isResendingId === p.id}
                              title="Resend Receipt Email"
                              style={{
                                border: '1px solid #CBD5E1',
                                background: '#F8FAFC',
                                color: '#475569',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                cursor: isResendingId === p.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Mail size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Offline Payment Modal */}
      {showOfflineModal && (
        <RecordOfflinePaymentModal
          applicationId={application.id}
          applicationNumber={application.application_number}
          candidateName={application.full_name}
          defaultAmount={500}
          onSuccess={onRefresh}
          onClose={() => setShowOfflineModal(false)}
        />
      )}

      {/* Payment Receipt Preview Modal */}
      {selectedReceiptData && (
        <PaymentReceiptModal
          receiptData={selectedReceiptData.receipt}
          paymentId={selectedReceiptData.paymentId}
          onClose={() => setSelectedReceiptData(null)}
        />
      )}
    </div>
  );
};
