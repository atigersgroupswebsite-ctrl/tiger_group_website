// ==============================================================================
// File: src/server/contactService.ts
// Description: Server-side handler for Contact Us inquiries
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Features: Server validation, persistent audit / notification, and Resend email dispatch
// ==============================================================================

import { getSupabaseServer } from './supabaseServer.js';
import { sendApplicationEmail, getEmailConfig } from './resendClient.js';
import { renderContactNotificationTemplate } from './emailTemplates.js';

export interface ContactUsPayload {
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
}

export interface ContactUsResult {
  success: boolean;
  message?: string;
  error?: string;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Validates, records, and sends notification email for public Contact Us inquiries
 */
export async function submitContactFormHandler(
  body: ContactUsPayload
): Promise<{ status: number; data: ContactUsResult }> {
  const name = body.name?.trim() || '';
  const phone = body.phone?.trim() || '';
  const email = body.email?.trim().toLowerCase() || '';
  const subject = body.subject?.trim() || 'General Inquiry';
  const message = body.message?.trim() || '';

  // 1. Validation
  if (!name || name.length < 2) {
    return { status: 400, data: { success: false, error: 'Please enter your full name (minimum 2 characters).' } };
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return { status: 400, data: { success: false, error: 'Please enter a valid 10-digit contact phone number.' } };
  }
  if (email && !EMAIL_REGEX.test(email)) {
    return { status: 400, data: { success: false, error: 'Please provide a valid email address.' } };
  }
  if (!message || message.length < 5) {
    return { status: 400, data: { success: false, error: 'Please enter a message explaining your requirement.' } };
  }

  const supabase = getSupabaseServer();

  // 2. Persist notification to central admin notifications table
  try {
    const { error: insertErr } = await supabase.from('notifications').insert({
      type: 'NEW_JOB_ENQUIRY',
      title: `[Contact Form] ${subject}`,
      message: `From: ${name} | Phone: ${phone}${email ? ` | Email: ${email}` : ''}\nMessage: ${message}`,
      read: false
    });
    if (insertErr) {
      console.warn('[submitContactFormHandler] Failed to save notification row:', insertErr.message);
    }
  } catch (dbErr: any) {
    console.warn('[submitContactFormHandler] Failed to save notification row:', dbErr.message);
  }

  // 3. Dispatch notification email to operations/compliance team
  const config = getEmailConfig();
  const operationsRecipient = process.env.ADMIN_NOTIFICATIONS_EMAIL || config.fromEmail || 'hr@atigerglobal.com';

  const rendered = renderContactNotificationTemplate({
    name,
    email: email || 'Not provided',
    phone,
    subject,
    message
  });

  const emailRes = await sendApplicationEmail({
    to: operationsRecipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: email || undefined
  });

  if (!emailRes.success && !emailRes.simulated) {
    console.warn('[submitContactFormHandler] Email dispatch notice:', emailRes.error);
  }

  return {
    status: 200,
    data: {
      success: true,
      message: 'Thank you for contacting A Tiger Global. Your inquiry has been registered.'
    }
  };
}
