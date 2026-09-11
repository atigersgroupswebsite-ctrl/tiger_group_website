// ==============================================================================
// File: src/server/joiningRejectionEmailService.ts
// Description: Server-Side Email Service for Candidate Document Rejection Notifications
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Zero passwords in email
//   - Zero private document contents in email
//   - Uses unified Resend client with SMTP fallback
//   - Email failures never rollback database transactions
// ==============================================================================

import { sendApplicationEmail } from './resendClient.js';
import { renderDocumentRejectionTemplate } from './emailTemplates.js';

export interface DocumentRejectionEmailRequest {
  candidateName: string;
  candidateEmail: string;
  joiningReference: string;
  documentLabel: string;
  rejectionReason: string;
  loginUrl?: string;
}

export interface DocumentRejectionEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  provider?: string;
  error?: string;
  statusNote?: string;
}

/**
 * Server-side handler for dispatching document rejection action notification to candidate.
 */
export async function sendDocumentRejectionEmailServerHandler(
  payload: DocumentRejectionEmailRequest
): Promise<{ status: number; data: DocumentRejectionEmailResult }> {
  const cleanEmail = payload.candidateEmail?.trim().toLowerCase();
  const cleanName = payload.candidateName?.trim() || 'Candidate';
  const cleanRef = payload.joiningReference?.trim() || 'JOIN-REFERENCE';
  const docLabel = payload.documentLabel?.trim() || 'Submitted Document';
  const reason = payload.rejectionReason?.trim() || 'Document copy is not acceptable. Please provide a clear replacement.';
  const loginUrl = payload.loginUrl || `${process.env.VITE_SITE_URL || 'https://atigerglobal.com'}/joining/login`;

  if (!cleanEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cleanEmail)) {
    return {
      status: 400,
      data: { success: false, error: 'A valid candidate email address is required.' }
    };
  }

  const template = renderDocumentRejectionTemplate({
    candidateName: cleanName,
    candidateEmail: cleanEmail,
    joiningReference: cleanRef,
    documentLabel: docLabel,
    rejectionReason: reason,
    loginUrl
  });

  try {
    const dispatchRes = await sendApplicationEmail({
      to: cleanEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    if (!dispatchRes.success) {
      return {
        status: 500,
        data: {
          success: false,
          error: dispatchRes.error || 'Failed to dispatch document rejection email via Resend.'
        }
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        messageId: dispatchRes.messageId,
        simulated: dispatchRes.simulated,
        provider: dispatchRes.provider,
        statusNote: dispatchRes.simulated ? 'UNTESTED EXTERNAL DELIVERY' : 'RESEND DISPATCHED'
      }
    };
  } catch (err: any) {
    console.error('[DOCUMENT_REJECTION_EMAIL_ERROR]', err);
    return {
      status: 500,
      data: {
        success: false,
        error: err?.message || 'Failed to deliver rejection notification email.'
      }
    };
  }
}
