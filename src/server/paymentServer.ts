// ==============================================================================
// File: src/server/paymentServer.ts
// Description: Secure server-side Cashfree (Sandbox) payment orchestration & verification
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Secrets (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are exclusively kept server-side
//   - Strict SANDBOX endpoint locking (production disabled)
//   - Cryptographic Cashfree webhook HMAC-SHA256 signature verification
//   - Authoritative amount enforcement (server-configured 500 INR, never trusts browser)
//   - Atomic, idempotent payment confirmation via Supabase RPC
//   - Decoupled Reference Slip generator triggered ONLY upon verified payment success
//   - Decoupled Resend receipt & reference slip delivery (email failure never rolls back payment)
// ==============================================================================

import crypto from 'node:crypto';
import { getSupabaseServer, authenticateRequest } from './supabaseServer';

export { getSupabaseServer, authenticateRequest };

// ------------------------------------------------------------------------------
// Cashfree Sandbox Configuration (Server-Only)
// ------------------------------------------------------------------------------

export const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
export const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
export const CASHFREE_ENVIRONMENT = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();

// CRITICAL SAFETY REQUIREMENT: Production payment strictly disabled, SANDBOX only
export const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg';
export const CASHFREE_API_VERSION = '2023-08-01';

// Authoritative Joining Registration Fee
export const AUTHORITATIVE_JOINING_FEE = 500;
export const TOTAL_CONSULTANCY_FEE = 1000;

function getCashfreeHeaders(): Record<string, string> {
  return {
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY,
    'x-api-version': CASHFREE_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

function resolveSiteBaseUrl(reqHeaders?: Record<string, string | string[] | undefined>): string {
  const host = (reqHeaders?.['host'] as string) || '';
  const proto = (reqHeaders?.['x-forwarded-proto'] as string) || (host.includes('localhost') ? 'http' : 'https');
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.atigerglobal.com';
}

/**
 * Handler: GET /api/payment/config?appId=...
 * Returns payment config, purpose, amount, and existing payment state for an application.
 */
export async function getPaymentConfigHandler(appId: string, authHeader?: string) {
  if (!appId) {
    return { status: 400, data: { success: false, error: 'Application ID is required' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // Verify application exists
  const { data: app, error: appErr } = await getSupabaseServer()
    .from('applications')
    .select('id, application_number, full_name, email, mobile, status, joining_access_enabled')
    .eq('id', appId)
    .single();

  if (appErr || !app) {
    return { status: 404, data: { success: false, error: 'Application record not found' } };
  }

  // Authorization check: Must be the candidate whose email matches OR an active admin
  const candidateEmail = auth.user.email?.toLowerCase().trim();
  const isCandidate = app.email.toLowerCase().trim() === candidateEmail;

  if (!isCandidate) {
    const { data: adminProfile } = await getSupabaseServer()
      .from('admin_profiles')
      .select('role, active')
      .eq('id', auth.user.id)
      .eq('active', true)
      .maybeSingle();

    if (!adminProfile) {
      return { status: 403, data: { success: false, error: 'Access denied for this application' } };
    }
  }

  // Check existing payments
  const { data: payments } = await getSupabaseServer()
    .from('payments')
    .select('*')
    .eq('application_id', appId)
    .order('created_at', { ascending: false });

  return {
    status: 200,
    data: {
      success: true,
      applicationId: app.id,
      applicationNumber: app.application_number,
      candidateName: app.full_name,
      candidateEmail: app.email,
      candidateMobile: app.mobile,
      applicationStatus: app.status,
      purpose: 'REGISTRATION',
      purposeTitle: 'Candidate Registration & Dossier Verification Fee',
      amount: AUTHORITATIVE_JOINING_FEE,
      currency: 'INR',
      totalConsultancyFee: TOTAL_CONSULTANCY_FEE,
      policyNote: 'Rs. 500 is payable upon joining form submission. The remaining Rs. 500 is coordinated after 1 month of active placement.',
      gateway: 'CASHFREE',
      environment: 'SANDBOX',
      payments: payments || []
    }
  };
}

/**
 * Handler: POST /api/payment/create-order
 * Server-side order creation using Cashfree Sandbox API
 */
export async function createPaymentOrderHandler(
  body: { applicationId: string; purpose?: string; amount?: number },
  authHeader?: string,
  reqHeaders?: Record<string, string | string[] | undefined>
) {
  const { applicationId, purpose = 'REGISTRATION' } = body;

  if (!applicationId) {
    return { status: 400, data: { success: false, error: 'Application ID is required' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // 1. Fetch application
  const { data: app, error: appErr } = await getSupabaseServer()
    .from('applications')
    .select('id, application_number, full_name, email, mobile, status, joining_access_enabled')
    .eq('id', applicationId)
    .single();

  if (appErr || !app) {
    return { status: 404, data: { success: false, error: 'Application not found' } };
  }

  // 2. Security authorization
  const candidateEmail = auth.user.email?.toLowerCase().trim();
  const isCandidate = app.email.toLowerCase().trim() === candidateEmail;

  if (!isCandidate) {
    const { data: adminProfile } = await getSupabaseServer()
      .from('admin_profiles')
      .select('role, active')
      .eq('id', auth.user.id)
      .eq('active', true)
      .maybeSingle();

    if (!adminProfile) {
      return { status: 403, data: { success: false, error: 'Unauthorized to initiate payment for this candidate' } };
    }
  }

  // 3. Check joining form submission status
  const { data: joiningForm } = await getSupabaseServer()
    .from('joining_forms')
    .select('id, submission_status')
    .eq('application_id', applicationId)
    .maybeSingle();

  // Authoritative amount strictly determined server-side (never trusts browser amount)
  const payableAmount = AUTHORITATIVE_JOINING_FEE;

  // 4. Concurrency-safe initiation via create_or_get_pending_payment RPC
  const { data: rpcRes, error: rpcErr } = await getSupabaseServer().rpc('create_or_get_pending_payment', {
    p_app_id: applicationId,
    p_purpose: purpose,
    p_amount: payableAmount
  });

  if (rpcErr || !rpcRes) {
    console.error('[CASHFREE_ORDER] create_or_get_pending_payment failed:', rpcErr);
    return { status: 500, data: { success: false, error: rpcErr?.message || 'Payment initiation failed' } };
  }

  const paymentData = rpcRes as any;

  // If already paid, return the verified success record
  if (paymentData.is_existing_success) {
    return {
      status: 200,
      data: {
        success: true,
        alreadyPaid: true,
        paymentId: paymentData.payment_id,
        paymentReference: paymentData.payment_reference,
        receiptNumber: paymentData.receipt_number,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'SUCCESS',
        paidAt: paymentData.paid_at,
        gatewayPaymentId: paymentData.gateway_payment_id
      }
    };
  }

  // Validate server credentials
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    console.error('[CASHFREE_ORDER] CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing from server runtime');
    return {
      status: 500,
      data: {
        success: false,
        error: 'Cashfree server credentials are not configured in runtime environment.'
      }
    };
  }

  // 5. Generate unique Cashfree Merchant Order ID (alphanumeric + underscore/hyphen, max 45 chars)
  // Format: ATG_CF_<ref-safe>_<timestamp>
  const cleanRef = (paymentData.payment_reference || 'REF').replace(/[^a-zA-Z0-9]/g, '');
  const merchantOrderId = `ATG_CF_${cleanRef}_${Date.now()}`.slice(0, 45);

  const baseUrl = resolveSiteBaseUrl(reqHeaders);
  const cleanPhone = (app.mobile || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';
  const customerId = `cust_${app.id.replace(/-/g, '').slice(0, 20)}`;

  const cfPayload = {
    order_id: merchantOrderId,
    order_amount: payableAmount,
    order_currency: 'INR',
    customer_details: {
      customer_id: customerId,
      customer_name: app.full_name || 'Candidate',
      customer_email: app.email,
      customer_phone: cleanPhone
    },
    order_meta: {
      return_url: `${baseUrl}/payment/result?order_id={order_id}`,
      notify_url: `${baseUrl}/api/payment/webhook`
    },
    order_note: `Candidate Registration Fee • ${app.application_number}`
  };

  let cfOrderResponse: any = null;
  try {
    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: getCashfreeHeaders(),
      body: JSON.stringify(cfPayload)
    });

    const responseText = await response.text();
    try {
      cfOrderResponse = JSON.parse(responseText);
    } catch {
      throw new Error(`Cashfree invalid JSON: ${responseText}`);
    }

    if (!response.ok) {
      console.error('[CASHFREE_ORDER] Cashfree order creation failed:', cfOrderResponse);
      const errMsg = cfOrderResponse?.message || cfOrderResponse?.error || 'Cashfree order creation rejected';
      return {
        status: response.status,
        data: {
          success: false,
          error: errMsg
        }
      };
    }
  } catch (netErr: any) {
    console.error('[CASHFREE_ORDER] Network exception calling Cashfree:', netErr);
    return {
      status: 502,
      data: {
        success: false,
        error: `Cashfree gateway communication error: ${netErr.message || netErr}`
      }
    };
  }

  const paymentSessionId = cfOrderResponse.payment_session_id;
  const cfOrderId = cfOrderResponse.cf_order_id;

  if (!paymentSessionId) {
    console.error('[CASHFREE_ORDER] No payment_session_id in Cashfree response:', cfOrderResponse);
    return {
      status: 500,
      data: {
        success: false,
        error: 'Cashfree did not return a valid payment session ID.'
      }
    };
  }

  // 6. Update payment with the generated Cashfree order ID, session, and joining_form_id
  await getSupabaseServer()
    .from('payments')
    .update({
      gateway_order_id: merchantOrderId,
      gateway: 'CASHFREE',
      joining_form_id: joiningForm?.id || null
    })
    .eq('id', paymentData.payment_id);

  return {
    status: 200,
    data: {
      success: true,
      alreadyPaid: false,
      paymentId: paymentData.payment_id,
      paymentReference: paymentData.payment_reference,
      orderId: merchantOrderId,
      cfOrderId: cfOrderId,
      payment_session_id: paymentSessionId,
      amount: payableAmount,
      currency: 'INR',
      environment: 'SANDBOX',
      candidate: {
        name: app.full_name,
        email: app.email,
        mobile: app.mobile
      }
    }
  };
}

/**
 * Gateway-agnostic post-payment success handler.
 * Generates the official Reference Slip (idempotently) and triggers automatic Resend email.
 * Decoupled: Resend failure never reverses payment success.
 */
export async function triggerPostPaymentReferenceSlip(paymentId: string) {
  try {
    const { getOrCreateReferenceSlipForPayment } = await import('../services/referenceSlipService');
    const refSlipRes = await getOrCreateReferenceSlipForPayment(paymentId);

    if (!refSlipRes.success || !refSlipRes.data || !refSlipRes.candidateEmail) {
      console.warn('[POST_PAYMENT_TRIGGER] Reference Slip notice:', refSlipRes.error);
      return;
    }

    let pdfBytes = refSlipRes.pdfBytes;
    if (!pdfBytes && refSlipRes.file?.storage_path) {
      const { data: fileData } = await getSupabaseServer().storage
        .from('generated-documents')
        .download(refSlipRes.file.storage_path);
      if (fileData) {
        const ab = await fileData.arrayBuffer();
        pdfBytes = new Uint8Array(ab);
      }
    }

    if (pdfBytes) {
      const { sendReferenceSlipEmail } = await import('./referenceSlipEmailService');
      await sendReferenceSlipEmail({
        recipientEmail: refSlipRes.candidateEmail,
        candidateName: refSlipRes.candidateName || 'Candidate',
        referenceNumber: refSlipRes.referenceNumber || refSlipRes.data.slip.reference_number,
        sourceReference: refSlipRes.sourceReference || 'REF',
        pdfBuffer: pdfBytes,
        joiningFormId: refSlipRes.data.slip.joining_form_id,
        applicationId: refSlipRes.data.slip.application_id
      });
    }
  } catch (err: any) {
    console.warn('[POST_PAYMENT_TRIGGER] Asynchronous Reference Slip trigger error (ignored, payment stays SUCCESS):', err?.message);
  }
}

/**
 * Handler: POST /api/payment/verify or GET /api/payment/verify?order_id=...
 * Server-side order verification via Cashfree Sandbox API
 * Checks authoritative Cashfree payment state and completes payment atomically in database.
 */
export async function verifyPaymentHandler(
  body: {
    orderId?: string;
    paymentId?: string;
    order_id?: string;
    payment_id?: string;
  },
  authHeader?: string
) {
  const targetOrderId = body.orderId || body.order_id;
  const targetPaymentId = body.paymentId || body.payment_id;

  if (!targetOrderId && !targetPaymentId) {
    return { status: 400, data: { success: false, error: 'Missing required orderId or paymentId parameter' } };
  }

  // Optional candidate or admin authentication
  if (authHeader) {
    const auth = await authenticateRequest(authHeader);
    if (!auth.authenticated) {
      return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
    }
  }

  // 1. Locate payment in local database
  let paymentQuery = getSupabaseServer().from('payments').select('*');
  if (targetOrderId) {
    paymentQuery = paymentQuery.eq('gateway_order_id', targetOrderId);
  } else if (targetPaymentId) {
    paymentQuery = paymentQuery.eq('id', targetPaymentId);
  }

  const { data: paymentRecord, error: pErr } = await paymentQuery.maybeSingle();

  if (pErr || !paymentRecord) {
    console.error(`[CASHFREE_VERIFY] Payment record not found for order ${targetOrderId || targetPaymentId}:`, pErr);
    return { status: 404, data: { success: false, error: 'Payment record not found in system.' } };
  }

  // 2. IDEMPOTENCY: If payment is ALREADY marked SUCCESS, return existing verified state immediately
  if (paymentRecord.status === 'SUCCESS') {
    return {
      status: 200,
      data: {
        success: true,
        paymentStatus: 'SUCCESS',
        alreadyVerified: true,
        paymentId: paymentRecord.id,
        paymentReference: paymentRecord.payment_reference,
        receiptNumber: paymentRecord.receipt_number || paymentRecord.payment_reference,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        paidAt: paymentRecord.paid_at,
        gatewayOrderId: paymentRecord.gateway_order_id,
        gatewayPaymentId: paymentRecord.gateway_payment_id
      }
    };
  }

  const orderId = paymentRecord.gateway_order_id || targetOrderId;

  // Validate server credentials
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    console.error('[CASHFREE_VERIFY] CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing from server runtime');
    return {
      status: 500,
      data: {
        success: false,
        error: 'Cashfree server credentials are not configured in runtime environment.'
      }
    };
  }

  // 3. Query Cashfree Sandbox API for authoritative Order and Payment state
  let cfOrder: any = null;
  let cfPayments: any[] = [];

  try {
    const orderRes = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: getCashfreeHeaders()
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('[CASHFREE_VERIFY] Cashfree get order error:', errText);
      return { status: 400, data: { success: false, error: `Cashfree order verification failed: ${errText}` } };
    }

    cfOrder = await orderRes.json();

    // Query payments list for the order
    const paymentsRes = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: getCashfreeHeaders()
    });

    if (paymentsRes.ok) {
      cfPayments = (await paymentsRes.json()) as any[];
    }
  } catch (err: any) {
    console.error('[CASHFREE_VERIFY] Exception querying Cashfree API:', err);
    return {
      status: 502,
      data: {
        success: false,
        error: `Error communicating with Cashfree Sandbox: ${err?.message || err}`
      }
    };
  }

  const orderStatus = cfOrder.order_status; // "PAID", "ACTIVE", "EXPIRED", "TERMINATED"
  const successPayment = Array.isArray(cfPayments)
    ? cfPayments.find((p: any) => p.payment_status === 'SUCCESS')
    : null;

  // 4. Handle State: SUCCESS / PAID
  if (orderStatus === 'PAID' || successPayment) {
    const gatewayPaymentId = String(successPayment?.cf_payment_id || cfOrder.cf_order_id || `cf_${Date.now()}`);
    const paymentMethodDesc = successPayment?.payment_group
      ? `CASHFREE_${String(successPayment.payment_group).toUpperCase()}`
      : 'CASHFREE';

    // Atomic database completion via complete_verified_payment RPC
    const { data: rpcRes, error: rpcErr } = await getSupabaseServer().rpc('complete_verified_payment', {
      p_payment_id: paymentRecord.id,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: gatewayPaymentId,
      p_payment_method: paymentMethodDesc
    });

    if (rpcErr || !rpcRes) {
      console.error('[CASHFREE_VERIFY] complete_verified_payment RPC failed:', rpcErr);
      return { status: 500, data: { success: false, error: rpcErr?.message || 'Database payment completion failed' } };
    }

    const verifiedPayment = rpcRes as any;

    // Ensure gateway is tagged as CASHFREE
    await getSupabaseServer()
      .from('payments')
      .update({ gateway: 'CASHFREE' })
      .eq('id', paymentRecord.id);

    // 5. Asynchronous receipt email (email failure does NOT fail payment)
    import('./paymentEmailService').then(({ sendPaymentReceiptEmail }) => {
      const receiptData = {
        applicationNumber: verifiedPayment.application_number,
        paymentReference: verifiedPayment.payment_reference,
        receiptNumber: verifiedPayment.receipt_number,
        candidateName: verifiedPayment.candidate_name,
        candidateEmail: verifiedPayment.candidate_email,
        paymentPurpose: verifiedPayment.purpose,
        amount: verifiedPayment.amount,
        currency: verifiedPayment.currency,
        paymentDate: verifiedPayment.paid_at,
        paymentStatus: 'SUCCESS',
        paymentMethod: paymentMethodDesc,
        gateway: 'CASHFREE',
        gatewayOrderId: orderId,
        gatewayPaymentId: gatewayPaymentId
      };
      return sendPaymentReceiptEmail(receiptData);
    }).catch((emailErr) => {
      console.warn('[CASHFREE_VERIFY] Asynchronous receipt email error (ignored):', emailErr);
    });

    // 6. Asynchronously trigger Reference Slip generation and Resend email
    triggerPostPaymentReferenceSlip(paymentRecord.id).catch((refErr) => {
      console.warn('[CASHFREE_VERIFY] Asynchronous Reference Slip error (ignored):', refErr);
    });

    return {
      status: 200,
      data: {
        success: true,
        paymentStatus: 'SUCCESS',
        paymentReference: verifiedPayment.payment_reference,
        receiptNumber: verifiedPayment.receipt_number,
        applicationNumber: verifiedPayment.application_number,
        amount: verifiedPayment.amount,
        currency: verifiedPayment.currency,
        paidAt: verifiedPayment.paid_at,
        gatewayOrderId: orderId,
        gatewayPaymentId: gatewayPaymentId,
        candidateName: verifiedPayment.candidate_name
      }
    };
  }

  // 7. Handle State: PENDING / ACTIVE
  if (orderStatus === 'ACTIVE') {
    return {
      status: 200,
      data: {
        success: true,
        paymentStatus: 'PENDING',
        orderId,
        message: 'Payment is pending or awaiting candidate completion in checkout.'
      }
    };
  }

  // 8. Handle State: FAILED / EXPIRED
  const failureReason = cfOrder.order_status === 'EXPIRED'
    ? 'Cashfree order expired before payment'
    : (successPayment?.payment_message || 'Payment not completed or failed at gateway');

  await getSupabaseServer().rpc('mark_payment_failed', {
    p_payment_id: paymentRecord.id,
    p_reason: failureReason
  });

  return {
    status: 200,
    data: {
      success: false,
      paymentStatus: 'FAILED',
      orderId,
      error: failureReason
    }
  };
}

/**
 * Verifies Cashfree webhook signature using HMAC-SHA256
 * Cashfree computes: HMAC-SHA256(timestamp + rawBody, CASHFREE_SECRET_KEY)
 */
function verifyCashfreeWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  timestampHeader?: string | null
): boolean {
  if (!signatureHeader || !CASHFREE_SECRET_KEY) {
    return false;
  }

  const payload = timestampHeader ? `${timestampHeader}${rawBody}` : rawBody;

  const expectedBase64 = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(payload)
    .digest('base64');

  const expectedHex = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signatureHeader, 'utf8');
  const b64Buf = Buffer.from(expectedBase64, 'utf8');
  const hexBuf = Buffer.from(expectedHex, 'utf8');

  if (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf)) {
    return true;
  }
  if (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) {
    return true;
  }
  return false;
}

