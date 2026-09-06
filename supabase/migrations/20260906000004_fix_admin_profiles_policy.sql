-- ==============================================================================
-- Migration: 20260906000004_fix_admin_profiles_policy.sql
-- Description: Prevent infinite recursion in admin_profiles RLS policies
-- ==============================================================================

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
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = true
  );
END;
$$;

DROP POLICY IF EXISTS "Super admin can manage admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin can view own profile" ON public.admin_profiles;

CREATE POLICY "Admin can view own profile"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admin can manage admin profiles"
  ON public.admin_profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
