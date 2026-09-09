-- ==============================================================================
-- Migration: 20260909000019_employee_id_card_verification.sql
-- Description: Employee ID Card Verification Tokens, Schema Enhancements & Public RPC
-- Security:
--   1. Adds cryptographic verification_token, verification_enabled, id_card_issued_at to employees
--   2. Provides public.verify_employee_by_token(p_token) returning strictly non-sensitive fields
--   3. Provides public.rotate_employee_verification_token(p_employee_id) for admin token rotation
-- ==============================================================================

-- 1. Schema Enhancements on public.employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS id_card_issued_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employees_verification_token
  ON public.employees(verification_token);

-- 2. Populate verification_token for any existing records lacking one
UPDATE public.employees
SET verification_token = 'atg_v_' || lower(encode(gen_random_bytes(16), 'hex'))
WHERE verification_token IS NULL;

-- 3. Public Verification RPC (Safe, leak-proof, callable by anon and authenticated)
CREATE OR REPLACE FUNCTION public.verify_employee_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_company_name TEXT := 'A TIGER GLOBAL Career Solution & Consultancy';
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Invalid or missing verification token'
    );
  END IF;

  SELECT 
    e.id,
    e.employee_code,
    e.candidate_name,
    e.designation,
    e.department,
    e.location,
    e.joining_date,
    e.employment_status,
    e.id_card_number,
    e.id_card_issued_at,
    e.verification_enabled,
    c.name AS c_name
  INTO v_emp
  FROM public.employees e
  LEFT JOIN public.companies c ON c.id = e.company_id
  WHERE e.verification_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'No official employee record matches this verification token'
    );
  END IF;

  IF NOT v_emp.verification_enabled THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'This employee identity verification has been suspended or deactivated'
    );
  END IF;

  IF v_emp.c_name IS NOT NULL AND trim(v_emp.c_name) != '' THEN
    v_company_name := v_emp.c_name;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', true,
    'is_active', (v_emp.employment_status = 'ACTIVE'),
    'employee_name', COALESCE(v_emp.candidate_name, 'Employee'),
    'employee_code', v_emp.employee_code,
    'designation', COALESCE(v_emp.designation, 'Associate'),
    'department', COALESCE(v_emp.department, 'Operations'),
    'company_name', v_company_name,
    'location', COALESCE(v_emp.location, 'Nagpur, Maharashtra'),
    'employment_status', v_emp.employment_status,
    'joining_date', v_emp.joining_date,
    'id_card_number', COALESCE(v_emp.id_card_number, 'IDC-' || v_emp.employee_code),
    'id_card_issued_at', COALESCE(v_emp.id_card_issued_at, v_emp.joining_date::timestamptz, now()),
    'verification_status', CASE 
      WHEN v_emp.employment_status = 'ACTIVE' THEN 'OFFICIALLY VERIFIED ACTIVE EMPLOYEE'
      ELSE 'INACTIVE / DEPARTED RECORD (' || v_emp.employment_status || ')'
    END
  );
END;
$$;

-- Grant execution to all users for public verification scanning
GRANT EXECUTE ON FUNCTION public.verify_employee_by_token(TEXT) TO anon, authenticated;

-- 4. Admin Token Rotation Function
CREATE OR REPLACE FUNCTION public.rotate_employee_verification_token(p_employee_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token TEXT;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrators can rotate verification tokens.';
  END IF;

  v_new_token := 'atg_v_' || lower(encode(gen_random_bytes(16), 'hex'));

  UPDATE public.employees
  SET verification_token = v_new_token,
      updated_at = now()
  WHERE id = p_employee_id;

  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_employee_verification_token(UUID) TO authenticated;
