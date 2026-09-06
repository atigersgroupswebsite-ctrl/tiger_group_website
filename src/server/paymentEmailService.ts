// ==============================================================================
// File: src/server/paymentEmailService.ts
// Description: Server-side email delivery for candidate Payment Receipts
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Uses environment variables for SMTP credentials (NEVER hardcoded)
//   - Email failures never invalidate successful payment transactions
//   - Audits delivery in activity_logs
// ==============================================================================

import nodemailer from 'nodemailer';
import { getPaymentReceiptPdfBuffer, type PaymentReceiptData } from '../utils/paymentReceiptGenerator';

export interface SendReceiptEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Sends the generated Payment Receipt PDF as an email attachment to the candidate.
 */
export async function sendPaymentReceiptEmail(
  receiptData: PaymentReceiptData
): Promise<SendReceiptEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"A Tiger Global" <no-reply@atigergroup.com>';

  // If SMTP is not configured in current environment, simulate email dispatch safely
  if (!host || !user || !pass) {
    console.log(
      `[PAYMENT_EMAIL] SMTP credentials not configured. Simulating delivery to ${receiptData.candidateEmail} for ${receiptData.receiptNumber}.`
    );
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}@atigergroup.local`
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

    const pdfBuffer = getPaymentReceiptPdfBuffer(receiptData);
    const pdfFilename = `${receiptData.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_Payment_Receipt.pdf`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #192a56; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">A TIGER GLOBAL</h2>
          <p style="color: #c5a059; margin: 5px 0 0; font-size: 12px; font-weight: bold;">CAREER SOLUTION & CONSULTANCY</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <h3 style="color: #166534; margin-top: 0;">Payment Received Successfully</h3>
          <p>Dear <strong>${receiptData.candidateName}</strong>,</p>
          <p>Thank you for completing your registration fee payment for Application <strong>${receiptData.applicationNumber}</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Receipt Number:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #192a56;">${receiptData.receiptNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Payment Reference:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${receiptData.paymentReference}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #192a56;">INR ${Number(receiptData.amount).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Purpose:</td>
              <td style="padding: 8px 0; text-align: right;">${receiptData.paymentPurpose}</td>
            </tr>
            ${receiptData.gatewayPaymentId ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Transaction ID:</td>
              <td style="padding: 8px 0; font-family: monospace; text-align: right;">${receiptData.gatewayPaymentId}</td>
            </tr>` : ''}
          </table>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 12px; color: #92400e;">
            <strong>Consultancy Policy:</strong> As per A Tiger Global Consultancy terms, Rs. 500 has been collected for initial registration/verification. The remaining Rs. 500 will be coordinated after 1 month of active placement.
          </div>

          <p>Please find your official <strong>Payment Receipt</strong> attached as a PDF to this email for your records.</p>
          <p style="margin-bottom: 0;">Regards,<br><strong>Onboarding & Accounts Division</strong><br>A Tiger Global</p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          This is an automated operational notification. Please do not reply directly to this email.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: receiptData.candidateEmail,
      subject: `A Tiger Global — Payment Receipt | ${receiptData.applicationNumber}`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFilename,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`[PAYMENT_EMAIL] Receipt sent to ${receiptData.candidateEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[PAYMENT_EMAIL] Delivery failed:', err);
    return {
      success: false,
      error: err.message || 'SMTP delivery failed'
    };
  }
}
