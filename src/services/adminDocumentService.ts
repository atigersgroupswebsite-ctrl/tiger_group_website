// ==============================================================================
// File: src/services/adminDocumentService.ts
// Description: Admin Document Verification & Central Queue Service Layer
// Brand: A Tiger Group's — Operational Administrative Review
// Security:
//   - Strict Admin Authorization (SUPER_ADMIN, DOCUMENT_VERIFIER, COORDINATOR)
//   - Private Signed URLs only (1h temporary expiry)
//   - All operations audited in activity_logs (entity_type = 'DOCUMENT')
//   - PII values (Aadhaar/PAN/Bank numbers) never logged or exposed in listings
//   - Database RPCs enforce transactional verify & reject mutations
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  DocumentRow,
  JoiningFormRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  DeclarationRow,
  DocumentType,
  DocumentVerificationStatus
} from '../types/database';

export interface RequiredDocumentSpec {
  type: string;
  side: 'FRONT' | 'BACK' | 'SINGLE' | null;
  label: string;
  required: boolean;
}

export const CONFIGURED_REQUIRED_DOCUMENTS: RequiredDocumentSpec[] = [
  { type: 'PHOTO', side: null, label: 'Passport Photograph', required: true },
  { type: 'SIGNATURE', side: null, label: 'Candidate Signature', required: true },
  { type: 'AADHAAR', side: 'FRONT', label: 'Aadhaar Card (Front)', required: true },
  { type: 'AADHAAR', side: 'BACK', label: 'Aadhaar Card (Back)', required: true },
  { type: 'PAN', side: null, label: 'PAN Card', required: true },
  { type: 'BANK_PASSBOOK', side: null, label: 'Bank Passbook / Cancelled Cheque', required: true },
  { type: 'EDUCATION_CERTIFICATE', side: null, label: 'Highest Education Certificate', required: false }
];

export interface DocumentVerificationStats {
  totalRequired: number;
  uploadedCount: number;
  verifiedCount: number;
  rejectedCount: number;
  pendingCount: number;
  allRequiredVerified: boolean;
  hasRejections: boolean;
  readinessLabel: string;
}