/**
 * Handler: POST /api/payment/webhook
 * Cashfree webhook ingestion with HMAC-SHA256 signature verification and idempotency
 */
export async function webhookHandler(
  rawBody: string,
  signatureHeader?: string | null,
  timestampHeader?: string | null
) {
  if (!rawBody) {
    return { status: 400, data: { error: 'Empty webhook body' } };
  }

  // 1. Verify Webhook Signature if secret configured
  if (CASHFREE_SECRET_KEY) {
    const isSignatureValid = verifyCashfreeWebhookSignature(rawBody, signatureHeader, timestampHeader);
    if (!isSignatureValid) {
      console.error('[CASHFREE_WEBHOOK] Cryptographic signature validation failed');
      return { status: 400, data: { error: 'Invalid Cashfree webhook signature' } };
    }
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return { status: 400, data: { error: 'Invalid JSON payload' } };
  }

  const eventType = eventPayload.type || eventPayload.event;
  console.log(`[CASHFREE_WEBHOOK] Received event: ${eventType}`);

  // Cashfree PG v3 webhook data structure:
  // eventPayload.data.order.order_id
  // eventPayload.data.payment.payment_status ("SUCCESS", "FAILED")
  const orderData = eventPayload.data?.order || eventPayload.order;
  const paymentData = eventPayload.data?.payment || eventPayload.payment;
  const orderId = orderData?.order_id || eventPayload.order_id;
  const paymentStatus = paymentData?.payment_status || (eventType === 'PAYMENT_SUCCESS_WEBHOOK' ? 'SUCCESS' : null);
  const cfPaymentId = paymentData?.cf_payment_id || eventPayload.cf_payment_id;

  if (!orderId) {
    return { status: 200, data: { received: true, note: 'No order_id in event payload' } };
  }

  // 2. Locate payment record by orderId
  const { data: paymentRecord } = await getSupabaseServer()
    .from('payments')
    .select('id, status, payment_reference')
    .eq('gateway_order_id', orderId)
    .maybeSingle();

  if (!paymentRecord) {
    console.warn(`[CASHFREE_WEBHOOK] No payment record found for order_id: ${orderId}`);
    return { status: 200, data: { received: true, note: 'Payment record not found' } };
  }

  // 3. IDEMPOTENCY: If already marked SUCCESS, acknowledge immediately
  if (paymentRecord.status === 'SUCCESS') {
    console.log(`[CASHFREE_WEBHOOK] Payment ${paymentRecord.id} already marked SUCCESS. Idempotent return.`);
    return { status: 200, data: { received: true, idempotent: true } };
  }

  // 4. Process SUCCESS
  if (paymentStatus === 'SUCCESS' || eventType === 'PAYMENT_SUCCESS_WEBHOOK' || eventType === 'ORDER_PAID_WEBHOOK') {
    const gatewayPaymentId = String(cfPaymentId || `cf_hook_${Date.now()}`);

    await getSupabaseServer().rpc('complete_verified_payment', {
      p_payment_id: paymentRecord.id,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: gatewayPaymentId,
      p_payment_method: 'CASHFREE'
    });

    await getSupabaseServer()
      .from('payments')
      .update({ gateway: 'CASHFREE' })
      .eq('id', paymentRecord.id);

    // Asynchronously generate candidate Reference Slip and dispatch via Resend
    triggerPostPaymentReferenceSlip(paymentRecord.id).catch((refErr) => {
      console.warn('[CASHFREE_WEBHOOK] Asynchronous Reference Slip error (ignored):', refErr);
    });

    return { status: 200, data: { received: true, processed: true } };
  }

  // 5. Process FAILURE
  if (paymentStatus === 'FAILED' || eventType === 'PAYMENT_FAILED_WEBHOOK') {
    if (paymentRecord.status === 'PENDING') {
      await getSupabaseServer().rpc('mark_payment_failed', {
        p_payment_id: paymentRecord.id,
        p_reason: paymentData?.payment_message || 'Cashfree payment failed'
      });
    }
    return { status: 200, data: { received: true, failed_recorded: true } };
  }

  return { status: 200, data: { received: true, event: eventType } };
}

