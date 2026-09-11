// ==============================================================================
// File: src/server/referenceSlipEmailService.ts
// Description: Server-side email delivery service for Candidate Official Reference Slips
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Dispatches via unified Resend REST API (https://api.resend.com/emails)
//   - Never exposes secrets in VITE_* or client bundles
//   - Uses authoritative candidate email from Joining/Application record
//   - Logs delivery audit trail via activity system (REFERENCE_SLIP_EMAIL_SENT)
//   - Decoupled from payment success: Email delivery failure never reverses payment
// ==============================================================================

import { getSupabaseServer, authenticateRequest } from './supabaseServer';
import { sendApplicationEmail } from './resendClient';

export interface SendReferenceSlipEmailPayload {
  recipientEmail: string;
  candidateName: string;
  referenceNumber: string;
  sourceReference: string;
  pdfBuffer: Uint8Array | Buffer;
  joiningFormId?: string | null;
  applicationId?: string | null;
  adminUserId?: string | null;
}

export interface SendReferenceSlipEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  provider?: string;
  error?: string;
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Generates the clean, professional HTML body for the Reference Slip email
 */
function renderReferenceSlipEmailTemplate(params: {
  candidateName: string;
  referenceNumber: string;
  sourceReference: string;
}) {
  const { candidateName, referenceNumber, sourceReference } = params;
  const currentYear = new Date().getFullYear();

  const subject = `Your Reference Slip – A TIGER GLOBAL (${referenceNumber})`;

  const text = `
Dear ${candidateName},

Your official Employee Reference Slip & Consultancy Return packet has been issued successfully.

Reference Number: ${referenceNumber}
Registration Reference: ${sourceReference}

Please find attached your official 2-Page Reference Slip PDF (MIME: application/pdf).
Kindly print this document and carry it along with your original KYC documents and credentials to your scheduled interview or reporting location.

If you have any questions, please contact us:
Phone: +91 8349353946
Email: atigerglobal@gmail.com
Address: Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur, MH 440035

Warm regards,
A TIGER GLOBAL Career Solution & Consultancy
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #f8fafc; }
    .header p { margin: 0; font-size: 13px; color: #cbd5e1; font-weight: 500; }
    .badge { display: inline-block; margin-top: 14px; padding: 6px 14px; background-color: rgba(245, 158, 11, 0.18); border: 1px solid #f59e0b; color: #fef3c7; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.75px; text-transform: uppercase; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #64748b; font-weight: 600; }
    .card-val { color: #0f172a; font-weight: 700; text-align: right; }
    .attachment-notice { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; }
    .attachment-notice p { margin: 0; font-size: 13px; color: #065f46; line-height: 1.5; }
    .footer { background-color: #0f172a; padding: 24px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6; }
    .footer strong { color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>A TIGER GLOBAL</h1>
      <p>CAREER SOLUTION & CONSULTANCY</p>
      <div class="badge">Official Reference Slip Issued</div>
    </div>
    <div class="content">
      <div class="greeting">Dear ${candidateName},</div>
      <p class="lead">
        We are pleased to inform you that your registration and verified payment have been successfully confirmed. Your official candidate dossier has been approved and your <strong>Employee Reference Slip & Consultancy Return</strong> packet has been generated.
      </p>

      <div class="card">
        <div class="card-row">
          <span class="card-label">Reference Number:</span>
          <span class="card-val">${referenceNumber}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Registration ID:</span>
          <span class="card-val">${sourceReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Status:</span>
          <span class="card-val" style="color: #16a34a;">VERIFIED & ACTIVE</span>
        </div>
      </div>

      <div class="attachment-notice">
        <p>
          <strong>Attached Document:</strong> Your official 2-Page Reference Slip is attached to this email as a PDF. Please print this document and carry it along with your original KYC credentials when reporting.
        </p>
      </div>

      <p style="font-size: 13px; color: #64748b; margin: 0;">
        For assistance or enquiries, contact our office at <strong>+91 8349353946</strong> or write to <strong>atigerglobal@gmail.com</strong>.
      </p>
    </div>
    <div class="footer">
      <strong>A TIGER GLOBAL Career Solution & Consultancy</strong><br>
      Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur, Maharashtra 440035<br>
      GSTIN: 27DIFPA0273P1Z4 | REG. NO.: 106157392603<br>
      &copy; ${currentYear} A TIGER GROUPS. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

/**
 * Server-side function to send the Reference Slip as a PDF attachment.
 * Uses Resend REST API. Never fails payment if email encounters errors.
 */
export async function sendReferenceSlipEmail(
  payload: SendReferenceSlipEmailPayload
): Promise<SendReferenceSlipEmailResult> {
  // 1. Authoritative Recipient Validation
  if (!payload.recipientEmail || !isValidEmail(payload.recipientEmail)) {
    console.warn(`[REFERENCE_SLIP_EMAIL] Invalid or missing recipient email: '${payload.recipientEmail}'`);
    return {
      success: false,
      error: `Candidate record does not have a valid email address: '${payload.recipientEmail || 'None'}'`
    };
  }

  // Format clean filename: e.g. JOIN-2026-000123-REFERENCE-SLIP.pdf
  const safeSource = (payload.sourceReference || payload.referenceNumber || 'REF')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const attachmentFilename = `${safeSource}-REFERENCE-SLIP.pdf`;

  // Render template
  const template = renderReferenceSlipEmailTemplate({
    candidateName: payload.candidateName,
    referenceNumber: payload.referenceNumber,
    sourceReference: payload.sourceReference
  });

  // 2. Dispatch via unified Resend client
  const dispatchRes = await sendApplicationEmail({
    to: payload.recipientEmail.trim(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [
      {
        filename: attachmentFilename,
        content: Buffer.from(payload.pdfBuffer),
        contentType: 'application/pdf'
      }
    ]
  });

  const supabase = getSupabaseServer();

  // 3. Log audit trail in public.activity_logs
  try {
    await supabase.from('activity_logs').insert({
      admin_user_id: payload.adminUserId || null,
      application_id: payload.applicationId || null,
      entity_type: 'REFERENCE_SLIP',
      action: dispatchRes.success ? 'REFERENCE_SLIP_EMAIL_SENT' : 'REFERENCE_SLIP_EMAIL_FAILED',
      details: {
        recipient: payload.recipientEmail.trim(),
        referenceNumber: payload.referenceNumber,
        sourceReference: payload.sourceReference,
        attachmentFilename,
        messageId: dispatchRes.messageId,
        provider: dispatchRes.provider,
        error: dispatchRes.error || null,
        dispatchedAt: new Date().toISOString()
      }
    });
  } catch (logErr) {
    console.warn('[REFERENCE_SLIP_EMAIL] Activity log error (ignored):', logErr);
  }

  if (!dispatchRes.success) {
    return {
      success: false,
      error: dispatchRes.error || 'Failed to dispatch Reference Slip email via Resend.'
    };
  }

  return {
    success: true,
    messageId: dispatchRes.messageId,
    provider: dispatchRes.provider
  };
}

/**
 * Administrative server handler for manual "Send Reference Slip" dispatch.
 */
export async function sendReferenceSlipServerHandler(
  body: {
    referenceSlipId?: string;
    joiningFormId?: string;
    applicationId?: string;
  },
  authHeader?: string
): Promise<{ status: number; data: any }> {
  // 1. Verify Admin Authorization
  const auth = await authenticateRequest(authHeader);
  if (!auth.authenticated || !auth.user) {
    return { status: 401, data: { success: false, error: auth.error || 'Unauthorized' } };
  }

  const supabase = getSupabaseServer();

  // Check admin role
  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role, active')
    .eq('id', auth.user.id)
    .eq('active', true)
    .maybeSingle();

  if (!adminProfile) {
    return { status: 403, data: { success: false, error: 'Unauthorized admin user' } };
  }

  const allowedRoles = ['SUPER_ADMIN', 'COORDINATOR'];
  if (!allowedRoles.includes(adminProfile.role)) {
    return {
      status: 403,
      data: { success: false, error: `Role '${adminProfile.role}' is not authorized to send Reference Slips.` }
    };
  }

  const { referenceSlipId, joiningFormId, applicationId } = body;
  if (!referenceSlipId && !joiningFormId && !applicationId) {
    return { status: 400, data: { success: false, error: 'Reference Slip or Entity identifier is required.' } };
  }

  // 2. Fetch Reference Slip record
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
    return { status: 404, data: { success: false, error: 'Reference Slip record not found.' } };
  }

  // 3. Resolve candidate source
  const targetJfId = slip.joining_form_id || joiningFormId;
  const targetAppId = slip.application_id || applicationId;

  let candidateEmail = '';
  let candidateName = '';
  let sourceReference = '';

  if (targetJfId) {
    const { data: jf } = await supabase
      .from('joining_forms')
      .select('candidate_name, email, joining_reference')
      .eq('id', targetJfId)
      .maybeSingle();
    if (jf) {
      candidateName = jf.candidate_name || 'Candidate';
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
    return { status: 400, data: { success: false, error: 'Authoritative candidate email could not be located.' } };
  }

  // 4. Resolve generated PDF file from storage
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
    const { data: fileData, error: fileErr } = await supabase.storage
      .from('generated-documents')
      .download(latestFile.storage_path);
    if (!fileErr && fileData) {
      const ab = await fileData.arrayBuffer();
      pdfBuffer = Buffer.from(ab);
    }
  }

  // If not yet generated in storage, dynamically generate it on the fly
  if (!pdfBuffer) {
    // Dynamic import to keep browser bundles clean
    const { getOrCreateReferenceSlipForEntity } = await import('../services/referenceSlipService');
    const genRes = await getOrCreateReferenceSlipForEntity({
      joiningFormId: targetJfId,
      applicationId: targetAppId,
      adminUserId: auth.user.id
    });

    if (genRes.pdfBytes) {
      pdfBuffer = Buffer.from(genRes.pdfBytes);
    } else if (genRes.file?.storage_path) {
      const { data: fileData } = await supabase.storage
        .from('generated-documents')
        .download(genRes.file.storage_path);
      if (fileData) {
        const ab = await fileData.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      }
    }
  }

  if (!pdfBuffer) {
    return { status: 500, data: { success: false, error: 'Generated Reference Slip PDF could not be retrieved.' } };
  }

  // 5. Send via Resend
  const emailRes = await sendReferenceSlipEmail({
    recipientEmail: candidateEmail,
    candidateName,
    referenceNumber: slip.reference_number,
    sourceReference,
    pdfBuffer,
    joiningFormId: targetJfId,
    applicationId: targetAppId,
    adminUserId: auth.user.id
  });

  if (!emailRes.success) {
    return { status: 500, data: { success: false, error: emailRes.error } };
  }

  return {
    status: 200,
    data: {
      success: true,
      message: `Reference Slip email successfully sent to ${candidateEmail}`,
      messageId: emailRes.messageId,
      referenceNumber: slip.reference_number
    }
  };
}
