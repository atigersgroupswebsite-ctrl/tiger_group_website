// ==============================================================================
// File: src/server/enquiryNotificationService.ts
// Description: Server-side email notification service for Job Seeker & Employer Inquiries
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import { sendApplicationEmail, getEmailConfig } from './resendClient.js';
import {
  renderJobSeekerEnquiryTemplate,
  renderEmployerEnquiryTemplate
} from './emailTemplates.js';

export async function sendJobSeekerEnquiryNotificationServerHandler(payload: {
  applicationNumber: string;
  fullName: string;
  email: string;
  mobile: string;
  desiredCompany: string;
  designation: string;
}) {
  const config = getEmailConfig();
  const operationsRecipient = process.env.ADMIN_NOTIFICATIONS_EMAIL || config.fromEmail || 'hr@atigerglobal.com';

  const template = renderJobSeekerEnquiryTemplate(payload);

  const res = await sendApplicationEmail({
    to: operationsRecipient,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: payload.email || undefined
  });

  return {
    status: res.success ? 200 : 500,
    data: {
      success: res.success,
      messageId: res.messageId,
      simulated: res.simulated,
      error: res.error
    }
  };
}

export async function sendEmployerEnquiryNotificationServerHandler(payload: {
  enquiryNumber: string;
  companyName: string;
  email: string;
  phone: string;
  jobRole: string;
  employeesRequired: number;
}) {
  const config = getEmailConfig();
  const operationsRecipient = process.env.ADMIN_NOTIFICATIONS_EMAIL || config.fromEmail || 'hr@atigerglobal.com';

  const template = renderEmployerEnquiryTemplate(payload);

  const res = await sendApplicationEmail({
    to: operationsRecipient,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: payload.email || undefined
  });

  return {
    status: res.success ? 200 : 500,
    data: {
      success: res.success,
      messageId: res.messageId,
      simulated: res.simulated,
      error: res.error
    }
  };
}
