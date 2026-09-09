// ==============================================================================
// File: src/services/companySignatureService.ts
// Description: Centralized Management of Founder / CEO Company Signature Asset
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Dedicated private bucket: 'company-assets'
//   - Storage RLS: Active admins can view; Strictly SUPER_ADMIN can upload/replace/delete
//   - Database RLS: system_settings key 'founder_ceo_signature' protected by trigger & RPC
//   - Historical safety: Uploading a new signature increments version and preserves past PDFs
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { logActivity } from './activityService';

export interface CompanySignatureMetadata {
  enabled: boolean;
  storage_path: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  signatory_title?: string;
  uploaded_at?: string | null;
  updated_at?: string | null;
  version?: number;
}

export const SIGNATURE_CONSTRAINTS = {
  bucket: 'company-assets',
  maxSizeBytes: 5 * 1024 * 1024, // 5MB limit
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp']
};

/**
 * Retrieves the current persisted Founder / CEO signature settings metadata.
 */
export async function getCompanySignatureSettings(): Promise<CompanySignatureMetadata> {
  if (!isSupabaseConfigured) {
    return { enabled: false, storage_path: null, signatory_title: 'Managing Director & CEO', version: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'founder_ceo_signature')
      .maybeSingle();

    if (error || !data || !data.value) {
      return { enabled: false, storage_path: null, signatory_title: 'Managing Director & CEO', version: 0 };
    }

    return data.value as unknown as CompanySignatureMetadata;
  } catch (err) {
    console.error('[getCompanySignatureSettings] Error:', err);
    return { enabled: false, storage_path: null, signatory_title: 'Managing Director & CEO', version: 0 };
  }
}

/**
 * Retrieves a temporary signed URL for the active founder/CEO signature image.
 */
export async function getActiveCompanySignatureSignedUrl(
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const setting = await getCompanySignatureSettings();
    if (!setting.enabled || !setting.storage_path) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from(SIGNATURE_CONSTRAINTS.bucket)
      .createSignedUrl(setting.storage_path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('[getActiveCompanySignatureSignedUrl] Warning:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[getActiveCompanySignatureSignedUrl] Exception:', err);
    return null;
  }
}

/**
 * Retrieves the active founder/CEO signature as an embedded base64 Data URL
 * for high-fidelity vector insertion into jsPDF without browser cross-origin hurdles.
 */
export async function getActiveCompanySignatureDataUrl(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const setting = await getCompanySignatureSettings();
    if (!setting.enabled || !setting.storage_path) {
      return null;
    }

    const { data: blob, error } = await supabase.storage
      .from(SIGNATURE_CONSTRAINTS.bucket)
      .download(setting.storage_path);

    if (error || !blob) {
      console.warn('[getActiveCompanySignatureDataUrl] Download warning:', error?.message);
      return null;
    }

    const mimeType = setting.mime_type || blob.type || 'image/png';
    const arrayBuffer = await blob.arrayBuffer();

    let base64 = '';
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }

    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.error('[getActiveCompanySignatureDataUrl] Exception:', err);
    return null;
  }
}

/**
 * Uploads and activates a new Founder / CEO Signature.
 * Strictly restricted server-side to SUPER_ADMIN.
 */
