// ==============================================================================
// File: src/services/paymentService.ts
// Description: Client-side Razorpay payment orchestration and verification service
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
  keyId?: string;
  payments?: PaymentRow[];
  error?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  alreadyPaid?: boolean;
  paymentId?: string;
  paymentReference?: string;
  orderId?: string;
  receiptNumber?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  candidate?: {
    name: string;
    email: string;
    mobile?: string;
  };
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentReference?: string;
  receiptNumber?: string;
  applicationNumber?: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  gatewayPaymentId?: string;
  candidateName?: string;
  error?: string;
}

/**
 * Dynamically loads the Razorpay checkout.js script.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
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
    const res = await fetch(`/api/payments/config?appId=${encodeURIComponent(applicationId)}`, {
      headers: {
        Authorization: authHeader
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payment configuration' };
  }
}

/**
 * Initiates order creation on the server.
 */
export async function createPaymentOrder(
  applicationId: string,
  purpose = 'REGISTRATION',
  amount = 500
): Promise<CreateOrderResponse> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({ applicationId, purpose, amount })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create payment order' };
  }
}

/**
 * Sends client Razorpay handler response to server for cryptographic signature verification.
 */
export async function verifyPaymentWithServer(payload: {
  paymentId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payments/verify', {
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
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payments/record-offline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      return { success: false, error: result.error || 'Failed to record offline payment' };
    }
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Offline payment recording failed' };
  }
}

/**
 * Admin action to resend the payment receipt email.
 */
export async function resendPaymentReceiptEmail(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch('/api/payments/resend-receipt', {
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
