// ==============================================================================
// File: api/joining/send-rejection-email.ts
// Description: Vercel Serverless Function — Send Candidate Document Rejection Email
// Endpoint: POST /api/joining/send-rejection-email
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils';
import { parseBody, sendResponse } from '../_utils';
import { sendDocumentRejectionEmailServerHandler } from '../../src/server/joiningRejectionEmailService';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = await parseBody(req);
    const result = await sendDocumentRejectionEmailServerHandler(body);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_JOINING_SEND_REJECTION_EMAIL_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error dispatching document rejection email'
    });
  }
}
