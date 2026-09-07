// ==============================================================================
// File: src/components/admin/RecordOfflinePaymentModal.tsx
// Description: Admin modal to record physical/office payments into Supabase
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security: Requires active admin credentials, audited in activity_logs
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Loader2, X, Check, Search, UserCheck } from 'lucide-react';
import { recordOfflinePayment } from '../../services/paymentService';
import { searchCandidateSources, type CandidateSourceLookup } from '../../services/adminPaymentService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface RecordOfflinePaymentModalProps {
  applicationId?: string;
  joiningFormId?: string;
  applicationNumber?: string;
  candidateName?: string;
  defaultAmount?: number;
  currentAdminName?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const RecordOfflinePaymentModal: React.FC<RecordOfflinePaymentModalProps> = ({
  applicationId: initialAppId,
  joiningFormId: initialJoiningId,
  applicationNumber: initialRef,
  candidateName: initialName,
  defaultAmount = 500,
  currentAdminName = 'Admin',
  onSuccess,
  onClose
}) => {
  const { role, profile } = useAdminAuth();
  const isVerifier = role === 'DOCUMENT_VERIFIER';

  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(initialAppId);
  const [selectedJoiningId, setSelectedJoiningId] = useState<string | undefined>(initialJoiningId);
  const [displayRef, setDisplayRef] = useState<string>(initialRef || '');
  const [displayName, setDisplayName] = useState<string>(initialName || '');

  // Candidate Search State for global modal use
  const hasFixedTarget = Boolean(initialAppId || initialJoiningId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateSourceLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [purpose, setPurpose] = useState<'REGISTRATION' | 'CONSULTANCY' | 'OTHER'>('REGISTRATION');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [receivedBy, setReceivedBy] = useState<string>(profile?.full_name || currentAdminName);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced candidate search if not fixed
  useEffect(() => {
    if (hasFixedTarget || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCandidateSources(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, hasFixedTarget]);

  const handleSelectCandidate = (cand: CandidateSourceLookup) => {
    if (cand.type === 'APPLICATION') {
      setSelectedAppId(cand.id);
      setSelectedJoiningId(undefined);
    } else {
      setSelectedJoiningId(cand.id);
      setSelectedAppId(undefined);
    }
    setDisplayRef(cand.reference);
    setDisplayName(cand.name);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerifier) {
      setError('Unauthorized: Document Verifiers are not permitted to record offline payments.');
      return;
    }

    if (!selectedAppId && !selectedJoiningId) {
      setError('Please search and select a candidate or application first.');
      return;
    }

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
        applicationId: selectedAppId,
        joiningFormId: selectedJoiningId,
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

        {/* Document Verifier Role Warning */}
        {isVerifier && (
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontSize: '0.8rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>Document Verifiers have read-only access and cannot record offline payments.</span>
          </div>
        )}

        {/* Candidate Context or Live Search */}
        {hasFixedTarget || (selectedAppId || selectedJoiningId) ? (
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                {selectedJoiningId && !selectedAppId ? 'Joining Dossier:' : 'Application:'}
              </span>
              {!hasFixedTarget && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppId(undefined);
                    setSelectedJoiningId(undefined);
                    setDisplayRef('');
                    setDisplayName('');
                  }}
                  style={{ border: 'none', background: 'transparent', color: '#1D4ED8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  Change Candidate
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: '#192A56' }}>
                {displayRef}
              </span>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
                {displayName}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Select Candidate / Reference *
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search by INQ-..., JOIN-..., name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSubmitting || isVerifier}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  backgroundColor: '#FCFBFB',
                  border: '1px solid #D2CECE',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#192A56',
                  outline: 'none'
                }}
              />
              {isSearching && (
                <Loader2 size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: '#94A3B8' }} />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 20
                }}
              >
                {searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectCandidate(item)}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#192A56' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {item.reference} • {item.company}
                      </div>
                    </div>
                    <UserCheck size={16} color="#047857" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              disabled={isSubmitting || isVerifier}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: isVerifier ? '#94A3B8' : '#192A56',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: isSubmitting || isVerifier ? 'not-allowed' : 'pointer'
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
