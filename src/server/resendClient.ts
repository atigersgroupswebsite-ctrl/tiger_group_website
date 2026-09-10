// ==============================================================================
// File: src/server/resendClient.ts
// Description: Centralized server-only Resend REST API email dispatcher
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strictly executes on server side (process.env)
//   - Never exposes API keys or secrets to browser/client
//   - Zero client bundle imports
//   - No nodemailer / native Node modules (Vercel ESM compatible)
// ==============================================================================

export interface EmailAttachment {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: 'resend_api' | 'simulated';
  simulated?: boolean;
  error?: string;
}

/**
 * Standard brand sender configuration
 */
export const DEFAULT_SENDER_NAME = 'A TIGER GLOBAL';
export const DEFAULT_SENDER_EMAIL = 'noreply@atigerglobal.com';
export const DEFAULT_FROM = `"${DEFAULT_SENDER_NAME}" <${DEFAULT_SENDER_EMAIL}>`;

/**
 * Retrieves server-side environment variables safely
 */
export function getEmailConfig() {
  const resendApiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined;

  const fromEmail = typeof process !== 'undefined'
    ? (process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || DEFAULT_SENDER_EMAIL)
    : DEFAULT_SENDER_EMAIL;

  const fromName = typeof process !== 'undefined'
    ? (process.env.RESEND_FROM_NAME || process.env.SMTP_FROM_NAME || DEFAULT_SENDER_NAME)
    : DEFAULT_SENDER_NAME;

  const defaultFrom = `"${fromName}" <${fromEmail}>`;

  return {
    resendApiKey,
    fromEmail,
    fromName,
    defaultFrom,
    hasApiKey: Boolean(resendApiKey && resendApiKey.trim().length > 0)
  };
}

/**
 * Sends email exclusively via Resend HTTP REST API (https://api.resend.com/emails).
 * nodemailer / SMTP removed: Vercel ESM serverless cannot load native net/tls modules.
 */
async function sendViaResendApi(
  apiKey: string,
  options: SendEmailOptions,
  defaultFrom: string
): Promise<SendEmailResult> {
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const payload: Record<string, any> = {
    from: options.from || defaultFrom,
    to: toList,
    subject: options.subject,
    html: options.html
  };

  if (options.text) payload.text = options.text;
  if (options.replyTo) payload.reply_to = options.replyTo;

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map((att) => {
      let contentBase64 = '';
      if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      } else if (att.content instanceof Uint8Array) {
        contentBase64 = Buffer.from(att.content).toString('base64');
      } else if (typeof att.content === 'string') {
        contentBase64 = Buffer.from(att.content).toString('base64');
      }

      return {
        filename: att.filename,
        content: contentBase64,
        content_type: att.contentType || 'application/octet-stream'
      };
    });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json?.message || `Resend API error status: ${response.status}`;
    return { success: false, provider: 'resend_api', error: errorMsg };
  }

  return {
    success: true,
    provider: 'resend_api',
    messageId: json?.id || `resend_${Date.now()}`
  };
}

/**
 * Central email dispatcher for all application business communications.
 * Uses Resend REST API exclusively. Returns explicit failure if key not configured.
 */
export async function sendApplicationEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const config = getEmailConfig();

  if (config.hasApiKey) {
    try {
      return await sendViaResendApi(config.resendApiKey!, options, config.defaultFrom);
    } catch (apiErr: any) {
      console.error('[sendApplicationEmail] Resend API exception:', apiErr.message);
      return { success: false, provider: 'resend_api', error: apiErr.message || 'Resend API call failed' };
    }
  }

  // RESEND_API_KEY not configured — never fake success
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const missingMsg = 'RESEND_API_KEY is not configured in the server environment. Email was NOT dispatched.';
  console.warn(`[EMAIL_DISPATCH_FAILED] ${missingMsg} (Target: ${recipient})`);

  return {
    success: false,
    provider: 'simulated',
    simulated: true,
    error: missingMsg
  };
}

