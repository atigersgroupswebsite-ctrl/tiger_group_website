// ==============================================================================
// File: src/server/vitePaymentPlugin.ts
// Description: Connect middleware Vite plugin providing secure server-side /api/payments endpoints
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
function parseRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function paymentApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-payment-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Handle Public Document Verification
        if (url.startsWith('/api/verify')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost');
            const token = (
              parsedUrl.searchParams.get('token') ||
              parsedUrl.searchParams.get('t') ||
              url.replace(/^\/api\/verify\/?/i, '').split('?')[0] ||
              ''
            ).trim();

            const { verifyDocumentTokenHandler } = await import('../../api/payment/_referenceSlipCore.js');
            const result = await verifyDocumentTokenHandler(token);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (verErr: any) {
            console.error('[API_VERIFY_LOCAL_ERROR]', verErr);
            return sendJsonResponse(res, 500, { isValid: false, error: verErr.message || 'Verification failed' });
          }
        }

        // Handle privileged Admin Directory operations
        if (url.startsWith('/api/admin/users')) {
          const method = req.method?.toUpperCase();
          const authHeader = req.headers['authorization'];
          try {
            const {
              listAdminUsersHandler,
              inviteAdminUserHandler,
              toggleAdminStatusHandler
            } = await import('./adminServer');

            if (url === '/api/admin/users' && method === 'GET') {
              const result = await listAdminUsersHandler(authHeader);
              return sendJsonResponse(res, result.status || 200, result.data);
            }

            if (url === '/api/admin/users/invite' && method === 'POST') {
              const rawBody = await parseRequestBody(req);
              const body = JSON.parse(rawBody || '{}');
              const result = await inviteAdminUserHandler(body, authHeader);
              return sendJsonResponse(res, result.status || 200, result.data);
            }

            if (url === '/api/admin/users/toggle-status' && method === 'POST') {
              const rawBody = await parseRequestBody(req);
              const body = JSON.parse(rawBody || '{}');
              const result = await toggleAdminStatusHandler(body, authHeader);
              return sendJsonResponse(res, result.status || 200, result.data);
            }

            return next();
          } catch (adminErr: any) {
            console.error('[API_ADMIN_ERROR]', adminErr);
            return sendJsonResponse(res, 500, { success: false, error: adminErr.message || 'Admin operation failed' });
          }
        }

        // Handle Employee Operations (e.g. Send ID Card Email)
        if (url === '/api/admin/employees/send-id-card' && req.method?.toUpperCase() === 'POST') {
          const authHeader = req.headers['authorization'];
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendEmployeeIdCardServerHandler } = await import('./employeeEmailService');
            const result = await sendEmployeeIdCardServerHandler(body, authHeader);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (empErr: any) {
            console.error('[API_EMPLOYEE_SEND_ID_CARD_ERROR]', empErr);
            return sendJsonResponse(res, 500, { success: false, error: empErr.message || 'Failed to dispatch Employee ID card' });
          }
        }

        // Handle Admin Reference Slip Email Dispatch
        if (url === '/api/admin/reference-slips/send' && req.method?.toUpperCase() === 'POST') {
          const authHeader = req.headers['authorization'];
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendReferenceSlipServerHandler } = await import('./referenceSlipEmailService');
            const result = await sendReferenceSlipServerHandler(body, authHeader);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (refErr: any) {
            console.error('[API_REFERENCE_SLIP_SEND_ERROR]', refErr);
            return sendJsonResponse(res, 500, { success: false, error: refErr.message || 'Failed to dispatch Reference Slip' });
          }
        }

        // Handle Candidate Account Creation via Supabase Auth Admin
        if (url === '/api/candidate/register' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { registerCandidateServerHandler, confirmCandidateEmailServerHandler } = await import('./candidateAccountService');
            if (body?.action === 'confirm_email' && body?.email) {
              const result = await confirmCandidateEmailServerHandler(body.email);
              return sendJsonResponse(res, result.status || 200, result.data);
            }
            const result = await registerCandidateServerHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (candRegErr: any) {
            console.error('[API_CANDIDATE_REGISTER_ERROR]', candRegErr);
            return sendJsonResponse(res, 500, { success: false, error: candRegErr.message || 'Failed to create candidate account' });
          }
        }

        // Handle Public Joining Operations (e.g. Send Confirmation / Receipt Email)
        if (url === '/api/joining/send-receipt' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendJoiningReceiptServerHandler } = await import('./joiningEmailService');
            const result = await sendJoiningReceiptServerHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (joinEmailErr: any) {
            console.error('[API_JOINING_SEND_RECEIPT_ERROR]', joinEmailErr);
            return sendJsonResponse(res, 500, { success: false, error: joinEmailErr.message || 'Failed to dispatch joining receipt' });
          }
        }

        // Handle Document Rejection Action Email Notification
        if (url === '/api/joining/send-rejection-email' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendDocumentRejectionEmailServerHandler } = await import('./joiningRejectionEmailService');
            const result = await sendDocumentRejectionEmailServerHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (rejEmailErr: any) {
            console.error('[API_JOINING_SEND_REJECTION_EMAIL_ERROR]', rejEmailErr);
            return sendJsonResponse(res, 500, { success: false, error: rejEmailErr.message || 'Failed to dispatch rejection email' });
          }
        }

        // Handle Public Contact Us Submission
        if (url === '/api/contact/submit' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { submitContactFormHandler } = await import('./contactService');
            const result = await submitContactFormHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (contactErr: any) {
            console.error('[API_CONTACT_SUBMIT_ERROR]', contactErr);
            return sendJsonResponse(res, 500, { success: false, error: contactErr.message || 'Failed to submit contact message' });
          }
        }

        // Handle Job Seeker Enquiry Admin Email Notification
        if (url === '/api/enquiries/notify-job-seeker' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendJobSeekerEnquiryNotificationServerHandler } = await import('./enquiryNotificationService');
            const result = await sendJobSeekerEnquiryNotificationServerHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (notifErr: any) {
            console.error('[API_ENQUIRY_JOB_SEEKER_ERROR]', notifErr);
            return sendJsonResponse(res, 500, { success: false, error: notifErr.message || 'Failed to dispatch enquiry notification' });
          }
        }

        // Handle Employer Enquiry Admin Email Notification
        if (url === '/api/enquiries/notify-employer' && req.method?.toUpperCase() === 'POST') {
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { sendEmployerEnquiryNotificationServerHandler } = await import('./enquiryNotificationService');
            const result = await sendEmployerEnquiryNotificationServerHandler(body);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (notifErr: any) {
            console.error('[API_ENQUIRY_EMPLOYER_ERROR]', notifErr);
            return sendJsonResponse(res, 500, { success: false, error: notifErr.message || 'Failed to dispatch employer notification' });
          }
        }

        // Handle Privileged Admin Email Send Test
        if (url === '/api/admin/email/send-test' && req.method?.toUpperCase() === 'POST') {
          const authHeader = req.headers['authorization'];
          try {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const { authenticateRequest, getSupabaseServer } = await import('./paymentServer');
            const auth = await authenticateRequest(authHeader);
            if (!auth.authenticated || !auth.user) {
              return sendJsonResponse(res, 401, { success: false, error: 'Unauthorized: Admin authentication required' });
            }

            const supabase = getSupabaseServer();
            const { data: adminProfile } = await supabase
              .from('admin_profiles')
              .select('id, role, active')
              .eq('id', auth.user.id)
              .maybeSingle();

            if (!adminProfile || !adminProfile.active || adminProfile.role !== 'SUPER_ADMIN') {
              return sendJsonResponse(res, 403, { success: false, error: 'Forbidden: Only active SUPER_ADMIN can trigger test emails' });
            }

            const { sendApplicationEmail, getEmailConfig } = await import('./resendClient');
            const config = getEmailConfig();
            const recipient = body.recipientEmail?.trim() || auth.user.email;

            const sendRes = await sendApplicationEmail({
              to: recipient,
              subject: `[TEST] A TIGER GLOBAL Resend Integration Test (${new Date().toLocaleTimeString()})`,
              html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #0F1B38;">A TIGER GLOBAL Email Integration Test</h2>
                <p>This test email confirms that your Resend / Custom SMTP integration is properly configured.</p>
                <p><strong>Configured Sender:</strong> ${config.defaultFrom}</p>
                <p><strong>Provider:</strong> ${config.hasApiKey ? 'Resend REST API' : 'Simulated Delivery'}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              </div>`,
              text: `A TIGER GLOBAL Email Integration Test\nSender: ${config.defaultFrom}\nTimestamp: ${new Date().toISOString()}`
            });

            return sendJsonResponse(res, sendRes.success ? 200 : 500, sendRes);
          } catch (testErr: any) {
            console.error('[API_ADMIN_TEST_EMAIL_ERROR]', testErr);
            return sendJsonResponse(res, 500, { success: false, error: testErr.message || 'Failed to dispatch test email' });
          }
        }

        if (!url.startsWith('/api/payment') && !url.startsWith('/api/payments')) {
          return next();
        }

        const method = req.method?.toUpperCase();
        const authHeader = req.headers['authorization'];

        // Normalize url so /api/payments/xxx and /api/payment/xxx both route identically
        const normalizedUrl = url.replace(/^\/api\/payment(s)?\//, '/api/payment/');

        try {
          const {
            getPaymentConfigHandler,
            createPaymentOrderHandler,
            verifyPaymentHandler,
            webhookHandler,
            recordOfflinePaymentHandler,
            resendReceiptEmailHandler
          } = await import('./paymentServer');

          // 1. GET /api/payment/config?appId=...
          if (normalizedUrl.startsWith('/api/payment/config') && method === 'GET') {
            const parsedUrl = new URL(url, 'http://localhost');
            const appId = parsedUrl.searchParams.get('appId') || '';
            const result = await getPaymentConfigHandler(appId, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 2. POST /api/payment/create-order
          if (normalizedUrl === '/api/payment/create-order' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await createPaymentOrderHandler(body, authHeader, req.headers);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 3. POST /api/payment/verify or GET /api/payment/verify
          if ((normalizedUrl.startsWith('/api/payment/verify') || normalizedUrl.startsWith('/api/payment/status')) && (method === 'POST' || method === 'GET')) {
            let orderId = '';
            let paymentId = '';
            if (method === 'GET') {
              const parsedUrl = new URL(url, 'http://localhost');
              orderId = parsedUrl.searchParams.get('order_id') || parsedUrl.searchParams.get('orderId') || '';
              paymentId = parsedUrl.searchParams.get('payment_id') || parsedUrl.searchParams.get('paymentId') || '';
            } else {
              const rawBody = await parseRequestBody(req);
              const body = JSON.parse(rawBody || '{}');
              orderId = body.orderId || body.order_id || body.gateway_order_id || '';
              paymentId = body.paymentId || body.payment_id || '';
            }
            const result = await verifyPaymentHandler({ orderId, paymentId }, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 4. POST /api/payment/webhook
          if (normalizedUrl === '/api/payment/webhook' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const signature = (req.headers['x-webhook-signature'] || req.headers['x-cashfree-signature']) as string | undefined;
            const timestamp = (req.headers['x-webhook-timestamp'] || req.headers['x-cashfree-timestamp']) as string | undefined;
            const result = await webhookHandler(rawBody, signature, timestamp);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 5. POST /api/payment/record-offline
          if (normalizedUrl === '/api/payment/record-offline' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await recordOfflinePaymentHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 6. POST /api/payment/resend-receipt
          if (normalizedUrl === '/api/payment/resend-receipt' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await resendReceiptEmailHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          return next();
        } catch (err: any) {
          console.error('[API_PAYMENT_ERROR]', err);
          return sendJsonResponse(res, 500, { success: false, error: err.message || 'Internal server error' });
        }
      });
    }
  };
}
