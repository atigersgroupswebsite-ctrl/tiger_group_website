// ==============================================================================
// File: api/admin/users/login.ts
// Description: Vercel Serverless Function — Sub-Admin Direct / Fallback Login
// Endpoint: POST /api/admin/users/login
// ==============================================================================

import type { VercelReq, VercelRes } from '../../_utils.js';
import { parseBody, sendResponse } from '../../_utils.js';
import { adminLoginHandler } from '../../../src/server/adminServer.js';

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
    const result = await adminLoginHandler(body);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_ADMIN_LOGIN_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error processing admin login'
    });
  }
}