export interface DocumentQueueItem extends DocumentRow {
  application?: {
    id: string;
    application_number: string;
    full_name: string;
    mobile: string;
    desired_company: string;
  } | null;
  joining_form?: {
    id: string;
    joining_reference: string | null;
    candidate_name: string | null;
    application_id: string | null;
    company_id: string | null;
    employee_code: string | null;
    company?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface DocumentQueueFilters {
  search?: string;
  status?: DocumentVerificationStatus | 'ALL' | 'PENDING_OR_UPLOADED';
  documentType?: DocumentType | 'ALL';
  source?: 'ALL' | 'APPLICATION' | 'JOINING';
}

/**
 * Computes database-driven verification metrics for an application's documents.
 * Respects that EDUCATION_CERTIFICATE is optional.
 */
export function calculateDocumentVerificationStats(
  documents: DocumentRow[],
  requiredSpecs: RequiredDocumentSpec[] = CONFIGURED_REQUIRED_DOCUMENTS
): DocumentVerificationStats {
  const mandatorySpecs = requiredSpecs.filter((s) => s.required);
  const totalRequired = mandatorySpecs.length;

  let verifiedCount = 0;
  let rejectedCount = 0;
  let uploadedCount = 0;

  for (const spec of mandatorySpecs) {
    const matchingDoc = documents.find((doc) => {
      const typeMatch = doc.document_type === spec.type;
      if (!typeMatch) return false;
      if (spec.side) {
        return doc.document_side === spec.side;
      }
      return true;
    });

    if (matchingDoc) {
      uploadedCount++;
      if (matchingDoc.verification_status === 'VERIFIED') {
        verifiedCount++;
      } else if (matchingDoc.verification_status === 'REJECTED') {
        rejectedCount++;
      }
    }
  }

  // Also count any rejections among non-spec / optional docs
  const totalRejections = documents.filter((d) => d.verification_status === 'REJECTED').length;
  const pendingCount = documents.filter(
    (d) => d.verification_status === 'PENDING' || d.verification_status === 'UPLOADED'
  ).length;

  const allRequiredVerified = verifiedCount === totalRequired;
  const hasRejections = totalRejections > 0;

  let readinessLabel = 'VERIFICATION IN PROGRESS';
  if (hasRejections) {
    readinessLabel = 'ACTION REQUIRED';
  } else if (allRequiredVerified) {
    readinessLabel = 'ALL REQUIRED DOCUMENTS VERIFIED';
  }

  return {
    totalRequired,
    uploadedCount,
    verifiedCount,
    rejectedCount: totalRejections,
    pendingCount,
    allRequiredVerified,
    hasRejections,
    readinessLabel
  };
}

/**
 * Generates a temporary, secure signed URL to view a private candidate document.
 * Never generates or exposes permanent public URLs.
 */
export async function getDocumentSignedUrl(
  storagePath: string | null | undefined,
  expiresInSeconds = 3600
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  if (!storagePath) {
    return { success: false, error: 'Document has no storage path recorded.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true, signedUrl: '#' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('candidate-documents')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: error?.message || 'Could not generate secure view URL.' };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Storage signed URL generation failed.' };
  }
}

/**
 * Verifies a candidate document via transactional RPC admin_verify_document.
 * Sets entity_type = 'DOCUMENT' on the activity log.
 */
export async function verifyCandidateDocument(
  docId: string
): Promise<{
  success: boolean;
  error?: string;
  documentId?: string;
  verificationStatus?: string;
  verifiedAt?: string;
}> {
  if (!docId) return { success: false, error: 'Document ID is required.' };

  if (!isSupabaseConfigured) {
    return {
      success: true,
      documentId: docId,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabase.rpc('admin_verify_document', {
      p_doc_id: docId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as {
      success?: boolean;
      error?: string;
      document_id?: string;
      verification_status?: string;
      verified_at?: string;
    };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Verification failed.' };
    }

    // Ensure activity log is tagged with entity_type = 'DOCUMENT' and entity_id = docId
    try {
      await supabase
        .from('activity_logs')
        .update({ entity_type: 'DOCUMENT', entity_id: docId })
        .eq('action', 'DOCUMENT_VERIFIED')
        .eq('metadata->>document_id', docId);
    } catch {
      // Non-critical audit attribution
    }

    return {
      success: true,
      documentId: res.document_id || docId,
      verificationStatus: res.verification_status || 'VERIFIED',
      verifiedAt: res.verified_at || new Date().toISOString()
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification failed.' };
  }
}

/**
 * Rejects a candidate document via transactional RPC admin_reject_document.
 * Mandatory non-empty rejection reason.
 * Sets entity_type = 'DOCUMENT' on the activity log.
 */
export async function rejectCandidateDocument(
  docId: string,
  reason: string
): Promise<{
  success: boolean;
  error?: string;
  documentId?: string;
  verificationStatus?: string;
  rejectionReason?: string;
  rejectedAt?: string;
}> {
  if (!docId) return { success: false, error: 'Document ID is required.' };
  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: 'Rejection reason is mandatory.' };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      documentId: docId,
      verificationStatus: 'REJECTED',
      rejectionReason: trimmed,
      rejectedAt: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabase.rpc('admin_reject_document', {
      p_doc_id: docId,
      p_reason: trimmed
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as {
      success?: boolean;
      error?: string;
      document_id?: string;
      verification_status?: string;
      rejection_reason?: string;
      rejected_at?: string;
    };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Rejection failed.' };
    }

    // Ensure activity log is tagged with entity_type = 'DOCUMENT' and entity_id = docId
    try {
      await supabase
        .from('activity_logs')
        .update({ entity_type: 'DOCUMENT', entity_id: docId })
        .eq('action', 'DOCUMENT_REJECTED')
        .eq('metadata->>document_id', docId);
    } catch {
      // Non-critical audit attribution
    }

    return {
      success: true,
      documentId: res.document_id || docId,
      verificationStatus: res.verification_status || 'REJECTED',
      rejectionReason: res.rejection_reason || trimmed,
      rejectedAt: res.rejected_at || new Date().toISOString()
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Rejection failed.' };
  }
}

// ==============================================================================
// CANDIDATE-SPECIFIC DOCUMENT RETRIEVAL (PRIMARY EMBEDDED WORKSPACE)
// ==============================================================================

/**
 * Fetches documents belonging exclusively to a candidate's application or standalone joining record.
 * Supports:
 *   1. Application-based candidate:
 *      Queries documents where application_id = applicationId OR joining_form_id = joiningFormId.
 *   2. Standalone Joining Form candidate:
 *      Queries documents where joining_form_id = joiningFormId.
 * Guarantees zero cross-candidate document leakage and uses database indexes.
 */
export async function getCandidateDocuments(params: {
  applicationId?: string | null;
  joiningFormId?: string | null;
}): Promise<{ success: boolean; data?: DocumentRow[]; error?: string }> {
  const { applicationId, joiningFormId } = params;

  if (!applicationId && !joiningFormId) {
    return { success: false, error: 'Either applicationId or joiningFormId must be provided.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true, data: [] };
  }

  try {
    let query = supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (applicationId && joiningFormId) {
      query = query.or(`application_id.eq.${applicationId},joining_form_id.eq.${joiningFormId}`);
    } else if (applicationId) {
      query = query.eq('application_id', applicationId);
    } else if (joiningFormId) {
      query = query.eq('joining_form_id', joiningFormId);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as DocumentRow[] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load candidate documents.' };
  }
}

// ==============================================================================
// CENTRAL DOCUMENT QUEUE QUERIES (STAGE 3 MODULE 3)
// ==============================================================================

/**
 * Fetches the global document queue across all candidate applications and joining forms.
 * Safe operational projection without exposing sensitive candidate PII (Aadhaar/PAN/Bank numbers).
 */
export async function getDocumentQueue(
  filters?: DocumentQueueFilters
): Promise<{ success: boolean; data?: DocumentQueueItem[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    let query = supabase
      .from('documents')
      .select(`
        *,
        application:applications(id, application_number, full_name, mobile, desired_company),
        joining_form:joining_forms(id, joining_reference, candidate_name, application_id, company_id, employee_code, company:companies(id, name))
      `)
      .order('uploaded_at', { ascending: false });

    // Status filter
    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status === 'PENDING_OR_UPLOADED') {
        query = query.in('verification_status', ['PENDING', 'UPLOADED']);
      } else {
        query = query.eq('verification_status', filters.status);
      }
    }

    // Document Type filter
    if (filters?.documentType && filters.documentType !== 'ALL') {
      query = query.eq('document_type', filters.documentType);
    }

    // Source filter
    if (filters?.source === 'APPLICATION') {
      query = query.not('application_id', 'is', null);
    } else if (filters?.source === 'JOINING') {
      query = query.not('joining_form_id', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    let results = (data || []) as unknown as DocumentQueueItem[];

    // Client-side search filtering across safe non-sensitive fields
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter((doc) => {
        const candidateName = (
          doc.application?.full_name ||
          doc.joining_form?.candidate_name ||
          ''
        ).toLowerCase();
        const appNum = (doc.application?.application_number || '').toLowerCase();
        const joinRef = (doc.joining_form?.joining_reference || '').toLowerCase();
        const docType = (doc.document_type || '').toLowerCase();
        const compName = (
          doc.joining_form?.company?.name ||
          doc.application?.desired_company ||
          ''
        ).toLowerCase();

        return Boolean(
          candidateName.includes(q) ||
          appNum.includes(q) ||
          joinRef.includes(q) ||
          docType.includes(q) ||
          compName.includes(q)
        );
      });
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch document queue.' };
  }
}

/**
 * Retrieves a single document by ID with joined application and joining form metadata.
 */
export async function getDocumentById(
  id: string
): Promise<{ success: boolean; data?: DocumentQueueItem; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        application:applications(id, application_number, full_name, mobile, desired_company),
        joining_form:joining_forms(id, joining_reference, candidate_name, application_id, company_id, employee_code, company:companies(id, name))
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as DocumentQueueItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch document details.' };
  }
}

/**
 * Returns count of pending documents requiring administrator verification.
 */
export async function getPendingDocumentCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  try {
    const { count, error } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .in('verification_status', ['PENDING', 'UPLOADED']);

    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}

/**
 * Fetches the complete Joining Dossier for an application including
 * child repeatable rows (education, family, emergency contacts, declarations).
 */
export async function getApplicationJoiningBundle(applicationId: string): Promise<{
  success: boolean;
  joiningForm: JoiningFormRow | null;
  education: EducationRecordRow[];
  family: FamilyDetailRow[];
  emergency: EmergencyContactRow[];
  declarations: DeclarationRow | null;
  error?: string;
}> {
  if (!applicationId) {
    return {
      success: false,
      joiningForm: null,
      education: [],
      family: [],
      emergency: [],
      declarations: null,
      error: 'Application ID is required.'
    };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      joiningForm: null,
      education: [],
      family: [],
      emergency: [],
      declarations: null
    };
  }

  try {
    const { data: form, error: formErr } = await (supabase
      .from('joining_forms')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle() as any);

    if (formErr) {
      return {
        success: false,
        joiningForm: null,
        education: [],
        family: [],
        emergency: [],
        declarations: null,
        error: formErr.message
      };
    }

    const joiningForm = (form as JoiningFormRow) || null;
    let education: EducationRecordRow[] = [];
    let family: FamilyDetailRow[] = [];
    let emergency: EmergencyContactRow[] = [];
    let declarations: DeclarationRow | null = null;

    if (joiningForm?.id) {
      const [eduRes, famRes, emRes, declRes] = await Promise.all([
        supabase.from('education_records').select('*').eq('joining_form_id', joiningForm.id).order('sort_order', { ascending: true }),
        supabase.from('family_details').select('*').eq('joining_form_id', joiningForm.id).order('sort_order', { ascending: true }),
        supabase.from('emergency_contacts').select('*').eq('joining_form_id', joiningForm.id).order('sort_order', { ascending: true }),
        supabase.from('declarations').select('*').eq('joining_form_id', joiningForm.id).maybeSingle()
      ]);

      education = (eduRes.data as EducationRecordRow[]) || [];
      family = (famRes.data as FamilyDetailRow[]) || [];
      emergency = (emRes.data as EmergencyContactRow[]) || [];
      declarations = (declRes.data as DeclarationRow) || null;
    }

    return {
      success: true,
      joiningForm,
      education,
      family,
      emergency,
      declarations
    };
  } catch (err: any) {
    return {
      success: false,
      joiningForm: null,
      education: [],
      family: [],
      emergency: [],
      declarations: null,
      error: err.message || 'Failed to fetch joining dossier bundle.'
    };
  }
}
