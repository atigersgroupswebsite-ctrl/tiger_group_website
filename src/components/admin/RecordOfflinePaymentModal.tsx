// ==============================================================================
// File: src/components/admin/RecordOfflinePaymentModal.tsx
// Description: Admin modal to record physical/office payments into Supabase
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security: Requires active admin credentials, audited in activity_logs
// ==============================================================================

import React, { useState } from 'react';
import { CreditCard, AlertCircle, Loader2, X, Check } from 'lucide-react';
import { recordOfflinePayment } from '../../services/paymentService';

interface RecordOfflinePaymentModalProps {
  applicationId: string;
  applicationNumber: string;
  candidateName: string;
  defaultAmount?: number;
  currentAdminName?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const RecordOfflinePaymentModal: React.FC<RecordOfflinePaymentModalProps> = ({
  applicationId,
  applicationNumber,
  candidateName,
  defaultAmount = 500,
  currentAdminName = 'Admin',
  onSuccess,
  onClose
}) => {
  const [purpose, setPurpose] = useState<'REGISTRATION' | 'CONSULTANCY' | 'OTHER'>('REGISTRATION');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [receivedBy, setReceivedBy] = useState<string>(currentAdminName);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please specify a valid payment amount.');
      return;
    }
    if (!receivedBy.trim()) {
      setError('Please provide the authorized receiver name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await recordOfflinePayment({
        applicationId,
        purpose,
        amount,
        receivedBy: receivedBy.trim(),
        notes: notes.trim() || undefined
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to record offline payment.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the payment record.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 42, 86, 0.7)',
        backdropFilter: 'blur(3px)',
        zIndex: 170,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 40px -10px rgba(25, 42, 86, 0.3)',
          border: '1px solid #E2E8F0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#192A56' }}>
                Record Offline Payment
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                Manual office cash / direct deposit fee entry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Candidate Context Pill */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Application:</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>
              {applicationNumber}
            </span>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
              {candidateName}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', fontSize: '0.8rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Purpose */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Payment Purpose
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as any)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none',
                fontWeight: 600
              }}
            >
              <option value="REGISTRATION">Registration & Dossier Verification (₹500)</option>
              <option value="CONSULTANCY">Post-Placement Consultancy Balance (₹500)</option>
              <option value="OTHER">Other Administrative Fee</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Amount (INR)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none',
                fontWeight: 700
              }}
            />
          </div>

          {/* Received By */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Authorized Collector / Received By
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. Accounts Desk / Admin Name"
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Notes / Remarks (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received cash at corporate branch office. Receipt given physically."
              rows={2}
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FCFBFB',
                border: '1px solid #D2CECE',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-admin-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#192A56',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Check size={16} color="#C5A059" />
                  <span>CONFIRM & RECORD PAYMENT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
