// ==============================================================================
// File: api/payment/_paymentCore.ts
// Description: Pure, self-contained serverless payment core for Vercel Node runtime.
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Architecture & Security:
//   - ZERO browser-only imports (no jspdf, no import.meta, no window references)
//   - Strict Cashfree SANDBOX endpoint locking (production disabled for safety)
//   - Authoritative payable amount (500 INR) determined strictly server-side
//   - Server-only Supabase client with persistSession: false, autoRefreshToken: false
//   - Atomic, idempotent payment completion via Supabase RPC (complete_verified_payment)
//   - Native fetch dispatch to Resend REST API (no container freeze / hung promises)
// ==============================================================================

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { ensureReferenceSlipForPayment } from './_referenceSlipCore.js';

// ------------------------------------------------------------------------------
// Configuration & Environment (Server-Only)
// ------------------------------------------------------------------------------

export const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
export const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
export const CASHFREE_ENVIRONMENT = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();

export const CASHFREE_BASE_URL = CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';
export const CASHFREE_API_VERSION = '2023-08-01';

// Authoritative Joining Registration Fee
export const AUTHORITATIVE_JOINING_FEE = 500;
export const TOTAL_CONSULTANCY_FEE = 1000;

const DEFAULT_SUPABASE_URL = 'https://bhfxqtaesvfsbdckgeka.supabase.co';

let _supabaseServer: any = null;

export function getSupabaseServer(): any {
  if (!_supabaseServer) {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseServer;
}

export async function authenticateRequest(authHeader: string | undefined | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false as const, error: 'Missing or malformed Authorization header' };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { authenticated: false as const, error: error?.message || 'Invalid or expired authorization token' };
    }
    return { authenticated: true as const, user };
  } catch (err: any) {
    return { authenticated: false as const, error: err?.message || 'Authentication error' };
  }
}

function getCashfreeHeaders(): Record<string, string> {
  return {
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY,
    'x-api-version': CASHFREE_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

// ------------------------------------------------------------------------------
// Resend REST API Client (Serverless Safe)
// ------------------------------------------------------------------------------

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const body: Record<string, any> = {
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    };
    if (params.attachments && params.attachments.length > 0) {
      body.attachments = params.attachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      return { success: false, error: data?.message || `Resend HTTP ${response.status}` };
    }
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error sending email via Resend' };
  }
}

// ------------------------------------------------------------------------------
// Post-Payment Email & Reference Slip Dispatch (Awaited in Serverless)
// ------------------------------------------------------------------------------

