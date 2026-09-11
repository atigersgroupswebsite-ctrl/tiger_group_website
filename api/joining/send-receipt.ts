// ==============================================================================
// File: api/joining/send-receipt.ts
// Description: Vercel Serverless Function — Send Candidate Joining Receipt via Email
// Endpoint: POST /api/joining/send-receipt
// Security: Public endpoint, validates candidate email and parameters server-side
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import { sendJoiningReceiptServerHandler } from '../../src/server/joiningEmailService.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = await parseBody(req);
    const result = await sendJoiningReceiptServerHandler(body);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_JOINING_SEND_RECEIPT_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error dispatching joining receipt email'
    });
  }
}
