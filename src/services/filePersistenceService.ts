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
