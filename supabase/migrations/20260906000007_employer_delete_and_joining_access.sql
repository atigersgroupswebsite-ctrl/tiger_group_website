-- ==============================================================================
-- Migration: 20260906000007_employer_delete_and_joining_access.sql
-- Description: 1. Restrict employer_enquiries deletion to SUPER_ADMIN only.
--              2. Add atomic RPC function delete_employer_enquiry_permanently.
--              3. Add privacy-preserving check_joining_access_status for candidate entry.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Restrict Employer Enquiries RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins have full access to employer enquiries" ON public.employer_enquiries;

-- Active admins (SUPER_ADMIN and COORDINATOR) can view
CREATE POLICY "Admins can view employer enquiries"
  ON public.employer_enquiries
  FOR SELECT
  USING (public.is_active_admin());

-- Active admins can update status
CREATE POLICY "Admins can update employer enquiries"
  ON public.employer_enquiries
  FOR UPDATE
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ONLY SUPER_ADMIN can delete employer enquiries
CREATE POLICY "Super Admins can delete employer enquiries"
  ON public.employer_enquiries
  FOR DELETE
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 2. Atomic Employer Enquiry Permanent Deletion RPC Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_employer_enquiry_permanently(target_enquiry_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_is_super BOOLEAN;
  enq_record RECORD;
BEGIN
  -- 1. Authorization verification
  caller_is_super := public.is_super_admin();
  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN users can permanently delete employer enquiries.';
  END IF;

  -- 2. Verify target record existence
  SELECT * INTO enq_record FROM public.employer_enquiries WHERE id = target_enquiry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer enquiry record not found for ID %', target_enquiry_id;
  END IF;

  -- 3. Cleanup related notifications
  DELETE FROM public.notifications WHERE employer_enquiry_id = target_enquiry_id;

  -- 4. Delete the employer enquiry record
  DELETE FROM public.employer_enquiries WHERE id = target_enquiry_id;

  -- 5. Audit log in activity_logs
  INSERT INTO public.activity_logs (
    admin_user_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'PERMANENT_DELETE_EMPLOYER_ENQUIRY',
    format('Employer enquiry %s (%s) was permanently deleted by Super Admin.', coalesce(enq_record.enquiry_number, enq_record.id::text), enq_record.company_name),
    jsonb_build_object(
      'enquiry_id', target_enquiry_id,
      'enquiry_number', enq_record.enquiry_number,
      'company_name', enq_record.company_name,
      'deleted_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_enquiry_id', target_enquiry_id,
    'enquiry_number', enq_record.enquiry_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_employer_enquiry_permanently(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Candidate Joining Access Pre-Check RPC Function (Privacy Preserving)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_joining_access_status(candidate_email TEXT)
RETURNS JSONB AS $$
DECLARE
  clean_email TEXT;
  matched_app RECORD;
BEGIN
  clean_email := lower(trim(coalesce(candidate_email, '')));
  IF clean_email = '' THEN
    RETURN jsonb_build_object('status', 'INVALID_INPUT');
  END IF;

  -- Lookup latest application for this email
  SELECT id, joining_access_enabled
  INTO matched_app
  FROM public.applications
  WHERE lower(trim(email)) = clean_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND');
  END IF;

  IF matched_app.joining_access_enabled = true THEN
    RETURN jsonb_build_object('status', 'ACCESS_ENABLED');
  ELSE
    RETURN jsonb_build_object('status', 'ACCESS_NOT_ENABLED');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_joining_access_status(TEXT) TO anon, authenticated;