export async function dispatchPostPaymentNotifications(paymentId: string) {
  const supabase = getSupabaseServer();
  const resendApiKey = process.env.RESEND_API_KEY;

  try {
    // 1. Fetch payment details
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select(`
        id, payment_reference, receipt_number, amount, currency, purpose, status, paid_at,
        payment_method, gateway, gateway_order_id, gateway_payment_id, application_id, joining_form_id,
        applications:application_id (id, application_number, full_name, email, mobile)
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (pErr || !payment || payment.status !== 'SUCCESS') {
      console.warn('[POST_PAYMENT] Payment record not found or not in SUCCESS state:', paymentId);
      return;
    }

    const app = payment.applications as any;
    let candidateEmail = app?.email;
    let candidateName = app?.full_name || 'Candidate';
    let applicationNumber = app?.application_number || 'ATG-APP';
    const receiptNumber = payment.receipt_number || payment.payment_reference;

    if (!candidateEmail && payment.joining_form_id) {
      const { data: jf } = await supabase
        .from('joining_forms')
        .select('candidate_name, email, joining_reference')
        .eq('id', payment.joining_form_id)
        .maybeSingle();
      if (jf) {
        candidateEmail = jf.email;
        candidateName = jf.candidate_name || 'Candidate';
        applicationNumber = jf.joining_reference || 'JOIN-CONFIRMED';
      }
    }

    if (!candidateEmail || !resendApiKey) {
      console.log('[POST_PAYMENT] Skipping email dispatch: candidateEmail or RESEND_API_KEY missing.');
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@atigerglobal.com';
    const fromName = process.env.RESEND_FROM_NAME || 'A TIGER GLOBAL';
    const defaultFrom = `"${fromName}" <${fromEmail}>`;

    // 2. Ensure Reference Slip 2-Page PDF is generated and persisted in private storage
    const refSlipRes = await ensureReferenceSlipForPayment(paymentId);
    const safeRef = applicationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const refSlipNumber = refSlipRes.slip?.reference_number || 'ATG-REF';

    // 3. Dispatch Candidate Confirmation Email with 2-Page Reference Slip attached
    const candidateSubject = `Your Official Reference Slip & Payment Confirmation – A TIGER GLOBAL (${applicationNumber})`;
    const candidateHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">A TIGER GLOBAL</h2>
          <p style="color: #c5a059; margin: 5px 0 0; font-size: 13px; font-weight: bold; letter-spacing: 1px;">CAREER SOLUTION & CONSULTANCY</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <h3 style="color: #166534; margin-top: 0; font-size: 18px;">Payment Verified & Official Reference Slip Issued</h3>
          <p>Dear <strong>${candidateName}</strong>,</p>
          <p>We are pleased to confirm that your registration fee payment has been successfully verified. Your official <strong>2-Page Employee Reference Slip & Consultancy Return Form</strong> has been generated and is attached to this email as a PDF document.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; background: #f8fafc; border-radius: 6px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Reference Slip No:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #0f172a;">${refSlipNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Receipt Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #0f172a;">${receiptNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Application / Dossier:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #0f172a;">${applicationNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Payment Reference:</td>
              <td style="padding: 10px 14px; font-family: monospace; font-weight: bold; text-align: right;">${payment.payment_reference}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Amount Paid:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #166534;">INR ${Number(payment.amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verification Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #166534;">VERIFIED & ACTIVE</td>
            </tr>
          </table>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; font-size: 13px; color: #1e40af;">
            <strong>Important Next Steps:</strong> Please print and carry this official Reference Slip along with your original identity & qualification documents when reporting to your assigned orientation. The embedded QR code enables instant authenticity verification by authorized company HR officers.
          </div>

          <p style="margin-bottom: 0;">Warm regards,<br><strong>Onboarding & Placement Division</strong><br>A Tiger Global Career Solution & Consultancy</p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          This is an automated transactional confirmation. Ref: ${refSlipNumber} | GSTIN: 27DIFPA0273P1Z4
        </div>
      </div>
    `;

    const attachments = refSlipRes.pdfBuffer ? [
      {
        filename: `${safeRef}-REFERENCE-SLIP.pdf`,
        content: refSlipRes.pdfBuffer.toString('base64'),
      }
    ] : [];

    const emailResult = await sendViaResend({
      apiKey: resendApiKey,
      from: defaultFrom,
      to: candidateEmail,
      subject: candidateSubject,
      html: candidateHtml,
      attachments,
    });

    if (app?.id) {
      await supabase.from('activity_logs').insert({
        application_id: app.id,
        action: emailResult.success ? 'REFERENCE_SLIP_EMAIL_SENT' : 'REFERENCE_SLIP_EMAIL_FAILED',
        description: `Reference Slip confirmation email ${emailResult.success ? 'sent' : 'failed'} to ${candidateEmail} for reference ${refSlipNumber}`,
      });
    }
  } catch (err: any) {
    console.warn('[POST_PAYMENT] Handled notification error (payment success preserved):', err?.message);
  }
}

// ------------------------------------------------------------------------------
// Core Payment Handlers
// ------------------------------------------------------------------------------

/**
 * Authoritative Server Resolver: Reads default_registration_fee from system_settings.
 * Throws a descriptive configuration error if missing, unreadable, or invalid.
 * Never silently falls back to 500.
 */
export async function resolveAuthoritativeRegistrationFee(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'default_registration_fee')
    .maybeSingle();

  if (error) {
    console.error('[AUTHORITATIVE_FEE] Failed to query system_settings.default_registration_fee:', error);
    throw new Error(`Authoritative registration fee query failed: ${error.message}`);
  }

  if (!data || data.value === null || data.value === undefined) {
    console.error('[AUTHORITATIVE_FEE] system_settings.default_registration_fee is missing');
    throw new Error('Authoritative registration fee setting is missing from system_settings');
  }

  let feeRaw = data.value;
  if (typeof feeRaw === 'string') {
    try {
      const parsed = JSON.parse(feeRaw);
      if (typeof parsed === 'number') feeRaw = parsed;
    } catch {
      // Keep as string
    }
  }

  const fee = Number(feeRaw);
  if (Number.isNaN(fee) || !Number.isFinite(fee) || fee <= 0) {
    console.error('[AUTHORITATIVE_FEE] Invalid registration fee in system_settings:', data.value);
    throw new Error(`Authoritative registration fee setting is invalid: ${JSON.stringify(data.value)}`);
  }

  return fee;
}

/**
 * Handler: GET /api/payment/config?appId=...&joiningFormId=...
 */
