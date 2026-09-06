-- ==============================================================================
-- Migration: 20260906000006_employer_enquiry_reference_number.sql
-- Description: Adds human-readable database-generated reference number to
--              employer_enquiries (EMP-YYYY-000001), enforces authoritative
--              database generation for application numbers, and updates triggers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add enquiry_number to employer_enquiries Table
-- ------------------------------------------------------------------------------
ALTER TABLE public.employer_enquiries
  ADD COLUMN IF NOT EXISTS enquiry_number TEXT UNIQUE;

-- Sequence for employer enquiry reference numbers
CREATE SEQUENCE IF NOT EXISTS public.employer_enquiry_number_seq START WITH 1;

-- Concurrency-safe employer enquiry number generator
CREATE OR REPLACE FUNCTION public.generate_employer_enquiry_number()
RETURNS TRIGGER AS $$
DECLARE
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.employer_enquiry_number_seq');
  NEW.enquiry_number := 'EMP-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Always assign authoritative database-generated enquiry_number
DROP TRIGGER IF EXISTS trg_employer_enquiries_number ON public.employer_enquiries;

CREATE TRIGGER trg_employer_enquiries_number
  BEFORE INSERT ON public.employer_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_employer_enquiry_number();

-- Backfill any existing employer enquiries that have null enquiry_number
DO $$
DECLARE
  rec RECORD;
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  FOR rec IN SELECT id FROM public.employer_enquiries WHERE enquiry_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('public.employer_enquiry_number_seq');
    UPDATE public.employer_enquiries
    SET enquiry_number = 'EMP-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_employer_enquiries_num ON public.employer_enquiries(enquiry_number);

-- ------------------------------------------------------------------------------
-- 2. Ensure Authoritative Application Number Generation
-- ------------------------------------------------------------------------------
-- Ensure trg_applications_number runs unconditionally on insert (browser cannot spoof)
DROP TRIGGER IF EXISTS trg_applications_number ON public.applications;

CREATE TRIGGER trg_applications_number
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_application_number();

-- ------------------------------------------------------------------------------
-- 3. Update Notification Trigger to include Reference Number
-- ------------------------------------------------------------------------------
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
    COALESCE(NEW.company_name, 'Company') || ' (' || COALESCE(NEW.enquiry_number, 'Pending') || ') requested ' || COALESCE(NEW.employees_required::TEXT, '1') || ' personnel for ' || COALESCE(NEW.job_role, 'Role') || '.',
    NEW.id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
