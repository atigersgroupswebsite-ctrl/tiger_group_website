-- ==============================================================================
-- Migration: 20261022000028_sub_admin_management_and_rbac.sql
-- Description: Super Admin-Controlled Sub-Admin Management & Granular RBAC System
-- Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
-- Security Architecture:
--   1. Updates public.admin_profiles role check constraint to include 'SUB_ADMIN'.
--   2. Adds designation and created_by columns to public.admin_profiles.
--   3. Creates public.permissions catalog with standard granular permissions.
--   4. Creates public.admin_permissions junction table for user permission mapping.
--   5. Creates public.admin_audit_logs table and view for immutable administrative auditing.
--   6. Introduces public.has_permission(p_user_id, p_permission_key) helper.
--   7. Configures Row Level Security (RLS) policies enforcing Super Admin exclusivity.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Safely Update public.admin_profiles Role Check Constraint
-- ------------------------------------------------------------------------------
UPDATE public.admin_profiles
SET role = UPPER(TRIM(role))
WHERE role IS NOT NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'admin_profiles'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.admin_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'SUB_ADMIN',
    'ADMIN',
    'COORDINATOR',
    'DOCUMENT_VERIFIER',
    'ACCOUNTANT',
    'FINANCE',
    'REGULAR_JOINING_OPERATOR'
  ));

-- ------------------------------------------------------------------------------
-- 2. Add designation & created_by to public.admin_profiles
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_profiles'
      AND column_name = 'designation'
  ) THEN
    ALTER TABLE public.admin_profiles ADD COLUMN designation TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_profiles'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.admin_profiles ADD COLUMN created_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Permissions Catalog Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY,
  permission_key TEXT UNIQUE NOT NULL,
  permission_name TEXT NOT NULL,
  module_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Granular Permissions across the 8 Modules
