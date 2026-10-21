-- ==============================================================================
-- Migration: 20261021000027_regular_joining_operator_role_and_rls.sql
-- Description: Isolated, Secure Role and Row Level Security (RLS) Policies
--              for the Dedicated Regular Joining Operator Role
-- Brand: A TIGER GROUPS — Internal Administration Access Governance
-- Security Architecture:
--   1. Adds REGULAR_JOINING_OPERATOR to public.admin_profiles role check constraint.
--   2. Introduces public.is_joining_operator() SECURITY DEFINER helper.
--   3. Explicitly preserves super-admin and existing admin roles (is_active_admin).
--   4. Grants least-privilege scoped access to public.joining_forms (REGULAR only).
--   5. Grants least-privilege scoped access to public.documents (REGULAR joining only).
--   6. Grants least-privilege scoped access to public.employees (ATG codes only).
--   7. Configures storage object access for candidate-documents and generated-documents.
--   8. Strictly DENIES operator access to applications, employer_enquiries, payments,
--      jobs, companies, system_settings, activity_logs, and admin directory.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Update public.admin_profiles Role Check Constraint
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_profiles DROP CONSTRAINT IF EXISTS admin_profiles_role_check;
ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_role_check
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT', 'FINANCE', 'REGULAR_JOINING_OPERATOR'));

-- ------------------------------------------------------------------------------
-- 2. Helper Function: is_joining_operator()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_joining_operator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role = 'REGULAR_JOINING_OPERATOR'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_joining_operator() TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Non-Destructive Column: created_by_admin_id on public.joining_forms
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'joining_forms'
      AND column_name = 'created_by_admin_id'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN created_by_admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_joining_forms_created_by_admin_id ON public.joining_forms(created_by_admin_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Scoped Row Level Security (RLS) on public.joining_forms
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Joining operators can view regular joining forms" ON public.joining_forms;
CREATE POLICY "Joining operators can view regular joining forms"
  ON public.joining_forms
  FOR SELECT
  TO authenticated
  USING (
    public.is_joining_operator() AND (
      workflow_type = 'REGULAR' OR
      custom_fields->>'workflowType' = 'REGULAR' OR
      joining_reference ILIKE 'ATG-%' OR
      employee_code ILIKE 'ATG-%' OR
      created_by_admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Joining operators can insert regular joining forms" ON public.joining_forms;
CREATE POLICY "Joining operators can insert regular joining forms"
  ON public.joining_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_joining_operator() AND (
      workflow_type = 'REGULAR' OR
      joining_reference ILIKE 'ATG-%' OR
      employee_code ILIKE 'ATG-%'
    )
  );

DROP POLICY IF EXISTS "Joining operators can update regular joining forms" ON public.joining_forms;
CREATE POLICY "Joining operators can update regular joining forms"
  ON public.joining_forms
  FOR UPDATE
  TO authenticated
  USING (
    public.is_joining_operator() AND (
      workflow_type = 'REGULAR' OR
      joining_reference ILIKE 'ATG-%' OR
      employee_code ILIKE 'ATG-%' OR
      created_by_admin_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_joining_operator() AND (
      workflow_type = 'REGULAR' OR
      joining_reference ILIKE 'ATG-%' OR
      employee_code ILIKE 'ATG-%' OR
      created_by_admin_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 5. Scoped Row Level Security (RLS) on public.documents
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Joining operators can view documents for regular joining" ON public.documents;
CREATE POLICY "Joining operators can view documents for regular joining"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_joining_operator() AND
    joining_form_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.joining_forms jf
      WHERE jf.id = documents.joining_form_id
        AND (jf.workflow_type = 'REGULAR' OR jf.joining_reference ILIKE 'ATG-%' OR jf.employee_code ILIKE 'ATG-%')
    )
  );

DROP POLICY IF EXISTS "Joining operators can insert documents for regular joining" ON public.documents;
CREATE POLICY "Joining operators can insert documents for regular joining"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_joining_operator() AND
    joining_form_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.joining_forms jf
      WHERE jf.id = documents.joining_form_id
        AND (jf.workflow_type = 'REGULAR' OR jf.joining_reference ILIKE 'ATG-%' OR jf.employee_code ILIKE 'ATG-%')
    )
  );

-- ------------------------------------------------------------------------------
-- 6. Scoped Row Level Security (RLS) on public.employees
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Joining operators can view regular employees" ON public.employees;
CREATE POLICY "Joining operators can view regular employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_joining_operator() AND (
      employee_code ILIKE 'ATG-%' OR
      joining_reference ILIKE 'ATG-%' OR
      EXISTS (
        SELECT 1 FROM public.joining_forms jf
        WHERE jf.id = employees.joining_form_id
          AND (jf.workflow_type = 'REGULAR' OR jf.joining_reference ILIKE 'ATG-%')
      )
    )
  );

DROP POLICY IF EXISTS "Joining operators can insert regular employees" ON public.employees;
CREATE POLICY "Joining operators can insert regular employees"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_joining_operator() AND (
      employee_code ILIKE 'ATG-%' OR
      joining_reference ILIKE 'ATG-%'
    )
  );

DROP POLICY IF EXISTS "Joining operators can update regular employees" ON public.employees;
CREATE POLICY "Joining operators can update regular employees"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    public.is_joining_operator() AND (
      employee_code ILIKE 'ATG-%' OR
      joining_reference ILIKE 'ATG-%'
    )
  )
  WITH CHECK (
    public.is_joining_operator() AND (
      employee_code ILIKE 'ATG-%' OR
      joining_reference ILIKE 'ATG-%'
    )
  );

-- ------------------------------------------------------------------------------
-- 7. Scoped Storage Policies for candidate-documents and generated-documents
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Joining operators can upload candidate documents" ON storage.objects;
CREATE POLICY "Joining operators can upload candidate documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-documents' AND
    public.is_joining_operator()
  );

DROP POLICY IF EXISTS "Joining operators can read candidate documents" ON storage.objects;
CREATE POLICY "Joining operators can read candidate documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-documents' AND
    public.is_joining_operator()
  );

DROP POLICY IF EXISTS "Joining operators can read generated documents" ON storage.objects;
CREATE POLICY "Joining operators can read generated documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-documents' AND
    public.is_joining_operator()
  );

DROP POLICY IF EXISTS "Joining operators can upload generated documents" ON storage.objects;
CREATE POLICY "Joining operators can upload generated documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents' AND
    public.is_joining_operator()
  );

-- End of Migration 20261021000027_regular_joining_operator_role_and_rls.sql
