// ==============================================================================
// File: src/components/admin/CreateReferenceSlipModal.tsx
// Description: Admin Modal to Select Candidate Source for New Reference Slip
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { X, Search, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { getCandidatesForReferenceSlip } from '../../services/referenceSlipService';

interface CandidateOption {
  type: 'APPLICATION' | 'JOINING_FORM';
  id: string;
  reference: string;
  candidateName: string;
  mobile: string;
  email: string;
  hasSlip: boolean;
}

interface CreateReferenceSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidate: CandidateOption) => void;
}

export const CreateReferenceSlipModal: React.FC<CreateReferenceSlipModalProps> = ({
  isOpen,
  onClose,
  onSelectCandidate
}) => {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getCandidatesForReferenceSlip()
        .then((list) => {
          setCandidates(list);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.candidateName.toLowerCase().includes(q) ||
      c.reference.toLowerCase().includes(q) ||
      c.mobile.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0F172A' }}>
              Create New Reference Slip
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Select a candidate from Applications (INQ-...) or Standalone Joining (JOIN-...)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#F1F5F9',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1'
            }}
          >
            <Search size={16} color="#64748B" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name, mobile, or reference (e.g. INQ-2026-...)"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem',
                color: '#0F172A'
              }}
            />
          </div>
        </div>

        {/* Candidate List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <Loader2 size={28} className="animate-spin" color="#4F46E5" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.825rem', color: '#64748B' }}>Loading candidates directory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <AlertCircle size={28} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>No candidate matching search.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filtered.map((cand) => (
                <div
                  key={`${cand.type}_${cand.id}`}
                  onClick={() => onSelectCandidate(cand)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#C7D2FE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: cand.type === 'APPLICATION' ? '#EEF2FF' : '#F0FDF4',
                        color: cand.type === 'APPLICATION' ? '#4F46E5' : '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    >
                      {cand.candidateName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                          {cand.candidateName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: cand.type === 'APPLICATION' ? '#EEF2FF' : '#DCFCE7',
                            color: cand.type === 'APPLICATION' ? '#4338CA' : '#15803D'
                          }}
                        >
                          {cand.reference}
                        </span>
                        {cand.hasSlip && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#64748B',
                              backgroundColor: '#F1F5F9',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}
                          >
                            Slip Exists
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                        Mobile: {cand.mobile} • Email: {cand.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4F46E5' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
