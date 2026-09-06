// ==============================================================================
// File: src/constants/adminRoutes.ts
// Description: Centralized Admin Route Constants for A TIGER GROUPS
// ==============================================================================

export const ADMIN_ROUTES = {
  login: '/admin/login',
  dashboard: '/admin',
  applications: '/admin/applications',
  applicationDetail: (id: string = ':id') => `/admin/applications/${id}`,
  employerEnquiries: '/admin/employer-enquiries',
  exports: '/admin/exports',
  jobs: '/admin/jobs',
  jobDetail: (id: string = ':id') => `/admin/jobs/${id}`,
  companies: '/admin/companies',
  companyDetail: (id: string = ':id') => `/admin/companies/${id}`,
  joining: '/admin/joining',
  joiningDetail: (id: string = ':id') => `/admin/joining/${id}`,
  documents: '/admin/documents',
  documentDetail: (id: string = ':id') => `/admin/documents/${id}`,
  payments: '/admin/payments',
  paymentDetail: (id: string = ':id') => `/admin/payments/${id}`,
  referenceSlips: '/admin/reference-slips',
  referenceSlipDetail: (id: string = ':id') => `/admin/reference-slips/${id}`,
  employees: '/admin/employees',
  employeeDetail: (id: string = ':id') => `/admin/employees/${id}`,
  files: '/admin/files',
  fileDetail: (id: string = ':id') => `/admin/files/${id}`,
  activity: '/admin/activity',
  settings: '/admin/settings'
} as const;

export type AdminRouteKey = keyof typeof ADMIN_ROUTES;
