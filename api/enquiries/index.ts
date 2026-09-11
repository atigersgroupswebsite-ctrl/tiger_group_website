// ==============================================================================
// File: api/enquiries/index.ts
// Description: Consolidated Vercel Serverless Function — Enquiries Notification Router
// Routes Handled:
//   - POST /api/enquiries/notify-job-seeker
//   - POST /api/enquiries/notify-employer
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import {
  sendJobSeekerEnquiryNotificationServerHandler,
  sendEmployerEnquiryNotificationServerHandler
} from '../../src/server/enquiryNotificationService.js';

function resolveAction(req: VercelReq): string {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const queryAction = urlObj.searchParams.get('_action') || (req.query?._action as string);
  if (queryAction) {
    return queryAction.toLowerCase().trim().replace(/^\//, '').split('/')[0];
  }

  const rawPath = (req.headers['x-matched-path'] as string) || urlObj.pathname;
  const match = rawPath.replace(/^\/api\/enquiries(\/|$)/i, '').split('/')[0];
  return (match || '').toLowerCase().trim();
}

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

  const action = resolveAction(req);

  try {
    const body = await parseBody(req);

    switch (action) {
      case 'notify-job-seeker': {
        const result = await sendJobSeekerEnquiryNotificationServerHandler(body);
        return sendResponse(res, result.status || 200, result.data);
      }

      case 'notify-employer': {
        const result = await sendEmployerEnquiryNotificationServerHandler(body);
        return sendResponse(res, result.status || 200, result.data);
      }

      default: {
        return sendResponse(res, 404, {
          success: false,
          error: `Enquiry action '${action || 'unknown'}' not found`
        });
      }
    }
  } catch (err: any) {
    console.error(`[API_ENQUIRIES_ROUTER_ERROR] Action: ${action}`, err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error processing enquiry notification'
    });
  }
}
