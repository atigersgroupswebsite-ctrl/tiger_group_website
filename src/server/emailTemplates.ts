// ==============================================================================
// File: src/server/emailTemplates.ts
// Description: Clean, unified server-side HTML email templates for A TIGER GLOBAL
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strict sanitization of variables to prevent HTML injection
//   - Zero passwords in templates
//   - Clean plain-text fallbacks
// ==============================================================================

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function baseEmailWrapper(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F1B38; padding: 26px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">A TIGER GLOBAL</h1>
              <p style="color: #c5a059; margin: 6px 0 0 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                Career Solution & Consultancy
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 30px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">A TIGER GLOBAL Career Solution & Consultancy</p>
              <p style="margin: 0 0 8px 0;">Central Compliance & Operations Registry &bull; Nagpur, Maharashtra, India</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">This is an official administrative correspondence. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template 1: Joining Confirmation / Receipt
 */
export function renderJoiningReceiptTemplate(data: {
  candidateName: string;
  candidateEmail: string;
  joiningReference: string;
  companyName?: string | null;
  designation?: string | null;
  submittedAt: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(data.candidateName || 'Candidate');
  const safeRef = escapeHtml(data.joiningReference || 'JOIN-REFERENCE');
  const safeEmail = escapeHtml(data.candidateEmail);
  const safeCompany = data.companyName ? escapeHtml(data.companyName) : null;
  const safeDesignation = data.designation ? escapeHtml(data.designation) : null;

  const content = `
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">Joining Form Submission Acknowledgment</h2>
    <p>Dear <strong>${safeName}</strong>,</p>
    <p>
      Thank you for submitting your official onboarding dossier with <strong>A TIGER GLOBAL Career Solution & Consultancy</strong>.
      Your joining application has been received and registered under the reference code below.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 24px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Joining Reference:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38; font-family: monospace; font-size: 16px;">
            ${safeRef}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Candidate Name:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Registered Email:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeEmail}</td>
        </tr>
        ${safeCompany ? `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Company / Plant:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeCompany}</td>
        </tr>
        ` : ''}
        ${safeDesignation ? `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Designation:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeDesignation}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Submission Timestamp:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${escapeHtml(data.submittedAt)}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #0F1B38; font-size: 15px; margin: 24px 0 10px 0;">Reporting Instructions:</h3>
    <ul style="padding-left: 20px; margin: 0 0 20px 0; font-size: 14px; color: #475569;">
      <li style="margin-bottom: 6px;">Please preserve your reference code <strong>${safeRef}</strong> for all future communications.</li>
      <li style="margin-bottom: 6px;">Carry original identity documents (Aadhaar, PAN, Bank Passbook, Marksheets) on your reporting date.</li>
      <li style="margin-bottom: 6px;">Our HR coordinator will contact you with reporting schedule updates.</li>
    </ul>
  `;

  return {
    subject: `Joining Form Confirmation & Reference (${safeRef}) | A TIGER GLOBAL`,
    html: baseEmailWrapper('Joining Confirmation', content),
    text: `Joining Form Submission Acknowledgment\n\nDear ${data.candidateName},\n\nYour joining application has been received.\nJoining Reference: ${data.joiningReference}\nCandidate Name: ${data.candidateName}\nEmail: ${data.candidateEmail}\n\nPreserve this reference code for all communications.\n\nA TIGER GLOBAL Career Solution & Consultancy`
  };
}

/**
 * Template 2: Candidate Document Rejection Notice
 */
export function renderDocumentRejectionTemplate(data: {
  candidateName: string;
  candidateEmail: string;
  joiningReference: string;
  documentLabel: string;
  rejectionReason: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(data.candidateName || 'Candidate');
  const safeRef = escapeHtml(data.joiningReference || 'JOIN-REFERENCE');
  const safeDoc = escapeHtml(data.documentLabel || 'Document');
  const safeReason = escapeHtml(data.rejectionReason || 'Please provide a clearer replacement copy.');
  const safeLoginUrl = escapeHtml(data.loginUrl);

  const content = `
    <div style="display: inline-block; padding: 4px 12px; background-color: #FEF2F2; border: 1px solid #F87171; border-radius: 4px; color: #991B1B; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
      ACTION REQUIRED
    </div>
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">Action Required: Document Re-Upload Needed</h2>
    <p>Dear <strong>${safeName}</strong>,</p>
    <p>
      During compliance verification of your onboarding dossier (<strong>${safeRef}</strong>), our team identified an issue with one of your submitted documents that requires replacement.
    </p>

    <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #FDE68A;">
          <td style="padding: 8px 0; color: #92400E; font-weight: 700; width: 35%;">Joining Reference:</td>
          <td style="padding: 8px 0; color: #1e293b; font-weight: 700; font-family: monospace;">${safeRef}</td>
        </tr>
        <tr style="border-bottom: 1px solid #FDE68A;">
          <td style="padding: 8px 0; color: #92400E; font-weight: 700;">Rejected Item:</td>
          <td style="padding: 8px 0; color: #DC2626; font-weight: 700;">${safeDoc}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400E; font-weight: 700; vertical-align: top;">Rejection Reason:</td>
          <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeReason}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #0F1B38; font-size: 15px; margin: 20px 0 10px 0;">Instructions to Re-Upload:</h3>
    <ol style="padding-left: 20px; margin: 0 0 24px 0; font-size: 14px; color: #334155;">
      <li style="margin-bottom: 6px;">Log in to your Candidate Portal using your registered email and password.</li>
      <li style="margin-bottom: 6px;">Only the rejected document (<strong>${safeDoc}</strong>) has been opened for editing. Verified documents remain safely preserved.</li>
      <li style="margin-bottom: 6px;">Upload a clear, legible replacement file and click <strong>Resubmit Dossier for Review</strong>.</li>
    </ol>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${safeLoginUrl}" style="display: inline-block; background-color: #0F1B38; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">
        LOG IN TO RE-UPLOAD DOCUMENT &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
      Direct Portal URL: <a href="${safeLoginUrl}" style="color: #0F1B38;">${safeLoginUrl}</a>
    </p>
  `;

  return {
    subject: `Action Required: Document Re-Upload for Joining (${safeRef}) | A TIGER GLOBAL`,
    html: baseEmailWrapper('Action Required: Document Re-Upload', content),
    text: `Action Required: Document Re-Upload\n\nDear ${data.candidateName},\n\nYour joining application (${data.joiningReference}) requires an update.\nRejected Document: ${data.documentLabel}\nReason: ${data.rejectionReason}\n\nPlease log in to re-upload: ${data.loginUrl}\n\nA TIGER GLOBAL Career Solution & Consultancy`
  };
}

/**
 * Template 3: Official Employee Identity Card Attachment
 */
export function renderEmployeeIdCardTemplate(data: {
  candidateName: string;
  employeeCode: string;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(data.candidateName || 'Employee');
  const safeCode = escapeHtml(data.employeeCode);
  const safeDesig = escapeHtml(data.designation || 'Associate');
  const safeDept = escapeHtml(data.department || 'Operations');
  const safeLoc = escapeHtml(data.location || 'Nagpur, Maharashtra');

  const content = `
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">Official Employee Identity Card</h2>
    <p>Dear <strong>${safeName}</strong>,</p>
    <p>
      Congratulations on your onboarding. Please find attached your official <strong>Employee Identity Card</strong> issued under <strong>A TIGER GLOBAL Career Solution & Consultancy</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Employee Name:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38;">${safeName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Employee Code:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38; font-family: monospace; font-size: 15px;">${safeCode}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Designation:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeDesig}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Department:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeDept}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Assigned Location:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeLoc}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #475569;">
      Your ID card is attached to this email in high-resolution PDF format (standard CR80 dimensions). You may print or present this digital document for corporate identification and site access.
    </p>
  `;

  return {
    subject: `Your Employee Identity Card — ${safeCode} | A TIGER GLOBAL`,
    html: baseEmailWrapper('Official Employee Identity Card', content),
    text: `Official Employee Identity Card\n\nDear ${data.candidateName},\n\nYour Employee Identity Card (${data.employeeCode}) has been issued and attached as a PDF.\n\nDesignation: ${data.designation || 'Associate'}\nDepartment: ${data.department || 'Operations'}\n\nA TIGER GLOBAL Career Solution & Consultancy`
  };
}

/**
 * Template 4: Contact Us Form Notification
 */
export function renderContactNotificationTemplate(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const safeSubj = escapeHtml(data.subject);
  const safeMsg = escapeHtml(data.message);

  const content = `
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">New Contact Form Message</h2>
    <p>A new inquiry was submitted via the public contact portal:</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; width: 30%;">Full Name:</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0F1B38;">${safeName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Phone:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0F1B38;">${safePhone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0F1B38;">${safeEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Subject:</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0F1B38;">${safeSubj}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #0F1B38; font-size: 14px; margin: 20px 0 8px 0;">Message Content:</h3>
    <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; font-size: 14px; color: #1e293b; white-space: pre-wrap;">
      ${safeMsg}
    </div>
  `;

  return {
    subject: `[Contact Form] ${safeSubj} — ${safeName}`,
    html: baseEmailWrapper(`Contact Inquiry: ${safeSubj}`, content),
    text: `New Contact Form Message\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nSubject: ${data.subject}\n\nMessage:\n${data.message}`
  };
}

/**
 * Template 5: Job Seeker Enquiry Admin Notification
 */
export function renderJobSeekerEnquiryTemplate(data: {
  applicationNumber: string;
  fullName: string;
  email: string;
  mobile: string;
  desiredCompany: string;
  designation: string;
}): { subject: string; html: string; text: string } {
  const safeApp = escapeHtml(data.applicationNumber);
  const safeName = escapeHtml(data.fullName);
  const safeEmail = escapeHtml(data.email);
  const safeMobile = escapeHtml(data.mobile);
  const safeComp = escapeHtml(data.desiredCompany);
  const safeDesig = escapeHtml(data.designation);

  const content = `
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">New Candidate Job Seeker Enquiry</h2>
    <p>A new candidate registration has been logged into the registry:</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Application Number:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38; font-family: monospace;">${safeApp}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Candidate Name:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Mobile:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeMobile}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Email:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeEmail}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Target Company:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeComp}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Desired Role:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeDesig}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: `[New Candidate] ${safeApp} — ${safeName} (${safeDesig})`,
    html: baseEmailWrapper('New Candidate Registration', content),
    text: `New Candidate Registration\n\nApplication: ${data.applicationNumber}\nName: ${data.fullName}\nMobile: ${data.mobile}\nEmail: ${data.email}\nDesired Role: ${data.designation}`
  };
}

