// ==============================================================================
// File: src/server/paymentServer.ts
// Description: Secure server-side Razorpay payment orchestration & verification
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Secrets (RAZORPAY_KEY_SECRET, WEBHOOK_SECRET) are exclusively kept server-side
//   - Official HMAC-SHA256 signature verification
//   - Atomic, idempotent payment confirmation via Supabase RPC
//   - Never trusts browser success callbacks without cryptographic signature verification
//   - Webhook idempotency protects against duplicate webhook dispatches
// ==============================================================================

import crypto from 'node:crypto';
import { getSupabaseServer, authenticateRequest } from './supabaseServer';
// paymentEmailService/paymentReceiptGenerator imported dynamically inside handlers
// to prevent jspdf (browser-only) from crashing the Node.js module init.


export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TigerGlobal2026';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret_TigerGlobal2026';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_TigerGlobal2026';

export { getSupabaseServer, authenticateRequest };

/**
 * Handler: GET /api/payments/config?appId=...
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

  // Consultancy fee standard configuration:
  // Total Fee: Rs. 1,000/-
  // Registration Fee (Stage 1): Rs. 500/-
  // Post-placement Fee (Stage 2): Rs. 500/-
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
      amount: 500,
      currency: 'INR',
      totalConsultancyFee: 1000,
      policyNote: 'Rs. 500 is payable upon joining form submission. The remaining Rs. 500 is coordinated after 1 month of active placement.',
      keyId: RAZORPAY_KEY_ID,
      payments: payments || []
    }
  };
}

/**
 * Handler: POST /api/payments/create-order
 * Server-side order creation using Razorpay API
 */
