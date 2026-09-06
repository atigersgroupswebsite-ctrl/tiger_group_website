// ==============================================================================
// File: src/services/adminDocumentService.ts
// Description: Admin Document Verification & Joining Form Review Service Layer
// Brand: A TIGER GROUPS — Operational Administrative Review
// Security:
//   - Strict Admin Authorization (SUPER_ADMIN, DOCUMENT_VERIFIER, COORDINATOR)
//   - Private Signed URLs only (1h temporary expiry)
//   - All operations audited in activity_logs
//   - PII values never logged
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  DocumentRow,
  JoiningFormRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  DeclarationRow
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
  { type: 'EDUCATION_CERTIFICATE', side: null, label: 'Highest Education Certificate', required: true }
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

/**
 * Computes database-driven verification metrics for an application's documents.
 */
export function calculateDocumentVerificationStats(
  documents: DocumentRow[],
  requiredSpecs: RequiredDocumentSpec[] = CONFIGURED_REQUIRED_DOCUMENTS
): DocumentVerificationStats {
  const totalRequired = requiredSpecs.length;

  let verifiedCount = 0;
  let rejectedCount = 0;
  let uploadedCount = 0;

  for (const spec of requiredSpecs) {
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
 */
export async function verifyCandidateDocument(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  if (!docId) return { success: false, error: 'Document ID is required.' };

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('admin_verify_document', {
      p_doc_id: docId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; error?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Verification failed.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification failed.' };
  }
}

/**
 * Rejects a candidate document via transactional RPC admin_reject_document.
 * Mandatory non-empty rejection reason.
 */
export async function rejectCandidateDocument(
  docId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!docId) return { success: false, error: 'Document ID is required.' };
  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: 'Rejection reason is mandatory.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('admin_reject_document', {
      p_doc_id: docId,
      p_reason: trimmed
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; error?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Rejection failed.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Rejection failed.' };
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
