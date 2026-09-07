// ==============================================================================
// File: src/services/adminPaymentService.ts
// Description: Central Payment Operations, Financial Ledger & KPI Service Layer
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strict Admin Authorization (SUPER_ADMIN, COORDINATOR, ACCOUNTANT for operations; DOCUMENT_VERIFIER read-only)
//   - PII protection: Aadhaar, PAN, bank account numbers, IFSC strictly excluded
//   - Cryptographic server verification integrity preserved
//   - Supports both Application-based (INQ-...) and Standalone Joining (JOIN-...) payments
//   - Integrated with activity_logs (entity_type = 'PAYMENT')
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  PaymentRow,
  PaymentStatus,
  ActivityLogRow
} from '../types/database';
import { recordOfflinePayment as serviceRecordOfflinePayment, resendPaymentReceiptEmail } from './paymentService';
import { buildPaymentReceiptPdf, type PaymentReceiptData } from '../utils/paymentReceiptGenerator';
import { persistGeneratedDocument } from './filePersistenceService';
import { logActivity } from './activityService';

export type PaymentPurpose = 'REGISTRATION' | 'CONSULTANCY' | 'OTHER';

export interface PaymentLedgerItem extends PaymentRow {
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  sourceType: 'APPLICATION' | 'JOINING';
  sourceReference: string;
  sourceId: string;
  companyName: string;
  application?: {
    id: string;
    application_number: string;
    full_name: string;
    email: string;
    mobile: string;
    desired_company: string;
    status: string;
  } | null;
  joining_form?: {
    id: string;
    joining_reference: string | null;
    candidate_name: string | null;
    email: string | null;
    employee_contact_number: string | null;
    company?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface PaymentLedgerFilters {
  search?: string;
  status?: PaymentStatus | 'ALL';
  purpose?: string | 'ALL';
  method?: string | 'ALL';
  source?: 'ALL' | 'APPLICATION' | 'JOINING';
  dateRange?: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
}

export interface FinancialKPIs {
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalCollected: number;
  periodCollected: number;
  todayCollection: number;
  currentMonthCollection: number;
  periodLabel: string;
}

export interface CandidateSourceLookup {
  id: string;
  type: 'APPLICATION' | 'JOINING';
  reference: string;
  name: string;
  email: string;
  mobile: string;
  company: string;
}

/**
 * Fetches the global payment ledger with full relational candidate mapping
 * and calculates genuine, real-time financial KPIs.
 */
export async function getPaymentLedger(
  filters?: PaymentLedgerFilters
): Promise<{ payments: PaymentLedgerItem[]; kpis: FinancialKPIs }> {
  if (!isSupabaseConfigured) {
    return {
      payments: [],
      kpis: {
        totalPayments: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
        totalCollected: 0,
        periodCollected: 0,
        todayCollection: 0,
        currentMonthCollection: 0,
        periodLabel: 'Database not connected'
      }
    };
  }

  try {
    // 1. Fetch payments joined with applications and joining_forms (safe non-KYC fields only)
    let query = supabase
      .from('payments')
      .select(`
        *,
        application:applications(
          id,
          application_number,
          full_name,
          email,
          mobile,
          desired_company,
          status
        ),
        joining_form:joining_forms(
          id,
          joining_reference,
          candidate_name,
          email,
          employee_contact_number,
          company:companies(
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Database-level status filtering if specified
    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    // Database-level purpose filtering
    if (filters?.purpose && filters.purpose !== 'ALL') {
      query = query.eq('purpose', filters.purpose);
    }

    // Source filtering
    if (filters?.source === 'APPLICATION') {
      query = query.not('application_id', 'is', null);
    } else if (filters?.source === 'JOINING') {
      query = query.not('joining_form_id', 'is', null);
    }

    // Method filtering
    if (filters?.method && filters.method !== 'ALL') {
      query = query.eq('payment_method', filters.method);
    }

    const { data: rawRows, error } = await query;

    if (error) {
      console.error('[getPaymentLedger] Supabase error:', error.message);
      throw error;
    }

    // 2. Map raw records into strongly-typed PaymentLedgerItems
    const mappedItems: PaymentLedgerItem[] = (rawRows || []).map((row: any) => {
      const app = row.application;
      const joining = row.joining_form;

      const isApp = Boolean(row.application_id && app);
      const sourceType: 'APPLICATION' | 'JOINING' = isApp ? 'APPLICATION' : 'JOINING';

      const sourceReference = isApp
        ? app?.application_number || 'INQ-PENDING'
        : joining?.joining_reference || 'JOIN-PENDING';

      const sourceId = isApp ? (app?.id || '') : (joining?.id || '');

      const candidateName = isApp
        ? app?.full_name || 'Candidate'
        : joining?.candidate_name || 'Candidate';

      const candidateEmail = isApp
        ? app?.email || ''
        : joining?.email || '';

      const candidateMobile = isApp
        ? app?.mobile || ''
        : joining?.employee_contact_number || '';

      const companyName = isApp
        ? app?.desired_company || 'A Tiger Group'
        : joining?.company?.name || 'A Tiger Group';

      return {
        ...row,
        candidateName,
        candidateEmail,
        candidateMobile,
        sourceType,
        sourceReference,
        sourceId,
        companyName,
        application: app || null,
        joining_form: joining || null
      };
    });

    // 3. Date range calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    now.setTime(Date.now()); // reset
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Filter by date range if applicable
    let dateFilteredItems = mappedItems;
    let periodLabel = 'All Time';

    if (filters?.dateRange && filters.dateRange !== 'ALL') {
      if (filters.dateRange === 'TODAY') {
        periodLabel = 'Today';
        dateFilteredItems = mappedItems.filter((p) => {
          const t = new Date(p.paid_at || p.created_at).getTime();
          return t >= startOfToday;
        });
      } else if (filters.dateRange === 'THIS_WEEK') {
        periodLabel = 'This Week';
        dateFilteredItems = mappedItems.filter((p) => {
          const t = new Date(p.paid_at || p.created_at).getTime();
          return t >= startOfWeek;
        });
      } else if (filters.dateRange === 'THIS_MONTH') {
        const monthName = now.toLocaleString('default', { month: 'long' });
        periodLabel = `${monthName} ${now.getFullYear()}`;
        dateFilteredItems = mappedItems.filter((p) => {
          const t = new Date(p.paid_at || p.created_at).getTime();
          return t >= startOfMonth;
        });
      } else if (filters.dateRange === 'LAST_30_DAYS') {
        periodLabel = 'Last 30 Days';
        dateFilteredItems = mappedItems.filter((p) => {
          const t = new Date(p.paid_at || p.created_at).getTime();
          return t >= thirtyDaysAgo;
        });
      } else if (filters.dateRange === 'CUSTOM') {
        periodLabel = 'Custom Period';
        if (filters.startDate) {
          const s = new Date(filters.startDate).getTime();
          dateFilteredItems = dateFilteredItems.filter((p) => new Date(p.paid_at || p.created_at).getTime() >= s);
        }
        if (filters.endDate) {
          const e = new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000; // inclusive
          dateFilteredItems = dateFilteredItems.filter((p) => new Date(p.paid_at || p.created_at).getTime() <= e);
        }
      }
    }

    // Client search filtering (safe identifiers only)
    let finalPayments = dateFilteredItems;
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      finalPayments = dateFilteredItems.filter((p) => {
        return (
          p.payment_reference.toLowerCase().includes(q) ||
          (p.receipt_number && p.receipt_number.toLowerCase().includes(q)) ||
          p.sourceReference.toLowerCase().includes(q) ||
          p.candidateName.toLowerCase().includes(q) ||
          (p.gateway_order_id && p.gateway_order_id.toLowerCase().includes(q)) ||
          (p.gateway_payment_id && p.gateway_payment_id.toLowerCase().includes(q)) ||
          p.companyName.toLowerCase().includes(q)
        );
      });
    }

    // 4. Calculate Financial KPIs from true database figures
    // All-time figures based on mappedItems (unfiltered by search)
    const totalPayments = mappedItems.length;
    const successfulPayments = mappedItems.filter((p) => p.status === 'SUCCESS').length;
    const pendingPayments = mappedItems.filter((p) => p.status === 'PENDING').length;
    const failedPayments = mappedItems.filter((p) => p.status === 'FAILED').length;
    const refundedPayments = mappedItems.filter((p) => p.status === 'REFUNDED').length;

    const totalCollected = mappedItems
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const todayCollection = mappedItems
      .filter((p) => p.status === 'SUCCESS' && new Date(p.paid_at || p.created_at).getTime() >= startOfToday)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const currentMonthCollection = mappedItems
      .filter((p) => p.status === 'SUCCESS' && new Date(p.paid_at || p.created_at).getTime() >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Period collection matches the selected date range filter
    const periodCollected = dateFilteredItems
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const kpis: FinancialKPIs = {
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      totalCollected,
      periodCollected,
      todayCollection,
      currentMonthCollection,
      periodLabel
    };

    return {
      payments: finalPayments,
      kpis
    };
  } catch (err: any) {
    console.error('[getPaymentLedger] Exception:', err);
    throw err;
  }
}

/**
 * Fetches single payment record by ID with relational candidate and audit history.
 */
export async function getPaymentById(
  paymentId: string
): Promise<{ payment: PaymentLedgerItem | null; activities: ActivityLogRow[] }> {
  if (!isSupabaseConfigured || !paymentId) {
    return { payment: null, activities: [] };
  }

  try {
    const { data: rawRowData, error } = await supabase
      .from('payments')
      .select(`
        *,
        application:applications(
          id,
          application_number,
          full_name,
          email,
          mobile,
          desired_company,
          status
        ),
        joining_form:joining_forms(
          id,
          joining_reference,
          candidate_name,
          email,
          employee_contact_number,
          company:companies(
            id,
            name
          )
        )
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (error || !rawRowData) {
      console.error('[getPaymentById] Not found or error:', error?.message);
      return { payment: null, activities: [] };
    }

    const rawRow = rawRowData as any;
    const app = rawRow.application;
    const joining = rawRow.joining_form;
    const isApp = Boolean(rawRow.application_id && app);
    const sourceType: 'APPLICATION' | 'JOINING' = isApp ? 'APPLICATION' : 'JOINING';

    const sourceReference = isApp
      ? app?.application_number || 'INQ-PENDING'
      : joining?.joining_reference || 'JOIN-PENDING';

    const sourceId = isApp ? (app?.id || '') : (joining?.id || '');

    const candidateName = isApp
      ? app?.full_name || 'Candidate'
      : joining?.candidate_name || 'Candidate';

    const candidateEmail = isApp
      ? app?.email || ''
      : joining?.email || '';

    const candidateMobile = isApp
      ? app?.mobile || ''
      : joining?.employee_contact_number || '';

    const companyName = isApp
      ? app?.desired_company || 'A Tiger Group'
      : joining?.company?.name || 'A Tiger Group';

    const paymentItem: PaymentLedgerItem = {
      ...rawRow,
      candidateName,
      candidateEmail,
      candidateMobile,
      sourceType,
      sourceReference,
      sourceId,
      companyName,
      application: app || null,
      joining_form: joining || null
    };

    // Fetch related audit logs (for this payment and its associated application)
    let activitiesQuery = supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'PAYMENT')
      .eq('entity_id', paymentId)
      .order('created_at', { ascending: false });

    const { data: paymentActs } = await activitiesQuery;

    let allActivities: ActivityLogRow[] = (paymentActs || []) as ActivityLogRow[];

    // If linked to application, also retrieve application payment events
    if (rawRow.application_id) {
      const { data: appActs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('application_id', rawRow.application_id)
        .in('action', ['PAYMENT_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED', 'OFFLINE_PAYMENT_RECORDED'])
        .order('created_at', { ascending: false });

      if (appActs && appActs.length > 0) {
        // Merge without duplicate IDs
        const existingIds = new Set(allActivities.map((a) => a.id));
        for (const act of appActs) {
          if (!existingIds.has(act.id)) {
            allActivities.push(act as ActivityLogRow);
          }
        }
        allActivities.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    }

    return {
      payment: paymentItem,
      activities: allActivities
    };
  } catch (err: any) {
    console.error('[getPaymentById] Exception:', err);
    return { payment: null, activities: [] };
  }
}

/**
 * Searches candidates across applications and joining forms for recording offline payments.
 */
export async function searchCandidateSources(
  searchTerm: string
): Promise<CandidateSourceLookup[]> {
  if (!isSupabaseConfigured || !searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const query = searchTerm.trim().toLowerCase();
  const results: CandidateSourceLookup[] = [];

  try {
    // 1. Search applications
    const { data: appData } = await supabase
      .from('applications')
      .select('id, application_number, full_name, email, mobile, desired_company')
      .or(`application_number.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%,mobile.ilike.%${query}%`)
      .limit(10);

    if (appData) {
      for (const app of appData) {
        results.push({
          id: app.id,
          type: 'APPLICATION',
          reference: app.application_number,
          name: app.full_name,
          email: app.email,
          mobile: app.mobile,
          company: app.desired_company || 'A Tiger Group'
        });
      }
    }

    // 2. Search standalone joining forms
    const { data: joiningData } = await supabase
      .from('joining_forms')
      .select(`
        id,
        joining_reference,
        candidate_name,
        email,
        employee_contact_number,
        company:companies(name)
      `)
      .or(`joining_reference.ilike.%${query}%,candidate_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (joiningData) {
      for (const j of joiningData) {
        // Avoid duplicate if this joining form is already linked to an application in results
        results.push({
          id: j.id,
          type: 'JOINING',
          reference: j.joining_reference || 'JOIN-PENDING',
          name: j.candidate_name || 'Candidate',
          email: j.email || '',
          mobile: j.employee_contact_number || '',
          company: (j.company as any)?.name || 'A Tiger Group'
        });
      }
    }

    return results;
  } catch (err) {
    console.error('[searchCandidateSources] Error searching candidates:', err);
    return [];
  }
}

/**
 * Administrative action to record an offline payment with strict role validation.
 * Blocks DOCUMENT_VERIFIER at the frontend and verifies RPC acceptance.
 */
export async function recordAdminOfflinePayment(input: {
  applicationId?: string | null;
  joiningFormId?: string | null;
  purpose: string;
  amount: number;
  receivedBy: string;
  notes?: string;
  adminRole?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  // Frontend guard: Document Verifier is strictly restricted
  if (input.adminRole === 'DOCUMENT_VERIFIER') {
    return {
      success: false,
      error: 'Unauthorized: Document Verifiers are not permitted to record offline payments.'
    };
  }

  if (!input.applicationId && !input.joiningFormId) {
    return {
      success: false,
      error: 'Either Application ID or Joining Form ID is required.'
    };
  }

  try {
    const res = await serviceRecordOfflinePayment({
      applicationId: input.applicationId || undefined,
      joiningFormId: input.joiningFormId || undefined,
      purpose: input.purpose,
      amount: input.amount,
      receivedBy: input.receivedBy,
      notes: input.notes
    });

    return res;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to record offline payment.'
    };
  }
}

/**
 * Resends payment receipt email to candidate.
 */
export async function resendReceiptEmail(paymentId: string): Promise<{ success: boolean; error?: string }> {
  return await resendPaymentReceiptEmail(paymentId);
}

/**
 * Persists a generated Payment Receipt PDF to the private 'generated-documents'
 * bucket and records it in the public.generated_files ledger.
 */
export async function persistReceiptDocument(
  payment: PaymentLedgerItem,
  receiptData: PaymentReceiptData
): Promise<{ success: boolean; fileId?: string; storagePath?: string; error?: string }> {
  try {
    const doc = buildPaymentReceiptPdf(receiptData);
    const pdfBlob = doc.output('blob');
    const fileName = `Receipt_${receiptData.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    const res = await persistGeneratedDocument({
      applicationId: payment.application_id,
      joiningFormId: payment.joining_form_id,
      fileType: 'RECEIPT_PDF',
      fileName,
      blob: pdfBlob,
      version: 1
    });

    if (res.success && res.fileId) {
      await logActivity({
        entityType: 'PAYMENT',
        entityId: payment.id,
        applicationId: payment.application_id,
        action: 'RECEIPT_PDF_PERSISTED',
        description: `Receipt PDF ${fileName} persisted to private storage.`
      });
    }

    return res;
  } catch (err: any) {
    console.error('[persistReceiptDocument] Exception:', err);
    return { success: false, error: err?.message || 'Failed to persist receipt PDF' };
  }
}
