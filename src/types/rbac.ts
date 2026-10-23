// ==============================================================================
// File: src/types/rbac.ts
// Description: Role-Based Access Control (RBAC) Definitions for A TIGER GROUPS
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// ==============================================================================

import type { AdminRole } from './database';

export type PermissionKey =
  // 1. Dashboard
  | 'dashboard.view'
  | 'dashboard.stats'
  // 2. Regular Joining Form
  | 'regular_joining.view'
  | 'regular_joining.submissions'
  | 'regular_joining.candidate_details'
  | 'regular_joining.edit'
  | 'regular_joining.verify'
  | 'regular_joining.generate_slip'
  | 'regular_joining.generate_id_card'
  | 'regular_joining.download_docs'
  | 'regular_joining.export_excel'
  // 3. Employee Management
  | 'employees.view'
  | 'employees.add'
  | 'employees.edit'
  | 'employees.view_docs'
  | 'employees.download_docs'
  | 'employees.manage_id_cards'
  // 4. Document Management
  | 'documents.view'
  | 'documents.upload'
  | 'documents.download'
  | 'documents.delete'
  // 5. Reports and Exports
  | 'reports.view'
  | 'reports.export'
  | 'reports.download_excel'
  // 6. Website and Content Management
  | 'website.view'
  | 'website.edit'
  | 'website.manage_forms'
  // 7. Admin Management
  | 'admin_management.view'
  | 'admin_management.create'
  | 'admin_management.edit_permissions'
  | 'admin_management.reset_password'
  | 'admin_management.toggle_status'
  | 'admin_management.delete'
  // 8. System Settings
  | 'settings.view'
  | 'settings.modify'
  | 'settings.auth';

export type ModuleKey =
  | 'Dashboard'
  | 'Regular Joining Form'
  | 'Employee Management'
  | 'Document Management'
  | 'Reports and Exports'
  | 'Website and Content Management'
  | 'Admin Management'
  | 'System Settings';

export interface PermissionDefinition {
  id: string;
  key: PermissionKey;
  name: string;
  module: ModuleKey;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Dashboard
  {
    id: 'perm_dashboard_view',
    key: 'dashboard.view',
    name: 'View Dashboard',
    module: 'Dashboard',
    description: 'Access the administrative overview dashboard'
  },
  {
    id: 'perm_dashboard_stats',
    key: 'dashboard.stats',
    name: 'View Summary Statistics',
    module: 'Dashboard',
    description: 'View key performance metrics and operational analytics'
  },

  // 2. Regular Joining Form
  {
    id: 'perm_regular_joining_view',
    key: 'regular_joining.view',
    name: 'View Joining Forms',
    module: 'Regular Joining Form',
    description: 'View blank and submitted regular joining forms'
  },
  {
    id: 'perm_regular_joining_submissions',
    key: 'regular_joining.submissions',
    name: 'Access Joining Submissions',
    module: 'Regular Joining Form',
    description: 'Browse and search candidate joining submissions register'
  },
  {
    id: 'perm_regular_joining_candidate_details',
    key: 'regular_joining.candidate_details',
    name: 'View Candidate Details',
    module: 'Regular Joining Form',
    description: 'View complete personal, bank, and statutory candidate details'
  },
  {
    id: 'perm_regular_joining_edit',
    key: 'regular_joining.edit',
    name: 'Edit Candidate Details',
    module: 'Regular Joining Form',
    description: 'Modify candidate application and joining record fields'
  },
  {
    id: 'perm_regular_joining_verify',
    key: 'regular_joining.verify',
    name: 'Verify Joining Forms',
    module: 'Regular Joining Form',
    description: 'Approve candidate joining submission and verify statutory documents'
  },
  {
    id: 'perm_regular_joining_generate_slip',
    key: 'regular_joining.generate_slip',
    name: 'Generate Reference Slips',
    module: 'Regular Joining Form',
    description: 'Preview and download 1-page official joining reference slip PDF'
  },
  {
    id: 'perm_regular_joining_generate_id_card',
    key: 'regular_joining.generate_id_card',
    name: 'Generate ID Cards',
    module: 'Regular Joining Form',
    description: 'Generate and download official employee photo ID card PDF'
  },
  {
    id: 'perm_regular_joining_download_docs',
    key: 'regular_joining.download_docs',
    name: 'Download Employee Documents',
    module: 'Regular Joining Form',
    description: 'Download candidate uploaded documents (Aadhaar, passbook, photos)'
  },
  {
    id: 'perm_regular_joining_export_excel',
    key: 'regular_joining.export_excel',
    name: 'Export Employee Details to Excel',
    module: 'Regular Joining Form',
    description: 'Export 3-sheet structured workbook of joining records'
  },