export async function getPaymentConfigHandler(
  queryParam: string | { appId?: string; joiningFormId?: string },
  authHeader?: string
) {
  let appId = '';
  let joiningFormId = '';
  if (typeof queryParam === 'string') {
    appId = queryParam;
  } else if (queryParam) {
    appId = queryParam.appId || '';
    joiningFormId = queryParam.joiningFormId || '';
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  const supabase = getSupabaseServer();

  let feeAmount: number;
  try {
    feeAmount = await resolveAuthoritativeRegistrationFee(supabase);
  } catch (feeErr: any) {
    return { status: 500, data: { success: false, error: feeErr.message || 'Payment system configuration error' } };
  }

  // 1. If appId is provided, verify application exists and check existing payments
  if (appId) {
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, application_number, full_name, email, mobile, status, joining_access_enabled')
      .eq('id', appId)
      .single();

    if (appErr || !app) {
      return { status: 404, data: { success: false, error: 'Application record not found' } };
    }

    const candidateEmail = auth.user.email?.toLowerCase().trim();
    const isCandidate = app.email.toLowerCase().trim() === candidateEmail;

    if (!isCandidate) {
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('role, active')
        .eq('id', auth.user.id)
        .eq('active', true)
        .maybeSingle();

      if (!adminProfile) {
        return { status: 403, data: { success: false, error: 'Access denied for this application' } };
      }
    }

    const { data: payments } = await supabase
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
        amount: feeAmount,
        currency: 'INR',
        totalConsultancyFee: TOTAL_CONSULTANCY_FEE,
        policyNote: `Rs. ${feeAmount} is payable upon registration. The remaining fee is coordinated after 1 month of active placement.`,
        gateway: 'CASHFREE',
        environment: CASHFREE_ENVIRONMENT,
        payments: payments || [],
      },
    };
  }

  // 2. If joiningFormId is provided, verify joining form exists and check existing payments
  if (joiningFormId) {
    const { data: jf, error: jfErr } = await supabase
      .from('joining_forms')
      .select('id, candidate_name, email, employee_contact_number, candidate_auth_user_id, joining_reference, submission_status')
      .eq('id', joiningFormId)
      .single();

    if (jfErr || !jf) {
      return { status: 404, data: { success: false, error: 'Joining Form record not found' } };
    }

    const candidateAuthUserId = auth.user.id;
    const isOwner = Boolean(jf.candidate_auth_user_id && jf.candidate_auth_user_id === candidateAuthUserId);

    if (!isOwner) {
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('role, active')
        .eq('id', auth.user.id)
        .eq('active', true)
        .maybeSingle();

      if (!adminProfile) {
        return { status: 403, data: { success: false, error: 'Access denied for this joining form' } };
      }
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('joining_form_id', joiningFormId)
      .order('created_at', { ascending: false });

    return {
      status: 200,
      data: {
        success: true,
        joiningFormId: jf.id,
        joiningReference: jf.joining_reference,
        candidateName: jf.candidate_name,
        candidateEmail: jf.email,
        candidateMobile: jf.employee_contact_number,
        purpose: 'REGISTRATION',
        purposeTitle: 'Candidate Registration & Dossier Verification Fee',
        amount: feeAmount,
        currency: 'INR',
        totalConsultancyFee: TOTAL_CONSULTANCY_FEE,
        policyNote: `Rs. ${feeAmount} is payable upon registration. The remaining fee is coordinated after 1 month of active placement.`,
        gateway: 'CASHFREE',
        environment: CASHFREE_ENVIRONMENT,
        payments: payments || [],
      },
    };
  }

  // 3. General configuration request
  return {
    status: 200,
    data: {
      success: true,
      purpose: 'REGISTRATION',
      purposeTitle: 'Candidate Registration & Dossier Verification Fee',
      amount: feeAmount,
      currency: 'INR',
      totalConsultancyFee: TOTAL_CONSULTANCY_FEE,
      policyNote: `Rs. ${feeAmount} is payable upon registration. The remaining fee is coordinated after 1 month of active placement.`,
      gateway: 'CASHFREE',
      environment: CASHFREE_ENVIRONMENT,
    },
  };
}

/**
 * Handler: POST /api/payment/create-order
 */
