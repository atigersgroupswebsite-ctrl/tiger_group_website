// ==============================================================================
// File: src/pages/admin/AdminPaymentsPage.tsx
// Description: Central Payment Operations Desk & Financial Ledger
// Brand: A Tiger Group's — Operational Administrative Review
// Security:
//   - Strict Admin Authorization (SUPER_ADMIN, COORDINATOR, ACCOUNTANT can record offline payments; DOCUMENT_VERIFIER read-only)
//   - Zero KYC PII exposure (Aadhaar/PAN/Bank numbers strictly omitted)
//   - Supports both Application-based (INQ-...) and Standalone Joining (JOIN-...) payments
//   - Accurate financial KPIs derived purely from genuine database figures
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getPaymentLedger,
  type PaymentLedgerItem,
  type PaymentLedgerFilters,
  type FinancialKPIs
} from '../../services/adminPaymentService';
import type { PaymentStatus } from '../../types/database';
import { RecordOfflinePaymentModal } from '../../components/admin/RecordOfflinePaymentModal';
import { PaymentReceiptModal } from '../../components/admin/PaymentReceiptModal';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../../utils/paymentReceiptGenerator';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';
import {
  CreditCard,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  RotateCcw,
  IndianRupee,
  Calendar,
  ShieldCheck,
  Building2
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
    label: 'Pending',
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
    label: 'Offline',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: Building2
  }
};

const PURPOSE_LABELS: Record<string, string> = {
  REGISTRATION: 'Registration & Verification',
  CONSULTANCY: 'Placement Consultancy Fee',
  OTHER: 'Administrative Fee'
};