  // 3. Employee Management
  {
    id: 'perm_employees_view',
    key: 'employees.view',
    name: 'View Employee Records',
    module: 'Employee Management',
    description: 'View corporate employee directory records'
  },
  {
    id: 'perm_employees_add',
    key: 'employees.add',
    name: 'Add Employees',
    module: 'Employee Management',
    description: 'Directly create new employee profiles in the directory'
  },
  {
    id: 'perm_employees_edit',
    key: 'employees.edit',
    name: 'Edit Employee Records',
    module: 'Employee Management',
    description: 'Update employee job title, department, or active status'
  },
  {
    id: 'perm_employees_view_docs',
    key: 'employees.view_docs',
    name: 'View Employee Documents',
    module: 'Employee Management',
    description: 'Inspect employee verified compliance documents'
  },
  {
    id: 'perm_employees_download_docs',
    key: 'employees.download_docs',
    name: 'Download Employee Documents',
    module: 'Employee Management',
    description: 'Download archived employee paperwork files'
  },
  {
    id: 'perm_employees_manage_id_cards',
    key: 'employees.manage_id_cards',
    name: 'Manage Employee ID Cards',
    module: 'Employee Management',
    description: 'Issue, regenerate, and dispatch employee ID cards'
  },

  // 4. Document Management
  {
    id: 'perm_documents_view',
    key: 'documents.view',
    name: 'View Documents',
    module: 'Document Management',
    description: 'View candidate and compliance documents archive'
  },
  {
    id: 'perm_documents_upload',
    key: 'documents.upload',
    name: 'Upload Documents',
    module: 'Document Management',
    description: 'Upload statutory documents and candidate verifications'
  },
  {
    id: 'perm_documents_download',
    key: 'documents.download',
    name: 'Download Documents',
    module: 'Document Management',
    description: 'Download verified candidate certificates and files'
  },
  {
    id: 'perm_documents_delete',
    key: 'documents.delete',
    name: 'Delete Documents',
    module: 'Document Management',
    description: 'Remove expired or invalid compliance documents'
  },

  // 5. Reports and Exports
  {
    id: 'perm_reports_view',
    key: 'reports.view',
    name: 'View Reports',
    module: 'Reports and Exports',
    description: 'View operational, candidate, and enquiry reports'
  },
  {
    id: 'perm_reports_export',
    key: 'reports.export',
    name: 'Export Reports',
    module: 'Reports and Exports',
    description: 'Generate and export aggregated administrative data'
  },
  {
    id: 'perm_reports_download_excel',
    key: 'reports.download_excel',
    name: 'Download Excel Files',
    module: 'Reports and Exports',
    description: 'Download generated Excel spreadsheets and ledgers'
  },

  // 6. Website and Content Management
  {
    id: 'perm_website_view',
    key: 'website.view',
    name: 'View Website Content',
    module: 'Website and Content Management',
    description: 'View portal job listings, companies, and content'
  },
  {
    id: 'perm_website_edit',
    key: 'website.edit',
    name: 'Edit Website Content',
    module: 'Website and Content Management',
    description: 'Create and modify career openings and company profiles'
  },
  {
    id: 'perm_website_manage_forms',
    key: 'website.manage_forms',
    name: 'Manage Website Forms',
    module: 'Website and Content Management',
    description: 'Configure public joining form fields and enquiries'
  },

  // 7. Admin Management
  {
    id: 'perm_admin_management_view',
    key: 'admin_management.view',
    name: 'View Sub-Admins',
    module: 'Admin Management',
    description: 'View Sub-Admin accounts and directory listings'
  },
  {
    id: 'perm_admin_management_create',
    key: 'admin_management.create',
    name: 'Create Sub-Admins',
    module: 'Admin Management',
    description: 'Create new Sub-Admin accounts with role assignments'
  },
  {
    id: 'perm_admin_management_edit_permissions',
    key: 'admin_management.edit_permissions',
    name: 'Edit Sub-Admin Permissions',
    module: 'Admin Management',
    description: 'Modify or revoke Sub-Admin granular permissions'
  },
  {
    id: 'perm_admin_management_reset_password',
    key: 'admin_management.reset_password',
    name: 'Reset Sub-Admin Passwords',
    module: 'Admin Management',
    description: 'Trigger password resets for Sub-Admin accounts'
  },
  {
    id: 'perm_admin_management_toggle_status',
    key: 'admin_management.toggle_status',
    name: 'Activate or Deactivate Sub-Admins',
    module: 'Admin Management',
    description: 'Suspend or activate Sub-Admin account access'
  },
  {
    id: 'perm_admin_management_delete',
    key: 'admin_management.delete',
    name: 'Delete Sub-Admin Accounts',
    module: 'Admin Management',
    description: 'Permanently delete Sub-Admin accounts and credentials'
  },

  // 8. System Settings
  {
    id: 'perm_settings_view',
    key: 'settings.view',
    name: 'View Settings',
    module: 'System Settings',
    description: 'View platform parameters and registration fee settings'
  },
  {
    id: 'perm_settings_modify',
    key: 'settings.modify',
    name: 'Modify Settings',
    module: 'System Settings',
    description: 'Update corporate parameters and configuration values'
  },
  {
    id: 'perm_settings_auth',
    key: 'settings.auth',
    name: 'Manage Authentication Settings',
    module: 'System Settings',
    description: 'Manage session timeout and authentication parameters'
  }
];

