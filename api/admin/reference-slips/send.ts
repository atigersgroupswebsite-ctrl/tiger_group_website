// ==============================================================================
// File: api/admin/reference-slips/send.ts
// Description: Self-contained Vercel Serverless Function — Send Reference Slip via Email
// Security: Requires active SUPER_ADMIN or COORDINATOR authorization
// Environment: Dispatches via Resend REST API (https://api.resend.com/emails)
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';

type VercelReq = IncomingMessage & {
  body?: any;
  query?: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
};

type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (data: any) => void;
  send?: (data: any) => void;
};

// ------------------------------------------------------------------------------
// Request / Response Helpers
// ------------------------------------------------------------------------------

async function parseBody(req: VercelReq): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendResponse(res: VercelRes, statusCode: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// ------------------------------------------------------------------------------
// Supabase Server Client & Auth
// ------------------------------------------------------------------------------

let _supabaseServer: any = null;

const DEFAULT_SUPABASE_URL = 'https://bhfxqtaesvfsbdckgeka.supabase.co';

function getSupabaseServer(): any {
  if (!_supabaseServer) {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseServer;
}

async function authenticateRequest(authHeader: string | undefined | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false as const, error: 'Missing or malformed Authorization header' };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { authenticated: false as const, error: error?.message || 'Invalid authorization token' };
    }
    return { authenticated: true as const, user };
  } catch (err: any) {
    return { authenticated: false as const, error: err.message || 'Authentication failed' };
  }
}

// ------------------------------------------------------------------------------
// Resend REST API Client
// ------------------------------------------------------------------------------

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment: { filename: string; content: Buffer };
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const payload = {
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: [
      {
        filename: params.attachment.filename,
        content: params.attachment.content.toString('base64'),
        content_type: 'application/pdf'
      }
    ]
  };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { success: false, error: json?.message || `Resend HTTP error ${resp.status}` };
  }

  return { success: true, messageId: json?.id || `resend_${Date.now()}` };
}

