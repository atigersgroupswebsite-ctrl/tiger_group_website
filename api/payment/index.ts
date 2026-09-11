// ==============================================================================
// File: api/payment/index.ts
// Description: Consolidated Vercel Serverless Function — Payment API Router
// Routes Handled:
//   - GET  /api/payment/config?appId=...
//   - POST /api/payment/create-order
//   - POST /api/payment/verify or GET /api/payment/verify?order_id=...
//   - POST /api/payment/webhook
//   - POST /api/payment/record-offline
//   - POST /api/payment/resend-receipt
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Pure Node runtime, strict Cashfree SANDBOX, zero browser imports
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, parseRawBody, sendResponse } from '../_utils.js';
import {
  getPaymentConfigHandler,
  createPaymentOrderHandler,
  verifyPaymentHandler,
  webhookHandler,
  recordOfflinePaymentHandler,
  resendReceiptEmailHandler
} from './_paymentCore.js';

function resolveAction(req: VercelReq): string {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const queryAction = urlObj.searchParams.get('_action') || (req.query?._action as string);
  if (queryAction) {
    return queryAction.toLowerCase().trim().replace(/^\//, '').split('/')[0];
  }

  const rawPath = (req.headers['x-matched-path'] as string) || urlObj.pathname;
  const match = rawPath.replace(/^\/api\/payment(s)?(\/|$)/i, '').split('/')[0];
  return (match || '').toLowerCase().trim();
}

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS / Preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp, x-cashfree-signature, x-cashfree-timestamp');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  const action = resolveAction(req);
  const authHeader = req.headers['authorization'] as string | undefined;
  const method = (req.method || 'GET').toUpperCase();
  const urlObj = new URL(req.url || '', 'http://localhost');

  try {
    switch (action) {
      case 'config': {
        if (method !== 'GET') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use GET.' });
        }
        const appId = urlObj.searchParams.get('appId') || (req.query?.appId as string) || '';
        const result = await getPaymentConfigHandler(appId, authHeader);
        return sendResponse(res, result.status, result.data);
      }

      case 'create-order': {
        if (method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await createPaymentOrderHandler(body, authHeader, req.headers);
        return sendResponse(res, result.status, result.data);
      }

      case 'verify':
      case 'status': {
        if (method !== 'POST' && method !== 'GET') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST or GET.' });
        }
        let body: any = {};
        if (method === 'GET') {
          const orderId =
            urlObj.searchParams.get('order_id') ||
            urlObj.searchParams.get('orderId') ||
            (req.query?.order_id as string) ||
            (req.query?.orderId as string) ||
            '';
          const paymentId =
            urlObj.searchParams.get('payment_id') ||
            urlObj.searchParams.get('paymentId') ||
            (req.query?.payment_id as string) ||
            (req.query?.paymentId as string) ||
            '';
          body = { orderId, paymentId };
        } else {
          body = await parseBody(req);
        }
        const result = await verifyPaymentHandler(body, authHeader);
        return sendResponse(res, result.status, result.data);
      }

      case 'webhook': {
        if (method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const rawBody = await parseRawBody(req);
        const signature = (req.headers['x-webhook-signature'] || req.headers['x-cashfree-signature']) as string | undefined;
        const timestamp = (req.headers['x-webhook-timestamp'] || req.headers['x-cashfree-timestamp']) as string | undefined;
        const result = await webhookHandler(rawBody, signature, timestamp);
        return sendResponse(res, result.status, result.data);
      }

      case 'record-offline': {
        if (method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await recordOfflinePaymentHandler(body, authHeader);
        return sendResponse(res, result.status, result.data);
      }

      case 'resend-receipt': {
        if (method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await resendReceiptEmailHandler(body, authHeader);
        return sendResponse(res, result.status, result.data);
      }

      default: {
        return sendResponse(res, 404, {
          success: false,
          error: `Payment action '${action || 'unknown'}' not found`
        });
      }
    }
  } catch (err: any) {
    console.error(`[API_PAYMENT_ROUTER_ERROR] Action: ${action}`, err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error processing payment operation'
    });
  }
}