/**
 * Template 6: Employer Enquiry Admin Notification
 */
export function renderEmployerEnquiryTemplate(data: {
  enquiryNumber: string;
  companyName: string;
  email: string;
  phone: string;
  jobRole: string;
  employeesRequired: number;
}): { subject: string; html: string; text: string } {
  const safeEnq = escapeHtml(data.enquiryNumber);
  const safeComp = escapeHtml(data.companyName);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const safeRole = escapeHtml(data.jobRole);

  const content = `
    <h2 style="color: #0F1B38; margin-top: 0; font-size: 18px; font-weight: 700;">New Corporate Employer Requirement</h2>
    <p>A new corporate manpower inquiry was received:</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Enquiry Reference:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38; font-family: monospace;">${safeEnq}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Company Name:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38;">${safeComp}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Corporate Email:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeEmail}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Phone:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safePhone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Role Needed:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0F1B38;">${safeRole}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Quantity Required:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0F1B38;">${data.employeesRequired}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: `[Corporate Requirement] ${safeEnq} — ${safeComp} (${data.employeesRequired} ${safeRole})`,
    html: baseEmailWrapper('Corporate Manpower Requirement', content),
    text: `New Corporate Manpower Requirement\n\nEnquiry: ${data.enquiryNumber}\nCompany: ${data.companyName}\nEmail: ${data.email}\nPhone: ${data.phone}\nRole: ${data.jobRole}\nRequired: ${data.employeesRequired}`
  };
}
