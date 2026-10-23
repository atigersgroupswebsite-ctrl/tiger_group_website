// ==============================================================================
// File: api/admin/users/update-permissions.ts
// Description: Vercel Serverless Function — Update Sub-Admin Granular Permissions
// Endpoint: POST /api/admin/users/update-permissions
// Security: Requires active SUPER_ADMIN authorization
// ==============================================================================

import type { VercelReq, VercelRes } from '../../_utils.js';
import { parseBody, sendResponse } from '../../_utils.js';
import { updateSubAdminPermissionsHandler } from '../../../src/server/adminServer.js';

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
    const result = await updateSubAdminPermissionsHandler(body, authHeader);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_UPDATE_PERMISSIONS_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error updating permissions'
    });
  }
}
