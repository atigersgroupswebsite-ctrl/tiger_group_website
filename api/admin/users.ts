// ==============================================================================
// File: api/admin/users.ts
// Description: Consolidated Vercel Serverless Function — Admin & Sub-Admin Users Router
// Routes Handled:
//   - GET  /api/admin/users                          (List admin directory users)
//   - POST /api/admin/users/login                    (Sub-admin password authentication)
//   - POST /api/admin/users/create-sub-admin         (Provision Sub-Admin)
//   - POST /api/admin/users/update-permissions       (Update Sub-Admin permissions)
//   - POST /api/admin/users/reset-password           (Reset Sub-Admin password)
//   - POST /api/admin/users/toggle-status            (Activate / Deactivate admin account)
//   - POST /api/admin/users/delete                   (Delete admin profile)
//   - POST /api/admin/users/invite                   (Invite admin user)
//   - GET  /api/admin/users/me/permissions           (Current authenticated permissions & profile)
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// ==============================================================================

import type { VercelReq, VercelRes } from '../_utils.js';
import { parseBody, sendResponse } from '../_utils.js';
import {
  listAdminUsersHandler,
  adminLoginHandler,
  createSubAdminHandler,
  updateSubAdminPermissionsHandler,
  resetSubAdminPasswordHandler,
  toggleAdminStatusHandler,
  deleteSubAdminHandler,
  inviteAdminUserHandler,
  getCurrentUserPermissionsHandler
} from '../../src/server/adminServer.js';

function resolveAction(req: VercelReq): string {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const queryAction = urlObj.searchParams.get('_action') || (req.query?._action as string);
  if (queryAction) {
    return queryAction.toLowerCase().trim().replace(/^\//, '');
  }

  const rawPath = (req.headers['x-matched-path'] as string) || urlObj.pathname;
  const match = rawPath.replace(/^\/api\/admin\/users(\/|$)/i, '');
  return (match || '').toLowerCase().trim();
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  const action = resolveAction(req);
  const authHeader = req.headers['authorization'] as string | undefined;

  try {
    switch (action) {
      case '':
      case 'list': {
        if (req.method !== 'GET') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use GET.' });
        }
        const result = await listAdminUsersHandler(authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'login': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await adminLoginHandler(body);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'create-sub-admin': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await createSubAdminHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'update-permissions': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await updateSubAdminPermissionsHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'reset-password': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await resetSubAdminPasswordHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'toggle-status': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await toggleAdminStatusHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'delete': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await deleteSubAdminHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'invite': {
        if (req.method !== 'POST') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
        }
        const body = await parseBody(req);
        const result = await inviteAdminUserHandler(body, authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      case 'me/permissions': {
        if (req.method !== 'GET') {
          return sendResponse(res, 405, { success: false, error: 'Method Not Allowed. Use GET.' });
        }
        const result = await getCurrentUserPermissionsHandler(authHeader);
        return sendResponse(res, result.status ?? 200, result.data);
      }

      default:
        return sendResponse(res, 404, {
          success: false,
          error: `Unknown action '${action}'. Please verify endpoint path.`
        });
    }
  } catch (err: any) {
    console.error(`[API_ADMIN_USERS_ROUTER_ERROR] action: ${action}`, err);
    return sendResponse(res, 500, {
      success: false,
      error: err?.message || 'Server error processing admin user request'
    });
  }
}
