// ==============================================================================
// File: src/server/employeeEmailService.ts
// Description: Server-side email delivery service for Employee Identity Cards
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Private SMTP credentials remain strictly server-side (process.env.SMTP_*)
//   - Never exposes secrets in VITE_* or client bundles
//   - Uses authoritative employee.email (no arbitrary recipient spoofing)
//   - Logs delivery audit trail via activity system (EMPLOYEE_ID_CARD_SENT)
// ==============================================================================

import nodemailer from 'nodemailer';
import { getSupabaseServer, authenticateRequest } from './paymentServer.ts';

export interface SendEmployeeIdCardEmailPayload {
  employeeId: string;
  recipientEmail: string;
  candidateName: string;
  employeeCode: string;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  pdfBuffer: Uint8Array | Buffer;
  fileId?: string | null;
  adminUserId?: string | null;
}

export interface SendIdCardEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Validates whether an email address format is sound
 */
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Server-side function to send the Employee Identity Card as a PDF attachment.
 * Uses real SMTP credentials. Never fakes success.
 */
export async function sendEmployeeIdCardEmail(
  payload: SendEmployeeIdCardEmailPayload
): Promise<SendIdCardEmailResult> {
  // 1. Authoritative Recipient Validation
  if (!payload.recipientEmail || !isValidEmail(payload.recipientEmail)) {
    return {
      success: false,
      error: `Employee record does not have a valid email address: '${payload.recipientEmail || 'None'}'`
    };
  }

  const host = typeof process !== 'undefined' ? process.env?.SMTP_HOST : undefined;
  const port = typeof process !== 'undefined' ? Number(process.env?.SMTP_PORT || 587) : 587;
  const user = typeof process !== 'undefined' ? process.env?.SMTP_USER : undefined;
  const pass = typeof process !== 'undefined' ? process.env?.SMTP_PASS : undefined;
  const from = typeof process !== 'undefined' ? (process.env?.SMTP_FROM || '"A Tiger Global" <hr@atigergroup.com>') : '"A Tiger Global" <hr@atigergroup.com>';

  const subject = `Your Employee Identity Card — ${payload.employeeCode} | A TIGER GLOBAL`;
  const attachmentFilename = `ID_Card_${payload.employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // 2. Validate SMTP configuration
  if (!host || !user || !pass) {
    const errorMsg = 'SMTP credentials (SMTP_HOST / SMTP_USER / SMTP_PASS) are not configured on the server. Email delivery could not be completed.';
    console.warn(`[EMPLOYEE_ID_CARD_EMAIL] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  // 3. Real SMTP Dispatch
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0F1B38; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">A TIGER GLOBAL</h2>
          <p style="color: #c5a059; margin: 5px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            Career Solution & Consultancy
          </p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <h3 style="color: #0F1B38; margin-top: 0;">Official Employee Identity Card</h3>
          <p>Dear <strong>${payload.candidateName}</strong>,</p>
          <p>
            Congratulations on your onboarding. Please find attached your official <strong>Employee Identity Card</strong> issued under A TIGER GLOBAL Career Solution & Consultancy.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; background-color: #F8FAFC; border-radius: 6px; overflow: hidden;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Employee Name:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #0F1B38;">${payload.candidateName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Employee Code:</td>
              <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #0F1B38; font-family: monospace;">${payload.employeeCode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Designation:</td>
              <td style="padding: 10px 14px; text-align: right; color: #0F1B38;">${payload.designation || 'Associate'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; color: #64748b;">Department:</td>
              <td style="padding: 10px 14px; text-align: right; color: #0F1B38;">${payload.department || 'Operations'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Location:</td>
              <td style="padding: 10px 14px; text-align: right; color: #0F1B38;">${payload.location || 'Nagpur, Maharashtra'}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #475569;">
            You may print or retain this digital document for work authorization and corporate identification purposes.
          </p>

          <p style="margin-top: 24px; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Human Resources & Administration</strong><br>
            A TIGER GLOBAL Career Solution & Consultancy
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          This is an official administrative correspondence. Please do not reply directly to this email.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: payload.recipientEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: attachmentFilename,
          content: Buffer.from(payload.pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    });

    // 4. Audit Log (EMPLOYEE_ID_CARD_SENT) - Only after real delivery succeeds
    const supabase = getSupabaseServer();
    try {
      await supabase.from('activity_logs').insert({
        admin_user_id: payload.adminUserId || null,
        entity_type: 'EMPLOYEE',
        entity_id: payload.employeeId,
        action: 'EMPLOYEE_ID_CARD_SENT',
        description: `Dispatched Employee Identity Card to ${payload.recipientEmail}`,
        metadata: {
          employeeId: payload.employeeId,
          recipientEmail: payload.recipientEmail,
          employeeCode: payload.employeeCode,
          fileId: payload.fileId || null,
          messageId: info.messageId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logErr) {
      console.warn('[sendEmployeeIdCardEmail] Activity log error:', logErr);
    }

    return {
      success: true,
      messageId: info.messageId,
      simulated: false
    };
  } catch (err: any) {
    console.error('[sendEmployeeIdCardEmail] Delivery failed:', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email via SMTP server.'
    };
  }
}

/**
 * Privileged server-side request handler for POST /api/admin/employees/send-id-card
 */
export async function sendEmployeeIdCardServerHandler(
  body: { employeeId?: string },
  authHeader?: string | null
): Promise<{ status: number; data: { success: boolean; message?: string; messageId?: string; error?: string } }> {
  // 1. Authenticate Request
  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  // 2. Authorize Admin Profile & Role
  const supabase = getSupabaseServer();
  const { data: adminProfile, error: profileErr } = await supabase
    .from('admin_profiles')
    .select('id, role, active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileErr || !adminProfile) {
    return { status: 403, data: { success: false, error: 'Forbidden: Admin profile not found' } };
  }

  if (!adminProfile.active) {
    return { status: 403, data: { success: false, error: 'Forbidden: Admin profile is inactive' } };
  }

  if (!['SUPER_ADMIN', 'COORDINATOR'].includes(adminProfile.role)) {
    return {
      status: 403,
      data: { success: false, error: 'Forbidden: Insufficient privileges to dispatch Employee ID Card' }
    };
  }

  // 3. Validate employee ID
  const { employeeId } = body;
  if (!employeeId) {
    return { status: 400, data: { success: false, error: 'Employee ID is required.' } };
  }

  // 4. Retrieve Authoritative Employee Data from Database
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (empErr || !employee) {
    return { status: 404, data: { success: false, error: 'Employee record not found.' } };
  }

  if (!employee.email || !isValidEmail(employee.email)) {
    return {
      status: 400,
      data: {
        success: false,
        error: `Employee record (${employee.employee_code}) does not have a valid email address on file.`
      }
    };
  }

  // 5. Retrieve Persisted Employee ID Card PDF from generated_files and storage
  let query = supabase
    .from('generated_files')
    .select('*')
    .eq('file_type', 'ID_CARD_PDF')
    .order('created_at', { ascending: false })
    .limit(1);

  if (employee.joining_form_id) {
    query = query.eq('joining_form_id', employee.joining_form_id);
  } else if (employee.application_id) {
    query = query.eq('application_id', employee.application_id);
  }

  const { data: existingFile } = await query.maybeSingle();

  if (!existingFile || !existingFile.storage_path) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Employee ID Card PDF has not been generated yet. Please generate and save the ID Card first.'
      }
    };
  }

  let blob: Blob | null = null;
  let dlErr: any = null;

  // Try 'generated-documents' bucket first, then fallback to 'documents'
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
    return {
      status: 500,
      data: {
        success: false,
        error: `Failed to retrieve ID Card PDF from document storage: ${dlErr?.message || 'Storage object not found'}`
      }
    };
  }

  const pdfBuffer = Buffer.from(await blob.arrayBuffer());

  // 6. Send Email using server-side Nodemailer
  const sendRes = await sendEmployeeIdCardEmail({
    employeeId: employee.id,
    recipientEmail: employee.email, // Authoritative!
    candidateName: employee.candidate_name || 'Employee',
    employeeCode: employee.employee_code,
    designation: employee.designation,
    department: employee.department,
    location: employee.location,
    pdfBuffer,
    fileId: existingFile.id,
    adminUserId: auth.user.id
  });

  if (!sendRes.success) {
    return {
      status: 500,
      data: {
        success: false,
        error: sendRes.error || 'Failed to dispatch email through SMTP server.'
      }
    };
  }

  return {
    status: 200,
    data: {
      success: true,
      message: `Official Employee ID Card successfully dispatched to ${employee.email}.`,
      messageId: sendRes.messageId
    }
  };
}
