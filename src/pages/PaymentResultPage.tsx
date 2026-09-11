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
import { verifyPaymentWithServer, downloadReferenceSlipPdf, type VerifyPaymentResponse } from '../services/paymentService';

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
      if (!res.success && res.paymentStatus !== 'PENDING' && res.paymentStatus !== 'FAILED' && res.paymentStatus !== 'USER_DROPPED') {
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

  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadReferenceSlip = async () => {
    if (!verificationData || verificationData.paymentStatus !== 'SUCCESS') return;
    setDownloadingSlip(true);
    setDownloadNotice(null);

    const fileName = verificationData.referenceSlipFileName ||
      `${(verificationData.applicationNumber || verificationData.paymentReference || 'ATG').replace(/[^a-zA-Z0-9_-]/g, '_')}-REFERENCE-SLIP.pdf`;

    const res = await downloadReferenceSlipPdf({
      paymentId: verificationData.paymentId,
      signedUrl: verificationData.referenceSlipDownloadUrl,
      fileName,
    });

    if (!res.success) {
      setDownloadNotice(res.error || 'Unable to download Reference Slip automatically. You can also access it in your Candidate Portal.');
    }
    setDownloadingSlip(false);
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
              <h2 className="text-xl sm:text-2xl font-bold">Payment Successful</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Your dossier registration fee has been received and verified.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Receipt & Payment Verification Grid */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Payment Reference</span>
                  <span className="font-mono font-bold text-slate-900">
                    {verificationData.paymentReference || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2.5">
                  <span className="text-slate-500">Receipt Number</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {verificationData.receiptNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2.5">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="text-base font-bold text-emerald-700">
                    ₹{Number(verificationData.amount || 500).toFixed(2)} {verificationData.currency || 'INR'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2.5">
                  <span className="text-slate-500">Verified Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    PAID &amp; VERIFIED
                  </span>
                </div>
                {verificationData.referenceSlipNumber && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2.5">
                    <span className="text-slate-500">Reference Slip No.</span>
                    <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                      {verificationData.referenceSlipNumber}
                    </span>
                  </div>
                )}
                {verificationData.gatewayPaymentId && (
                  <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-200 pt-2.5">
                    <span>Cashfree Txn ID</span>
                    <span className="font-mono">{verificationData.gatewayPaymentId}</span>
                  </div>
                )}
              </div>

              {/* Reference Slip Callout */}
              <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-bold text-blue-900">Official Reference Slip Issued: </span>
                  <span className="text-blue-800">
                    Your candidate-specific 2-Page Reference Slip &amp; Consultancy Return Form has been verified and attached to your confirmation email. Carry this document when reporting to orientation.
                  </span>
                </div>
              </div>

              {downloadNotice && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {downloadNotice}
                </div>
              )}

              {/* Candidate Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadReferenceSlip}
                  disabled={downloadingSlip}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {downloadingSlip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingSlip ? 'Downloading Reference Slip...' : 'Download Reference Slip (PDF)'}
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

        {/* USER DROPPED State */}
        {!loading && verificationData?.paymentStatus === 'USER_DROPPED' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Checkout Cancelled — No funds charged</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-2">
              {verificationData.message || 'You exited the Cashfree checkout window before completing the payment.'}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Your Joining submission is securely saved and awaiting the ₹500 Registration &amp; Verification Fee.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/joining/payment"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Resume Payment / Pay ₹500
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
