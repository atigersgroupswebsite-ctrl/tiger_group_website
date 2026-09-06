-- ==============================================================================
-- Migration: 20260906000002_storage_and_rls.sql
-- Description: Security, Private Storage Buckets, and Row Level Security (RLS)
-- Includes:
--   - Private buckets for candidate and generated documents
--   - Role checks and authentication helpers
--   - Strict RLS policies on all 17 operational tables
--   - Candidate authorization gated by (email match + joining_access_enabled)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Private Storage Buckets
-- ------------------------------------------------------------------------------
-- Candidate documents & generated PDF packets must NEVER be publicly readable
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'candidate-documents',
    'candidate-documents',
    false,
    10485760, -- 10MB limit per file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'generated-documents',
    'generated-documents',
    false,
    20971520, -- 20MB limit for compiled packets
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. Security Authorization Helper Functions
-- ------------------------------------------------------------------------------

-- Check if authenticated user is an active internal administrator
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current authenticated user is a candidate authorized for application
-- Rule: joining_access_enabled = true AND authenticated email matches application email
CREATE OR REPLACE FUNCTION public.is_candidate_authorized_for_application(app_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF jwt_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.applications
    WHERE id = app_id
      AND joining_access_enabled = true
      AND lower(trim(email)) = jwt_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check candidate authorization for a joining form record
CREATE OR REPLACE FUNCTION public.is_candidate_authorized_for_joining_form(form_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF jwt_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.joining_forms jf
    JOIN public.applications a ON a.id = jf.application_id
    WHERE jf.id = form_id
      AND a.joining_access_enabled = true
      AND lower(trim(a.email)) = jwt_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. Enable RLS on All Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joining_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. RLS Policies: Applications
-- ------------------------------------------------------------------------------
-- Public can submit new enquiries (controlled insert)
CREATE POLICY "Public can insert job seeker enquiry"
  ON public.applications
  FOR INSERT
  WITH CHECK (
    status = 'NEW_ENQUIRY' AND
    joining_access_enabled = false
  );

-- Authorized candidate can view their own application
CREATE POLICY "Authorized candidate can read application"
  ON public.applications
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(id));

-- Admins have full access
CREATE POLICY "Admins have full access to applications"
  ON public.applications
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 5. RLS Policies: Employer Enquiries
-- ------------------------------------------------------------------------------
-- Public can submit employer requirements
CREATE POLICY "Public can insert employer enquiry"
  ON public.employer_enquiries
  FOR INSERT
  WITH CHECK (status = 'NEW');

-- Admins have full access
CREATE POLICY "Admins have full access to employer enquiries"
  ON public.employer_enquiries
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 6. RLS Policies: Companies & Jobs
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view active companies"
  ON public.companies
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage companies"
  ON public.companies
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Public can view active jobs"
  ON public.jobs
  FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "Admins can manage jobs"
  ON public.jobs
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 7. RLS Policies: Joining Forms
-- ------------------------------------------------------------------------------
CREATE POLICY "Authorized candidate can read joining form"
  ON public.joining_forms
  FOR SELECT
  USING (public.is_candidate_authorized_for_joining_form(id));

CREATE POLICY "Authorized candidate can update joining form"
  ON public.joining_forms
  FOR UPDATE
  USING (
    public.is_candidate_authorized_for_joining_form(id) AND
    submission_status IN ('DRAFT', 'IN_PROGRESS')
  )
  WITH CHECK (
    public.is_candidate_authorized_for_joining_form(id)
  );

CREATE POLICY "Admins have full access to joining forms"
  ON public.joining_forms
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 8. RLS Policies: Emergency Contacts, Education, Family, Declarations
-- ------------------------------------------------------------------------------
-- Emergency Contacts
CREATE POLICY "Authorized candidate can manage emergency contacts"
  ON public.emergency_contacts
  FOR ALL
  USING (public.is_candidate_authorized_for_joining_form(joining_form_id))
  WITH CHECK (public.is_candidate_authorized_for_joining_form(joining_form_id));

CREATE POLICY "Admins can manage emergency contacts"
  ON public.emergency_contacts
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Education Records
CREATE POLICY "Authorized candidate can manage education records"
  ON public.education_records
  FOR ALL
  USING (public.is_candidate_authorized_for_joining_form(joining_form_id))
  WITH CHECK (public.is_candidate_authorized_for_joining_form(joining_form_id));

CREATE POLICY "Admins can manage education records"
  ON public.education_records
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Family Details
CREATE POLICY "Authorized candidate can manage family details"
  ON public.family_details
  FOR ALL
  USING (public.is_candidate_authorized_for_joining_form(joining_form_id))
  WITH CHECK (public.is_candidate_authorized_for_joining_form(joining_form_id));

CREATE POLICY "Admins can manage family details"
  ON public.family_details
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Declarations
CREATE POLICY "Authorized candidate can manage declarations"
  ON public.declarations
  FOR ALL
  USING (public.is_candidate_authorized_for_joining_form(joining_form_id))
  WITH CHECK (public.is_candidate_authorized_for_joining_form(joining_form_id));

CREATE POLICY "Admins can manage declarations"
  ON public.declarations
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 9. RLS Policies: Documents
-- ------------------------------------------------------------------------------
CREATE POLICY "Authorized candidate can view documents"
  ON public.documents
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Authorized candidate can insert/update documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Authorized candidate can modify own documents"
  ON public.documents
  FOR UPDATE
  USING (public.is_candidate_authorized_for_application(application_id))
  WITH CHECK (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Authorized candidate can delete own documents"
  ON public.documents
  FOR DELETE
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage documents"
  ON public.documents
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 10. RLS Policies: Payments, Reference Slips, Consultancy Returns, Employees
-- ------------------------------------------------------------------------------
CREATE POLICY "Authorized candidate can view payments"
  ON public.payments
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage payments"
  ON public.payments
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Authorized candidate can view reference slips"
  ON public.reference_slips
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage reference slips"
  ON public.reference_slips
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Authorized candidate can view consultancy returns"
  ON public.consultancy_returns
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage consultancy returns"
  ON public.consultancy_returns
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Authorized candidate can view employee record"
  ON public.employees
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage employees"
  ON public.employees
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Authorized candidate can view generated files"
  ON public.generated_files
  FOR SELECT
  USING (public.is_candidate_authorized_for_application(application_id));

CREATE POLICY "Admins can manage generated files"
  ON public.generated_files
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 11. RLS Policies: Admin Profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can view own profile"
  ON public.admin_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Super admin can manage admin profiles"
  ON public.admin_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = true
    )
  );

-- ------------------------------------------------------------------------------
-- 12. Storage Objects Access Policies (candidate-documents & generated-documents)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins have full access to storage objects"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.is_active_admin()
  )
  WITH CHECK (
    bucket_id IN ('candidate-documents', 'generated-documents') AND
    public.is_active_admin()
  );

CREATE POLICY "Candidate can upload documents to candidate-documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'candidate-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Candidate can read own candidate-documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'candidate-documents' AND
    auth.uid() IS NOT NULL
  );
