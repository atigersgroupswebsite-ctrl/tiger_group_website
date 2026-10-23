// ==============================================================================
// File: api/admin/users/delete.ts
// Description: Vercel Serverless Function — Permanently Delete Sub-Admin Account
// Endpoint: POST /api/admin/users/delete
// Security: Requires active SUPER_ADMIN authorization
// ==============================================================================

import type { VercelReq, VercelRes } from '../../_utils.js';
import { parseBody, sendResponse } from '../../_utils.js';
import { deleteSubAdminHandler } from '../../../src/server/adminServer.js';

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
    const authHeader = req.headers['authorization'] as string | undefined;
    const body = await parseBody(req);
    const result = await deleteSubAdminHandler(body, authHeader);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_DELETE_SUB_ADMIN_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error deleting Sub-Admin'
    });
  }
}