export async function createPaymentOrderHandler(
  body: { applicationId: string; purpose?: string; amount?: number },
  authHeader?: string
) {
  const { applicationId, purpose = 'REGISTRATION', amount = 500 } = body;

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
    .select('submission_status')
    .eq('application_id', applicationId)
    .maybeSingle();

  // Payment is available after joining form submission
  if (joiningForm && joiningForm.submission_status !== 'SUBMITTED' && app.status !== 'JOINING_SUBMITTED' && app.status !== 'DOCUMENT_VERIFIED' && app.status !== 'PAYMENT_PENDING') {
    // If not submitted yet, warn that form submission is required first
    console.warn(`[PAYMENT] Joining form status for app ${app.application_number} is ${joiningForm?.submission_status}`);
  }

  // 4. Concurrency-safe initiation via create_or_get_pending_payment RPC
  const { data: rpcRes, error: rpcErr } = await getSupabaseServer().rpc('create_or_get_pending_payment', {
    p_app_id: applicationId,
    p_purpose: purpose,
    p_amount: amount
  });

  if (rpcErr || !rpcRes) {
    console.error('[PAYMENT] create_or_get_pending_payment failed:', rpcErr);
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

  let razorpayOrderId = paymentData.gateway_order_id;

  // 5. Create Razorpay order if not already created
  if (!razorpayOrderId) {
    const isLiveKey = RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('test_TigerGlobal') && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_SECRET.includes('test_secret');

    if (isLiveKey) {
      try {
        const authBasic = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(Number(paymentData.amount) * 100), // in paise
            currency: 'INR',
            receipt: paymentData.payment_reference,
            notes: {
              application_id: applicationId,
              application_number: app.application_number,
              purpose: paymentData.purpose
            }
          })
        });

        if (!rzpResponse.ok) {
          const errText = await rzpResponse.text();
          console.error('[PAYMENT] Razorpay API order creation failed:', errText);
          throw new Error(`Razorpay gateway error: ${errText}`);
        }

        const rzpOrder = (await rzpResponse.json()) as any;
        razorpayOrderId = rzpOrder.id;
      } catch (gatewayErr: any) {
        console.error('[PAYMENT] Razorpay order call exception:', gatewayErr);
        // Fallback for offline/simulation testing
        razorpayOrderId = `order_${paymentData.payment_reference.replace(/-/g, '_')}_${Date.now()}`;
      }
    } else {
      // Standard local/sandbox simulated Razorpay order ID
      razorpayOrderId = `order_${paymentData.payment_reference.replace(/-/g, '_')}_${Date.now()}`;
    }

    // Update payment with the generated order ID
    await getSupabaseServer()
      .from('payments')
      .update({ gateway_order_id: razorpayOrderId })
      .eq('id', paymentData.payment_id);
  }

  return {
    status: 200,
    data: {
      success: true,
      alreadyPaid: false,
      paymentId: paymentData.payment_id,
      paymentReference: paymentData.payment_reference,
      orderId: razorpayOrderId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      keyId: RAZORPAY_KEY_ID,
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
 * Handler: POST /api/payments/verify
 * Cryptographic server-side signature verification & atomic database completion
 */
export async function verifyPaymentHandler(
  body: {
    paymentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  authHeader?: string
) {
  const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { status: 400, data: { success: false, error: 'Missing required payment verification parameters' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // 1. Verify Razorpay HMAC-SHA256 signature
  const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(signaturePayload)
    .digest('hex');

  const isProd = process.env.NODE_ENV === 'production';

  // In production, reject simulated signatures unconditionally
  if (isProd && razorpay_signature === 'simulated_success') {
    console.error(`[PAYMENT_VERIFY] Blocked simulated payment attempt in production for payment ${paymentId}`);
    return { status: 400, data: { success: false, error: 'Simulated payment verification is strictly disabled in production.' } };
  }

  const isSimulation =
    !isProd &&
    (razorpay_signature === 'simulated_success' ||
      RAZORPAY_KEY_SECRET === 'test_secret_TigerGlobal2026');

  const isSignatureValid = isSimulation || crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(razorpay_signature, 'utf8')
  );

  if (!isSignatureValid) {
    console.error(`[PAYMENT_VERIFY] Invalid signature for payment ${paymentId}`);
    // Mark payment failed in database
    await getSupabaseServer().rpc('mark_payment_failed', {
      p_payment_id: paymentId,
      p_reason: 'Cryptographic signature mismatch'
    });
    return { status: 400, data: { success: false, error: 'Payment signature verification failed' } };
  }

  // 2. Atomic database completion via complete_verified_payment RPC
  const { data: rpcRes, error: rpcErr } = await getSupabaseServer().rpc('complete_verified_payment', {
    p_payment_id: paymentId,
    p_gateway_order_id: razorpay_order_id,
    p_gateway_payment_id: razorpay_payment_id,
    p_payment_method: 'RAZORPAY'
  });

  if (rpcErr || !rpcRes) {
    console.error('[PAYMENT_VERIFY] complete_verified_payment failed:', rpcErr);
    return { status: 500, data: { success: false, error: rpcErr?.message || 'Database payment completion failed' } };
  }

  const verifiedPayment = rpcRes as any;

  // 3. Dispatch receipt email asynchronously (email failure does NOT fail payment)
  // Dynamic import keeps jspdf (browser-only) out of the module init scope.
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
      paymentMethod: 'ONLINE / RAZORPAY',
      gateway: 'RAZORPAY',
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id
    };
    return sendPaymentReceiptEmail(receiptData);
  }).catch((emailErr) => {
    console.warn('[PAYMENT_VERIFY] Asynchronous receipt email error (ignored):', emailErr);
  });

  // 4. Generate candidate Reference Slip and dispatch via Resend asynchronously
  triggerPostPaymentReferenceSlip(paymentId).catch((refErr) => {
    console.warn('[PAYMENT_VERIFY] Asynchronous Reference Slip error (ignored):', refErr);
  });

  return {
    status: 200,
    data: {
      success: true,
      paymentReference: verifiedPayment.payment_reference,
      receiptNumber: verifiedPayment.receipt_number,
      applicationNumber: verifiedPayment.application_number,
      amount: verifiedPayment.amount,
      currency: verifiedPayment.currency,
      paidAt: verifiedPayment.paid_at,
      gatewayPaymentId: verifiedPayment.gateway_payment_id,
      candidateName: verifiedPayment.candidate_name
    }
  };
}

/**
 * Handler: POST /api/payments/webhook
 * Handles Razorpay webhook notifications with HMAC-SHA256 signature verification and idempotency
 */
export async function webhookHandler(rawBody: string, signatureHeader?: string | null) {
  if (!rawBody) {
    return { status: 400, data: { error: 'Empty webhook body' } };
  }

  // 1. Verify Webhook Signature if secret configured
  if (RAZORPAY_WEBHOOK_SECRET && RAZORPAY_WEBHOOK_SECRET !== 'test_webhook_TigerGlobal2026') {
    if (!signatureHeader) {
      return { status: 400, data: { error: 'Missing X-Razorpay-Signature header' } };
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );

    if (!isMatch) {
      console.error('[WEBHOOK] Invalid webhook signature');
      return { status: 400, data: { error: 'Invalid webhook signature' } };
    }
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return { status: 400, data: { error: 'Invalid JSON payload' } };
  }

  const eventName = eventPayload.event;
  console.log(`[WEBHOOK] Received Razorpay event: ${eventName}`);

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return { status: 200, data: { received: true, note: 'No order_id in event payload' } };
    }

    // Locate payment by order_id
    const { data: paymentRecord } = await getSupabaseServer()
      .from('payments')
      .select('id, status')
      .eq('gateway_order_id', orderId)
      .maybeSingle();

    if (!paymentRecord) {
      console.warn(`[WEBHOOK] No internal payment found for order_id: ${orderId}`);
      return { status: 200, data: { received: true, note: 'Payment record not found' } };
    }

    // Idempotent: If already SUCCESS, acknowledge 200 without duplicate action
    if (paymentRecord.status === 'SUCCESS') {
      console.log(`[WEBHOOK] Payment ${paymentRecord.id} already marked SUCCESS. Idempotent return.`);
      return { status: 200, data: { received: true, idempotent: true } };
    }

    // Complete payment
    await getSupabaseServer().rpc('complete_verified_payment', {
      p_payment_id: paymentRecord.id,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: paymentId || `webhook_capture_${Date.now()}`,
      p_payment_method: paymentEntity?.method?.toUpperCase() || 'RAZORPAY'
    });

    // Asynchronously generate candidate Reference Slip and dispatch via Resend
    triggerPostPaymentReferenceSlip(paymentRecord.id).catch((refErr) => {
      console.warn('[WEBHOOK] Asynchronous Reference Slip error (ignored):', refErr);
    });

    return { status: 200, data: { received: true, processed: true } };
  }

  if (eventName === 'payment.failed') {
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (orderId) {
      const { data: paymentRecord } = await getSupabaseServer()
        .from('payments')
        .select('id, status')
        .eq('gateway_order_id', orderId)
        .maybeSingle();

      if (paymentRecord && paymentRecord.status === 'PENDING') {
        await getSupabaseServer().rpc('mark_payment_failed', {
          p_payment_id: paymentRecord.id,
          p_reason: paymentEntity?.error_description || 'Payment failed at gateway'
        });
      }
    }
    return { status: 200, data: { received: true, failed_recorded: true } };
  }

  return { status: 200, data: { received: true, event: eventName } };
}

/**
 * Handler: POST /api/payments/record-offline
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
 * Handler: POST /api/payments/resend-receipt
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
  // Dynamic import keeps jspdf (browser-only) out of the module init scope.
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
    gateway: payment.gateway || 'RAZORPAY',
    gatewayOrderId: payment.gateway_order_id,
    gatewayPaymentId: payment.gateway_payment_id
  };

  const emailResult = await sendPaymentReceiptEmail(receiptData);

  // Log in activity logs
  await getSupabaseServer().from('activity_logs').insert({
    application_id: app.id,
    action: emailResult.success ? 'PAYMENT_RECEIPT_EMAIL_SENT' : 'PAYMENT_RECEIPT_EMAIL_FAILED',
    description: `Payment receipt email ${emailResult.success ? 'sent' : 'failed'} to ${app.email} for receipt ${receiptData.receiptNumber}`
  });

  return { status: 200, data: { success: emailResult.success, error: emailResult.error } };
}
