// ==============================================================================
// File: src/services/paymentService.ts
// Description: Client-side Cashfree (Sandbox) payment orchestration and verification service
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import { supabase } from '../lib/supabaseClient';
import type { PaymentRow } from '../types/database';

export interface PaymentConfigResponse {
  success: boolean;
  applicationId?: string;
  applicationNumber?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidateMobile?: string;
  applicationStatus?: string;
  purpose?: string;
  purposeTitle?: string;
  amount?: number;
  currency?: string;
  totalConsultancyFee?: number;
  policyNote?: string;
  gateway?: string;
  environment?: string;
  payments?: PaymentRow[];
  error?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  alreadyPaid?: boolean;
  paymentId?: string;
  paymentReference?: string;
  orderId?: string;
  cfOrderId?: string;
  payment_session_id?: string;
  receiptNumber?: string;
  amount?: number;
  currency?: string;
  environment?: string;
  candidate?: {
    name: string;
    email: string;
    mobile?: string;
  };
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentStatus?: 'SUCCESS' | 'PENDING' | 'USER_DROPPED' | 'FAILED';
  paymentReference?: string;
  receiptNumber?: string;
  applicationNumber?: string;
  applicationId?: string;
  joiningFormId?: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  candidateName?: string;
  referenceSlipNumber?: string;
  referenceSlipDownloadUrl?: string;
  referenceSlipFileName?: string;
  message?: string;
  error?: string;
}

/**
 * Dynamically loads the official Cashfree Web SDK V3.
 */
export function loadCashfreeCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Cashfree) {
      return resolve(true);
    }
    const existing = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Cashfree V3 SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initializes and triggers Cashfree Web Checkout in Sandbox mode.
 */
export async function launchCashfreeCheckout(paymentSessionId: string): Promise<void> {
  const isLoaded = await loadCashfreeCheckoutScript();
  if (!isLoaded) {
    throw new Error('Could not load Cashfree payment gateway SDK. Please check your internet connection.');
  }

  const CashfreeSDK = (window as any).Cashfree;
  if (!CashfreeSDK) {
    throw new Error('Cashfree SDK is not available in window context.');
  }

  // Strictly Sandbox mode per project specification
  const cashfree = CashfreeSDK({
    mode: 'sandbox'
  });

  cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self'
  });
}

/**
 * Gets authentication header token for active session.
 */
async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : '';
}

/**
 * Retrieves payment requirements and current payments list.
 */
export async function getPaymentConfig(
  params?: string | { applicationId?: string; joiningFormId?: string }
): Promise<PaymentConfigResponse> {
  try {
    const authHeader = await getAuthHeader();
    let query = '';
    if (typeof params === 'string') {
      query = params ? `?appId=${encodeURIComponent(params)}` : '';
    } else if (params) {
      const parts: string[] = [];
      if (params.applicationId) parts.push(`appId=${encodeURIComponent(params.applicationId)}`);
      if (params.joiningFormId) parts.push(`joiningFormId=${encodeURIComponent(params.joiningFormId)}`);
      if (parts.length > 0) query = `?${parts.join('&')}`;
    }

    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`/api/payment/config${query}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payment configuration' };
  }
}

export interface CreateOrderParams {
  applicationId?: string;
  joiningFormId?: string;
  purpose?: string;
  amount?: number;
}

/**
 * Initiates order creation on the server with Cashfree Sandbox.
 * Supports either applicationId or standalone joiningFormId.
 * Server authoritatively resolves amount from system_settings.
 */
export async function createPaymentOrder(
  params: string | CreateOrderParams,
  purpose = 'REGISTRATION'
): Promise<CreateOrderResponse> {
  try {
    let bodyPayload: CreateOrderParams;
    if (typeof params === 'string') {
      bodyPayload = { applicationId: params, purpose };
    } else {
      bodyPayload = {
        applicationId: params.applicationId,
        joiningFormId: params.joiningFormId,
        purpose: params.purpose || purpose
      };
    }

    if (!bodyPayload.applicationId && !bodyPayload.joiningFormId) {
      return { success: false, error: 'Either applicationId or joiningFormId is required to create a payment order.' };
    }

    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(bodyPayload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create payment order' };
  }
}

/**
 * Verifies payment status with server (which queries Cashfree Sandbox API authoritatively).
 */
export async function verifyPaymentWithServer(payload: {
  orderId?: string;
  paymentId?: string;
}): Promise<VerifyPaymentResponse> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Server payment verification failed' };
  }
}

/**
 * Admin action to record an offline payment.
 */
export async function recordOfflinePayment(payload: {
  applicationId?: string;
  joiningFormId?: string;
  purpose: string;
  amount: number;
  receivedBy: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payment/record-offline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record offline payment' };
  }
}

/**
 * Fetches and triggers browser download of the candidate's official 2-page Reference Slip PDF.
 */
export async function downloadReferenceSlipPdf(params: {
  paymentId?: string;
  joiningFormId?: string;
  applicationId?: string;
  signedUrl?: string;
  fileName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let url = params.signedUrl;
    let fileName = params.fileName || 'REFERENCE-SLIP.pdf';

    // Retrieve active Supabase session token
    let authToken = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token || '';
    } catch {
      // Fallback if session unavailable
    }

    if (!url) {
      const q = new URLSearchParams();
      if (params.paymentId) q.set('paymentId', params.paymentId);
      if (params.joiningFormId) q.set('joiningFormId', params.joiningFormId);
      if (params.applicationId) q.set('applicationId', params.applicationId);

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/payment/reference-slip?${q.toString()}`, { headers });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Unable to retrieve Reference Slip download URL.');
      }
      url = data.signedUrl;
      if (data.fileName) fileName = data.fileName;
    }

    if (!url) {
      return { success: false, error: 'No download URL available.' };
    }

    // Layer 1: Fetch PDF bytes as a Blob to trigger guaranteed same-origin browser download
    try {
      const pdfRes = await fetch(url);
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
        return { success: true };
      }
    } catch (fetchErr) {
      console.warn('[downloadReferenceSlipPdf] Blob fetch fallback to direct navigation:', fetchErr);
    }

    // Layer 2: Same-origin direct server stream fallback
    if (params.paymentId || params.joiningFormId || params.applicationId) {
      const streamQ = new URLSearchParams();
      if (params.paymentId) streamQ.set('paymentId', params.paymentId);
      if (params.joiningFormId) streamQ.set('joiningFormId', params.joiningFormId);
      if (params.applicationId) streamQ.set('applicationId', params.applicationId);
      streamQ.set('download', '1');
      if (authToken) streamQ.set('auth_token', authToken);

      window.location.assign(`/api/payment/reference-slip?${streamQ.toString()}`);
      return { success: true };
    }

    // Layer 3: Direct signedUrl navigation
    window.location.assign(url);
    return { success: true };
  } catch (err: any) {
    console.error('[downloadReferenceSlipPdf] Error:', err);
    return { success: false, error: err.message || 'Failed to download Reference Slip.' };
  }
}

/**
 * Admin action to trigger payment receipt email resend.
 */
export async function resendPaymentReceiptEmail(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payment/resend-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({ paymentId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resend receipt email' };
  }
}
