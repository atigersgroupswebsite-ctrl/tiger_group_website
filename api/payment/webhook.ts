// ==============================================================================
// File: api/payment/webhook.ts
// Description: Vercel Serverless Function — Razorpay Webhook Ingestion
// Endpoint: POST /api/payment/webhook
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Verifies incoming webhook HMAC-SHA256 signature against RAZORPAY_WEBHOOK_SECRET
//   - Idempotent execution prevents duplicate credit or receipt dispatches
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils';
import { parseRawBody, sendResponse } from '../_utils';
import { webhookHandler } from '../../src/server/paymentServer';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const rawBody = await parseRawBody(req);
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const result = await webhookHandler(rawBody, signature);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_WEBHOOK_ERROR]', err);
    return sendResponse(res, 500, {
      error: err?.message || 'Server error processing webhook event'
    });
  }
}
