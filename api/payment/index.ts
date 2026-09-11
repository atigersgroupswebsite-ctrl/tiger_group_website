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
  resendReceiptEmailHandler,
  getSupabaseServer
} from './_paymentCore.js';
import {
  ensureReferenceSlipForPayment,
  verifyDocumentTokenHandler
} from './_referenceSlipCore.js';

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

      case 'reference-slip': {
        if (method !== 'GET') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use GET.' });
        }
        let paymentId = urlObj.searchParams.get('payment_id') || urlObj.searchParams.get('paymentId') || (req.query?.payment_id as string) || (req.query?.paymentId as string) || '';
        const joiningFormId = urlObj.searchParams.get('joining_form_id') || urlObj.searchParams.get('joiningFormId') || (req.query?.joining_form_id as string) || (req.query?.joiningFormId as string) || '';
        const applicationId = urlObj.searchParams.get('application_id') || urlObj.searchParams.get('applicationId') || (req.query?.application_id as string) || (req.query?.applicationId as string) || '';

        const supabase = getSupabaseServer();
        if (!paymentId && (joiningFormId || applicationId)) {
          let pQuery = supabase.from('payments').select('id').eq('status', 'SUCCESS');
          if (joiningFormId) pQuery = pQuery.eq('joining_form_id', joiningFormId);
          else if (applicationId) pQuery = pQuery.eq('application_id', applicationId);
          const { data: pData } = await pQuery.order('paid_at', { ascending: false }).limit(1);
          if (pData?.[0]?.id) paymentId = pData[0].id;
        }

        if (!paymentId) {
          return sendResponse(res, 400, { success: false, error: 'Valid paymentId, joiningFormId, or applicationId is required.' });
        }

        const slipRes = await ensureReferenceSlipForPayment(paymentId);
        if (!slipRes.success) {
          return sendResponse(res, 500, { success: false, error: slipRes.error || 'Failed to resolve reference slip.' });
        }

        return sendResponse(res, 200, {
          success: true,
          referenceSlipNumber: slipRes.slip?.reference_number,
          signedUrl: slipRes.signedUrl,
          verificationToken: slipRes.verificationToken,
          storagePath: slipRes.storagePath,
        });
      }

      case 'public-verify':
      case 'verify-document': {
        if (method !== 'GET') {
          return sendResponse(res, 405, { isValid: false, error: 'Method Not Allowed. Use GET.' });
        }
        const token = (
          urlObj.searchParams.get('token') ||
          (req.query?.token as string) ||
          urlObj.searchParams.get('t') ||
          (req.query?.t as string) ||
          ''
        ).trim();

        const result = await verifyDocumentTokenHandler(token);
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
