-- ==============================================================================
-- Migration: 20260906000009_admin_document_verification.sql
-- Description: Stage 5 Document Verification, Document Upload Notifications,
--              and Admin Activity Logging
-- Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Notification Trigger on Document Upload / Re-upload
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_document_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  app_num TEXT;
  cand_name TEXT;
  doc_label TEXT;
BEGIN
  -- Notify if newly inserted, or if replacing a previously rejected document, or if storage path changed
  IF (TG_OP = 'INSERT') OR 
     (TG_OP = 'UPDATE' AND OLD.verification_status = 'REJECTED' AND NEW.verification_status IN ('PENDING', 'UPLOADED')) OR
     (TG_OP = 'UPDATE' AND OLD.storage_path IS DISTINCT FROM NEW.storage_path) THEN
    
    SELECT application_number, full_name INTO app_num, cand_name
    FROM public.applications
    WHERE id = NEW.application_id;

    doc_label := NEW.document_type || 
      CASE WHEN NEW.document_side IS NOT NULL AND NEW.document_side != 'SINGLE' THEN ' (' || NEW.document_side || ')' ELSE '' END;

    INSERT INTO public.notifications (
      type,
      title,
      message,
      application_id,
      read
    ) VALUES (
      'DOCUMENT_UPLOADED',
      'Document Uploaded',
      COALESCE(cand_name, 'Candidate') || ' uploaded ' || doc_label || ' for ' || COALESCE(app_num, 'application') || '.',
      NEW.application_id,
      false
    );

    -- Also record in activity logs
    INSERT INTO public.activity_logs (
      application_id,
      action,
      description,
      metadata
    ) VALUES (
      NEW.application_id,
      'DOCUMENT_UPLOADED',
      'Candidate uploaded or updated statutory document: ' || doc_label || '.',
      jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'document_side', NEW.document_side,
        'file_name', NEW.original_file_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_document_uploaded_notification ON public.documents;

CREATE TRIGGER trg_document_uploaded_notification
  AFTER INSERT OR UPDATE OF storage_path, verification_status
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_document_uploaded();

-- ------------------------------------------------------------------------------
-- 2. Admin Verification RPC: Verify Document
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_verify_document(p_doc_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  target_doc RECORD;
  target_app RECORD;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
BEGIN
  -- Verify active admin session
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
  END IF;

  SELECT role INTO caller_role
  FROM public.admin_profiles
  WHERE id = caller_id AND active = true;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
  END IF;

  -- Role check: ACCOUNTANT cannot verify documents
  IF caller_role = 'ACCOUNTANT' THEN
    RAISE EXCEPTION 'Forbidden: Role % is not authorized to verify documents.', caller_role;
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  SELECT * INTO target_app FROM public.applications WHERE id = target_doc.application_id;

  -- Update document status
  UPDATE public.documents
  SET
    verification_status = 'VERIFIED',
    verified_at = now_iso,
    verified_by = caller_id,
    rejection_reason = NULL
  WHERE id = p_doc_id;

  doc_label := target_doc.document_type || 
    CASE WHEN target_doc.document_side IS NOT NULL AND target_doc.document_side != 'SINGLE' THEN ' (' || target_doc.document_side || ')' ELSE '' END;

  -- Log action in activity_logs
  INSERT INTO public.activity_logs (
    application_id,
    admin_user_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.application_id,
    caller_id,
    'DOCUMENT_VERIFIED',
    'Administrator verified document: ' || doc_label || '.',
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'verified_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_doc_id,
    'verification_status', 'VERIFIED',
    'verified_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_verify_document(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Admin Verification RPC: Reject Document (Reason Mandatory)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_document(p_doc_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  target_doc RECORD;
  target_app RECORD;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
  trimmed_reason TEXT;
BEGIN
  -- Verify active admin session
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
  END IF;

  SELECT role INTO caller_role
  FROM public.admin_profiles
  WHERE id = caller_id AND active = true;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
  END IF;

  -- Role check: ACCOUNTANT cannot reject documents
  IF caller_role = 'ACCOUNTANT' THEN
    RAISE EXCEPTION 'Forbidden: Role % is not authorized to reject documents.', caller_role;
  END IF;

  trimmed_reason := trim(coalesce(p_reason, ''));
  IF trimmed_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is mandatory to reject candidate document.';
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  -- Update document status
  UPDATE public.documents
  SET
    verification_status = 'REJECTED',
    verified_at = NULL,
    verified_by = caller_id,
    rejection_reason = trimmed_reason
  WHERE id = p_doc_id;

  doc_label := target_doc.document_type || 
    CASE WHEN target_doc.document_side IS NOT NULL AND target_doc.document_side != 'SINGLE' THEN ' (' || target_doc.document_side || ')' ELSE '' END;

  -- Log action in activity_logs
  INSERT INTO public.activity_logs (
    application_id,
    admin_user_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.application_id,
    caller_id,
    'DOCUMENT_REJECTED',
    'Administrator rejected document ' || doc_label || '. Reason: ' || trimmed_reason,
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'rejection_reason', trimmed_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_doc_id,
    'verification_status', 'REJECTED',
    'rejection_reason', trimmed_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reject_document(UUID, TEXT) TO authenticated;
