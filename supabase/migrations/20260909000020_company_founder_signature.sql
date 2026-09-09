-- ==============================================================================
-- Migration: 20260909000020_company_founder_signature.sql
-- Description: Centralized Founder / CEO Signature Management for Employee ID Cards
-- Security:
--   - Dedicated private bucket: company-assets (5MB limit, png/jpg/webp)
--   - Storage RLS: Active admins can SELECT (read for ID card generation);
--                  Strictly SUPER_ADMIN can INSERT, UPDATE, DELETE.
--   - Database RLS: system_settings key 'founder_ceo_signature' protected by trigger
--                   and manage_company_signature RPC strictly for SUPER_ADMIN.
--   - Historical safety: Old files preserved upon replacement, version increments.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Dedicated Private Storage Bucket: company-assets
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  false,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. Storage RLS Policies on storage.objects for company-assets
-- ------------------------------------------------------------------------------

-- SELECT: Active admins can read company assets (required to generate official documents)
DROP POLICY IF EXISTS "Active admins can view company assets" ON storage.objects;
CREATE POLICY "Active admins can view company assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_active_admin());

-- INSERT: Strictly SUPER_ADMIN can upload company assets
DROP POLICY IF EXISTS "Super admins can insert company assets" ON storage.objects;
CREATE POLICY "Super admins can insert company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.is_super_admin());

-- UPDATE: Strictly SUPER_ADMIN can update company assets
DROP POLICY IF EXISTS "Super admins can update company assets" ON storage.objects;
CREATE POLICY "Super admins can update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'company-assets' AND public.is_super_admin());

-- DELETE: Strictly SUPER_ADMIN can delete company assets
DROP POLICY IF EXISTS "Super admins can delete company assets" ON storage.objects;
CREATE POLICY "Super admins can delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 3. System Settings Configuration for founder_ceo_signature
-- ------------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value, description, category)
VALUES (
  'founder_ceo_signature',
  '{"enabled": false, "storage_path": null, "signatory_title": "Managing Director & CEO", "version": 0}'::jsonb,
  'Authoritative Founder / CEO Signature asset for official Employee Identity Cards.',
  'COMPANY_ASSETS'
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. Database Security Trigger on system_settings
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_founder_signature_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.key = 'founder_ceo_signature' OR OLD.key = 'founder_ceo_signature') THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN can modify the Founder/CEO Signature asset.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_founder_signature_permission ON public.system_settings;
CREATE TRIGGER trg_check_founder_signature_permission
  BEFORE UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_founder_signature_permission();

-- ------------------------------------------------------------------------------
-- 5. RPC: Atomic Founder / CEO Signature Management (SUPER_ADMIN Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_company_signature(
  p_action TEXT, -- 'ACTIVATE', 'DEACTIVATE', 'REMOVE'
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_old_setting JSONB;
  v_new_setting JSONB;
  v_version INT;
BEGIN
  -- 1. Strict SUPER_ADMIN check
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only SUPER_ADMIN can manage the Founder/CEO Signature asset.';
  END IF;

  v_user_id := auth.uid();

  SELECT value INTO v_old_setting FROM public.system_settings WHERE key = 'founder_ceo_signature';
  IF v_old_setting IS NULL THEN
    v_old_setting := '{"enabled": false, "storage_path": null, "version": 0}'::jsonb;
  END IF;

  v_version := COALESCE((v_old_setting->>'version')::int, 0);

  IF p_action = 'ACTIVATE' THEN
    v_new_setting := jsonb_build_object(
      'enabled', true,
      'storage_path', p_payload->>'storage_path',
      'file_name', p_payload->>'file_name',
      'mime_type', p_payload->>'mime_type',
      'file_size', (p_payload->>'file_size')::bigint,
      'signatory_title', 'Managing Director & CEO',
      'uploaded_at', now(),
      'version', v_version + 1,
      'updated_by', v_user_id
    );
  ELSIF p_action = 'DEACTIVATE' THEN
    v_new_setting := v_old_setting || jsonb_build_object(
      'enabled', false,
      'updated_at', now(),
      'updated_by', v_user_id
    );
  ELSIF p_action = 'REMOVE' THEN
    v_new_setting := jsonb_build_object(
      'enabled', false,
      'storage_path', null,
      'file_name', null,
      'signatory_title', 'Managing Director & CEO',
      'updated_at', now(),
      'version', v_version,
      'updated_by', v_user_id
    );
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  UPDATE public.system_settings
  SET value = v_new_setting,
      updated_by = v_user_id,
      updated_at = now()
  WHERE key = 'founder_ceo_signature';

  RETURN jsonb_build_object('success', true, 'setting', v_new_setting);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.manage_company_signature(TEXT, JSONB) TO authenticated;