/**
 * Handler: POST /api/payment/record-offline
 * Admin manual offline payment recording
 */
export async function recordOfflinePaymentHandler(
  body: {
    applicationId?: string;
    joiningFormId?: string;
    purpose: string;
    amount: number;
    receivedBy: string;
    notes?: string;
  },
  authHeader?: string
) {
  const { applicationId, joiningFormId, purpose, amount, receivedBy, notes } = body;

  if ((!applicationId && !joiningFormId) || !purpose || !amount || !receivedBy) {
    return { status: 400, data: { success: false, error: 'Missing required offline payment fields (source reference, purpose, amount, or receivedBy)' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // Verify admin authorization & hardened role checks
  const { data: adminProfile } = await getSupabaseServer()
    .from('admin_profiles')
    .select('role, active')
    .eq('id', auth.user.id)
    .eq('active', true)
    .maybeSingle();

  if (!adminProfile) {
    return { status: 403, data: { success: false, error: 'Only authorized administrators can record offline payments.' } };
  }

  const allowedRoles = ['SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'];
  if (!allowedRoles.includes(adminProfile.role)) {
    return {
      status: 403,
      data: {
        success: false,
        error: `Role '${adminProfile.role}' is not authorized to record offline payments. Document Verifiers have read-only access.`
      }
    };
  }

  const { data: rpcRes, error: rpcErr } = await getSupabaseServer().rpc('record_offline_payment', {
    p_app_id: applicationId || null,
    p_purpose: purpose,
    p_amount: amount,
    p_received_by: receivedBy,
    p_notes: notes || undefined,
    p_joining_form_id: joiningFormId || null
  });

  if (rpcErr || !rpcRes) {
    console.error('[OFFLINE_PAYMENT] Failed to record:', rpcErr);
    return { status: 500, data: { success: false, error: rpcErr?.message || 'Failed to record offline payment' } };
  }

  const paymentRecord = rpcRes as any;
  const paymentId = paymentRecord?.payment_id || paymentRecord?.id;
  if (paymentId) {
    triggerPostPaymentReferenceSlip(paymentId).catch((refErr) => {
      console.warn('[OFFLINE_PAYMENT] Asynchronous Reference Slip error (ignored):', refErr);
    });
  }

  return { status: 200, data: rpcRes };
}

/**
 * Handler: POST /api/payment/resend-receipt
 * Admin action to resend the payment receipt email
 */
export async function resendReceiptEmailHandler(
  body: { paymentId: string },
  authHeader?: string
) {
  const { paymentId } = body;
  if (!paymentId) {
    return { status: 400, data: { success: false, error: 'Payment ID is required' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // Find payment and application
  const { data: payment, error: pErr } = await getSupabaseServer()
    .from('payments')
    .select(`
      id, payment_reference, receipt_number, amount, currency, purpose, status, paid_at,
      payment_method, gateway, gateway_order_id, gateway_payment_id,
      applications:application_id (id, application_number, full_name, email, mobile)
    `)
    .eq('id', paymentId)
    .single();

  if (pErr || !payment) {
    return { status: 404, data: { success: false, error: 'Payment record not found' } };
  }

  if (payment.status !== 'SUCCESS') {
    return { status: 400, data: { success: false, error: 'Receipt can only be sent for SUCCESS payments' } };
  }

  const app = payment.applications as any;
  const { sendPaymentReceiptEmail } = await import('./paymentEmailService');

  const receiptData = {
    applicationNumber: app.application_number,
    paymentReference: payment.payment_reference,
    receiptNumber: payment.receipt_number || payment.payment_reference,
    candidateName: app.full_name,
    candidateEmail: app.email,
    candidateMobile: app.mobile,
    paymentPurpose: payment.purpose,
    amount: payment.amount,
    currency: payment.currency,
    paymentDate: payment.paid_at || new Date(),
    paymentStatus: 'SUCCESS',
    paymentMethod: payment.payment_method || 'ONLINE',
    gateway: payment.gateway || 'CASHFREE',
    gatewayOrderId: payment.gateway_order_id,
    gatewayPaymentId: payment.gateway_payment_id
  };

  const emailResult = await sendPaymentReceiptEmail(receiptData);

  await getSupabaseServer().from('activity_logs').insert({
    application_id: app.id,
    action: emailResult.success ? 'PAYMENT_RECEIPT_EMAIL_SENT' : 'PAYMENT_RECEIPT_EMAIL_FAILED',
    description: `Payment receipt email ${emailResult.success ? 'sent' : 'failed'} to ${app.email} for receipt ${receiptData.receiptNumber}`
  });

  return { status: 200, data: { success: emailResult.success, error: emailResult.error } };
}