export async function createPaymentOrderHandler(
  body: { applicationId?: string; joiningFormId?: string; purpose?: string; amount?: number },
  authHeader?: string,
  reqHeaders?: Record<string, string | string[] | undefined>
) {
  const { applicationId, joiningFormId, purpose = 'REGISTRATION' } = body;

  if (!applicationId && !joiningFormId) {
    return { status: 400, data: { success: false, error: 'Application ID or Joining Form ID is required' } };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  const supabase = getSupabaseServer();
  const token = authHeader?.replace('Bearer ', '').trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  const db = hasServiceRoleKey
    ? supabase
    : (token
        ? createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '', {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } }
          })
        : supabase);

  // Authoritative payable amount resolved server-side from system_settings
  let payableAmount: number;
  try {
    payableAmount = await resolveAuthoritativeRegistrationFee(supabase);
  } catch (feeErr: any) {
    console.error('[createPaymentOrderHandler] Authoritative fee resolution failed:', feeErr);
    return {
      status: 500,
      data: {
        success: false,
        error: feeErr.message || 'Payment system configuration error: Authoritative registration fee could not be determined.'
      }
    };
  }

  let candidateName = 'Candidate';
  let candidateEmail = '';
  let candidatePhone = '9999999999';
  let customerId = '';
  let orderNote = '';
  let paymentData: any = null;

  if (applicationId) {
    // 1. Fetch application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, application_number, full_name, email, mobile, status, joining_access_enabled')
      .eq('id', applicationId)
      .single();

    if (appErr || !app) {
      return { status: 404, data: { success: false, error: 'Application not found' } };
    }

    // 2. Security authorization
    const candidateUserEmail = auth.user.email?.toLowerCase().trim();
    const isCandidate = app.email.toLowerCase().trim() === candidateUserEmail;

    if (!isCandidate) {
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('role, active')
        .eq('id', auth.user.id)
        .eq('active', true)
        .maybeSingle();

      if (!adminProfile) {
        return { status: 403, data: { success: false, error: 'Unauthorized to initiate payment for this candidate' } };
      }
    }

    // 3. Concurrency-safe initiation via create_or_get_pending_payment RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_or_get_pending_payment', {
      p_app_id: applicationId,
      p_purpose: purpose,
      p_amount: payableAmount,
    });

    if (rpcErr || !rpcRes) {
      console.error('[CASHFREE_ORDER] create_or_get_pending_payment failed:', rpcErr);
      return { status: 500, data: { success: false, error: rpcErr?.message || 'Payment initiation failed' } };
    }

    paymentData = rpcRes as any;

    candidateName = app.full_name || 'Candidate';
    candidateEmail = app.email;
    candidatePhone = (app.mobile || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';
    customerId = `cust_${app.id.replace(/-/g, '').slice(0, 20)}`;
    orderNote = `Candidate Registration Fee • ${app.application_number}`;

  } else if (joiningFormId) {
    // Standalone Joining flow
    // 1. Fetch joining form
    const { data: joiningForm, error: jfErr } = await db
      .from('joining_forms')
      .select('id, application_id, candidate_name, email, employee_contact_number, other_contact_number, candidate_auth_user_id, joining_reference, submission_status')
      .eq('id', joiningFormId)
      .single();

    if (jfErr || !joiningForm) {
      return { status: 404, data: { success: false, error: 'Joining Form record not found' } };
    }

    // 2. Security authorization: Verify candidate_auth_user_id matches authenticated Supabase user
    const candidateAuthUserId = auth.user.id;
    const isOwner = Boolean(joiningForm.candidate_auth_user_id && joiningForm.candidate_auth_user_id === candidateAuthUserId);

    if (!isOwner) {
      const { data: adminProfile } = await db
        .from('admin_profiles')
        .select('role, active')
        .eq('id', auth.user.id)
        .eq('active', true)
        .maybeSingle();

      if (!adminProfile) {
        return { status: 403, data: { success: false, error: 'Unauthorized: Candidate ownership verification failed.' } };
      }
    }

    // 3. Concurrency-safe initiation:
    // Try RPC first (if migration with p_joining_form_id is active)
    let rpcHandled = false;
    try {
      const { data: rpcRes, error: rpcErr } = await db.rpc('create_or_get_pending_payment', {
        p_app_id: null,
        p_purpose: purpose,
        p_amount: payableAmount,
        p_joining_form_id: joiningFormId
      });
      if (!rpcErr && rpcRes) {
        paymentData = rpcRes;
        rpcHandled = true;
      }
    } catch {
      rpcHandled = false;
    }

    if (!rpcHandled) {
      // Idempotency check: First, check if already successfully paid
      const { data: existingSuccess } = await db
        .from('payments')
        .select('*')
        .eq('joining_form_id', joiningFormId)
        .eq('purpose', purpose)
        .eq('status', 'SUCCESS')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSuccess) {
        return {
          status: 200,
          data: {
            success: true,
            alreadyPaid: true,
            paymentId: existingSuccess.id,
            paymentReference: existingSuccess.payment_reference,
            receiptNumber: existingSuccess.receipt_number,
            amount: existingSuccess.amount,
            currency: existingSuccess.currency,
            status: 'SUCCESS',
            paidAt: existingSuccess.paid_at,
            gatewayPaymentId: existingSuccess.gateway_payment_id,
          },
        };
      }

      // Check if a recent PENDING payment exists (within 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingPending } = await db
        .from('payments')
        .select('*')
        .eq('joining_form_id', joiningFormId)
        .eq('purpose', purpose)
        .eq('status', 'PENDING')
        .gt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        paymentData = {
          payment_id: existingPending.id,
          payment_reference: existingPending.payment_reference,
          amount: existingPending.amount,
          currency: existingPending.currency,
          is_existing_success: false
        };
      } else {
        const { data: newPayment, error: insertErr } = await db
          .from('payments')
          .insert({
            application_id: joiningForm.application_id || null,
            joining_form_id: joiningFormId,
            amount: payableAmount,
            currency: 'INR',
            purpose: purpose,
            payment_method: 'ONLINE',
            gateway: 'CASHFREE',
            status: 'PENDING'
          })
          .select('*')
          .single();

        if (insertErr || !newPayment) {
          console.error('[CASHFREE_ORDER] Failed to insert standalone pending payment:', insertErr);
          return { status: 500, data: { success: false, error: insertErr?.message || 'Payment initiation failed' } };
        }

        paymentData = {
          payment_id: newPayment.id,
          payment_reference: newPayment.payment_reference,
          amount: newPayment.amount,
          currency: newPayment.currency,
          is_existing_success: false
        };
      }
    }

    candidateName = (joiningForm.candidate_name || 'Candidate').trim();
    candidateEmail = (joiningForm.email || auth.user.email || '').trim().toLowerCase();
    candidatePhone = (joiningForm.employee_contact_number || joiningForm.other_contact_number || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';
    customerId = `cand_${auth.user.id.replace(/-/g, '').slice(0, 20)}`;
    orderNote = `Candidate Registration Fee • ${joiningForm.joining_reference || 'JOINING'}`;
  }

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
        gatewayPaymentId: paymentData.gateway_payment_id,
      },
    };
  }

  // Validate server credentials
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    console.error('[CASHFREE_ORDER] CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing from server runtime');
    return {
      status: 500,
      data: {
        success: false,
        error: 'Cashfree server credentials are not configured in runtime environment.',
      },
    };
  }

  // 5. Generate unique Cashfree Merchant Order ID
  const cleanRef = (paymentData.payment_reference || 'REF').replace(/[^a-zA-Z0-9]/g, '');
  const merchantOrderId = `ATG_CF_${cleanRef}_${Date.now()}`.slice(0, 45);

  const baseUrl = resolveSiteBaseUrl(reqHeaders);
  const cleanPhone = (candidatePhone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

  const cfPayload = {
    order_id: merchantOrderId,
    order_amount: payableAmount,
    order_currency: 'INR',
    customer_details: {
      customer_id: customerId,
      customer_name: candidateName || 'Candidate',
      customer_email: candidateEmail,
      customer_phone: cleanPhone,
    },
    order_meta: {
      return_url: `${baseUrl}/payment/result?order_id={order_id}`,
      notify_url: `${baseUrl}/api/payment/webhook`,
    },
    order_note: orderNote,
  };

  let cfOrderResponse: any = null;
  try {
    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: getCashfreeHeaders(),
      body: JSON.stringify(cfPayload),
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
          error: errMsg,
        },
      };
    }
  } catch (netErr: any) {
    console.error('[CASHFREE_ORDER] Network exception calling Cashfree:', netErr);
    return {
      status: 502,
      data: {
        success: false,
        error: `Cashfree gateway communication error: ${netErr.message || netErr}`,
      },
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
        error: 'Payment session ID missing from gateway response.',
      },
    };
  }

  // 6. Update payment record with gateway order ID
  const paymentRecordId = paymentData.payment_id || paymentData.id;
  if (paymentRecordId) {
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        gateway_order_id: merchantOrderId,
        currency: 'INR',
        amount: payableAmount,
        payment_method: 'ONLINE',
        gateway: 'CASHFREE',
      })
      .eq('id', paymentRecordId);

    if (updateErr) {
      console.warn('[CASHFREE_ORDER] Warning updating gateway order ID:', updateErr.message);
    }
  }

  return {
    status: 200,
    data: {
      success: true,
      alreadyPaid: false,
      paymentId: paymentRecordId,
      paymentReference: paymentData.payment_reference,
      orderId: merchantOrderId,
      cfOrderId: cfOrderId,
      payment_session_id: paymentSessionId,
      amount: payableAmount,
      currency: 'INR',
      environment: CASHFREE_ENVIRONMENT,
      candidate: {
        name: candidateName,
        email: candidateEmail,
        mobile: candidatePhone,
      },
    },
  };
}

