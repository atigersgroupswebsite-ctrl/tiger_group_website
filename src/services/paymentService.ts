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
  paymentStatus?: 'SUCCESS' | 'PENDING' | 'USER_DROPPED' | 'FAILED';
  paymentReference?: string;
  receiptNumber?: string;
  applicationNumber?: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  candidateName?: string;
  referenceSlipNumber?: string;
  referenceSlipDownloadUrl?: string;
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
export async function getPaymentConfig(applicationId: string): Promise<PaymentConfigResponse> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/payment/config?appId=${encodeURIComponent(applicationId)}`, {
      headers: {
        Authorization: authHeader
      }
    });
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
 */
export async function createPaymentOrder(
  params: string | CreateOrderParams,
  purpose = 'REGISTRATION',
  amount = 500
): Promise<CreateOrderResponse> {
  try {
    let bodyPayload: CreateOrderParams;
    if (typeof params === 'string') {
      bodyPayload = { applicationId: params, purpose, amount };
    } else {
      bodyPayload = {
        applicationId: params.applicationId,
        joiningFormId: params.joiningFormId,
        purpose: params.purpose || purpose,
        amount: params.amount || amount
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

    if (!url) {
      const q = new URLSearchParams();
      if (params.paymentId) q.set('paymentId', params.paymentId);
      if (params.joiningFormId) q.set('joiningFormId', params.joiningFormId);
      if (params.applicationId) q.set('applicationId', params.applicationId);

      const res = await fetch(`/api/payment/reference-slip?${q.toString()}`);
      const data = await res.json();
      if (!data.success || !data.signedUrl) {
        throw new Error(data.error || 'Unable to retrieve Reference Slip download URL.');
      }
      url = data.signedUrl;
    }

    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = params.fileName || 'REFERENCE-SLIP.pdf';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }

    return { success: false, error: 'No download URL available.' };
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
