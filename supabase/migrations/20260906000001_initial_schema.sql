-- ==============================================================================
-- Migration: 20260906000001_initial_schema.sql
-- Description: Core Schema for A TIGER GROUPS / A TIGER GLOBAL
-- Includes:
--   - Reusable updated_at trigger
--   - PostgreSQL-safe Application Number Generator (INQ-YYYY-000001)
--   - Core operational tables (applications, employer_enquiries, companies, jobs)
--   - Multi-table Joining Form normalized architecture
--   - Documents, Declarations, Payments, Reference Slips, Employees, etc.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Helper Functions & Sequences
-- ------------------------------------------------------------------------------

-- Automated updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for human-readable application numbers
CREATE SEQUENCE IF NOT EXISTS public.application_number_seq START WITH 1;

-- Concurrency-safe application number generator
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.application_number_seq');
  NEW.application_number := 'INQ-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Applications (Candidate Initial Enquiries & Master Case Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  
  full_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  desired_company TEXT NOT NULL,
  designation TEXT NOT NULL,
  description TEXT,
  
  status TEXT NOT NULL DEFAULT 'NEW_ENQUIRY' CHECK (
    status IN (
      'NEW_ENQUIRY',
      'SCREENING',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_SELECTED',
      'JOINING_ACCESS_GRANTED',
      'JOINING_SUBMITTED',
      'VERIFICATION_PENDING',
      'VERIFIED_ACTIVE',
      'REJECTED',
      'ARCHIVED'
    )
  ),
  
  joining_access_enabled BOOLEAN NOT NULL DEFAULT false,
  joining_access_enabled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_mobile_length CHECK (length(trim(mobile)) >= 10),
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER trg_applications_number
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
  EXECUTE FUNCTION public.generate_application_number();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_applications_app_num ON public.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_email ON public.applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_mobile ON public.applications(mobile);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- ------------------------------------------------------------------------------
-- 3. Employer Enquiries (B2B Recruitment Requirements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employer_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  employees_required INTEGER NOT NULL CHECK (employees_required > 0),
  job_role TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (
    status IN ('NEW', 'CONTACTED', 'IN_REVIEW', 'CONTRACTED', 'CLOSED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_employer_enquiries_updated_at
  BEFORE UPDATE ON public.employer_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_employer_enquiries_status ON public.employer_enquiries(status);

-- ------------------------------------------------------------------------------
-- 4. Companies (Group Businesses & Employer Partners)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (
    company_type IN ('GROUP_BUSINESS', 'EMPLOYER_PARTNER', 'OTHER')
  ),
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Jobs (Active Openings at Group Businesses / Client Plants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Joining Forms (Master 1-to-1 Joining Record for Form 5 / Onboarding)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.joining_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,

  -- Admin / Company Controlled Details
  unit TEXT,
  company_address TEXT,
  employee_code TEXT,
  department TEXT,
  sub_department TEXT,
  designation TEXT,
  location TEXT,
  date_of_joining DATE,
  gross_salary NUMERIC,

  -- Candidate Personal Information
  date_of_birth DATE,
  gender TEXT,
  mother_or_husband_name TEXT,
  marital_status TEXT,
  spouse_name TEXT,
  blood_group TEXT,
  aadhaar_number TEXT,
  pan_number TEXT,
  employee_contact_number TEXT,
  other_contact_number TEXT,
  email TEXT,

  -- Permanent Address
  permanent_address TEXT,
  permanent_city TEXT,
  permanent_district TEXT,
  permanent_state TEXT,
  permanent_country TEXT,
  permanent_pin_code TEXT,

  -- Current Address
  current_address TEXT,
  current_city TEXT,
  current_district TEXT,
  current_state TEXT,
  current_country TEXT,
  current_pin_code TEXT,
  same_as_permanent BOOLEAN DEFAULT false,

  -- Bank & Statutory Registrations
  bank_account_holder TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  branch_name TEXT,
  uan TEXT,
  esic_number TEXT,
  pt_number TEXT,

  -- Media References
  candidate_signature_path TEXT,
  photo_path TEXT,

  -- Form Lifecycle State
  submission_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    submission_status IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'REJECTED')
  ),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_joining_forms_updated_at
  BEFORE UPDATE ON public.joining_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_joining_forms_app_id ON public.joining_forms(application_id);
CREATE INDEX IF NOT EXISTS idx_joining_forms_status ON public.joining_forms(submission_status);

-- ------------------------------------------------------------------------------
-- 7. Emergency Contacts (Repeatable Child Rows for Joining Forms)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joining_form_id UUID NOT NULL REFERENCES public.joining_forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  relation TEXT NOT NULL,
  address TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_form_id ON public.emergency_contacts(joining_form_id);

-- ------------------------------------------------------------------------------
-- 8. Education Records (Repeatable Qualifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joining_form_id UUID NOT NULL REFERENCES public.joining_forms(id) ON DELETE CASCADE,
  qualification TEXT NOT NULL,
  board_university TEXT,
  year INTEGER,
  percentage_or_grade TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_education_records_form_id ON public.education_records(joining_form_id);

-- ------------------------------------------------------------------------------
-- 9. Family Details (Repeatable Dependents)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joining_form_id UUID NOT NULL REFERENCES public.joining_forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_or_date_of_birth TEXT,
  relation TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_family_details_form_id ON public.family_details(joining_form_id);

-- ------------------------------------------------------------------------------
-- 10. Documents (Individual Uploaded Records, Front/Back Aware)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'PHOTO',
      'SIGNATURE',
      'AADHAAR',
      'PAN',
      'BANK_PASSBOOK',
      'EDUCATION_CERTIFICATE',
      'ADDRESS_PROOF',
      'EXPERIENCE_CERTIFICATE',
      'OTHER'
    )
  ),
  document_side TEXT CHECK (document_side IN ('FRONT', 'BACK', 'SINGLE') OR document_side IS NULL),
  storage_path TEXT,
  original_file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  verification_status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (
    verification_status IN ('UPLOADED', 'VERIFIED', 'REJECTED', 'PENDING')
  ),
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID
);