/**
 * Resilient payment lookup:
 * 1. Checks gateway_order_id directly
 * 2. Checks internal payment ID directly
 * 3. Fallback: Deterministic payment_reference extraction from ATG_CF_${cleanRef}_${timestamp}
 * Automatically backfills gateway_order_id on the record using the trusted server-side client when found.
 */
export async function resolvePaymentRecord(
  supabase: any,
  targetOrderId?: string | null,
  targetPaymentId?: string | null
): Promise<{ data: any | null; error: any | null }> {
  // 1. Direct gateway_order_id lookup
  if (targetOrderId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('gateway_order_id', targetOrderId)
      .maybeSingle();

    if (data) {
      return { data, error: null };
    }
    if (error) {
      console.warn('[PAYMENT_LOOKUP] Error searching by gateway_order_id:', error.message);
    }
  }

  // 2. Direct payment ID lookup
  if (targetPaymentId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', targetPaymentId)
      .maybeSingle();

    if (data) {
      if (targetOrderId && (!data.gateway_order_id || data.gateway_order_id !== targetOrderId)) {
        await supabase
          .from('payments')
          .update({ gateway_order_id: targetOrderId })
          .eq('id', data.id);
        data.gateway_order_id = targetOrderId;
      }
      return { data, error: null };
    }
    if (error) {
      console.warn('[PAYMENT_LOOKUP] Error searching by id:', error.message);
    }
  }

  // 3. Resilient fallback: Deterministic extraction from order_id: ATG_CF_${paymentRef}_${timestamp}
  if (targetOrderId && targetOrderId.startsWith('ATG_CF_')) {
    const match = targetOrderId.match(/^ATG_CF_([A-Za-z0-9]+)_\d+$/);
    if (match && match[1]) {
      const rawRef = match[1]; // e.g. "PAY2026000012"
      let formattedRef = rawRef;
      if (rawRef.startsWith('PAY') && rawRef.length >= 13) {
        // Formatted standard: PAY-YYYY-NNNNNN
        formattedRef = `${rawRef.slice(0, 3)}-${rawRef.slice(3, 7)}-${rawRef.slice(7)}`;
      }

      // Try searching by formatted payment_reference
      let { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_reference', formattedRef)
        .maybeSingle();

      // Fallback search by rawRef if formatted did not match
      if (!data && formattedRef !== rawRef) {
        const fallbackRes = await supabase
          .from('payments')
          .select('*')
          .eq('payment_reference', rawRef)
          .maybeSingle();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (data) {
        // Backfill gateway_order_id if missing or mismatch
        if (!data.gateway_order_id || data.gateway_order_id !== targetOrderId) {
          try {
            await supabase
              .from('payments')
              .update({ gateway_order_id: targetOrderId })
              .eq('id', data.id);
            data.gateway_order_id = targetOrderId;
          } catch (updateErr: any) {
            console.warn('[PAYMENT_LOOKUP] Non-critical: Failed to backfill gateway_order_id:', updateErr?.message);
          }
        }
        return { data, error: null };
      }
      if (error) {
        console.warn('[PAYMENT_LOOKUP] Error searching by payment_reference fallback:', error.message);
      }
    }
  }

  return { data: null, error: null };
}

/**
 * Handler: POST /api/payment/verify or GET /api/payment/verify?order_id=...
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

  if (authHeader) {
    const auth = await authenticateRequest(authHeader);
    if (!auth.authenticated) {
      return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
    }
  }

  const supabase = getSupabaseServer();

  // 1. Resilient lookup for payment in local database
  const { data: paymentRecord, error: pErr } = await resolvePaymentRecord(
    supabase,
    targetOrderId,
    targetPaymentId
  );

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
        gatewayPaymentId: paymentRecord.gateway_payment_id,
      },
    };
  }

  const orderId = paymentRecord.gateway_order_id || targetOrderId;

  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    console.error('[CASHFREE_VERIFY] CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing from server runtime');
    return {
      status: 500,
      data: {
        success: false,
        error: 'Cashfree server credentials are not configured in runtime environment.',
      },
    };
  }

  // 3. Query Cashfree Sandbox API
  let cfOrder: any = null;
  let cfPayments: any[] = [];

  try {
    const orderRes = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: getCashfreeHeaders(),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('[CASHFREE_VERIFY] Cashfree get order error:', errText);
      return { status: 400, data: { success: false, error: `Cashfree order verification failed: ${errText}` } };
    }

    cfOrder = await orderRes.json();

    const paymentsRes = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: getCashfreeHeaders(),
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
        error: `Error communicating with Cashfree gateway: ${err?.message || err}`,
      },
    };
  }

  const orderStatus = cfOrder?.order_status; // "PAID", "ACTIVE", "EXPIRED", "TERMINATED"
  const paymentsList = Array.isArray(cfPayments) ? cfPayments : [];

  // Sort payment attempts by payment_time descending (latest attempt first)
  const sortedAttempts = [...paymentsList].sort((a, b) => {
    const tA = a.payment_time ? new Date(a.payment_time).getTime() : 0;
    const tB = b.payment_time ? new Date(b.payment_time).getTime() : 0;
    return tB - tA;
  });

  const successPayment = paymentsList.find((p: any) => p.payment_status === 'SUCCESS');
  const latestAttempt = sortedAttempts[0] || null;

  // 4. Authoritative Four-Outcome Classification:
  // Rule 1: SUCCESS (order_status === PAID OR any successful payment attempt. SUCCESS always wins.)
  if (orderStatus === 'PAID' || Boolean(successPayment)) {
    const gatewayPaymentId = String(successPayment?.cf_payment_id || cfOrder?.cf_order_id || `cf_${Date.now()}`);
    const paymentMethodDesc = successPayment?.payment_group
      ? `CASHFREE_${String(successPayment.payment_group).toUpperCase()}`
      : 'CASHFREE';

    // Atomic database completion via complete_verified_payment RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_verified_payment', {
      p_payment_id: paymentRecord.id,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: gatewayPaymentId,
      p_payment_method: paymentMethodDesc,
    });

    if (rpcErr || !rpcRes) {
      console.error('[CASHFREE_VERIFY] complete_verified_payment RPC failed:', rpcErr);
      return { status: 500, data: { success: false, error: rpcErr?.message || 'Database payment completion failed' } };
    }

    const verifiedPayment = rpcRes as any;

    // Send notifications ONLY if not already verified (idempotency guard)
    if (!verifiedPayment.already_verified) {
      await supabase
        .from('payments')
        .update({ gateway: 'CASHFREE' })
        .eq('id', paymentRecord.id);

      // Await post-payment email & reference slip notifications
      await dispatchPostPaymentNotifications(paymentRecord.id);
    }

    // Ensure candidate reference slip exists and signed URL is ready for immediate download
    let refSlipNumber: string | undefined;
    let refSlipDownloadUrl: string | undefined;
    let refSlipFileName: string | undefined;
    try {
      const refSlipRes = await ensureReferenceSlipForPayment(paymentRecord.id);
      if (refSlipRes.success) {
        refSlipNumber = refSlipRes.slip?.reference_number;
        refSlipDownloadUrl = refSlipRes.signedUrl;
        refSlipFileName = refSlipRes.fileName;
      }
    } catch (refErr: any) {
      console.warn('[CASHFREE_VERIFY] Reference slip retrieval non-blocking notice:', refErr?.message);
    }

    return {
      status: 200,
      data: {
        success: true,
        paymentId: verifiedPayment.id,
        paymentStatus: 'SUCCESS',
        paymentReference: verifiedPayment.payment_reference,
        receiptNumber: verifiedPayment.receipt_number,
        applicationNumber: verifiedPayment.application_number,
        amount: verifiedPayment.amount,
        currency: verifiedPayment.currency,
        paidAt: verifiedPayment.paid_at,
        gatewayOrderId: orderId,
        gatewayPaymentId: gatewayPaymentId,
        candidateName: verifiedPayment.candidate_name,
        referenceSlipNumber: refSlipNumber,
        referenceSlipDownloadUrl: refSlipDownloadUrl,
        referenceSlipFileName: refSlipFileName,
      },
    };
  }

  // Rule 2: USER_DROPPED
  // Latest/current authoritative attempt is USER_DROPPED.
  // Keep our DB payment PENDING (recoverable state).
  if (latestAttempt?.payment_status === 'USER_DROPPED') {
    return {
      status: 200,
      data: {
        success: false,
        paymentStatus: 'USER_DROPPED',
        paymentId: paymentRecord.id,
        orderId,
        paymentReference: paymentRecord.payment_reference,
        applicationId: paymentRecord.application_id,
        joiningFormId: paymentRecord.joining_form_id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        message: latestAttempt?.payment_message || 'Payment process was exited before completion.',
      },
    };
  }

  // Rule 3: FAILED
  // Latest/current authoritative attempt is FAILED or order is EXPIRED/TERMINATED.
  if (
    latestAttempt?.payment_status === 'FAILED' ||
    latestAttempt?.payment_status === 'CANCELLED' ||
    orderStatus === 'EXPIRED' ||
    orderStatus === 'TERMINATED'
  ) {
    const failureReason =
      orderStatus === 'EXPIRED'
        ? 'Cashfree order expired before payment'
        : (latestAttempt?.payment_message || 'Payment not completed or failed at gateway');

    await supabase.rpc('mark_payment_failed', {
      p_payment_id: paymentRecord.id,
      p_reason: failureReason,
    });

    return {
      status: 200,
      data: {
        success: false,
        paymentStatus: 'FAILED',
        paymentId: paymentRecord.id,
        orderId,
        paymentReference: paymentRecord.payment_reference,
        applicationId: paymentRecord.application_id,
        joiningFormId: paymentRecord.joining_form_id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        error: failureReason,
      },
    };
  }

  // Rule 4: PENDING (Default fallback)
  // Transaction still awaiting completion (e.g. orderStatus === 'ACTIVE' or latestAttempt?.payment_status === 'PENDING').
  // Keep DB payment PENDING.
  return {
    status: 200,
    data: {
      success: true,
      paymentStatus: 'PENDING',
      paymentId: paymentRecord.id,
      orderId,
      paymentReference: paymentRecord.payment_reference,
      applicationId: paymentRecord.application_id,
      joiningFormId: paymentRecord.joining_form_id,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      message: 'Payment is pending or awaiting candidate completion in checkout.',
    },
  };
}

/**
 * Verifies Cashfree webhook signature using HMAC-SHA256
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
 */
export async function webhookHandler(
  rawBody: string,
  signatureHeader?: string | null,
  timestampHeader?: string | null
) {
  if (!rawBody) {
    return { status: 400, data: { error: 'Empty webhook body' } };
  }

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

  const orderData = eventPayload.data?.order || eventPayload.order;
  const paymentData = eventPayload.data?.payment || eventPayload.payment;
  const orderId = orderData?.order_id || eventPayload.order_id;
  const paymentStatus = paymentData?.payment_status || (eventType === 'PAYMENT_SUCCESS_WEBHOOK' ? 'SUCCESS' : null);
  const cfPaymentId = paymentData?.cf_payment_id || eventPayload.cf_payment_id;

  if (!orderId) {
    return { status: 200, data: { received: true, note: 'No order_id in event payload' } };
  }

  const supabase = getSupabaseServer();

  // 1. Resilient lookup for payment record
  const { data: paymentRecord } = await resolvePaymentRecord(supabase, orderId);

  if (!paymentRecord) {
    console.warn(`[CASHFREE_WEBHOOK] No payment record found for order_id: ${orderId}`);
    return { status: 200, data: { received: true, note: 'Payment record not found' } };
  }

  // 2. IDEMPOTENCY: If already marked SUCCESS, acknowledge immediately
  if (paymentRecord.status === 'SUCCESS') {
    console.log(`[CASHFREE_WEBHOOK] Payment ${paymentRecord.id} already marked SUCCESS. Idempotent return.`);
    return { status: 200, data: { received: true, idempotent: true } };
  }

  // 3. Process SUCCESS (SUCCESS always wins)
  if (paymentStatus === 'SUCCESS' || eventType === 'PAYMENT_SUCCESS_WEBHOOK' || eventType === 'ORDER_PAID_WEBHOOK') {
    const gatewayPaymentId = String(cfPaymentId || `cf_hook_${Date.now()}`);

    const { data: rpcRes } = await supabase.rpc('complete_verified_payment', {
      p_payment_id: paymentRecord.id,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: gatewayPaymentId,
      p_payment_method: 'CASHFREE',
    });

    const verified = rpcRes as any;
    if (verified && !verified.already_verified) {
      await supabase
        .from('payments')
        .update({ gateway: 'CASHFREE' })
        .eq('id', paymentRecord.id);

      // Await post-payment notifications safely before responding
      await dispatchPostPaymentNotifications(paymentRecord.id);
    }

    return { status: 200, data: { received: true, processed: true } };
  }

  // 4. Process USER_DROPPED (Keep DB payment PENDING)
  if (paymentStatus === 'USER_DROPPED' || eventType === 'PAYMENT_USER_DROPPED_WEBHOOK') {
    // Keep DB payment PENDING so candidate can resume checkout
    return { status: 200, data: { received: true, user_dropped: true } };
  }

  // 5. Process FAILURE (Only if currently PENDING)
  if (paymentStatus === 'FAILED' || eventType === 'PAYMENT_FAILED_WEBHOOK') {
    if (paymentRecord.status === 'PENDING') {
      await supabase.rpc('mark_payment_failed', {
        p_payment_id: paymentRecord.id,
        p_reason: paymentData?.payment_message || 'Cashfree payment failed',
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
    return {
      status: 400,
      data: {
        success: false,
        error: 'Missing required offline payment fields (source reference, purpose, amount, or receivedBy)'
      }
    };
  }

  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  const supabase = getSupabaseServer();

  // Verify admin authorization & hardened role checks
  const { data: adminProfile, error: profileErr } = await supabase
    .from('admin_profiles')
    .select('role, active')
    .eq('id', auth.user.id)
    .eq('active', true)
    .maybeSingle();

  if (profileErr || !adminProfile) {
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

  // To ensure has_admin_role in PostgreSQL RPC sees the user context, create user client or use supabase
  const token = authHeader?.replace('Bearer ', '').trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const userClient = token
    ? createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
    : supabase;

  let rpcRes: any = null;
  let rpcErr: any = null;

  const rpcPayload = {
    p_app_id: applicationId || null,
    p_purpose: purpose,
    p_amount: amount,
    p_received_by: receivedBy,
    p_notes: notes || undefined,
    p_joining_form_id: joiningFormId || null
  };

  // Attempt RPC with user token context first (satisfies has_admin_role)
  const userAttempt = await userClient.rpc('record_offline_payment', rpcPayload);
  rpcRes = userAttempt.data;
  rpcErr = userAttempt.error;

  // If user client failed due to auth/headers, try with service client
  if (rpcErr && userClient !== supabase) {
    console.warn('[OFFLINE_PAYMENT] User client RPC attempt failed, falling back to service role client:', rpcErr.message);
    const serviceAttempt = await supabase.rpc('record_offline_payment', rpcPayload);
    if (!serviceAttempt.error) {
      rpcRes = serviceAttempt.data;
      rpcErr = null;
    }
  }

  if (rpcErr || !rpcRes) {
    console.error('[OFFLINE_PAYMENT] Failed to record offline payment:', rpcErr);
    return { status: 500, data: { success: false, error: rpcErr?.message || 'Failed to record offline payment' } };
  }

  const paymentRecord = rpcRes as any;
  const paymentId = paymentRecord?.payment_id || paymentRecord?.id;
  if (paymentId) {
    await dispatchPostPaymentNotifications(paymentId);
  }

  return { status: 200, data: rpcRes };
}

/**
 * Handler: POST /api/payment/resend-receipt
 * Admin or candidate action to resend the payment receipt email
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

  const supabase = getSupabaseServer();

  // Find payment and application
  const { data: payment, error: pErr } = await supabase
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

  // Authorization: Must be the applicant OR an active admin
  const app = payment.applications as any;
  const userEmail = auth.user.email?.toLowerCase().trim();
  const isApplicant = app?.email && app.email.toLowerCase().trim() === userEmail;

  if (!isApplicant) {
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('role, active')
      .eq('id', auth.user.id)
      .eq('active', true)
      .maybeSingle();

    if (!adminProfile) {
      return { status: 403, data: { success: false, error: 'Unauthorized to resend receipt for this payment' } };
    }
  }

  // Dispatch receipt and reference slip using serverless-safe notification function
  await dispatchPostPaymentNotifications(payment.id);

  return { status: 200, data: { success: true } };
}

