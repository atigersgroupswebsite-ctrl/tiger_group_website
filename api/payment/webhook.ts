// ==============================================================================
// File: api/payment/webhook.ts
// Description: Vercel Serverless Function — Cashfree Webhook Ingestion
// Endpoint: POST /api/payment/webhook
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Verifies incoming webhook HMAC-SHA256 signature against CASHFREE_SECRET_KEY
//   - Idempotent execution prevents duplicate credit, receipt, or reference slip dispatches
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseRawBody, sendResponse } from '../_utils.js';
import { webhookHandler } from './_paymentCore.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const rawBody = await parseRawBody(req);
    const signature = (req.headers['x-webhook-signature'] || req.headers['x-cashfree-signature']) as string | undefined;
    const timestamp = (req.headers['x-webhook-timestamp'] || req.headers['x-cashfree-timestamp']) as string | undefined;
    const result = await webhookHandler(rawBody, signature, timestamp);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_WEBHOOK_ERROR]', err);
    return sendResponse(res, 500, {
      error: err?.message || 'Server error processing webhook event'
    });
  }
}
