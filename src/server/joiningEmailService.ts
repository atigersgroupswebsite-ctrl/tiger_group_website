// ==============================================================================
// File: src/server/joiningEmailService.ts
// Description: Server-Side Email Service for Public Joining Form Submission Receipts
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Server-only execution (Resend API with SMTP fallback)
// ==============================================================================

import { sendApplicationEmail } from './resendClient.js';
import { renderJoiningReceiptTemplate } from './emailTemplates.js';

export interface JoiningReceiptRequest {
  candidateName: string;
  candidateEmail: string;
  joiningReference: string;
  companyName?: string;
  designation?: string;
  submittedAt: string;
}

export interface JoiningEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  provider?: string;
  error?: string;
}

/**
 * Server-side handler for dispatching joining confirmation receipt to candidate.
 */
export async function sendJoiningReceiptServerHandler(
  payload: JoiningReceiptRequest
): Promise<{ status: number; data: JoiningEmailResult }> {
  const cleanEmail = payload.candidateEmail?.trim().toLowerCase();
  const cleanName = payload.candidateName?.trim() || 'Candidate';
  const cleanRef = payload.joiningReference?.trim() || 'JOIN-REFERENCE';

  if (!cleanEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cleanEmail)) {
    return {
      status: 400,
      data: { success: false, error: 'A valid candidate email address is required.' }
    };
  }

  const formattedDate = new Date(payload.submittedAt || new Date()).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const template = renderJoiningReceiptTemplate({
    candidateName: cleanName,
    candidateEmail: cleanEmail,
    joiningReference: cleanRef,
    companyName: payload.companyName,
    designation: payload.designation,
    submittedAt: formattedDate
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
          error: dispatchRes.error || 'Failed to dispatch joining receipt email via Resend.'
        }
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        messageId: dispatchRes.messageId,
        simulated: dispatchRes.simulated,
        provider: dispatchRes.provider
      }
    };
  } catch (err: any) {
    console.error('[JOINING_RECEIPT_ERROR]', err);
    return {
      status: 500,
      data: {
        success: false,
        error: err.message || 'Failed to dispatch joining receipt email.'
      }
    };
  }
}
