// ==============================================================================
// File: api/payment/verify.ts
// Description: Vercel Serverless Function — Razorpay Payment Signature Verification
// Endpoint: POST /api/payment/verify
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Cryptographic HMAC-SHA256 signature verification executed strictly server-side
//   - Never trusts frontend claims of success without valid Razorpay signature
//   - Atomic completion via Supabase complete_verified_payment RPC
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils';
import { parseBody, sendResponse } from '../_utils';
import { verifyPaymentHandler } from '../../src/server/paymentServer';

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS / Preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = await parseBody(req);
    const authHeader = req.headers['authorization'] as string | undefined;
    const result = await verifyPaymentHandler(body, authHeader);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_VERIFY_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error verifying payment signature'
    });
  }
}