export const AdminPaymentsPage: React.FC = () => {
  const { role } = useAdminAuth();

  // Role permissions
  const canRecordOffline = role === 'SUPER_ADMIN' || role === 'COORDINATOR' || role === 'ACCOUNTANT';
  const isVerifier = role === 'DOCUMENT_VERIFIER';

  const [payments, setPayments] = useState<PaymentLedgerItem[]>([]);
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'APPLICATION' | 'JOINING'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS'>('ALL');

  // Modals state
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [receiptModalData, setReceiptModalData] = useState<{
    receipt: PaymentReceiptData;
    paymentId: string;
  } | null>(null);

  // Load payment ledger
  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: PaymentLedgerFilters = {
        search: searchQuery,
        status: statusFilter,
        purpose: purposeFilter,
        source: sourceFilter,
        method: methodFilter,
        dateRange: dateRangeFilter
      };

      const result = await getPaymentLedger(filters);
      setPayments(result.payments);
      setKpis(result.kpis);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments ledger.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, purposeFilter, sourceFilter, methodFilter, dateRangeFilter]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Build receipt data helper
  const getReceiptData = (payment: PaymentLedgerItem): PaymentReceiptData => {
    return {
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
  };

  const handleDownloadReceipt = (payment: PaymentLedgerItem) => {
    const data = getReceiptData(payment);
    downloadPaymentReceiptPdf(data);
  };

  const handleViewReceipt = (payment: PaymentLedgerItem) => {
    const data = getReceiptData(payment);
    setReceiptModalData({ receipt: data, paymentId: payment.id });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPurposeFilter('ALL');
    setSourceFilter('ALL');
    setMethodFilter('ALL');
    setDateRangeFilter('ALL');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C5A059', letterSpacing: '0.1em' }}>
              FINANCIAL OPERATIONS
            </span>
            {isVerifier && (
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>
                Read-Only Auditor View
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#192A56', margin: 0 }}>
            Payments & Financial Ledger
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
            Official transaction ledger, Razorpay verification states, and offline fee collection receipts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="btn-admin-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canRecordOffline && (
            <button
              type="button"
              onClick={() => setShowOfflineModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#192A56',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(25, 42, 86, 0.15)'
              }}
            >
              <Plus size={16} color="#C5A059" />
              <span>RECORD OFFLINE PAYMENT</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem' }}>{successMessage}</span>
        </div>
      )}

      {/* Real-time Financial KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {/* Card 1: Total Collected */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Revenue
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                ₹{kpis.totalCollected.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                All-time verified payments
              </div>
            </div>
          </div>

          {/* Card 2: Period Collection */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                {kpis.periodLabel}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#192A56', marginTop: '2px' }}>
                ₹{kpis.periodCollected.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                Today: ₹{kpis.todayCollection.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Card 3: Successful / Verified */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Verified Payments
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#192A56', marginTop: '2px' }}>
                {kpis.successfulPayments}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>
                Of {kpis.totalPayments} total attempted
              </div>
            </div>
          </div>

          {/* Card 4: Pending Transactions */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>
                {kpis.pendingPayments}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                Awaiting signature / capture
              </div>
            </div>
          </div>

          {/* Card 5: Failed / Refunded */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FEF2F2', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Failed / Issues
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B91C1C', marginTop: '2px' }}>
                {kpis.failedPayments}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                Refunded: {kpis.refundedPayments}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          {/* Search Input */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Search Payment Records
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search reference, receipt #, candidate, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.625rem 0.85rem 0.625rem 2.25rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#192A56',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Verified / Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          {/* Purpose Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Purpose
            </label>
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            >
              <option value="ALL">All Purposes</option>
              <option value="REGISTRATION">Registration & Dossier</option>
              <option value="CONSULTANCY">Placement Consultancy</option>
              <option value="OTHER">Other Fees</option>
            </select>
          </div>

          {/* Source Filter (Application vs Standalone Joining) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Source Stream
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="APPLICATION">Application Flow (INQ-...)</option>
              <option value="JOINING">Standalone Joining (JOIN-...)</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#192A56', marginBottom: '0.35rem' }}>
              Period Range
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#192A56',
                outline: 'none'
              }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-admin-secondary"
              style={{ width: '100%', padding: '0.625rem', fontSize: '0.825rem' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payment Ledger Data Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#192A56' }}>
            Ledger Entries ({payments.length})
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Showing genuine Supabase verified transactions
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: '#192A56' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading payments ledger...</div>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <CreditCard size={40} style={{ margin: '0 auto 1rem auto', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#192A56', margin: '0 0 0.5rem 0' }}>
              No payments found
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              {searchQuery || statusFilter !== 'ALL' || purposeFilter !== 'ALL'
                ? 'No transactions matched the selected filters. Try clearing your search parameters.'
                : 'No payment entries have been initiated or recorded in the system yet.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL' || purposeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-admin-secondary"
                style={{ marginTop: '1rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Payment Ref</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Source Reference</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Purpose</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Method / Gateway</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Receipt #</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Payment Ref */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <Link
                          to={`/admin/payments/${p.id}`}
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#192A56',
                            textDecoration: 'none',
                            display: 'inline-block'
                          }}
                        >
                          {p.payment_reference}
                        </Link>
                      </td>

                      {/* Candidate */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>
                          {p.candidateName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {p.candidateEmail || (p.candidateMobile ? formatIndianPhoneNumber(p.candidateMobile) : 'Contact on file')}
                        </div>
                      </td>

                      {/* Source Reference */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: p.sourceType === 'APPLICATION' ? '#EFF6FF' : '#F5F3FF',
                              color: p.sourceType === 'APPLICATION' ? '#1D4ED8' : '#6B21A8'
                            }}
                          >
                            {p.sourceType === 'APPLICATION' ? 'APP' : 'JOIN'}
                          </span>
                          {p.sourceType === 'APPLICATION' ? (
                            <Link
                              to={`/admin/applications/${p.sourceId}`}
                              style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1D4ED8', textDecoration: 'none', fontWeight: 600 }}
                            >
                              {p.sourceReference}
                            </Link>
                          ) : (
                            <Link
                              to={`/admin/joining/${p.sourceId}`}
                              style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B21A8', textDecoration: 'none', fontWeight: 600 }}
                            >
                              {p.sourceReference}
                            </Link>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                          {p.companyName}
                        </div>
                      </td>

                      {/* Purpose */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                          {PURPOSE_LABELS[p.purpose] || p.purpose}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: '#192A56', fontSize: '0.95rem' }}>
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: statusConf.color,
                            backgroundColor: statusConf.bg,
                            border: `1px solid ${statusConf.border}`
                          }}
                        >
                          <StatusIcon size={12} />
                          <span>{statusConf.label}</span>
                        </span>
                      </td>

                      {/* Method / Gateway */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                          {p.payment_method || 'ONLINE'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {p.gateway || 'RAZORPAY'}
                        </div>
                      </td>

                      {/* Receipt # */}
                      <td style={{ padding: '1rem 1rem' }}>
                        {p.receipt_number ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.775rem', fontWeight: 700, color: '#047857' }}>
                            {p.receipt_number}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1E293B' }}>
                          {new Date(p.paid_at || p.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {new Date(p.paid_at || p.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          {/* View Detail Link */}
                          <Link
                            to={`/admin/payments/${p.id}`}
                            title="View Full Payment Dossier"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#192A56',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Eye size={14} />
                          </Link>

                          {/* View Receipt modal if verified */}
                          {p.status === 'SUCCESS' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(p)}
                                title="View Official Receipt Modal"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#047857',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FileText size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(p)}
                                title="Download Receipt PDF"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#1D4ED8',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Download size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offline Payment Recording Modal */}
      {showOfflineModal && (
        <RecordOfflinePaymentModal
          onSuccess={() => {
            setShowOfflineModal(false);
            setSuccessMessage('Offline payment recorded successfully and verified.');
            loadLedger();
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
          onClose={() => setShowOfflineModal(false)}
        />
      )}

      {/* Payment Receipt Modal */}
      {receiptModalData && (
        <PaymentReceiptModal
          receiptData={receiptModalData.receipt}
          paymentId={receiptModalData.paymentId}
          onClose={() => setReceiptModalData(null)}
        />
      )}
    </div>
  );
};
