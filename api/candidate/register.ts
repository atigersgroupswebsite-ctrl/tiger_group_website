// ==============================================================================
// File: api/candidate/register.ts
// Description: Vercel Serverless Function — Candidate Operations & Account Gateway
// Endpoints Handled:
//   - POST /api/candidate/register (Create Account / Auto-confirm)
//   - POST /api/candidate/document-signed-url (Secure Document Signed URL Provisioning)
// Security:
//   - Zero client access to Supabase service-role keys
//   - Document endpoint strictly authenticates JWT and verifies dossier ownership
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import {
  registerCandidateServerHandler,
  confirmCandidateEmailServerHandler,
  documentSignedUrlServerHandler
} from '../../src/server/candidateAccountService.js';

function resolveAction(req: VercelReq, body: any): string {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const queryAction = urlObj.searchParams.get('_action') || (req.query?._action as string);
  if (queryAction) return queryAction.toLowerCase().trim();
  if (body?.action) return String(body.action).toLowerCase().trim();
  const rawPath = (req.headers['x-matched-path'] as string) || urlObj.pathname;
  const match = rawPath.replace(/^\/api\/candidate(\/|$)/i, '').split('/')[0];
  return (match || '').toLowerCase().trim();
}

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
    const action = resolveAction(req, body);

    if (action === 'document_signed_url' || action === 'document-signed-url') {
      const authHeader = req.headers['authorization'] as string | undefined;
      const result = await documentSignedUrlServerHandler(body, authHeader);
      return sendResponse(res, result.status ?? 200, result.data);
    }

    if (action === 'confirm_email' && body?.email) {
      const result = await confirmCandidateEmailServerHandler(body.email);
      return sendResponse(res, result.status ?? 200, result.data);
    }

    const result = await registerCandidateServerHandler(body);
    return sendResponse(res, result.status ?? 200, result.data);
  } catch (err: any) {
    console.error('[API_CANDIDATE_GATEWAY_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error processing candidate request'
    });
  }
}

