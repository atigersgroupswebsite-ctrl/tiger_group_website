-- ==============================================================================
-- Migration: 20260908000016_jobs_and_companies_deletion.sql
-- Description: Production-Safe Deletion System for JOBS and COMPANIES
-- Model:
--   - STRICT ROLE AUTHORIZATION: Only public.is_super_admin() can delete.
--   - JOB DELETION: Decouples applications (sets applications.job_id = NULL)
--     to strictly preserve applications, candidate files, joining forms,
--     payments, and audit logs.
--   - COMPANY DELETION: Strictly verifies zero active dependent records
--     (jobs, employees, joining forms, reference slips). Blocks deletion with
--     descriptive error if dependencies exist to prevent destroying business history.
--   - AUDIT TRAIL: Inserts structured activity logs (JOB_DELETED, COMPANY_DELETED)
--     with entity_type = 'JOB' and 'COMPANY'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Re-affirm RLS Policies on jobs and companies
-- ------------------------------------------------------------------------------
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can delete jobs" ON public.jobs;
CREATE POLICY "Super Admins can delete jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can delete companies" ON public.companies;
CREATE POLICY "Super Admins can delete companies"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 2. Atomic Job Permanent Deletion RPC Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_job_permanently(target_job_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_is_super BOOLEAN;
  job_record RECORD;
  affected_apps INTEGER := 0;
BEGIN
  -- 1. Verify authorization: SUPER_ADMIN only
  caller_is_super := public.is_super_admin();
  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN users can permanently delete job postings.';
  END IF;

  -- 2. Verify target job existence
  SELECT * INTO job_record FROM public.jobs WHERE id = target_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job record not found for ID %', target_job_id;
  END IF;

  -- 3. Decouple associated applications to protect candidate history
  -- Sets applications.job_id = NULL so candidates and applications are completely preserved
  UPDATE public.applications
  SET job_id = NULL
  WHERE job_id = target_job_id;
  GET DIAGNOSTICS affected_apps = ROW_COUNT;

  -- 4. Permanently delete the job record
  DELETE FROM public.jobs WHERE id = target_job_id;

  -- 5. Record auditable governance event in activity_logs
  INSERT INTO public.activity_logs (
    admin_user_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'JOB',
    target_job_id::TEXT,
    'JOB_DELETED',
    format('Job posting "%s" was permanently deleted by Super Admin (%s linked application(s) preserved).', job_record.title, affected_apps),
    jsonb_build_object(
      'job_id', target_job_id,
      'title', job_record.title,
      'company_id', job_record.company_id,
      'preserved_applications_count', affected_apps,
      'deleted_by', auth.uid(),
      'deleted_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'job_id', target_job_id,
    'title', job_record.title,
    'preserved_applications_count', affected_apps
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_job_permanently(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Atomic Company Permanent Deletion RPC Function (Safe Dependency Guard)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_company_permanently(target_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_is_super BOOLEAN;
  comp_record RECORD;
  v_jobs_count INTEGER := 0;
  v_emps_count INTEGER := 0;
  v_jf_count INTEGER := 0;
  v_ref_count INTEGER := 0;
BEGIN
  -- 1. Verify authorization: SUPER_ADMIN only
  caller_is_super := public.is_super_admin();
  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN users can permanently delete corporate facilities.';
  END IF;

  -- 2. Verify target company existence
  SELECT * INTO comp_record FROM public.companies WHERE id = target_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company record not found for ID %', target_company_id;
  END IF;

  -- 3. Inspect dependencies across operational entities
  SELECT count(*) INTO v_jobs_count FROM public.jobs WHERE company_id = target_company_id;
  SELECT count(*) INTO v_emps_count FROM public.employees WHERE company_id = target_company_id;
  SELECT count(*) INTO v_jf_count FROM public.joining_forms WHERE company_id = target_company_id;
  SELECT count(*) INTO v_ref_count FROM public.reference_slips WHERE company_id = target_company_id;

  -- If dependent business records exist, block deletion to prevent data loss or orphaned history
  IF v_jobs_count > 0 OR v_emps_count > 0 OR v_jf_count > 0 OR v_ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete company "%": it has active operational dependencies (% job(s), % employee(s), % joining form(s), % reference slip(s)). Please reassign, archive, or close these records before deleting.',
      comp_record.name, v_jobs_count, v_emps_count, v_jf_count, v_ref_count;
  END IF;

  -- 4. Delete the company record (safe since zero dependencies remain)
  DELETE FROM public.companies WHERE id = target_company_id;

  -- 5. Record auditable governance event in activity_logs
  INSERT INTO public.activity_logs (
    admin_user_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'COMPANY',
    target_company_id::TEXT,
    'COMPANY_DELETED',
    format('Company "%s" was permanently deleted by Super Admin.', comp_record.name),
    jsonb_build_object(
      'company_id', target_company_id,
      'name', comp_record.name,
      'company_type', comp_record.company_type,
      'deleted_by', auth.uid(),
      'deleted_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'company_id', target_company_id,
    'name', comp_record.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_company_permanently(UUID) TO authenticated;