export const PERMISSION_MODULES: ModuleKey[] = [
  'Dashboard',
  'Regular Joining Form',
  'Employee Management',
  'Document Management',
  'Reports and Exports',
  'Website and Content Management',
  'Admin Management',
  'System Settings'
];

export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
}

export const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  JOINING_VERIFICATION_ADMIN: {
    key: 'JOINING_VERIFICATION_ADMIN',
    name: 'Joining Verification Admin',
    description: 'Authorized to review candidate joining submissions, verify forms, generate reference slips & ID cards, and download compliance documents.',
    permissions: [
      'dashboard.view',
      'regular_joining.view',
      'regular_joining.submissions',
      'regular_joining.candidate_details',
      'regular_joining.verify',
      'regular_joining.generate_slip',
      'regular_joining.generate_id_card',
      'regular_joining.download_docs',
      'documents.view',
      'documents.download'
    ]
  },
  HR_ADMIN: {
    key: 'HR_ADMIN',
    name: 'HR Admin',
    description: 'Authorized to view & manage employee records, access joining submissions, verify forms, generate ID cards, and export employee registers.',
    permissions: [
      'dashboard.view',
      'dashboard.stats',
      'regular_joining.view',
      'regular_joining.submissions',
      'regular_joining.candidate_details',
      'regular_joining.verify',
      'regular_joining.generate_id_card',
      'regular_joining.export_excel',
      'employees.view',
      'employees.add',
      'employees.edit',
      'employees.view_docs',
      'employees.download_docs',
      'employees.manage_id_cards',
      'documents.view',
      'documents.upload',
      'documents.download',
      'reports.view',
      'reports.export',
      'reports.download_excel'
    ]
  },
  REPORTS_ADMIN: {
    key: 'REPORTS_ADMIN',
    name: 'Reports Admin',
    description: 'Authorized to view summary statistics, access reports, and download Excel registers. Cannot verify forms or generate ID cards.',
    permissions: [
      'dashboard.view',
      'dashboard.stats',
      'reports.view',
      'reports.export',
      'reports.download_excel'
    ]
  },
  CUSTOM_ADMIN: {
    key: 'CUSTOM_ADMIN',
    name: 'Custom Admin',
    description: 'Custom tailored permissions individually assigned by the Super Admin.',
    permissions: []
  }
};

export interface SubAdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  designation?: string | null;
  active: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  permissions: PermissionKey[];
  createdBy?: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  actingAdminId: string;
  actingAdminEmail?: string;
  actingAdminName?: string;
  action: string;
  targetId?: string | null;
  status: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, any> | null;
  createdAt: string;
}

/**
 * Normalizes any permission identifier or legacy permission ID (e.g. 'perm_dashboard_view')
 * into the standard PermissionKey format (e.g. 'dashboard.view').
 */
export function normalizePermissionKey(raw: string | undefined | null): PermissionKey {
  if (!raw || typeof raw !== 'string') return '' as PermissionKey;
  const trimmed = raw.trim();

  // 1. Direct match against known PermissionKey
  const directMatch = ALL_PERMISSIONS.find((p) => p.key === trimmed);
  if (directMatch) return directMatch.key;

  // 2. Match against known PermissionDefinition id (e.g. 'perm_dashboard_view')
  const idMatch = ALL_PERMISSIONS.find((p) => p.id === trimmed);
  if (idMatch) return idMatch.key;

  // 3. Fallback transformation for perm_ prefix
  if (trimmed.startsWith('perm_')) {
    const stripped = trimmed.slice(5);
    const dotCandidate = stripped.replace('_', '.');
    const matchedDot = ALL_PERMISSIONS.find((p) => p.key === dotCandidate);
    if (matchedDot) return matchedDot.key;

    // Handle multi-word modules (e.g. regular_joining_candidate_details -> regular_joining.candidate_details)
    const lastUnderscoreToDot = stripped.replace(/_([^_]+)$/, '.$1');
    const matchedLast = ALL_PERMISSIONS.find((p) => p.key === lastUnderscoreToDot);
    if (matchedLast) return matchedLast.key;
  }

  return trimmed as PermissionKey;
}

/**
 * Normalizes an array of permission keys/identifiers, removing duplicates and invalid keys.
 */
export function normalizePermissionKeys(rawList: (string | undefined | null)[]): PermissionKey[] {
  if (!Array.isArray(rawList)) return [];
  const validKeys = new Set<PermissionKey>();
  for (const item of rawList) {
    if (!item) continue;
    const normalized = normalizePermissionKey(item);
    if (normalized && ALL_PERMISSIONS.some((p) => p.key === normalized)) {
      validKeys.add(normalized);
    }
  }
  return Array.from(validKeys);
}

