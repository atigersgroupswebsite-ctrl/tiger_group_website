// ==============================================================================
// File: src/server/resendClient.ts
// Description: Centralized server-only Resend API client & SMTP fallback dispatcher
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strictly executes on server side (process.env)
//   - Never exposes API keys or secrets to browser/client
//   - Zero client bundle imports
// ==============================================================================

import nodemailer from 'nodemailer';

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
  provider: 'resend_api' | 'resend_smtp' | 'simulated';
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
  const smtpHost = typeof process !== 'undefined' ? (process.env.SMTP_HOST || 'smtp.resend.com') : 'smtp.resend.com';
  const smtpPort = typeof process !== 'undefined' ? Number(process.env.SMTP_PORT || 587) : 587;
  const smtpUser = typeof process !== 'undefined' ? (process.env.SMTP_USER || 'resend') : 'resend';
  const smtpPass = typeof process !== 'undefined' ? (process.env.SMTP_PASS || resendApiKey) : resendApiKey;
  
  const fromEmail = typeof process !== 'undefined' 
    ? (process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || DEFAULT_SENDER_EMAIL) 
    : DEFAULT_SENDER_EMAIL;
  
  const fromName = typeof process !== 'undefined' 
    ? (process.env.RESEND_FROM_NAME || process.env.SMTP_FROM_NAME || DEFAULT_SENDER_NAME) 
    : DEFAULT_SENDER_NAME;

  const defaultFrom = `"${fromName}" <${fromEmail}>`;

  return {
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
    defaultFrom,
    hasApiKey: Boolean(resendApiKey && resendApiKey.trim().length > 0),
    hasSmtp: Boolean(smtpPass && smtpPass.trim().length > 0)
  };
}

/**
 * Sends email via Resend HTTP REST API (https://api.resend.com/emails)
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
    return {
      success: false,
      provider: 'resend_api',
      error: errorMsg
    };
  }

  return {
    success: true,
    provider: 'resend_api',
    messageId: json?.id || `resend_${Date.now()}`
  };
}

/**
 * Sends email via Resend SMTP transport using nodemailer
 */
async function sendViaSmtp(
  config: ReturnType<typeof getEmailConfig>,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions: Record<string, any> = {
    from: options.from || config.defaultFrom,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  };

  if (options.replyTo) {
    mailOptions.replyTo = options.replyTo;
  }

  if (options.attachments && options.attachments.length > 0) {
    mailOptions.attachments = options.attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
      contentType: att.contentType
    }));
  }

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    provider: 'resend_smtp',
    messageId: info.messageId
  };
}

/**
 * Central email dispatcher for all application business communications.
 * Priority order:
 * 1. Resend REST API (if RESEND_API_KEY is configured)
 * 2. Resend Custom SMTP (if SMTP_PASS / credentials are configured)
 * 3. Graceful simulation logging (if neither key is configured in dev/testing environment)
 */
export async function sendApplicationEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const config = getEmailConfig();

  // 1. Try Resend REST API if key present
  if (config.hasApiKey) {
    try {
      const result = await sendViaResendApi(config.resendApiKey!, options, config.defaultFrom);
      if (result.success) return result;
      console.warn('[sendApplicationEmail] Resend API failed, trying SMTP fallback:', result.error);
    } catch (apiErr: any) {
      console.warn('[sendApplicationEmail] Resend API exception, trying SMTP fallback:', apiErr.message);
    }
  }

  // 2. Try SMTP if configured
  if (config.hasSmtp) {
    try {
      return await sendViaSmtp(config, options);
    } catch (smtpErr: any) {
      console.error('[sendApplicationEmail] Resend SMTP failed:', smtpErr.message);
      return {
        success: false,
        provider: 'resend_smtp',
        error: smtpErr.message || 'SMTP delivery failed'
      };
    }
  }

  // 3. If neither RESEND_API_KEY nor SMTP is configured, do NOT report false success!
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const missingMsg = 'RESEND_API_KEY / SMTP credentials are not configured in the server environment. Email was NOT dispatched.';
  console.warn(`[EMAIL_DISPATCH_FAILED] ${missingMsg} (Target: ${recipient})`);

  return {
    success: false,
    provider: 'simulated',
    simulated: true,
    error: missingMsg
  };
}
