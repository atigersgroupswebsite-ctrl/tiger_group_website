// ==============================================================================
// File: api/admin/employees/send-id-card.ts
// Description: Self-contained Vercel Serverless Function — Send Employee ID Card via Email
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
    const { data: { user }, error } = await getSupabaseServer().auth.getUser(token);
    if (error || !user) {
      return { authenticated: false as const, error: error?.message || 'Invalid or expired authentication token' };
    }
    return { authenticated: true as const, user };
  } catch (err: any) {
    return { authenticated: false as const, error: err?.message || 'Authentication error' };
  }
}

// ------------------------------------------------------------------------------
// Email HTML Template
// ------------------------------------------------------------------------------

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmployeeIdCardHtml(data: {
  candidateName: string;
  employeeCode: string;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(data.candidateName);
  const code = escapeHtml(data.employeeCode);
  const desig = escapeHtml(data.designation || 'Consultant / Executive');
  const dept = escapeHtml(data.department || 'Operations');
  const loc = escapeHtml(data.location || 'Headquarters / Client Site');

  const subject = `Official Employee Identity Card — ${data.candidateName} (${data.employeeCode}) | A TIGER GLOBAL`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background-color: #0F1B38; padding: 26px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">A TIGER GLOBAL</h1>
              <p style="color: #c5a059; margin: 6px 0 0 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                Career Solution & Consultancy
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #0F1B38; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">
                Official Employee Identity Card
              </h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                Dear <strong>${name}</strong>,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations on your appointment with <strong>A TIGER GLOBAL Career Solution & Consultancy</strong>. Your official digital Employee Identity Card has been authorized and issued.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 0 0 24px 0;">
                <tr><td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 40%;">Employee Code</td><td style="padding: 10px 16px; font-size: 13px; color: #0F1B38; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${code}</td></tr>
                <tr><td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Full Name</td><td style="padding: 10px 16px; font-size: 13px; color: #0F1B38; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${name}</td></tr>
                <tr><td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Designation</td><td style="padding: 10px 16px; font-size: 13px; color: #0F1B38; border-bottom: 1px solid #e2e8f0;">${desig}</td></tr>
                <tr><td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Department</td><td style="padding: 10px 16px; font-size: 13px; color: #0F1B38; border-bottom: 1px solid #e2e8f0;">${dept}</td></tr>
                <tr><td style="padding: 10px 16px; font-size: 13px; color: #64748b;">Work Location</td><td style="padding: 10px 16px; font-size: 13px; color: #0F1B38;">${loc}</td></tr>
              </table>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                Your official ID Card PDF is attached to this email. Please keep it accessible for organizational identification and client-site assignments.
              </p>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0;">
                Warm regards,<br>
                <strong style="color: #0F1B38;">A TIGER GLOBAL Career Solution & Consultancy</strong><br>
                Human Resources & Administration Division
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0b1329; padding: 18px 30px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} A TIGER GLOBAL Career Solution & Consultancy. All rights reserved.<br>
                GSTIN: 27DIFPA0273P1Z4 | REG. NO.: 106157392603
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Official Employee Identity Card — A TIGER GLOBAL

Dear ${data.candidateName},

Your official Employee Identity Card has been issued:
- Employee Code: ${data.employeeCode}
- Full Name: ${data.candidateName}
- Designation: ${data.designation || 'N/A'}
- Department: ${data.department || 'N/A'}
- Work Location: ${data.location || 'N/A'}

Your official ID Card PDF is attached to this email.

Warm regards,
A TIGER GLOBAL Career Solution & Consultancy`;

  return { subject, html, text };
}

// ------------------------------------------------------------------------------
// Main Serverless Handler
// ------------------------------------------------------------------------------

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS Preflight
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

    // 1. Authenticate Request
    const auth = await authenticateRequest(authHeader);
    if (!auth.authenticated || !auth.user) {
      return sendResponse(res, 401, { success: false, error: auth.error || 'Unauthorized' });
    }

    // 2. Authorize Admin Profile & Role
    const supabase = getSupabaseServer();
    const { data: adminProfile, error: profileErr } = await supabase
      .from('admin_profiles')
      .select('id, role, active')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (profileErr || !adminProfile) {
      return sendResponse(res, 403, { success: false, error: 'Forbidden: Admin profile not found' });
    }

    if (!adminProfile.active) {
      return sendResponse(res, 403, { success: false, error: 'Forbidden: Admin profile is inactive' });
    }

    if (!['SUPER_ADMIN', 'COORDINATOR'].includes(adminProfile.role)) {
      return sendResponse(res, 403, {
        success: false,
        error: 'Forbidden: Insufficient privileges to dispatch Employee ID Card'
      });
    }

    // 3. Validate employee ID
    const body = await parseBody(req);
    const employeeId = body?.employeeId;
    if (!employeeId) {
      return sendResponse(res, 400, { success: false, error: 'Employee ID is required.' });
    }

    // 4. Retrieve Authoritative Employee Record
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (empErr || !employee) {
      return sendResponse(res, 404, { success: false, error: 'Employee record not found.' });
    }

    if (!employee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email.trim())) {
      return sendResponse(res, 400, {
        success: false,
        error: `Employee record (${employee.employee_code}) does not have a valid email address on file.`
      });
    }

    // 5. Retrieve Persisted ID Card PDF from generated_files & storage
    let query = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'ID_CARD_PDF')
      .order('generated_at', { ascending: false })
      .limit(1);

    if (employee.joining_form_id) {
      query = query.eq('joining_form_id', employee.joining_form_id);
    } else if (employee.application_id) {
      query = query.eq('application_id', employee.application_id);
    }

    const { data: existingFile } = await query.maybeSingle();

    if (!existingFile || !existingFile.storage_path) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Employee ID Card PDF has not been generated yet. Please generate and save the ID Card first.'
      });
    }

    let blob: Blob | null = null;
    let dlErr: any = null;

    const genDocRes = await supabase.storage.from('generated-documents').download(existingFile.storage_path);
    if (genDocRes.data) {
      blob = genDocRes.data;
    } else {
      const docRes = await supabase.storage.from('documents').download(existingFile.storage_path);
      if (docRes.data) {
        blob = docRes.data;
      } else {
        dlErr = genDocRes.error || docRes.error;
      }
    }

    if (!blob) {
      return sendResponse(res, 500, {
        success: false,
        error: `Failed to retrieve ID Card PDF from document storage: ${dlErr?.message || 'Storage object not found'}`
      });
    }

    const pdfBuffer = Buffer.from(await blob.arrayBuffer());

    // 6. Check Resend API Key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey || resendApiKey.trim().length === 0) {
      return sendResponse(res, 500, {
        success: false,
        error: 'RESEND_API_KEY is not configured in the server environment. Email was NOT dispatched.'
      });
    }

    // 7. Format Attachment and Render Email
    const safeName = (employee.candidate_name || 'Employee').replace(/[^a-zA-Z0-9]/g, '-');
    const safeCode = (employee.employee_code || 'ATG-EMP').replace(/[^a-zA-Z0-9]/g, '-');
    const attachmentFilename = `${safeCode}-${safeName}-ID-Card.pdf`;

    const template = renderEmployeeIdCardHtml({
      candidateName: employee.candidate_name,
      employeeCode: employee.employee_code,
      designation: employee.designation,
      department: employee.department,
      location: employee.location
    });

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@atigerglobal.com';
    const fromName = process.env.RESEND_FROM_NAME || 'A TIGER GLOBAL';
    const defaultFrom = `"${fromName}" <${fromEmail}>`;

    const emailPayload = {
      from: defaultFrom,
      to: [employee.email.trim()],
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: [
        {
          filename: attachmentFilename,
          content: pdfBuffer.toString('base64')
        }
      ]
    };

    // 8. Dispatch to Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const resendJson: any = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('[API_SEND_ID_CARD] Resend API Error:', resendResponse.status, resendJson);
      return sendResponse(res, 502, {
        success: false,
        error: resendJson?.message || `Resend API returned status ${resendResponse.status}`,
        resendStatus: resendResponse.status
      });
    }

    // 9. Audit Log
    try {
      await supabase.from('activity_logs').insert({
        admin_user_id: auth.user.id,
        entity_type: 'EMPLOYEE',
        entity_id: employee.id,
        action: 'EMPLOYEE_ID_CARD_SENT',
        description: `Dispatched Employee Identity Card to ${employee.email}`,
        metadata: {
          employeeId: employee.id,
          recipientEmail: employee.email,
          employeeCode: employee.employee_code,
          fileId: existingFile.id,
          messageId: resendJson?.id,
          provider: 'resend_api',
          timestamp: new Date().toISOString()
        }
      });
    } catch (logErr: any) {
      console.warn('[API_SEND_ID_CARD] Audit log insert warning:', logErr?.message);
    }

    return sendResponse(res, 200, {
      success: true,
      message: `Official Employee ID Card successfully dispatched to ${employee.email}.`,
      messageId: resendJson?.id
    });
  } catch (err: any) {
    console.error('[API_SEND_ID_CARD_UNHANDLED_EXCEPTION]', err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Unexpected server error dispatching ID card email'
    });
  }
}
