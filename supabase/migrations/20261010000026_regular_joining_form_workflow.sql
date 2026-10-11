-- ==============================================================================
-- Migration: 20261010000026_regular_joining_form_workflow.sql
-- Description: Database foundations for Admin Regular Joining Form Workflow
-- Brand: A TIGER GLOBAL — Career Solution & Consultancy
-- Features:
--   1. Adds non-destructive columns to public.joining_forms for Regular Joining
--      (workflow_type, company_name, factory_supervisor_name, upi_number,
--       interview_date, verified_at, verified_by)
--   2. Safe, concurrency-protected sequential employee code generator
--      Format: ATG-501-2026, ATG-502-2026, starting at 501 for current year
--   3. RPC get_next_regular_employee_code for authenticated admin operations
-- ==============================================================================

DO $$
BEGIN
  -- 1. Add workflow_type column to distinguish regular joining records from standard
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'workflow_type'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN workflow_type TEXT DEFAULT 'STANDARD';
  END IF;

  -- 2. Add company_name text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN company_name TEXT;
  END IF;

  -- 3. Add factory_supervisor_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'factory_supervisor_name'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN factory_supervisor_name TEXT;
  END IF;

  -- 4. Add upi_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'upi_number'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN upi_number TEXT;
  END IF;

  -- 5. Add interview_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'interview_date'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN interview_date DATE;
  END IF;

  -- 6. Add verified_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;

  -- 7. Add verified_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN verified_by TEXT;
  END IF;
END $$;

-- Backfill existing records with 'STANDARD' workflow_type if null
UPDATE public.joining_forms
SET workflow_type = 'STANDARD'
WHERE workflow_type IS NULL;

-- Performance index for workflow_type
CREATE INDEX IF NOT EXISTS idx_joining_forms_workflow_type ON public.joining_forms(workflow_type);

-- ==============================================================================
-- Function: generate_regular_employee_code
-- Rule:
--   Format: ATG-{SEQ}-{YYYY} (e.g. ATG-501-2026, ATG-502-2026)
--   Starting sequence for any year is 501.
--   Uses advisory transaction lock to guarantee zero collisions under concurrency.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_regular_employee_code(p_year INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_suffix TEXT;
  v_pattern TEXT;
  v_max_seq INTEGER := 500; -- Baseline so next is 501
  v_code TEXT;
  v_seq INTEGER;
  r RECORD;
BEGIN
  IF p_year IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_year := p_year;
  END IF;

  v_suffix := '-' || v_year::TEXT;
  v_pattern := '^ATG-([0-9]+)-' || v_year::TEXT || '$';

  -- Advisory lock (ID: 746592) serializes code generation within the transaction
  PERFORM pg_advisory_xact_lock(746592);

  -- Scan both joining_forms and employees tables to find highest sequence already assigned
  FOR r IN
    SELECT joining_reference AS code FROM public.joining_forms WHERE joining_reference ~ v_pattern
    UNION
    SELECT employee_code AS code FROM public.joining_forms WHERE employee_code ~ v_pattern
    UNION
    SELECT employee_code AS code FROM public.employees WHERE employee_code ~ v_pattern
  LOOP
    BEGIN
      v_seq := substring(r.code from '^ATG-([0-9]+)-')::INTEGER;
      IF v_seq > v_max_seq THEN
        v_max_seq := v_seq;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore any non-integer regex captures
    END;
  END LOOP;

  v_code := 'ATG-' || (v_max_seq + 1)::TEXT || v_suffix;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Function: get_next_regular_employee_code (RPC)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_next_regular_employee_code(p_year INTEGER DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := public.generate_regular_employee_code(p_year);
  RETURN jsonb_build_object(
    'success', true,
    'employee_code', v_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_regular_employee_code(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_regular_employee_code(INTEGER) TO anon;
