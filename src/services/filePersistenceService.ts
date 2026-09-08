// ==============================================================================
// File: src/services/filePersistenceService.ts
// Description: Persistent Document Storage & Generated Files Ledger
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Uploads to private 'generated-documents' Supabase bucket
//   - Records metadata in public.generated_files ledger
//   - Strict authenticated access via pre-signed temporary URLs (no public exposure)
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { GeneratedFileType, GeneratedFileRow } from '../types/database';
import { logActivity } from './activityService';

export interface PersistGeneratedDocumentInput {
  applicationId?: string | null;
  joiningFormId?: string | null;
  fileType: GeneratedFileType;
  fileName: string;
  blob: Blob;
  version?: number;
  generatedBy?: string | null;
}

export interface PersistGeneratedDocumentResult {
  success: boolean;
  fileId?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Uploads a generated document (e.g. 14-page Joining Packet, Payment Receipt) to the
 * private 'generated-documents' storage bucket and records its audit metadata in public.generated_files.
 */
export async function persistGeneratedDocument(
  input: PersistGeneratedDocumentInput
): Promise<PersistGeneratedDocumentResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  if (!input.applicationId && !input.joiningFormId) {
    return { success: false, error: 'Either applicationId or joiningFormId is required.' };
  }

  const version = input.version || 1;
  const entityFolder = input.joiningFormId
    ? `joining/${input.joiningFormId}`
    : `applications/${input.applicationId}`;

