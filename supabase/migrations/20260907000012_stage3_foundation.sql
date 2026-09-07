-- ==============================================================================
-- Migration: 20260907000012_stage3_foundation.sql
-- Description: Stage 3 Architectural Foundation
--              1. Jobs Data Model (operational fields: department, salary_range, vacancies, experience_level).
--              2. Applications -> Jobs foreign key relationship (job_id).
--              3. Standalone Joining -> Employee foundation (application_id nullable, joining_form_id FK).
--              4. Standalone Joining Documents & Payments dependency chain.
--              5. Generated Documents Persistence (joining_form_id on generated_files).
--              6. Generalized Activity Logging Model (entity_type, entity_id).
--              7. System Settings Persistence Model (system_settings table).
--              8. Role-Based Access Control & RLS Hardening for SUPER_ADMIN, COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT.
--              9. Storage Object Deletion restricted to SUPER_ADMIN.
-- Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Operational Fields on public.jobs & applications.job_id
-- ------------------------------------------------------------------------------
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vacancies INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Applications foreign key link to jobs (nullable for backwards compatibility)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);

-- Backfill operational fields on existing seed jobs if present
UPDATE public.jobs
SET
  department = COALESCE(department, 'Manufacturing & Processing'),
  salary_range = COALESCE(salary_range, '₹14,500 - ₹18,000 / month'),
  vacancies = COALESCE(vacancies, 25),
  experience_level = COALESCE(experience_level, '0 - 2 Years')
WHERE id = '00000000-0000-0000-0000-000000000101';

UPDATE public.jobs
SET
  department = COALESCE(department, 'Engineering & Maintenance'),
  salary_range = COALESCE(salary_range, '₹18,000 - ₹24,000 / month'),
  vacancies = COALESCE(vacancies, 10),
  experience_level = COALESCE(experience_level, '1 - 3 Years')
WHERE id = '00000000-0000-0000-0000-000000000102';

UPDATE public.jobs
SET
  department = COALESCE(department, 'Quality Assurance & Inspection'),
  salary_range = COALESCE(salary_range, '₹15,000 - ₹19,500 / month'),
  vacancies = COALESCE(vacancies, 15),
  experience_level = COALESCE(experience_level, 'Fresher / Experienced')
WHERE id = '00000000-0000-0000-0000-000000000103';

-- ------------------------------------------------------------------------------
-- 2. Standalone Joining -> Employee Promotion Foundation
-- ------------------------------------------------------------------------------
-- Allow application_id to be NULL on employees for candidates who joined via standalone flow
ALTER TABLE public.employees ALTER COLUMN application_id DROP NOT NULL;

-- Add joining_form_id foreign key
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;

-- Add snapshot fields for convenient administrative records
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS candidate_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_reference TEXT;

-- Unique and indexing constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_joining_form_id_unique ON public.employees(joining_form_id) WHERE joining_form_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_joining_form_id ON public.employees(joining_form_id);

-- Check constraint: Must have either application_id OR joining_form_id
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS chk_employee_source;
ALTER TABLE public.employees ADD CONSTRAINT chk_employee_source CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 3. Standalone Support for Documents & Payments Dependency Chain
-- ------------------------------------------------------------------------------
-- Documents: Support standalone joining forms
ALTER TABLE public.documents ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_joining_form_id ON public.documents(joining_form_id);

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS chk_documents_source;
ALTER TABLE public.documents ADD CONSTRAINT chk_documents_source CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);

-- Payments: Support standalone joining forms
ALTER TABLE public.payments ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payments_joining_form_id ON public.payments(joining_form_id);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payments_source;
ALTER TABLE public.payments ADD CONSTRAINT chk_payments_source CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 4. Generated Documents Persistence Foundation
-- ------------------------------------------------------------------------------
ALTER TABLE public.generated_files ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.generated_files ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;
ALTER TABLE public.generated_files ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.generated_files ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'application/pdf';

CREATE INDEX IF NOT EXISTS idx_generated_files_joining_form_id ON public.generated_files(joining_form_id);

