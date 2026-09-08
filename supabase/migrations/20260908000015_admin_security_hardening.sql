-- ==============================================================================
-- Migration: 20260908000015_admin_security_hardening.sql
-- Description: Hardens admin_profiles Row Level Security (RLS) & Governance
-- Model:
--   - SELECT: Only active admins (for Directory) or authenticated user matching own id
--   - INSERT: Strictly public.is_super_admin()
--   - UPDATE: Strictly public.is_super_admin()
--   - DELETE: Strictly public.is_super_admin()
--   - Role constraint strictly enforced (SUPER_ADMIN, COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT)
-- ==============================================================================

-- 1. Ensure helper functions are robust, SECURITY DEFINER, with locked search_path
CREATE OR REPLACE FUNCTION public.is_active_admin()
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
      AND role IN ('SUPER_ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND role = 'SUPER_ADMIN'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = auth.uid() AND active = true;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_admin_role(VARIADIC allowed_roles text[])
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
      AND role = ANY(allowed_roles)
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role(VARIADIC text[]) TO authenticated;

-- 2. Harden admin_profiles RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Clean existing policies on admin_profiles to prevent conflicts
DROP POLICY IF EXISTS "Super admin can manage admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin can view own profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admin can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admin can update admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admin can delete admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can view own admin profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "admin_profiles_select_policy" ON public.admin_profiles;
DROP POLICY IF EXISTS "admin_profiles_insert_policy" ON public.admin_profiles;
DROP POLICY IF EXISTS "admin_profiles_update_policy" ON public.admin_profiles;
DROP POLICY IF EXISTS "admin_profiles_delete_policy" ON public.admin_profiles;

-- Policy 1 (SELECT): An authenticated user can inspect their own admin profile, OR an active admin can view all profiles
CREATE POLICY "admin_profiles_select_policy"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    public.is_active_admin()
  );

-- Policy 2 (INSERT): ONLY Super Admins can insert new admin profiles
CREATE POLICY "admin_profiles_insert_policy"
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
  );

-- Policy 3 (UPDATE): ONLY Super Admins can update admin profiles (roles, active status, etc.)
CREATE POLICY "admin_profiles_update_policy"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- Policy 4 (DELETE): ONLY Super Admins can delete admin profiles
CREATE POLICY "admin_profiles_delete_policy"
  ON public.admin_profiles
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
  );