CREATE INDEX IF NOT EXISTS idx_documents_app_id ON public.documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_type_side ON public.documents(application_id, document_type, document_side);

-- ------------------------------------------------------------------------------
-- 11. Declarations (Statutory Form 5 / EPFO Undertakings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joining_form_id UUID UNIQUE NOT NULL REFERENCES public.joining_forms(id) ON DELETE CASCADE,
  candidate_acceptance BOOLEAN NOT NULL DEFAULT false,
  background_check_consent BOOLEAN DEFAULT false,
  code_of_conduct_acceptance BOOLEAN DEFAULT false,
  signatory_name TEXT,
  declaration_date DATE,
  candidate_signature_path TEXT,
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_declarations_form_id ON public.declarations(joining_form_id);

-- ------------------------------------------------------------------------------
-- 12. Payments (Registration / Verification Processing Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  payment_reference TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  purpose TEXT NOT NULL,
  payment_method TEXT,
  gateway TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'OFFLINE')
  ),
  paid_at TIMESTAMPTZ,
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_app_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference);

-- ------------------------------------------------------------------------------
-- 13. Reference Slips (Formal Interview & Deployment Authorizations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reference_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reference_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  interview_date DATE,
  reporting_date DATE,
  reporting_time TEXT,
  department TEXT,
  designation TEXT,
  salary_ctc NUMERIC,
  interview_conducted_by TEXT,
  interview_result TEXT,
  selected_designation TEXT,
  joining_date DATE,
  remarks TEXT,
  candidate_signature_path TEXT,
  authorized_signature_path TEXT,
  company_signature_path TEXT,
  company_seal_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reference_slips_updated_at
  BEFORE UPDATE ON public.reference_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_reference_slips_app_id ON public.reference_slips(application_id);

-- ------------------------------------------------------------------------------
-- 14. Consultancy Returns (Formal Candidate Acceptance Receipt)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultancy_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_acceptance BOOLEAN NOT NULL DEFAULT false,
  candidate_signature_path TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_consultancy_returns_updated_at
  BEFORE UPDATE ON public.consultancy_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 15. Employees (Confirmed Active Workforce Deployments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  designation TEXT,
  department TEXT,
  location TEXT,
  joining_date DATE,
  employment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    employment_status IN ('ACTIVE', 'PROBATION', 'RESIGNED', 'TERMINATED', 'ON_LEAVE')
  ),
  id_card_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);

-- ------------------------------------------------------------------------------
-- 16. Generated Files (Rendered 14-Page Packets, Slips & Verification PDFs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (
    file_type IN ('JOINING_PACKET_PDF', 'REFERENCE_SLIP_PDF', 'ID_CARD_PDF', 'RECEIPT_PDF', 'EXCEL_EXPORT')
  ),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_generated_files_app_id ON public.generated_files(application_id);

-- ------------------------------------------------------------------------------
-- 17. Activity Logs (Audit Trail for Compliance & Governance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  admin_user_id UUID,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_app_id ON public.activity_logs(application_id);

-- ------------------------------------------------------------------------------
-- 18. Admin Profiles (Internal Corporate Coordinators & Verification Staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'COORDINATOR' CHECK (
    role IN ('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT')
  ),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
