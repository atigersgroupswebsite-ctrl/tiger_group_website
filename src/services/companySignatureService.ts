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

export interface CompanyStampMetadata {
  enabled: boolean;
  storage_path: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  stamp_title?: string;
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

export const STAMP_CONSTRAINTS = {
  bucket: 'company-assets',
  maxSizeBytes: 5 * 1024 * 1024, // 5MB limit
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp']
};

// In-memory runtime caches for immediate, lag-free PDF rendering
let cachedCompanySignatureDataUrl: string | null = null;
let cachedCompanyStampDataUrl: string | null = null;

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
  if (cachedCompanySignatureDataUrl) {
    return cachedCompanySignatureDataUrl;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('atg_company_signature_data_url');
    if (local) {
      cachedCompanySignatureDataUrl = local;
      return local;
    }
  }

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

    const dataUrl = `data:${mimeType};base64,${base64}`;
    cachedCompanySignatureDataUrl = dataUrl;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('atg_company_signature_data_url', dataUrl);
    }
    return dataUrl;
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

// ==============================================================================
// COMPANY OFFICIAL STAMP / SEAL MANAGEMENT
// ==============================================================================

/**
 * Retrieves the current persisted Company Stamp / Seal metadata.
 */
export async function getCompanyStampSettings(): Promise<CompanyStampMetadata> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('atg_company_stamp_setting');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }

  if (!isSupabaseConfigured) {
    return { enabled: false, storage_path: null, stamp_title: 'Official Company Seal', version: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'official_company_stamp')
      .maybeSingle();

    if (error || !data || !data.value) {
      return { enabled: false, storage_path: null, stamp_title: 'Official Company Seal', version: 0 };
    }

    return data.value as unknown as CompanyStampMetadata;
  } catch (err) {
    console.error('[getCompanyStampSettings] Error:', err);
    return { enabled: false, storage_path: null, stamp_title: 'Official Company Seal', version: 0 };
  }
}

/**
 * Retrieves a temporary signed URL for the active company stamp image.
 */
export async function getActiveCompanyStampSignedUrl(
  expiresInSeconds = 3600
): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const localDataUrl = localStorage.getItem('atg_company_stamp_data_url');
    if (localDataUrl) return localDataUrl;
  }

  if (!isSupabaseConfigured) return null;

  try {
    const setting = await getCompanyStampSettings();
    if (!setting.enabled || !setting.storage_path) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from(STAMP_CONSTRAINTS.bucket)
      .createSignedUrl(setting.storage_path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('[getActiveCompanyStampSignedUrl] Warning:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[getActiveCompanyStampSignedUrl] Exception:', err);
    return null;
  }
}

/**
 * Retrieves the active company stamp as an embedded base64 Data URL.
 */
export async function getActiveCompanyStampDataUrl(): Promise<string | null> {
  if (cachedCompanyStampDataUrl) {
    return cachedCompanyStampDataUrl;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('atg_company_stamp_data_url');
    if (local) {
      cachedCompanyStampDataUrl = local;
      return local;
    }
  }

  if (!isSupabaseConfigured) return null;

  try {
    const setting = await getCompanyStampSettings();
    if (!setting.enabled || !setting.storage_path) {
      return null;
    }

    const { data: blob, error } = await supabase.storage
      .from(STAMP_CONSTRAINTS.bucket)
      .download(setting.storage_path);

    if (error || !blob) {
      console.warn('[getActiveCompanyStampDataUrl] Download warning:', error?.message);
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

    const dataUrl = `data:${mimeType};base64,${base64}`;
    cachedCompanyStampDataUrl = dataUrl;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('atg_company_stamp_data_url', dataUrl);
    }
    return dataUrl;
  } catch (err) {
    console.error('[getActiveCompanyStampDataUrl] Exception:', err);
    return null;
  }
}

/**
 * Uploads and activates an authentic Company Stamp / Seal asset.
 */
export async function uploadCompanyStamp(
  file: File
): Promise<{ success: boolean; setting?: CompanyStampMetadata; error?: string }> {
  if (!file) {
    return { success: false, error: 'No stamp file selected.' };
  }

  const mimeType = file.type.toLowerCase();
  if (!STAMP_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
    return {
      success: false,
      error: 'Invalid file format. Please upload a PNG, JPG, or WebP official company stamp.'
    };
  }

  if (file.size > STAMP_CONSTRAINTS.maxSizeBytes) {
    return {
      success: false,
      error: `File size exceeds the 5MB maximum limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
    };
  }

  try {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const storagePath = `stamps/official_stamp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

    // Read to Data URL for instant client availability
    const readerPromise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dataUrl = await readerPromise;
    cachedCompanyStampDataUrl = dataUrl;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('atg_company_stamp_data_url', dataUrl);
    }

    const newSetting: CompanyStampMetadata = {
      enabled: true,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      file_size: file.size,
      stamp_title: 'Official Company Seal',
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('atg_company_stamp_setting', JSON.stringify(newSetting));
    }

    // Try Supabase Storage upload if configured
    if (isSupabaseConfigured) {
      try {
        await supabase.storage
          .from(STAMP_CONSTRAINTS.bucket)
          .upload(storagePath, file, { contentType: mimeType, upsert: true });

        // Update system_settings
        await supabase
          .from('system_settings')
          .upsert({
            key: 'official_company_stamp',
            value: newSetting as any,
            description: 'Official corporate stamp & seal for employee reference slips and documents.',
            category: 'COMPANY_ASSETS',
            updated_at: new Date().toISOString()
          });
      } catch (sbErr) {
        console.warn('[uploadCompanyStamp] Remote storage notice:', sbErr);
      }
    }

    await logActivity({
      entityType: 'SETTINGS',
      entityId: 'official_company_stamp',
      action: 'COMPANY_STAMP_UPLOADED',
      description: 'Official Company Stamp uploaded for employee reference slips.',
      metadata: { fileName: file.name, storagePath, mimeType }
    });

    return { success: true, setting: newSetting };
  } catch (err: any) {
    console.error('[uploadCompanyStamp] Exception:', err);
    return { success: false, error: err?.message || 'Failed to upload company stamp.' };
  }
}

/**
 * Removes or deactivates the official company stamp.
 */
export async function removeCompanyStamp(): Promise<{ success: boolean; error?: string }> {
  cachedCompanyStampDataUrl = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('atg_company_stamp_data_url');
    localStorage.removeItem('atg_company_stamp_setting');
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('system_settings')
        .upsert({
          key: 'official_company_stamp',
          value: { enabled: false, storage_path: null, version: 0 } as any,
          updated_at: new Date().toISOString()
        });
    } catch (_) {}
  }

  return { success: true };
}

/**
 * Toggles the enabled state of the official company stamp.
 */
export async function toggleCompanyStampEnabled(
  enabled: boolean
): Promise<{ success: boolean; setting?: CompanyStampMetadata; error?: string }> {
  const current = await getCompanyStampSettings();
  const updated: CompanyStampMetadata = {
    ...current,
    enabled,
    updated_at: new Date().toISOString()
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('atg_company_stamp_setting', JSON.stringify(updated));
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('system_settings')
        .upsert({
          key: 'official_company_stamp',
          value: updated as any,
          updated_at: new Date().toISOString()
        });
    } catch (_) {}
  }

  return { success: true, setting: updated };
}