ALTER TABLE public.generated_files DROP CONSTRAINT IF EXISTS chk_generated_files_source;
ALTER TABLE public.generated_files ADD CONSTRAINT chk_generated_files_source CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 5. Generalized Activity Logging Model
-- ------------------------------------------------------------------------------
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'APPLICATION';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;

-- Backfill existing activity logs with entity_type='APPLICATION' and entity_id=application_id
UPDATE public.activity_logs
SET
  entity_type = 'APPLICATION',
  entity_id = application_id::TEXT
WHERE application_id IS NOT NULL AND entity_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- ------------------------------------------------------------------------------
-- 6. System Settings Persistence Model
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'SYSTEM',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- Seed realistic operational defaults
INSERT INTO public.system_settings (key, value, description, category)
VALUES
  (
    'notification_sound_enabled',
    'true'::jsonb,
    'Enable audio notification alert on new incoming candidate and employer submissions.',
    'PREFERENCES'
  ),
  (
    'default_registration_fee',
    '350'::jsonb,
    'Standard candidate registration and document verification processing fee in INR.',
    'FINANCIAL'
  ),
  (
    'default_consultancy_fee',
    '2500'::jsonb,
    'Standard candidate placement consultancy fee in INR upon successful employer selection.',
    'FINANCIAL'
  ),
  (
    'platform_helpline',
    '{"phone": "+91 88054 02444", "email": "info@atigergroups.com"}'::jsonb,
    'Official corporate support helpline and email contact details.',
    'SUPPORT'
  ),
  (
    'office_timings',
    '{"days": "Monday - Saturday", "hours": "10:00 AM - 6:30 PM IST"}'::jsonb,
    'Standard administrative office operating schedule and candidate counseling hours.',
    'OPERATIONS'
  ),
  (
    'company_defaults',
    '{"city": "Nagpur", "state": "Maharashtra", "country": "India"}'::jsonb,
    'Default regional operating base for candidate deployment and logistics dispatch.',
    'OPERATIONS'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ------------------------------------------------------------------------------
-- 7. Role Authorization Helper Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = auth.uid() AND active = true;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_admin_role(VARIADIC allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 8. Row Level Security Hardening by Administrative Role
-- ------------------------------------------------------------------------------

-- 8.1 System Settings Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Coordinators and Super Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Coordinators and Super Admins can manage system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Coordinators and Super Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

DROP POLICY IF EXISTS "Super Admins can delete system settings" ON public.system_settings;
CREATE POLICY "Super Admins can delete system settings"
  ON public.system_settings
  FOR DELETE
  USING (public.is_super_admin());

-- 8.2 Documents Security
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Authorized candidate can view documents" ON public.documents;

-- Candidate access supports both application-based and standalone joining forms
CREATE POLICY "Authorized candidate can view documents"
  ON public.documents
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

-- All active admins can view documents for verification/processing/audit
CREATE POLICY "Admins can view documents"
  ON public.documents
  FOR SELECT
  USING (public.is_active_admin());

-- Coordinators, Document Verifiers and Super Admins can insert/upload documents
CREATE POLICY "Authorized roles can insert documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER'));

-- Document Verifier, Coordinator, and Super Admin can verify/reject/update documents
-- (ACCOUNTANT is explicitly blocked from verifying or changing candidate documents)
CREATE POLICY "Authorized roles can update documents"
  ON public.documents
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER'));

-- Only Super Admins can permanently delete document records
CREATE POLICY "Super Admins can delete documents"
  ON public.documents
  FOR DELETE
  USING (public.is_super_admin());

-- 8.3 Payments Security
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Authorized candidate can view payments" ON public.payments;

-- Candidate access supports both application-based and standalone joining forms
CREATE POLICY "Authorized candidate can view payments"
  ON public.payments
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

-- All active admins can view payments (for verification/coordination/audit)
CREATE POLICY "Admins can view payments"
  ON public.payments
  FOR SELECT
  USING (public.is_active_admin());

-- Accountants, Coordinators, and Super Admins can insert payments
-- (DOCUMENT_VERIFIER is explicitly blocked from creating payments)
CREATE POLICY "Authorized roles can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'));

-- Accountants, Coordinators, and Super Admins can update payments
-- (DOCUMENT_VERIFIER is explicitly blocked from modifying payment status/receipts)
CREATE POLICY "Authorized roles can update payments"
  ON public.payments
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'));

-- Only Super Admins can permanently delete payments
CREATE POLICY "Super Admins can delete payments"
  ON public.payments
  FOR DELETE
  USING (public.is_super_admin());

-- 8.4 Companies & Jobs Security
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can view companies"
  ON public.companies
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Coordinators and Super Admins can insert companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Coordinators and Super Admins can update companies"
  ON public.companies
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Super Admins can delete companies"
  ON public.companies
  FOR DELETE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can view jobs"
  ON public.jobs
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Coordinators and Super Admins can insert jobs"
  ON public.jobs
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Coordinators and Super Admins can update jobs"
  ON public.jobs
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Super Admins can delete jobs"
  ON public.jobs
  FOR DELETE
  USING (public.is_super_admin());

-- 8.5 Employees Security
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authorized candidate can view employee record" ON public.employees;

CREATE POLICY "Authorized candidate can view employee record"
  ON public.employees
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

CREATE POLICY "Admins can view employees"
  ON public.employees
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Coordinators and Super Admins can insert employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Coordinators and Super Admins can update employees"
  ON public.employees
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Super Admins can delete employees"
  ON public.employees
  FOR DELETE
  USING (public.is_super_admin());

-- 8.6 Generated Files Security
DROP POLICY IF EXISTS "Admins can manage generated files" ON public.generated_files;
DROP POLICY IF EXISTS "Authorized candidate can view generated files" ON public.generated_files;

CREATE POLICY "Authorized candidate can view generated files"
  ON public.generated_files
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

CREATE POLICY "Admins can view generated files"
  ON public.generated_files
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Admins can insert generated files"
  ON public.generated_files
  FOR INSERT
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Coordinators and Super Admins can update generated files"
  ON public.generated_files
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Super Admins can delete generated files"
  ON public.generated_files
  FOR DELETE
  USING (public.is_super_admin());

-- 8.7 Reference Slips & Consultancy Returns Security
DROP POLICY IF EXISTS "Admins can manage reference slips" ON public.reference_slips;
CREATE POLICY "Admins can view reference slips"
  ON public.reference_slips
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Coordinators and Super Admins can insert reference slips"
  ON public.reference_slips
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Coordinators and Super Admins can update reference slips"
  ON public.reference_slips
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR'));

CREATE POLICY "Super Admins can delete reference slips"
  ON public.reference_slips
  FOR DELETE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can manage consultancy returns" ON public.consultancy_returns;
CREATE POLICY "Admins can view consultancy returns"
  ON public.consultancy_returns
  FOR SELECT
  USING (public.is_active_admin());

CREATE POLICY "Financial roles and Super Admins can insert consultancy returns"
  ON public.consultancy_returns
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'));

CREATE POLICY "Financial roles and Super Admins can update consultancy returns"
  ON public.consultancy_returns
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT'));

CREATE POLICY "Super Admins can delete consultancy returns"
  ON public.consultancy_returns
  FOR DELETE
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 9. Storage Object Deletion Restriced to SUPER_ADMIN
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins have full access to storage objects" ON storage.objects;

-- Active admins can read candidate and generated documents
CREATE POLICY "Admins can read private storage objects"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.is_active_admin()
  );

-- Active admins can upload/record private storage objects
CREATE POLICY "Admins can insert private storage objects"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.is_active_admin()
  );

-- Authorized admins (Super Admin, Coordinator, Document Verifier) can update metadata/re-upload
CREATE POLICY "Authorized admins can update private storage objects"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER')
  )
  WITH CHECK (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER')
  );

-- STRICT RULE: Only SUPER_ADMIN can delete private storage objects!
CREATE POLICY "Super Admins can delete private storage objects"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.is_super_admin()
  );
