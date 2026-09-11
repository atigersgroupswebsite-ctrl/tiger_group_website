// ==============================================================================
// File: api/payment/create-order.ts
// Description: Vercel Serverless Function — Cashfree Sandbox Order Initiation
// Endpoint: POST /api/payment/create-order
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Cashfree secret key kept strictly server-side
//   - Requester must be authorized candidate or active admin
//   - Authoritative payable amount (500 INR) determined server-side
//   - Interacts with Supabase create_or_get_pending_payment RPC
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils';
import { parseBody, sendResponse } from '../_utils';
import { createPaymentOrderHandler } from '../../src/server/paymentServer';

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
    const result = await createPaymentOrderHandler(body, authHeader, req.headers);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_CREATE_ORDER_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error initiating payment order'
    });
  }
}
