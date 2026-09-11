// ==============================================================================
// File: api/enquiries/notify-employer.ts
// Description: Vercel Serverless Function — Employer Enquiry Admin Email Notification
// Endpoint: POST /api/enquiries/notify-employer
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import { sendEmployerEnquiryNotificationServerHandler } from '../../src/server/enquiryNotificationService.js';

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
    const result = await sendEmployerEnquiryNotificationServerHandler(body);
    return sendResponse(res, result.status || 200, result.data);
  } catch (err: any) {
    console.error('[API_ENQUIRY_EMPLOYER_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error sending employer enquiry notification'
    });
  }
}
