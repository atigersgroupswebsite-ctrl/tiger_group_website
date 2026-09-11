// ==============================================================================
// File: api/admin/email/send-test.ts
// Description: Vercel Serverless Function — Privileged Admin Resend Integration Diagnostic Test
// Endpoint: POST /api/admin/email/send-test
// Security: Requires active SUPER_ADMIN authorization
// ==============================================================================

import type { VercelReq, VercelRes } from '../../_utils.js';
import { parseBody, sendResponse } from '../../_utils.js';
import { getSupabaseServer, authenticateRequest } from '../../../src/server/supabaseServer.js';
import { sendApplicationEmail, getEmailConfig } from '../../../src/server/resendClient.js';

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

  const authHeader = req.headers['authorization'] as string | undefined;

  try {
    const auth = await authenticateRequest(authHeader);
    if (!auth.authenticated || !auth.user) {
      return sendResponse(res, 401, { success: false, error: 'Unauthorized: Admin authentication required' });
    }

    const supabase = getSupabaseServer();
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, role, active')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (!adminProfile || !adminProfile.active || adminProfile.role !== 'SUPER_ADMIN') {
      return sendResponse(res, 403, { success: false, error: 'Forbidden: Only active SUPER_ADMIN can trigger test emails' });
    }

    const body = await parseBody(req);
    const config = getEmailConfig();
    const recipient = body?.recipientEmail?.trim() || auth.user.email;

    const sendRes = await sendApplicationEmail({
      to: recipient,
      subject: `[TEST] A TIGER GLOBAL Resend Integration Test (${new Date().toLocaleTimeString()})`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #0F1B38;">A TIGER GLOBAL Email Integration Test</h2>
        <p>This test email confirms that your Resend / Custom SMTP integration is properly configured.</p>
        <p><strong>Configured Sender:</strong> ${config.defaultFrom}</p>
        <p><strong>Provider:</strong> ${config.hasApiKey ? 'Resend REST API' : 'Simulated Delivery'}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>`,
      text: `A TIGER GLOBAL Email Integration Test\nSender: ${config.defaultFrom}\nTimestamp: ${new Date().toISOString()}`
    });

    return sendResponse(res, sendRes.success ? 200 : 500, sendRes);
  } catch (err: any) {
    console.error('[API_ADMIN_TEST_EMAIL_ERROR]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Failed to dispatch test email'
    });
  }
}