export async function uploadCompanySignature(
  file: File
): Promise<{ success: boolean; setting?: CompanySignatureMetadata; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  // 1. File Validation
  if (!file) {
    return { success: false, error: 'No signature file selected.' };
  }

  const mimeType = file.type.toLowerCase();
  if (!SIGNATURE_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
    return {
      success: false,
      error: 'Invalid file format. Only PNG (preferred for transparency), JPG, and WebP signatures are supported.'
    };
  }

  if (file.size > SIGNATURE_CONSTRAINTS.maxSizeBytes) {
    return {
      success: false,
      error: `File size exceeds the 5MB maximum limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
    };
  }

  try {
    // 2. Determine file extension and unique storage path
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const storagePath = `signatures/founder_ceo_sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

    // 3. Upload to private 'company-assets' bucket
    const { error: uploadErr } = await supabase.storage
      .from(SIGNATURE_CONSTRAINTS.bucket)
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadErr) {
      console.error('[uploadCompanySignature] Storage error:', uploadErr.message);
      return { success: false, error: `Upload failed: ${uploadErr.message}` };
    }

    // 4. Update system_settings via atomic security-gated RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('manage_company_signature', {
      p_action: 'ACTIVATE',
      p_payload: {
        storage_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
        file_size: file.size
      }
    });

    const resData = rpcRes as any;
    if (rpcErr || !resData?.success) {
      console.error('[uploadCompanySignature] RPC error:', rpcErr?.message);
      return {
        success: false,
        error: rpcErr?.message || 'Failed to activate company signature setting.'
      };
    }

    const newSetting = resData.setting as CompanySignatureMetadata;
    const isReplacement = (newSetting?.version || 1) > 1;

    // 5. Activity Log
    await logActivity({
      entityType: 'SETTINGS',
      entityId: 'founder_ceo_signature',
      action: isReplacement ? 'COMPANY_SIGNATURE_REPLACED' : 'COMPANY_SIGNATURE_UPLOADED',
      description: `Founder/CEO Signature ${isReplacement ? 'replaced' : 'uploaded'} (Version ${newSetting.version || 1}).`,
      metadata: {
        fileName: file.name,
        storagePath,
        version: newSetting.version,
        fileSize: file.size,
        mimeType
      }
    });

    return { success: true, setting: newSetting };
  } catch (err: any) {
    console.error('[uploadCompanySignature] Exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred during signature upload.' };
  }
}

/**
 * Removes or deactivates the currently active Founder / CEO signature asset.
 * Strictly restricted server-side to SUPER_ADMIN.
 */
export async function removeCompanySignature(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('manage_company_signature', {
      p_action: 'REMOVE',
      p_payload: {}
    });

    const resData = rpcRes as any;
    if (rpcErr || !resData?.success) {
      console.error('[removeCompanySignature] RPC error:', rpcErr?.message);
      return { success: false, error: rpcErr?.message || 'Failed to remove company signature.' };
    }

    await logActivity({
      entityType: 'SETTINGS',
      entityId: 'founder_ceo_signature',
      action: 'COMPANY_SIGNATURE_REMOVED',
      description: 'Founder/CEO Signature removed from active company identity assets.',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[removeCompanySignature] Exception:', err);
    return { success: false, error: err?.message || 'Failed to remove signature.' };
  }
}

/**
 * Toggles the enabled status of the existing signature without deleting the stored asset.
 */
export async function toggleCompanySignatureEnabled(
  enabled: boolean
): Promise<{ success: boolean; setting?: CompanySignatureMetadata; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const current = await getCompanySignatureSettings();
    if (!current.storage_path) {
      return { success: false, error: 'No company signature asset has been uploaded yet.' };
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('manage_company_signature', {
      p_action: enabled ? 'ACTIVATE' : 'DEACTIVATE',
      p_payload: {
        storage_path: current.storage_path,
        file_name: current.file_name,
        mime_type: current.mime_type,
        file_size: current.file_size
      }
    });

    const resData = rpcRes as any;
    if (rpcErr || !resData?.success) {
      return { success: false, error: rpcErr?.message || 'Failed to toggle signature status.' };
    }

    await logActivity({
      entityType: 'SETTINGS',
      entityId: 'founder_ceo_signature',
      action: enabled ? 'COMPANY_SIGNATURE_ACTIVATED' : 'COMPANY_SIGNATURE_DEACTIVATED',
      description: `Founder/CEO Signature ${enabled ? 'enabled' : 'disabled'} for ID Card generation.`,
      metadata: { enabled }
    });

    return { success: true, setting: resData.setting };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle signature status.' };
  }
}
