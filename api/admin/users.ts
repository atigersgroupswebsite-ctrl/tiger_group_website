// ==============================================================================
// File: api/admin/users.ts
// Description: Vercel Serverless Function — List Admin Directory Users
// Endpoint: GET /api/admin/users
// Security: Requires active SUPER_ADMIN authorization
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.ts';
import { sendResponse } from '../_utils.ts';
import { listAdminUsersHandler } from '../../src/server/adminServer.ts';

export default async function handler(req: VercelReq, res: VercelRes) {
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
    const authHeader = req.headers['authorization'] as string | undefined;
    const result = await listAdminUsersHandler(authHeader);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_ADMIN_USERS_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error retrieving admin users'
    });
  }
}
