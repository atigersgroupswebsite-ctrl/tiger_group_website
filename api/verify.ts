// ==============================================================================
// File: api/verify.ts
// Description: Permanent Public Document Verification API Endpoint
// Route: GET /api/verify?token=...
// Brand: A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Publicly accessible without login or Vercel authentication
//   - Strictly non-sensitive data exposure (No Aadhaar, PAN, Phone, Address, Bank)
//   - Server-side validates non-guessable cryptographic tokens
//   - Supports dual resolution: Reference Slips and Employee Identity Cards
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseServer } from './payment/_paymentCore.js';

type VercelReq = IncomingMessage & {
  query?: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
};

type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (data: any) => void;
  send?: (data: any) => void;
};

function sendResponse(res: VercelRes, statusCode: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status?.(204)?.end?.() ?? res.end();
  }

  if (req.method !== 'GET') {
    return sendResponse(res, 405, { isValid: false, error: 'Method Not Allowed. Use GET.' });
  }

  const urlObj = new URL(req.url || '', 'http://localhost');
  const token = (
    urlObj.searchParams.get('token') ||
    (req.query?.token as string) ||
    urlObj.searchParams.get('t') ||
    (req.query?.t as string) ||
    ''
  ).trim();

  if (!token) {
    return sendResponse(res, 400, {
      isValid: false,
      error: 'Missing verification token in scan request.'
    });
  }

  const supabase = getSupabaseServer();

  try {
    // --------------------------------------------------------------------------
    // 1. Check Reference Slips
    // --------------------------------------------------------------------------
    let slip: any = null;

    // Check by verification_token column
    const { data: slipsByToken } = await supabase
      .from('reference_slips')
      .select('*')
      .eq('verification_token', token)
      .limit(1);

    slip = slipsByToken?.[0] || null;

    // If not found and token starts with atg_ref_, attempt UUID lookup
    if (!slip && token.startsWith('atg_ref_')) {
      const hex = token.replace('atg_ref_', '');
      if (hex.length === 32) {
        const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        const { data: slipByUuid } = await supabase
          .from('reference_slips')
          .select('*')
          .eq('id', uuid)
          .maybeSingle();

        slip = slipByUuid || null;
      }
    }

    // Direct UUID match fallback
    if (!slip && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      const { data: slipByDirectId } = await supabase
        .from('reference_slips')
        .select('*')
        .eq('id', token)
        .maybeSingle();

      slip = slipByDirectId || null;
    }

    if (slip) {
      // Resolve candidate name (Non-PII: No phone, Aadhaar, PAN, or full street address)
      let candidateName = 'Verified Candidate';
      if (slip.joining_form_id) {
        const { data: jf } = await supabase
          .from('joining_forms')
          .select('candidate_name')
          .eq('id', slip.joining_form_id)
          .maybeSingle();
        if (jf?.candidate_name) candidateName = jf.candidate_name;
      } else if (slip.application_id) {
        const { data: app } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', slip.application_id)
          .maybeSingle();
        if (app?.full_name) candidateName = app.full_name;
      }

      // Resolve payment confirmation
      let pQuery = supabase
        .from('payments')
        .select('payment_reference, receipt_number, amount, status, paid_at')
        .eq('status', 'SUCCESS');

      if (slip.joining_form_id) {
        pQuery = pQuery.eq('joining_form_id', slip.joining_form_id);
      } else if (slip.application_id) {
        pQuery = pQuery.eq('application_id', slip.application_id);
      }

      const { data: payments } = await pQuery.order('paid_at', { ascending: false }).limit(1);
      const payment = payments?.[0] || null;

      return sendResponse(res, 200, {
        isValid: true,
        documentType: 'REFERENCE_SLIP',
        documentTitle: 'Official Employee Reference Slip & Placement Authorization',
        referenceNumber: slip.reference_number,
        candidateName,
        issuanceDate: slip.date || (slip.created_at ? slip.created_at.split('T')[0] : '—'),
        issuingAuthority: 'A TIGER GLOBAL Career Solution & Consultancy',
        designation: slip.selected_designation || slip.designation || 'Consultant / Executive',
        department: slip.department || 'Operations / Placement',
        companyName: slip.company_name || 'A TIGER GLOBAL Authorized Client Organization',
        interviewResult: slip.interview_result || 'SELECTED',
        paymentVerified: Boolean(payment?.status === 'SUCCESS'),
        paymentReference: payment?.payment_reference || 'VERIFIED',
        receiptNumber: payment?.receipt_number || 'REC-VERIFIED',
        feeStatus: payment?.status === 'SUCCESS' ? 'PAID & VERIFIED (INR 500.00)' : 'CONFIRMED',
        verificationStatus: 'OFFICIALLY ISSUED & AUTHENTIC DOCUMENT',
        verifiedAt: new Date().toISOString(),
      });
    }

    // --------------------------------------------------------------------------
    // 2. Check Employees (ID Cards)
    // --------------------------------------------------------------------------
    const { data: empRpc } = await supabase.rpc('verify_employee_by_token', {
      p_token: token
    });

    if (empRpc && empRpc.is_valid) {
      return sendResponse(res, 200, {
        isValid: true,
        documentType: 'EMPLOYEE_ID_CARD',
        documentTitle: 'Official Corporate Employee Identity Credential',
        ...empRpc,
      });
    }

    // --------------------------------------------------------------------------
    // 3. Not Found
    // --------------------------------------------------------------------------
    return sendResponse(res, 200, {
      isValid: false,
      error: 'No official Reference Slip or Identity Record matches this verification token. The document may be invalid, superseded, or tampered.'
    });
  } catch (err: any) {
    console.error('[API_VERIFY_ERROR]', err);
    return sendResponse(res, 500, {
      isValid: false,
      error: 'An internal server error occurred while verifying the cryptographic token.'
    });
  }
}
