// ==============================================================================
// File: api/payment/verify.ts
// Description: Vercel Serverless Function — Cashfree Sandbox Payment Verification
// Endpoint: POST/GET /api/payment/verify
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Official server-side Cashfree status retrieval & validation
//   - Never trusts frontend claims of success without authoritative gateway confirmation
//   - Atomic completion via Supabase complete_verified_payment RPC
//   - Automatically triggers Reference Slip and Resend receipt upon verified success
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import { verifyPaymentHandler } from './_paymentCore.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS / Preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST or GET.' });
  }

  try {
    let orderId = '';
    let paymentId = '';

    if (req.method === 'GET') {
      const url = new URL(req.url || '', 'http://localhost');
      orderId =
        (typeof req.query?.order_id === 'string' ? req.query.order_id : '') ||
        (typeof req.query?.orderId === 'string' ? req.query.orderId : '') ||
        url.searchParams.get('order_id') ||
        url.searchParams.get('orderId') ||
        '';
      paymentId =
        (typeof req.query?.payment_id === 'string' ? req.query.payment_id : '') ||
        (typeof req.query?.paymentId === 'string' ? req.query.paymentId : '') ||
        url.searchParams.get('payment_id') ||
        url.searchParams.get('paymentId') ||
        '';
    } else {
      const body = await parseBody(req);
      orderId = body.orderId || body.order_id || body.gateway_order_id || '';
      paymentId = body.paymentId || body.payment_id || '';
    }

    const authHeader = req.headers['authorization'] as string | undefined;
    const result = await verifyPaymentHandler({ orderId, paymentId }, authHeader);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_VERIFY_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error verifying payment status'
    });
  }
}