  // Unique sanitized storage path inside private bucket
  const timestamp = Date.now();
  const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${entityFolder}/${input.fileType.toLowerCase()}_v${version}_${timestamp}_${sanitizedName}`;

  try {
    // 1. Upload binary file to private generated-documents bucket
    const { error: uploadErr } = await supabase.storage
      .from('generated-documents')
      .upload(storagePath, input.blob, {
        contentType: input.blob.type || 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.error('[persistGeneratedDocument] Upload error:', uploadErr.message);
      return { success: false, error: uploadErr.message };
    }

    // 2. Insert metadata into public.generated_files
    const { data: rowData, error: dbErr } = await supabase
      .from('generated_files')
      .insert({
        application_id: input.applicationId || null,
        joining_form_id: input.joiningFormId || null,
        file_type: input.fileType,
        storage_path: storagePath,
        file_name: input.fileName,
        file_size: input.blob.size,
        mime_type: input.blob.type || 'application/pdf',
        version,
        generated_by: input.generatedBy || null
      })
      .select('id')
      .single();

    if (dbErr) {
      console.error('[persistGeneratedDocument] DB ledger error:', dbErr.message);
      return { success: false, error: dbErr.message };
    }

    return {
      success: true,
      fileId: rowData.id,
      storagePath
    };
  } catch (err: any) {
    console.error('[persistGeneratedDocument] Unexpected error:', err);
    return { success: false, error: err?.message || 'Failed to persist generated document.' };
  }
}

/**
 * Creates an authenticated signed URL for securely downloading/viewing a private generated document.
 */
export async function getGeneratedDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: 'Database is not configured.' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('generated-documents')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err: any) {
    return { error: err?.message || 'Failed to generate signed document URL.' };
  }
}

/**
 * Lists all generated document records for an application or joining form.
 */
export async function getGeneratedDocumentsForEntity(params: {
  applicationId?: string;
  joiningFormId?: string;
}): Promise<GeneratedFileRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    let query = supabase.from('generated_files').select('*');

    if (params.joiningFormId) {
      query = query.eq('joining_form_id', params.joiningFormId);
    } else if (params.applicationId) {
      query = query.eq('application_id', params.applicationId);
    } else {
      return [];
    }

    const { data, error } = await query.order('generated_at', { ascending: false });

    if (error) {
      console.error('[getGeneratedDocumentsForEntity] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getGeneratedDocumentsForEntity] Exception:', err);
    return [];
  }
}

export interface GeneratedFilesFilters {
  search?: string;
  fileType?: string;
  sourceType?: 'ALL' | 'APPLICATION' | 'JOINING_FORM';
  startDate?: string;
  endDate?: string;
}

export interface GeneratedFileListItem {
  id: string;
  fileType: GeneratedFileType;
  storagePath: string;
  fileName: string;
  version: number;
  fileSize: number | null;
  mimeType: string | null;
  generatedAt: string;
  generatedBy: string | null;
  applicationId: string | null;
  joiningFormId: string | null;
  sourceType: 'APPLICATION' | 'JOINING_FORM';
  sourceReference: string;
  candidateName: string;
  candidateMobile: string | null;
}

export interface GeneratedFilesKPIs {
  totalFiles: number;
  joiningPacketsCount: number;
  referenceSlipsCount: number;
  idCardsCount: number;
  receiptsCount: number;
  exportsCount: number;
}

export interface GeneratedFileDetail {
  file: GeneratedFileRow;
  candidate: {
    sourceType: 'APPLICATION' | 'JOINING_FORM';
    sourceId: string;
    sourceReference: string;
    candidateName: string;
    mobile: string | null;
    email: string | null;
  } | null;
  allVersions: GeneratedFileRow[];
  signedUrl?: string | null;
}

/**
 * Fetches the central administrative directory of generated files with search, filtering, and KPIs.
 */
export async function getGeneratedFiles(
  filters: GeneratedFilesFilters = {}
): Promise<{ data: GeneratedFileListItem[]; kpis: GeneratedFilesKPIs }> {
  const emptyKpis: GeneratedFilesKPIs = {
    totalFiles: 0,
    joiningPacketsCount: 0,
    referenceSlipsCount: 0,
    idCardsCount: 0,
    receiptsCount: 0,
    exportsCount: 0
  };

  if (!isSupabaseConfigured) {
    return { data: [], kpis: emptyKpis };
  }

  try {
    let query = supabase
      .from('generated_files')
      .select(`
        *,
        applications (
          id,
          application_number,
          full_name,
          mobile
        ),
        joining_forms (
          id,
          joining_reference,
          candidate_name,
          employee_contact_number
        )
      `)
      .order('generated_at', { ascending: false });

    if (filters.fileType && filters.fileType !== 'ALL') {
      query = query.eq('file_type', filters.fileType as GeneratedFileType);
    }

    if (filters.sourceType === 'APPLICATION') {
      query = query.not('application_id', 'is', null);
    } else if (filters.sourceType === 'JOINING_FORM') {
      query = query.not('joining_form_id', 'is', null);
    }

    if (filters.startDate) {
      query = query.gte('generated_at', `${filters.startDate}T00:00:00.000Z`);
    }
    if (filters.endDate) {
      query = query.lte('generated_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error('[getGeneratedFiles] DB error:', error.message);
      return { data: [], kpis: emptyKpis };
    }

    // Map rows into standardized safe operational list items
    const items: GeneratedFileListItem[] = (rows || []).map((row: any) => {
      const isApp = Boolean(row.application_id);
      const app = row.applications;
      const jf = row.joining_forms;

      const sourceReference = isApp
        ? (app?.application_number || `INQ-${new Date(row.generated_at).getFullYear()}-000000`)
        : (jf?.joining_reference || `JOIN-${new Date(row.generated_at).getFullYear()}-000000`);

      const candidateName = isApp
        ? (app?.full_name || 'Application Candidate')
        : (jf?.candidate_name || 'Joining Candidate');

      const candidateMobile = isApp
        ? (app?.mobile || null)
        : (jf?.employee_contact_number || null);

      return {
        id: row.id,
        fileType: row.file_type as GeneratedFileType,
        storagePath: row.storage_path,
        fileName: row.file_name,
        version: row.version,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        generatedAt: row.generated_at,
        generatedBy: row.generated_by,
        applicationId: row.application_id,
        joiningFormId: row.joining_form_id,
        sourceType: isApp ? 'APPLICATION' : 'JOINING_FORM',
        sourceReference,
        candidateName,
        candidateMobile
      };
    });

    // Compute KPIs
    const kpis: GeneratedFilesKPIs = {
      totalFiles: items.length,
      joiningPacketsCount: items.filter((f) => f.fileType === 'JOINING_PACKET_PDF').length,
      referenceSlipsCount: items.filter((f) => f.fileType === 'REFERENCE_SLIP_PDF').length,
      idCardsCount: items.filter((f) => f.fileType === 'ID_CARD_PDF').length,
      receiptsCount: items.filter((f) => f.fileType === 'RECEIPT_PDF').length,
      exportsCount: items.filter((f) => f.fileType === 'EXCEL_EXPORT').length
    };

    // Client-side text search (safe fields only)
    const q = (filters.search || '').trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => {
          return (
            item.fileName.toLowerCase().includes(q) ||
            item.fileType.toLowerCase().includes(q) ||
            item.sourceReference.toLowerCase().includes(q) ||
            item.candidateName.toLowerCase().includes(q) ||
            (item.candidateMobile && item.candidateMobile.includes(q))
          );
        })
      : items;

    return { data: filtered, kpis };
  } catch (err) {
    console.error('[getGeneratedFiles] Unexpected error:', err);
    return { data: [], kpis: emptyKpis };
  }
}

/**
 * Retrieves a single generated file record by ID with candidate associations and version history.
 */
export async function getGeneratedFileDetail(
  id: string
): Promise<{ success: boolean; data?: GeneratedFileDetail; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data: row, error } = await supabase
      .from('generated_files')
      .select(`
        *,
        applications (
          id,
          application_number,
          full_name,
          mobile,
          email
        ),
        joining_forms (
          id,
          joining_reference,
          candidate_name,
          employee_contact_number,
          email
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !row) {
      return { success: false, error: error?.message || 'Generated file record not found.' };
    }

