// ==============================================================================
// File: api/_utils.ts
// Description: Shared request/response utilities for Vercel serverless functions
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'node:http';

export type VercelReq = IncomingMessage & {
  body?: any;
  query?: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
};

export type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (data: any) => void;
  send?: (data: any) => void;
};

/**
 * Robustly parses request body whether pre-parsed by Vercel or streaming.
 */
export async function parseBody(req: VercelReq): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Extracts raw unparsed body as string (essential for webhook HMAC signature verification).
 */
export async function parseRawBody(req: VercelReq): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => resolve(raw));
    req.on('error', () => resolve(''));
  });
}

/**
 * Sends structured JSON response across both Vercel serverless and Node HTTP runtimes.
 */
export function sendResponse(res: VercelRes, statusCode: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
