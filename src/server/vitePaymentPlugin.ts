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

        // Handle privileged Admin Directory operations
        if (url.startsWith('/api/admin/users')) {
          const method = req.method?.toUpperCase();
          const authHeader = req.headers['authorization'];
          try {
            const {
              listAdminUsersHandler,
              inviteAdminUserHandler,
              toggleAdminStatusHandler
            } = await import('./adminServer.ts');

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
            const { sendEmployeeIdCardServerHandler } = await import('./employeeEmailService.ts');
            const result = await sendEmployeeIdCardServerHandler(body, authHeader);
            return sendJsonResponse(res, result.status || 200, result.data);
          } catch (empErr: any) {
            console.error('[API_EMPLOYEE_SEND_ID_CARD_ERROR]', empErr);
            return sendJsonResponse(res, 500, { success: false, error: empErr.message || 'Failed to dispatch Employee ID card' });
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
          } = await import('./paymentServer.ts');

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
            const result = await createPaymentOrderHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 3. POST /api/payment/verify
          if (normalizedUrl === '/api/payment/verify' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await verifyPaymentHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 4. POST /api/payment/webhook
          if (normalizedUrl === '/api/payment/webhook' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const signature = req.headers['x-razorpay-signature'] as string | undefined;
            const result = await webhookHandler(rawBody, signature);
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
