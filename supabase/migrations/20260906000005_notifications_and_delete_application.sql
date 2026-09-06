-- ==============================================================================
-- Migration: 20260906000005_notifications_and_delete_application.sql
-- Description: Realtime Notifications, Multi-tier Application Delete with
--              SUPER_ADMIN Authorization, Storage Cleanup, and FK Cascades
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'NEW_JOB_ENQUIRY',
      'NEW_EMPLOYER_ENQUIRY',
      'PAYMENT_SUCCESS',
      'DOCUMENT_UPLOADED',
      'JOINING_FORM_SUBMITTED'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_enquiry_id UUID REFERENCES public.employer_enquiries(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_admin_user_id ON public.notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_app_id ON public.notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_emp_id ON public.notifications(employer_enquiry_id);

-- ------------------------------------------------------------------------------
-- 2. Row Level Security on Notifications
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Admins can view notifications
CREATE POLICY "Admins can view notifications"
  ON public.notifications
  FOR SELECT
  USING (public.is_active_admin());

-- Admins can mark notifications as read
CREATE POLICY "Admins can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 3. Realtime Replication for Notifications
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Automated Database Triggers for Enquiry Notifications
-- ------------------------------------------------------------------------------

-- Trigger for New Candidate Applications (NEW_JOB_ENQUIRY)
CREATE OR REPLACE FUNCTION public.handle_new_job_enquiry_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    type,
    title,
    message,
    application_id,
    read
  ) VALUES (
    'NEW_JOB_ENQUIRY',
    'New Job Enquiry',
    COALESCE(NEW.full_name, 'Candidate') || ' submitted a new job enquiry (' || COALESCE(NEW.application_number, 'Pending') || ').',
    NEW.id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_job_enquiry ON public.applications;
CREATE TRIGGER trg_notify_new_job_enquiry
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_job_enquiry_notification();

-- Trigger for New Employer Inquiries (NEW_EMPLOYER_ENQUIRY)
CREATE OR REPLACE FUNCTION public.handle_new_employer_enquiry_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    type,
    title,
    message,
    employer_enquiry_id,
    read
  ) VALUES (
    'NEW_EMPLOYER_ENQUIRY',
    'New Employer Enquiry',
    COALESCE(NEW.company_name, 'A company') || ' submitted a manpower requirement (' || NEW.employees_required || ' staff).',
    NEW.id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_employer_enquiry ON public.employer_enquiries;
CREATE TRIGGER trg_notify_new_employer_enquiry
  AFTER INSERT ON public.employer_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_employer_enquiry_notification();

-- ------------------------------------------------------------------------------
-- 5. Helper Function: is_super_admin()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND active = true AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. Secure Server-Side DELETE Authorization on Applications Table
-- ------------------------------------------------------------------------------
-- Drop broad admin full access policy to separate SELECT/UPDATE from DELETE
DROP POLICY IF EXISTS "Admins have full access to applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can select applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.applications;
DROP POLICY IF EXISTS "Super Admins can delete applications" ON public.applications;

CREATE POLICY "Admins can select applications"
  ON public.applications FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Admins can update applications"
  ON public.applications FOR UPDATE
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ONLY SUPER_ADMIN can delete from applications table directly
CREATE POLICY "Super Admins can delete applications"
  ON public.applications FOR DELETE
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 7. Cascade Activity Logs on Application Delete
-- ------------------------------------------------------------------------------
ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_application_id_fkey,
  ADD CONSTRAINT activity_logs_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- 8. Atomic Application Deletion RPC Function with Storage Cleanup
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_application_permanently(target_app_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_is_super BOOLEAN;
  app_record RECORD;
  files_deleted INTEGER := 0;
  paths_to_delete TEXT[] := ARRAY[]::TEXT[];
  doc_rec RECORD;
  gen_rec RECORD;
  jf_rec RECORD;
  ref_rec RECORD;
BEGIN
  -- 1. Authorization verification
  caller_is_super := public.is_super_admin();
  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN users can permanently delete applications.';
  END IF;

  -- 2. Verify target record existence
  SELECT * INTO app_record FROM public.applications WHERE id = target_app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application record not found for ID %', target_app_id;
  END IF;

  -- 3. Gather storage paths for private document cleanup
  -- Document records
  FOR doc_rec IN SELECT storage_path FROM public.documents WHERE application_id = target_app_id AND storage_path IS NOT NULL LOOP
    paths_to_delete := array_append(paths_to_delete, doc_rec.storage_path);
  END LOOP;

  -- Generated PDFs / Files
  FOR gen_rec IN SELECT storage_path FROM public.generated_files WHERE application_id = target_app_id AND storage_path IS NOT NULL LOOP
    paths_to_delete := array_append(paths_to_delete, gen_rec.storage_path);
  END LOOP;

  -- Joining Form Photos & Signatures
  FOR jf_rec IN SELECT photo_path, candidate_signature_path FROM public.joining_forms WHERE application_id = target_app_id LOOP
    IF jf_rec.photo_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, jf_rec.photo_path);
    END IF;
    IF jf_rec.candidate_signature_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, jf_rec.candidate_signature_path);
    END IF;
  END LOOP;

  -- Reference Slips Signatures & Seals
  FOR ref_rec IN SELECT candidate_signature_path, authorized_signature_path, company_signature_path, company_seal_path FROM public.reference_slips WHERE application_id = target_app_id LOOP
    IF ref_rec.candidate_signature_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, ref_rec.candidate_signature_path);
    END IF;
    IF ref_rec.authorized_signature_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, ref_rec.authorized_signature_path);
    END IF;
    IF ref_rec.company_signature_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, ref_rec.company_signature_path);
    END IF;
    IF ref_rec.company_seal_path IS NOT NULL THEN
      paths_to_delete := array_append(paths_to_delete, ref_rec.company_seal_path);
    END IF;
  END LOOP;

  -- 4. Delete activity logs and notifications associated with application
  DELETE FROM public.activity_logs WHERE application_id = target_app_id;
  DELETE FROM public.notifications WHERE application_id = target_app_id;

  -- 5. Permanently delete application record (cascades joining_forms, documents, payments, etc.)
  DELETE FROM public.applications WHERE id = target_app_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', target_app_id,
    'application_number', app_record.application_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