    const isApp = Boolean(row.application_id);
    const app = (row as any).applications;
    const jf = (row as any).joining_forms;

    const candidate = (isApp && app) || (!isApp && jf)
      ? {
          sourceType: isApp ? ('APPLICATION' as const) : ('JOINING_FORM' as const),
          sourceId: isApp ? app.id : jf.id,
          sourceReference: isApp ? app.application_number : (jf.joining_reference || 'JOIN-CANDIDATE'),
          candidateName: isApp ? app.full_name : jf.candidate_name,
          mobile: isApp ? app.mobile : jf.employee_contact_number,
          email: isApp ? app.email : jf.email
        }
      : null;

    // Fetch version history (all files with the same file_type for this candidate)
    let versionQuery = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', row.file_type);

    if (row.joining_form_id) {
      versionQuery = versionQuery.eq('joining_form_id', row.joining_form_id);
    } else if (row.application_id) {
      versionQuery = versionQuery.eq('application_id', row.application_id);
    }

    const { data: versions } = await versionQuery.order('version', { ascending: false });

    // Generate authenticated signed URL (3600 seconds)
    const { url: signedUrl } = await getGeneratedDocumentSignedUrl(row.storage_path, 3600);

    return {
      success: true,
      data: {
        file: row as GeneratedFileRow,
        candidate,
        allVersions: (versions as GeneratedFileRow[]) || [row as GeneratedFileRow],
        signedUrl: signedUrl || null
      }
    };
  } catch (err: any) {
    console.error('[getGeneratedFileDetail] Error:', err);
    return { success: false, error: err?.message || 'Failed to retrieve generated file detail.' };
  }
}

/**
 * Permanently deletes a generated document from private storage and the ledger.
 * STRICTLY restricted to SUPER_ADMIN by both RLS and front-end authorization.
 */
export async function deleteGeneratedFile(params: {
  id: string;
  storagePath: string;
  fileName: string;
  adminUserId?: string | null;
  applicationId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    // 1. Remove storage object from private generated-documents bucket
    if (params.storagePath) {
      const { error: storageErr } = await supabase.storage
        .from('generated-documents')
        .remove([params.storagePath]);

      if (storageErr) {
        console.warn('[deleteGeneratedFile] Storage remove warning:', storageErr.message);
      }
    }

    // 2. Delete row from public.generated_files
    const { error: dbErr } = await supabase
      .from('generated_files')
      .delete()
      .eq('id', params.id);

    if (dbErr) {
      return { success: false, error: dbErr.message };
    }

    // 3. Log audited activity
    await logActivity({
      applicationId: params.applicationId || undefined,
      entityType: 'GENERATED_FILE',
      entityId: params.id,
      action: 'GENERATED_FILE_DELETED',
      description: `Generated file "${params.fileName}" deleted by Super Admin.`,
      metadata: {
        fileId: params.id,
        fileName: params.fileName,
        storagePath: params.storagePath
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[deleteGeneratedFile] Error:', err);
    return { success: false, error: err?.message || 'Failed to delete generated file.' };
  }
}
