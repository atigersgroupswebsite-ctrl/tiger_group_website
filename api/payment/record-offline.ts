// ==============================================================================
// File: api/payment/record-offline.ts
// Description: Vercel Serverless Function — Admin Record Offline Payment
// Endpoint: POST /api/payment/record-offline
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Requires active admin with role SUPER_ADMIN, COORDINATOR, or ACCOUNTANT
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import { recordOfflinePaymentHandler } from './_paymentCore.js';

export default async function handler(req: VercelReq, res: VercelRes) {
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
    const result = await recordOfflinePaymentHandler(body, authHeader);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_RECORD_OFFLINE_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error recording offline payment'
    });
  }
}
