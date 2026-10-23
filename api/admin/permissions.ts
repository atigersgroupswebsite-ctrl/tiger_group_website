// ==============================================================================
// File: api/admin/permissions.ts
// Description: Vercel Serverless Function — Catalog of Available Granular Permissions
// Endpoint: GET /api/admin/permissions
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { sendResponse } from '../_utils.js';
import { ALL_PERMISSIONS, PERMISSION_MODULES, ROLE_TEMPLATES } from '../../src/types/rbac.js';

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

  return sendResponse(res, 200, {
    success: true,
    permissions: ALL_PERMISSIONS,
    modules: PERMISSION_MODULES,
    roleTemplates: ROLE_TEMPLATES
  });
}
