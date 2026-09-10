// ==============================================================================
// File: src/server/employeeEmailService.ts
// Description: Server-side email delivery service for Employee Identity Cards
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Dispatches via Resend API with SMTP fallback
//   - Never exposes secrets in VITE_* or client bundles
//   - Uses authoritative employee.email (no arbitrary recipient spoofing)
//   - Logs delivery audit trail via activity system (EMPLOYEE_ID_CARD_SENT)
// ==============================================================================

import { getSupabaseServer, authenticateRequest } from './supabaseServer';
import { sendApplicationEmail } from './resendClient';
import { renderEmployeeIdCardTemplate } from './emailTemplates';

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
  provider?: string;
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
 * Uses Resend API with SMTP fallback. Never fakes success.
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

  // Format clean, employee-specific filename e.g. ATG-7566-Shoaib-Sheikh-ID-Card.pdf
  const safeName = (payload.candidateName || 'Employee').replace(/[^a-zA-Z0-9]/g, '-');
  const safeCode = (payload.employeeCode || 'ATG-EMP').replace(/[^a-zA-Z0-9]/g, '-');
  const attachmentFilename = `${safeCode}-${safeName}-ID-Card.pdf`;

  // Render template
  const template = renderEmployeeIdCardTemplate({
    candidateName: payload.candidateName,
    employeeCode: payload.employeeCode,
    designation: payload.designation,
    department: payload.department,
    location: payload.location
  });

  // 2. Dispatch via unified Resend Client
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

  if (!dispatchRes.success) {
    return {
      success: false,
      error: dispatchRes.error || 'Failed to dispatch ID Card email via Resend.'
    };
  }

  // 3. Audit Log in public.activity_logs
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
        messageId: dispatchRes.messageId,
        provider: dispatchRes.provider,
        simulated: dispatchRes.simulated || false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (logErr: any) {
    console.warn('[sendEmployeeIdCardEmail] Activity log insertion error:', logErr.message);
  }

  return {
    success: true,
    messageId: dispatchRes.messageId,
    simulated: dispatchRes.simulated,
    provider: dispatchRes.provider
  };
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
    .order('generated_at', { ascending: false })
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

  // 6. Send Email using server-side Resend Client
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
        error: sendRes.error || 'Failed to dispatch email through email service.'
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