// ------------------------------------------------------------------------------
// Main Handler
// ------------------------------------------------------------------------------

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const auth = await authenticateRequest(authHeader);
    if (!auth.authenticated || !auth.user) {
      return sendResponse(res, 401, { success: false, error: auth.error || 'Unauthorized' });
    }

    const supabase = getSupabaseServer();

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('role, active')
      .eq('id', auth.user.id)
      .eq('active', true)
      .maybeSingle();

    if (!adminProfile) {
      return sendResponse(res, 403, { success: false, error: 'Unauthorized: admin profile required' });
    }

    const allowedRoles = ['SUPER_ADMIN', 'COORDINATOR'];
    if (!allowedRoles.includes(adminProfile.role)) {
      return sendResponse(res, 403, {
        success: false,
        error: `Role '${adminProfile.role}' is not authorized to send Reference Slips.`
      });
    }

    const body = await parseBody(req);
    const { referenceSlipId, joiningFormId, applicationId } = body;

    if (!referenceSlipId && !joiningFormId && !applicationId) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Reference Slip, Joining Form, or Application ID is required'
      });
    }

    // 1. Fetch Reference Slip
    let slipQuery = supabase.from('reference_slips').select('*');
    if (referenceSlipId) {
      slipQuery = slipQuery.eq('id', referenceSlipId);
    } else if (joiningFormId) {
      slipQuery = slipQuery.eq('joining_form_id', joiningFormId);
    } else if (applicationId) {
      slipQuery = slipQuery.eq('application_id', applicationId);
    }

    const { data: slip, error: slipErr } = await slipQuery.maybeSingle();
    if (slipErr || !slip) {
      return sendResponse(res, 404, { success: false, error: 'Reference Slip record not found' });
    }

    const targetJfId = slip.joining_form_id || joiningFormId;
    const targetAppId = slip.application_id || applicationId;

    // 2. Fetch Authoritative Candidate Email & Details
    let candidateEmail = '';
    let candidateName = 'Candidate';
    let sourceReference = 'REF';

    if (targetJfId) {
      const { data: jf } = await supabase
        .from('joining_forms')
        .select('candidate_name, email, joining_reference')
        .eq('id', targetJfId)
        .maybeSingle();
      if (jf) {
        candidateName = jf.candidate_name || candidateName;
        candidateEmail = jf.email || '';
        sourceReference = jf.joining_reference || 'JOIN-STANDALONE';
      }
    }

    if (!candidateEmail && targetAppId) {
      const { data: app } = await supabase
        .from('applications')
        .select('full_name, email, application_number')
        .eq('id', targetAppId)
        .maybeSingle();
      if (app) {
        candidateName = candidateName || app.full_name || 'Candidate';
        candidateEmail = app.email || '';
        sourceReference = sourceReference || app.application_number || 'INQ-REF';
      }
    }

    if (!candidateEmail) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Authoritative candidate email could not be located in Joining/Application record.'
      });
    }

    // 3. Retrieve Generated PDF from Storage
    let fileQuery = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'REFERENCE_SLIP_PDF');

    if (targetJfId) {
      fileQuery = fileQuery.eq('joining_form_id', targetJfId);
    } else if (targetAppId) {
      fileQuery = fileQuery.eq('application_id', targetAppId);
    }

    const { data: genFiles } = await fileQuery.order('version', { ascending: false }).limit(1);
    const latestFile = genFiles?.[0];

    let pdfBuffer: Buffer | null = null;
    if (latestFile?.storage_path) {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from('generated-documents')
        .download(latestFile.storage_path);
      if (!downloadErr && fileData) {
        const ab = await fileData.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      }
    }

    if (!pdfBuffer) {
      return sendResponse(res, 500, {
        success: false,
        error: 'Generated Reference Slip PDF not found in storage. Please generate the PDF first.'
      });
    }

    // 4. Send via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return sendResponse(res, 500, {
        success: false,
        error: 'RESEND_API_KEY is not configured on the server runtime.'
      });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@atigerglobal.com';
    const fromName = process.env.RESEND_FROM_NAME || 'A TIGER GLOBAL';
    const defaultFrom = `"${fromName}" <${fromEmail}>`;

    const safeSource = sourceReference.replace(/[^a-zA-Z0-9_-]/g, '_');
    const attachmentFilename = `${safeSource}-REFERENCE-SLIP.pdf`;
    const currentYear = new Date().getFullYear();

    const emailSubject = `Your Reference Slip – A TIGER GLOBAL (${slip.reference_number})`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 0; }
    .box { max-width: 600px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .hdr { background: #0f172a; padding: 28px; text-align: center; color: #fff; }
    .hdr h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .hdr p { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
    .cnt { padding: 28px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .ftr { background: #0f172a; padding: 20px; text-align: center; color: #94a3b8; font-size: 11px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="hdr">
      <h1>A TIGER GLOBAL</h1>
      <p>CAREER SOLUTION & CONSULTANCY</p>
    </div>
    <div class="cnt">
      <p>Dear <strong>${candidateName}</strong>,</p>
      <p>Your official Employee Reference Slip has been issued. Please find your official 2-Page Reference Slip attached as a PDF document.</p>
      <div class="card">
        <div class="row"><span>Reference Number:</span><strong>${slip.reference_number}</strong></div>
        <div class="row"><span>Registration ID:</span><strong>${sourceReference}</strong></div>
      </div>
      <p>Please print this Reference Slip and present it when reporting along with your original KYC credentials.</p>
    </div>
    <div class="ftr">
      &copy; ${currentYear} A TIGER GLOBAL Career Solution & Consultancy | Nagpur, MH 440035
    </div>
  </div>
</body>
</html>`.trim();

    const emailText = `
Dear ${candidateName},

Your official Employee Reference Slip has been issued.
Reference Number: ${slip.reference_number}
Registration Reference: ${sourceReference}

Please find attached your official 2-Page Reference Slip PDF. Print and carry this document when reporting.

Regards,
A TIGER GLOBAL Career Solution & Consultancy
    `.trim();

    const dispatchRes = await sendViaResend({
      apiKey: resendApiKey,
      from: defaultFrom,
      to: candidateEmail.trim(),
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      attachment: {
        filename: attachmentFilename,
        content: pdfBuffer
      }
    });

    // 5. Activity log
    await supabase.from('activity_logs').insert({
      admin_user_id: auth.user.id,
      application_id: targetAppId || null,
      entity_type: 'REFERENCE_SLIP',
      action: dispatchRes.success ? 'REFERENCE_SLIP_EMAIL_SENT' : 'REFERENCE_SLIP_EMAIL_FAILED',
      details: {
        recipient: candidateEmail.trim(),
        referenceNumber: slip.reference_number,
        sourceReference,
        attachmentFilename,
        messageId: dispatchRes.messageId,
        error: dispatchRes.error || null,
        dispatchedAt: new Date().toISOString()
      }
    });

    if (!dispatchRes.success) {
      return sendResponse(res, 500, { success: false, error: dispatchRes.error });
    }

    return sendResponse(res, 200, {
      success: true,
      message: `Reference Slip email successfully sent to ${candidateEmail}`,
      messageId: dispatchRes.messageId,
      referenceNumber: slip.reference_number
    });
  } catch (err: any) {
    console.error('[API_REFERENCE_SLIP_SEND_ERROR]', err);
    return sendResponse(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}
