-- ==============================================================================
-- Migration 14: Reference Slips & Consultancy Returns Hardening & Standalone Joining
-- Description:
--   1. Adds joining_form_id to public.reference_slips and public.consultancy_returns
--   2. Makes application_id nullable on both tables with check constraint
--   3. Adds company_id and company_name references to public.reference_slips
--   4. Hardens RLS policies for role-based admin governance and candidate verification
-- ==============================================================================

-- 1. Update public.reference_slips
ALTER TABLE public.reference_slips ALTER COLUMN application_id DROP NOT NULL;

ALTER TABLE public.reference_slips
  ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Constraint: Must have either application_id or joining_form_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_reference_slips_source'
  ) THEN
    ALTER TABLE public.reference_slips
      ADD CONSTRAINT chk_reference_slips_source
      CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reference_slips_joining_form_id ON public.reference_slips(joining_form_id);
CREATE INDEX IF NOT EXISTS idx_reference_slips_company_id ON public.reference_slips(company_id);
CREATE INDEX IF NOT EXISTS idx_reference_slips_result ON public.reference_slips(interview_result);
CREATE INDEX IF NOT EXISTS idx_reference_slips_date ON public.reference_slips(date);

-- 2. Update public.consultancy_returns
ALTER TABLE public.consultancy_returns ALTER COLUMN application_id DROP NOT NULL;

-- Drop foreign key on application_id if it has UNIQUE constraint or update unique constraint
DO $$
BEGIN
  -- If unique constraint exists on application_id, drop it and create unique index on non-null
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultancy_returns_application_id_key'
  ) THEN
    ALTER TABLE public.consultancy_returns DROP CONSTRAINT consultancy_returns_application_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consultancy_returns_app_unique
  ON public.consultancy_returns(application_id)
  WHERE application_id IS NOT NULL;

ALTER TABLE public.consultancy_returns
  ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;

-- Constraint: Must have either application_id or joining_form_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_consultancy_returns_source'
  ) THEN
    ALTER TABLE public.consultancy_returns
      ADD CONSTRAINT chk_consultancy_returns_source
      CHECK (application_id IS NOT NULL OR joining_form_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultancy_returns_joining_form_id ON public.consultancy_returns(joining_form_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultancy_returns_joining_unique
  ON public.consultancy_returns(joining_form_id)
  WHERE joining_form_id IS NOT NULL;

-- 3. RLS Security Updates for Candidate Access
DROP POLICY IF EXISTS "Authorized candidate can view reference slips" ON public.reference_slips;
CREATE POLICY "Authorized candidate can view reference slips"
  ON public.reference_slips
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

DROP POLICY IF EXISTS "Authorized candidate can view consultancy returns" ON public.consultancy_returns;
CREATE POLICY "Authorized candidate can view consultancy returns"
  ON public.consultancy_returns
  FOR SELECT
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );

DROP POLICY IF EXISTS "Authorized candidate can update consultancy returns" ON public.consultancy_returns;
CREATE POLICY "Authorized candidate can update consultancy returns"
  ON public.consultancy_returns
  FOR UPDATE
  USING (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  )
  WITH CHECK (
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id))
  );
