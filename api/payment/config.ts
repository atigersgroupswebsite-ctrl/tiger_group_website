// ==============================================================================
// File: api/payment/config.ts
// Description: Vercel Serverless Function — Payment Configuration & Status Fetch
// Endpoint: GET /api/payment/config?appId=...
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils';
import { sendResponse } from '../_utils';
import { getPaymentConfigHandler } from './_paymentCore';

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS / Preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'GET') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use GET.' });
  }

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const appId =
      (typeof req.query?.appId === 'string' ? req.query.appId : undefined) ||
      url.searchParams.get('appId') ||
      '';
    const authHeader = req.headers['authorization'] as string | undefined;
    const result = await getPaymentConfigHandler(appId, authHeader);
    return sendResponse(res, result.status, result.data);
  } catch (err: any) {
    console.error('[API_PAYMENT_CONFIG_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error retrieving payment configuration'
    });
  }
}
