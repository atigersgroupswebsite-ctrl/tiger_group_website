// ==============================================================================
// File: src/server/joiningEmailService.ts
// Description: Server-Side Email Service for Public Joining Form Submission Receipts
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Server-only execution (Nodemailer strictly excluded from browser bundle)
// ==============================================================================

import nodemailer from 'nodemailer';

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

  // Read SMTP settings from environment
  const host = typeof process !== 'undefined' ? process.env?.SMTP_HOST : undefined;
  const port = typeof process !== 'undefined' ? Number(process.env?.SMTP_PORT || 587) : 587;
  const user = typeof process !== 'undefined' ? process.env?.SMTP_USER : undefined;
  const pass = typeof process !== 'undefined' ? process.env?.SMTP_PASS : undefined;
  const from = typeof process !== 'undefined' ? (process.env?.SMTP_FROM || '"A Tiger Global" <hr@atigergroup.com>') : '"A Tiger Global" <hr@atigergroup.com>';

  // If SMTP is not configured, simulate successful receipt dispatch
  if (!host || !user || !pass) {
    console.log(
      `[JOINING_RECEIPT_SIMULATED] SMTP not configured. Simulated receipt to: ${cleanEmail} (Ref: ${cleanRef}, Name: ${cleanName})`
    );
    return {
      status: 200,
      data: {
        success: true,
        simulated: true,
        messageId: `sim_${Date.now()}`
      }
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const formattedDate = new Date(payload.submittedAt || new Date()).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const subject = `Joining Form Confirmation & Reference (${cleanRef}) | A TIGER GLOBAL`;

    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0F1B38; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">A TIGER GLOBAL</h2>
          <p style="color: #c5a059; margin: 6px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">
            Career Solution & Consultancy
          </p>
        </div>

        <div style="padding: 28px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff; border-radius: 0 0 8px 8px;">
          <h3 style="color: #0F1B38; margin-top: 0; font-size: 18px;">Joining Form Submission Acknowledgment</h3>
          <p>Dear <strong>${cleanName}</strong>,</p>
          <p>
            Thank you for completing your official onboarding dossier with <strong>A TIGER GLOBAL Career Solution & Consultancy</strong>.
            Your joining information has been recorded in our central compliance registry.
          </p>

          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Joining Reference:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0F1B38; font-family: monospace; font-size: 16px;">
                  ${cleanRef}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Candidate Name:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">
                  ${cleanName}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Contact Email:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">
                  ${cleanEmail}
                </td>
              </tr>
              ${payload.companyName ? `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Company / Plant:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">
                  ${payload.companyName}
                </td>
              </tr>
              ` : ''}
              ${payload.designation ? `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Designation:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">
                  ${payload.designation}
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Submitted On:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">
                  ${formattedDate}
                </td>
              </tr>
            </table>
          </div>

          <h4 style="color: #0F1B38; margin: 20px 0 8px 0; font-size: 14px;">Next Steps for Reporting:</h4>
          <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
            <li style="margin-bottom: 6px;">
              <strong>Keep your Joining Reference:</strong> Quote <strong>${cleanRef}</strong> for all queries with HR coordinators.
            </li>
            <li style="margin-bottom: 6px;">
              <strong>Original Documents:</strong> Please carry original Aadhaar, PAN, Bank Passbook, and Educational marksheets for physical verification on reporting day.
            </li>
            <li style="margin-bottom: 6px;">
              <strong>Coordination:</strong> Our operations desk will contact you via email/phone regarding your reporting schedule.
            </li>
          </ol>

          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            <p style="margin: 0;">This is an automated operational notification from A TIGER GLOBAL HR & Compliance Registry.</p>
            <p style="margin: 4px 0 0 0;">Plot No. 12, MIDC Industrial Area, Nagpur, Maharashtra — 440028</p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: cleanEmail,
      subject,
      html: htmlBody
    });

    console.log(`[JOINING_RECEIPT_SENT] MessageId: ${info.messageId} to ${cleanEmail}`);
    return {
      status: 200,
      data: {
        success: true,
        messageId: info.messageId,
        simulated: false
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
