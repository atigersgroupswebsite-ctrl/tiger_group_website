-- ==============================================================================
-- Migration: 20260913000024_admin_joining_form_deletion.sql
-- Description: Admin-Only Permanent Deletion for Candidate Joining Forms
-- Features:
--   1. Strict active-admin verification (is_active_admin() OR is_super_admin())
--   2. Atomic deletion of joining_forms and genuine child/dependent rows
--   3. Explicit employee unlinking to ensure public.employees records are NEVER deleted
--   4. Decoupling of application-level records so parent applications are preserved
--   5. Gathers exclusive storage paths for cleanup
--   6. Auditable activity log entry
-- ==============================================================================

-- Ensure employee records can exist independently when unlinked from deleted joining forms
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS chk_employee_source;

-- Compatibility alias for is_admin -> is_active_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.is_active_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.delete_joining_form_permanently(target_form_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_is_admin BOOLEAN;
  caller_is_super BOOLEAN;
  jf_record RECORD;
  paths_to_delete TEXT[] := ARRAY[]::TEXT[];
  doc_rec RECORD;
  gen_rec RECORD;
BEGIN
  -- 1. Authorization: Only active administrators, super admins, or service_role
  caller_is_admin := public.is_active_admin();
  caller_is_super := public.is_super_admin();
  IF NOT (caller_is_admin OR caller_is_super OR (auth.jwt() ->> 'role' = 'service_role')) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrators can permanently delete joining forms.';
  END IF;

  -- 2. Verify target record existence
  SELECT * INTO jf_record FROM public.joining_forms WHERE id = target_form_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joining form not found for ID %', target_form_id;
  END IF;

  -- 3. Gather storage paths for private document cleanup (exclusive to candidate joining form)
  -- Form Photo
  IF jf_record.photo_path IS NOT NULL AND jf_record.photo_path <> '' THEN
    paths_to_delete := array_append(paths_to_delete, jf_record.photo_path);
  END IF;

  -- Form Signature
  IF jf_record.candidate_signature_path IS NOT NULL AND jf_record.candidate_signature_path <> '' THEN
    paths_to_delete := array_append(paths_to_delete, jf_record.candidate_signature_path);
  END IF;

  -- Standalone documents belonging specifically to this joining form
  -- (If application_id is present, document belongs to parent application and must be retained)
  FOR doc_rec IN
    SELECT storage_path FROM public.documents
    WHERE joining_form_id = target_form_id
      AND application_id IS NULL
      AND storage_path IS NOT NULL
      AND storage_path <> ''
  LOOP
    paths_to_delete := array_append(paths_to_delete, doc_rec.storage_path);
  END LOOP;

  -- Standalone generated files
  FOR gen_rec IN
    SELECT storage_path FROM public.generated_files
    WHERE joining_form_id = target_form_id
      AND application_id IS NULL
      AND storage_path IS NOT NULL
      AND storage_path <> ''
  LOOP
    paths_to_delete := array_append(paths_to_delete, gen_rec.storage_path);
  END LOOP;

  -- 4. CRITICAL: Unlink shared/non-dependent records to protect business data
  -- Unlink employees directory record (employees has ON DELETE CASCADE on joining_form_id)
  -- This ensures employee records in public.employees are NEVER deleted!
  UPDATE public.employees
  SET joining_form_id = NULL,
      joining_reference = NULL
  WHERE joining_form_id = target_form_id;

  -- Unlink application-level reference slips so they remain intact with parent application
  UPDATE public.reference_slips
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  -- Unlink application-level consultancy returns
  UPDATE public.consultancy_returns
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  -- Unlink application-level documents, payments, generated files, activity logs, notifications
  UPDATE public.documents
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  UPDATE public.payments
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  UPDATE public.generated_files
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  UPDATE public.activity_logs
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  UPDATE public.notifications
  SET joining_form_id = NULL
  WHERE joining_form_id = target_form_id
    AND application_id IS NOT NULL;

  -- 5. Delete dependent child records exclusive to this joining form
  DELETE FROM public.emergency_contacts WHERE joining_form_id = target_form_id;
  DELETE FROM public.education_records WHERE joining_form_id = target_form_id;
  DELETE FROM public.family_details WHERE joining_form_id = target_form_id;
  DELETE FROM public.declarations WHERE joining_form_id = target_form_id;

  -- Standalone reference slips & consultancy returns (where application_id IS NULL)
  DELETE FROM public.reference_slips WHERE joining_form_id = target_form_id;
  DELETE FROM public.consultancy_returns WHERE joining_form_id = target_form_id;

  -- Standalone documents, payments, generated files
  DELETE FROM public.documents WHERE joining_form_id = target_form_id;
  DELETE FROM public.payments WHERE joining_form_id = target_form_id;
  DELETE FROM public.generated_files WHERE joining_form_id = target_form_id;

  -- Standalone activity logs & notifications
  DELETE FROM public.activity_logs WHERE joining_form_id = target_form_id;
  DELETE FROM public.notifications WHERE joining_form_id = target_form_id;

  -- 6. Permanently delete the joining form record
  DELETE FROM public.joining_forms WHERE id = target_form_id;

  -- 7. Audit log of deletion event
  INSERT INTO public.activity_logs (
    admin_user_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'JOINING_FORM',
    target_form_id::TEXT,
    'JOINING_FORM_DELETED',
    format('Joining form %s (Candidate: %s) was permanently deleted by Administrator.',
           COALESCE(jf_record.joining_reference, target_form_id::TEXT),
           COALESCE(jf_record.candidate_name, 'Unknown')),
    jsonb_build_object(
      'joining_form_id', target_form_id,
      'joining_reference', jf_record.joining_reference,
      'candidate_name', jf_record.candidate_name,
      'submission_status', jf_record.submission_status,
      'deleted_by', auth.uid(),
      'deleted_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'joining_form_id', target_form_id,
    'joining_reference', jf_record.joining_reference,
    'candidate_name', jf_record.candidate_name,
    'storage_paths', paths_to_delete
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_joining_form_permanently(UUID) TO authenticated;
