// ==============================================================================
// File: src/pages/PaymentResultPage.tsx
// Description: Cashfree Sandbox Payment Verification & Result Page
// Route: /payment/result?order_id=...
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Never trusts browser redirect; queries server for authoritative Cashfree state
//   - Shows verified receipt details only after server confirms SUCCESS
//   - Direct access to Candidate Portal and receipt downloads
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  FileCheck
} from 'lucide-react';
import { verifyPaymentWithServer, type VerifyPaymentResponse } from '../services/paymentService';
import { downloadPaymentReceiptPdf, type PaymentReceiptData } from '../utils/paymentReceiptGenerator';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';

  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<VerifyPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided in return URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyPaymentWithServer({ orderId });
      setVerificationData(res);
      if (!res.success && res.paymentStatus !== 'PENDING' && res.paymentStatus !== 'FAILED') {
        setError(res.error || 'Unable to verify payment with server.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification network error.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleDownloadReceipt = () => {
    if (!verificationData || verificationData.paymentStatus !== 'SUCCESS') return;

    const receiptPayload: PaymentReceiptData = {
      applicationNumber: verificationData.applicationNumber || 'ATG',
      paymentReference: verificationData.paymentReference || 'N/A',
      receiptNumber: verificationData.receiptNumber || verificationData.paymentReference || 'REC',
      candidateName: verificationData.candidateName || 'Candidate',
      candidateEmail: '',
      paymentPurpose: 'Candidate Registration & Dossier Verification Fee',
      amount: verificationData.amount || 500,
      currency: verificationData.currency || 'INR',
      paymentDate: verificationData.paidAt || new Date().toISOString(),
      paymentStatus: 'SUCCESS',
      paymentMethod: 'ONLINE / CASHFREE (SANDBOX)',
      gateway: 'CASHFREE',
      gatewayOrderId: verificationData.gatewayOrderId || orderId,
      gatewayPaymentId: verificationData.gatewayPaymentId
    };

    downloadPaymentReceiptPdf(receiptPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Cashfree Gateway • Sandbox Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Payment Status Verification
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Authoritative transaction status confirmed directly with Cashfree
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Verifying with Cashfree...
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Please wait while our server cryptographically queries the Cashfree Sandbox API to confirm your payment state.
            </p>
            {orderId && (
              <div className="mt-4 inline-block font-mono text-xs bg-slate-100 px-3 py-1.5 rounded text-slate-700">
                Order ID: {orderId}
              </div>
            )}
          </div>
        )}

        {/* Error without status */}
        {!loading && error && !verificationData?.paymentStatus && (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Verification Error</h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={checkStatus}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Verification
              </button>
              <Link
                to="/joining/payment"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Return to Payment Page
              </Link>
            </div>
          </div>
        )}

        {/* SUCCESS State */}
        {!loading && verificationData?.paymentStatus === 'SUCCESS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Payment Verified Successfully!</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Your dossier registration fee has been received and confirmed.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Receipt Details Grid */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Receipt Number</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {verificationData.receiptNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Payment Reference</span>
                  <span className="font-mono font-medium text-slate-700">
                    {verificationData.paymentReference || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Gateway Order ID</span>
                  <span className="font-mono text-xs text-slate-600">
                    {verificationData.gatewayOrderId || orderId}
                  </span>
                </div>
                {verificationData.gatewayPaymentId && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Cashfree Txn ID</span>
                    <span className="font-mono text-xs text-slate-600">
                      {verificationData.gatewayPaymentId}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Amount Paid</span>
                  <span className="text-lg font-bold text-emerald-700">
                    ₹{verificationData.amount || 500}.00 {verificationData.currency || 'INR'}
                  </span>
                </div>
              </div>

              {/* Reference Slip Automated Generation Callout */}
              <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-900">Official Reference Slip Generated: </span>
                  <span className="text-blue-800">
                    Your dynamic Reference Slip has been automatically prepared and queued to your registered email via Resend.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Payment Receipt (PDF)
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    to="/joining/portal"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm text-center transition-colors flex items-center justify-center gap-2"
                  >
                    Go to Candidate Portal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/"
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm text-center transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING State */}
        {!loading && verificationData?.paymentStatus === 'PENDING' && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Awaiting Confirmation</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Your transaction is currently active or pending confirmation from your bank or payment method.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={checkStatus}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh Status
              </button>
              <Link
                to="/joining/portal"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Go to Portal
              </Link>
            </div>
          </div>
        )}

        {/* FAILED State */}
        {!loading && verificationData?.paymentStatus === 'FAILED' && (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Not Completed</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-2">
              {verificationData.error || 'The payment was cancelled or failed at Cashfree.'}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              No funds were charged. You can retry safely at any time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/joining/payment"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Payment Again
              </Link>
              <Link
                to="/joining/portal"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Return to Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