INSERT INTO public.permissions (id, permission_key, permission_name, module_name, description)
VALUES
  -- 1. Dashboard
  ('perm_dashboard_view', 'dashboard.view', 'View Dashboard', 'Dashboard', 'Access the administrative overview dashboard'),
  ('perm_dashboard_stats', 'dashboard.stats', 'View Summary Statistics', 'Dashboard', 'View key performance metrics and operational analytics'),

  -- 2. Regular Joining Form
  ('perm_regular_joining_view', 'regular_joining.view', 'View Joining Forms', 'Regular Joining Form', 'View blank and submitted regular joining forms'),
  ('perm_regular_joining_submissions', 'regular_joining.submissions', 'Access Joining Submissions', 'Regular Joining Form', 'Browse and search candidate joining submissions register'),
  ('perm_regular_joining_candidate_details', 'regular_joining.candidate_details', 'View Candidate Details', 'Regular Joining Form', 'View complete personal, bank, and statutory candidate details'),
  ('perm_regular_joining_edit', 'regular_joining.edit', 'Edit Candidate Details', 'Regular Joining Form', 'Modify candidate application and joining record fields'),
  ('perm_regular_joining_verify', 'regular_joining.verify', 'Verify Joining Forms', 'Regular Joining Form', 'Approve candidate joining submission and verify statutory documents'),
  ('perm_regular_joining_generate_slip', 'regular_joining.generate_slip', 'Generate Reference Slips', 'Regular Joining Form', 'Preview and download 1-page official joining reference slip PDF'),
  ('perm_regular_joining_generate_id_card', 'regular_joining.generate_id_card', 'Generate ID Cards', 'Regular Joining Form', 'Generate and download official employee photo ID card PDF'),
  ('perm_regular_joining_download_docs', 'regular_joining.download_docs', 'Download Employee Documents', 'Regular Joining Form', 'Download candidate uploaded documents (Aadhaar, passbook, photos)'),
  ('perm_regular_joining_export_excel', 'regular_joining.export_excel', 'Export Employee Details to Excel', 'Regular Joining Form', 'Export 3-sheet structured workbook of joining records'),

  -- 3. Employee Management
  ('perm_employees_view', 'employees.view', 'View Employee Records', 'Employee Management', 'View corporate employee directory records'),
  ('perm_employees_add', 'employees.add', 'Add Employees', 'Employee Management', 'Directly create new employee profiles in the directory'),
  ('perm_employees_edit', 'employees.edit', 'Edit Employee Records', 'Employee Management', 'Update employee job title, department, or active status'),
  ('perm_employees_view_docs', 'employees.view_docs', 'View Employee Documents', 'Employee Management', 'Inspect employee verified compliance documents'),
  ('perm_employees_download_docs', 'employees.download_docs', 'Download Employee Documents', 'Employee Management', 'Download archived employee paperwork files'),
  ('perm_employees_manage_id_cards', 'employees.manage_id_cards', 'Manage Employee ID Cards', 'Employee Management', 'Issue, regenerate, and dispatch employee ID cards'),

  -- 4. Document Management
  ('perm_documents_view', 'documents.view', 'View Documents', 'Document Management', 'View candidate and compliance documents archive'),
  ('perm_documents_upload', 'documents.upload', 'Upload Documents', 'Document Management', 'Upload statutory documents and candidate verifications'),
  ('perm_documents_download', 'documents.download', 'Download Documents', 'Document Management', 'Download verified candidate certificates and files'),
  ('perm_documents_delete', 'documents.delete', 'Delete Documents', 'Document Management', 'Remove expired or invalid compliance documents'),

  -- 5. Reports and Exports
  ('perm_reports_view', 'reports.view', 'View Reports', 'Reports and Exports', 'View operational, candidate, and enquiry reports'),
  ('perm_reports_export', 'reports.export', 'Export Reports', 'Reports and Exports', 'Generate and export aggregated administrative data'),
  ('perm_reports_download_excel', 'reports.download_excel', 'Download Excel Files', 'Reports and Exports', 'Download generated Excel spreadsheets and ledgers'),

  -- 6. Website and Content Management
  ('perm_website_view', 'website.view', 'View Website Content', 'Website and Content Management', 'View portal job listings, companies, and content'),
  ('perm_website_edit', 'website.edit', 'Edit Website Content', 'Website and Content Management', 'Create and modify career openings and company profiles'),
  ('perm_website_manage_forms', 'website.manage_forms', 'Manage Website Forms', 'Website and Content Management', 'Configure public joining form fields and enquiries'),

  -- 7. Admin Management
  ('perm_admin_management_view', 'admin_management.view', 'View Sub-Admins', 'Admin Management', 'View Sub-Admin accounts and directory listings'),
  ('perm_admin_management_create', 'admin_management.create', 'Create Sub-Admins', 'Admin Management', 'Create new Sub-Admin accounts with role assignments'),
  ('perm_admin_management_edit_permissions', 'admin_management.edit_permissions', 'Edit Sub-Admin Permissions', 'Admin Management', 'Modify or revoke Sub-Admin granular permissions'),
  ('perm_admin_management_reset_password', 'admin_management.reset_password', 'Reset Sub-Admin Passwords', 'Admin Management', 'Trigger password resets for Sub-Admin accounts'),
  ('perm_admin_management_toggle_status', 'admin_management.toggle_status', 'Activate or Deactivate Sub-Admins', 'Admin Management', 'Suspend or activate Sub-Admin account access'),
  ('perm_admin_management_delete', 'admin_management.delete', 'Delete Sub-Admin Accounts', 'Admin Management', 'Permanently delete Sub-Admin accounts and credentials'),

  -- 8. System Settings
  ('perm_settings_view', 'settings.view', 'View Settings', 'System Settings', 'View platform parameters and registration fee settings'),
  ('perm_settings_modify', 'settings.modify', 'Modify Settings', 'System Settings', 'Update corporate parameters and configuration values'),
  ('perm_settings_auth', 'settings.auth', 'Manage Authentication Settings', 'System Settings', 'Manage session timeout and authentication parameters')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 4. Admin Permissions Junction Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_permission UNIQUE (admin_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON public.admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission_id ON public.admin_permissions(permission_id);

-- ------------------------------------------------------------------------------
-- 5. Admin Audit Logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acting_admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_acting_admin ON public.admin_audit_logs(acting_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Helper Function: has_permission()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_permission_key IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Active SUPER_ADMIN has unconditional universal permissions
  IF EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = p_user_id
      AND role = 'SUPER_ADMIN'
      AND active = true
  ) THEN
    RETURN true;
  END IF;

  -- 2. Verify active profile and assigned permission
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_permissions ap
    INNER JOIN public.permissions p ON p.id = ap.permission_id
    INNER JOIN public.admin_profiles prof ON prof.id = ap.admin_id
    WHERE ap.admin_id = p_user_id
      AND prof.active = true
      AND p.permission_key = p_permission_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissions catalog: all active authenticated admins can view available permissions
DROP POLICY IF EXISTS "Admins can view permissions catalog" ON public.permissions;
CREATE POLICY "Admins can view permissions catalog"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND active = true
    )
  );

-- Only SUPER_ADMIN can modify the permissions catalog
DROP POLICY IF EXISTS "Super Admin can manage permissions catalog" ON public.permissions;
CREATE POLICY "Super Admin can manage permissions catalog"
  ON public.permissions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin Permissions: Sub-admins can view their own assigned permissions
DROP POLICY IF EXISTS "Admins can view their own permissions" ON public.admin_permissions;
CREATE POLICY "Admins can view their own permissions"
  ON public.admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR public.is_super_admin()
  );

-- Only SUPER_ADMIN can insert, update, or delete admin permissions
DROP POLICY IF EXISTS "Super Admin can manage admin permissions" ON public.admin_permissions;
CREATE POLICY "Super Admin can manage admin permissions"
  ON public.admin_permissions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin Audit Logs: Super Admin can read all audit logs; Sub-admins can read their own
DROP POLICY IF EXISTS "Super Admin can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Super Admin can view all audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR acting_admin_id = auth.uid()
  );

-- Append-only for authenticated admins; NO UPDATE OR DELETE ALLOWED
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (acting_admin_id = auth.uid() OR public.is_super_admin());
