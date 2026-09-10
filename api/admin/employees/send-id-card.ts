// ==============================================================================
// File: api/admin/employees/send-id-card.ts
// Description: Vercel Serverless Function — Send Employee ID Card via Email
// Endpoint: POST /api/admin/employees/send-id-card
// Security: Requires active SUPER_ADMIN or COORDINATOR authorization
// ==============================================================================

import type { VercelReq, VercelRes } from '../../_utils';
import { parseBody, sendResponse } from '../../_utils';
import { sendEmployeeIdCardServerHandler } from '../../../src/server/employeeEmailService';

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
    const authHeader = req.headers['authorization'] as string | undefined;
    const result = await sendEmployeeIdCardServerHandler(body, authHeader);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_SEND_ID_CARD_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error dispatching ID card email'
    });
  }
}
