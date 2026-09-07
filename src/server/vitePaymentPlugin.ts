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

        if (!url.startsWith('/api/payments')) {
          return next();
        }

        const method = req.method?.toUpperCase();
        const authHeader = req.headers['authorization'];

        try {
          const {
            getPaymentConfigHandler,
            createPaymentOrderHandler,
            verifyPaymentHandler,
            webhookHandler,
            recordOfflinePaymentHandler,
            resendReceiptEmailHandler
          } = await import('./paymentServer');

          // 1. GET /api/payments/config?appId=...
          if (url.startsWith('/api/payments/config') && method === 'GET') {
            const parsedUrl = new URL(url, 'http://localhost');
            const appId = parsedUrl.searchParams.get('appId') || '';
            const result = await getPaymentConfigHandler(appId, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 2. POST /api/payments/create-order
          if (url === '/api/payments/create-order' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await createPaymentOrderHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 3. POST /api/payments/verify
          if (url === '/api/payments/verify' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await verifyPaymentHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 4. POST /api/payments/webhook
          if (url === '/api/payments/webhook' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const signature = req.headers['x-razorpay-signature'] as string | undefined;
            const result = await webhookHandler(rawBody, signature);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 5. POST /api/payments/record-offline
          if (url === '/api/payments/record-offline' && method === 'POST') {
            const rawBody = await parseRequestBody(req);
            const body = JSON.parse(rawBody || '{}');
            const result = await recordOfflinePaymentHandler(body, authHeader);
            return sendJsonResponse(res, result.status, result.data);
          }

          // 6. POST /api/payments/resend-receipt
          if (url === '/api/payments/resend-receipt' && method === 'POST') {
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
