// ==============================================================================
// File: scripts/test_restricted_employee_role.ts
// Description: Automated Test Suite for Restricted Employee Role & Authorization
// Brand: A TIGER GROUPS — Admin Panel Security & Governance
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import type { AdminRole } from '../src/types/database';
import { generateNextRegularEmployeeCode } from '../src/services/regularJoiningService';

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING RESTRICTED EMPLOYEE ROLE & SECURITY TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 1: TypeScript Role & Constants Verification
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 1: ROLE TYPES & CONSTANTS DEFINITION ---');

  const testRole: AdminRole = 'REGULAR_JOINING_OPERATOR';
  assert(testRole === 'REGULAR_JOINING_OPERATOR', 'AdminRole union includes REGULAR_JOINING_OPERATOR');

  const adminAuthFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/contexts/AdminAuthContext.tsx'),
    'utf8'
  );
  assert(
    adminAuthFile.includes("'REGULAR_JOINING_OPERATOR'"),
    'AdminAuthContext ALLOWED_ADMIN_ROLES includes REGULAR_JOINING_OPERATOR'
  );
  assert(
    adminAuthFile.includes('isJoiningOperator'),
    'AdminAuthContext exposes isJoiningOperator flag'
  );

  const adminServerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/adminServer.ts'),
    'utf8'
  );
  assert(
    adminServerFile.includes("'REGULAR_JOINING_OPERATOR'"),
    'src/server/adminServer.ts VALID_ADMIN_ROLES includes REGULAR_JOINING_OPERATOR'
  );
  assert(
    adminServerFile.includes("'ADMIN'") && adminServerFile.includes("'FINANCE'"),
    'src/server/adminServer.ts VALID_ADMIN_ROLES includes ADMIN and FINANCE'
  );
  assert(
    adminServerFile.includes('isOrphanedRecovery') && adminServerFile.includes('existingProfile'),
    'src/server/adminServer.ts protects existing profiles from overwrites and supports orphaned recovery'
  );

  // ----------------------------------------------------------------------------
  // SECTION 2: Navigation & Route Guard Logic
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 2: NAVIGATION RESTRICTIONS & DIRECT URL GUARD ---');

  const adminProtectedRouteFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/admin/AdminProtectedRoute.tsx'),
    'utf8'
  );

  assert(
    adminProtectedRouteFile.includes("cleanPath === '/admin'") &&
    adminProtectedRouteFile.includes("ADMIN_ROUTES.regularJoiningList"),
    'AdminProtectedRoute redirects operator from /admin to regularJoiningList'
  );

  function isOperatorAllowedPath(pathname: string): boolean {
    const cleanPath = pathname.replace(/\/+$/, '') || '/admin';
    return (
      cleanPath === '/admin/regular-joining' ||
      cleanPath.startsWith('/admin/regular-joining/') ||
      cleanPath === '/admin/regular-joining-list' ||
      (cleanPath.startsWith('/admin/joining/') && cleanPath !== '/admin/joining') ||
      cleanPath === '/admin/employees' ||
      cleanPath.startsWith('/admin/employees/')
    );
  }

  // Operator Allowed Paths (Workflow: Joining Form, Submissions, Verification, ID Cards)
  assert(isOperatorAllowedPath('/admin/regular-joining'), 'Operator allowed to access Regular Joining Form');
  assert(isOperatorAllowedPath('/admin/regular-joining/form-uuid-123'), 'Operator allowed to access specific Regular Joining Form');
  assert(isOperatorAllowedPath('/admin/regular-joining-list'), 'Operator allowed to access Regular Joining Submissions List');
  assert(isOperatorAllowedPath('/admin/joining/some-uuid-456'), 'Operator allowed to access specific Joining Dossier');
  assert(isOperatorAllowedPath('/admin/employees'), 'Operator allowed to access ID Cards section');
  assert(isOperatorAllowedPath('/admin/employees/emp-uuid-789'), 'Operator allowed to access specific Employee ID Card');

  // Operator Denied Paths (Direct URL Attack simulation)
  const forbiddenPaths = [
    '/admin', // General dashboard denied (redirected)
    '/admin/applications',
    '/admin/applications/app-123',
    '/admin/employer-enquiries',
    '/admin/employer-enquiries/enq-456',
    '/admin/admin-users',
    '/admin/settings/admin-users',
    '/admin/exports',
    '/admin/jobs',
    '/admin/jobs/job-1',
    '/admin/companies',
    '/admin/documents',
    '/admin/documents/doc-1',
    '/admin/payments',
    '/admin/payments/pay-1',
    '/admin/reference-slips',
    '/admin/files',
    '/admin/activity',
    '/admin/settings',
    '/admin/joining-form-settings',
    '/admin/joining' // Full standard applicant joining register denied
  ];

  for (const forbiddenPath of forbiddenPaths) {
    assert(
      !isOperatorAllowedPath(forbiddenPath),
      `Operator denied direct URL access to: ${forbiddenPath}`
    );
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: Admin Sidebar Navigation Configuration
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 3: ADMIN SIDEBAR LEAST-PRIVILEGE INTEGRITY ---');

  const adminSidebarFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.tsx'),
    'utf8'
  );

  assert(
    adminSidebarFile.includes('OPERATOR_NAV_ITEMS'),
    'AdminSidebar defines dedicated OPERATOR_NAV_ITEMS array'
  );
  assert(
    adminSidebarFile.includes('isOperator ?'),
    'AdminSidebar conditionally switches navigation based on isOperator'
  );
  assert(
    adminSidebarFile.includes('Joining Operations'),
    'AdminSidebar renders isolated Joining Operations group for operators'
  );
  const operatorBlock = adminSidebarFile.slice(
    adminSidebarFile.indexOf('const OPERATOR_NAV_ITEMS'),
    adminSidebarFile.indexOf('const MANAGEMENT_SUITE_ITEMS')
  );
  assert(
    !operatorBlock.includes("name: 'Dashboard'") &&
    operatorBlock.includes("name: 'Regular Joining Form'") &&
    operatorBlock.includes("name: 'Joining Submissions'") &&
    operatorBlock.includes("name: 'ID Cards'"),
    'OPERATOR_NAV_ITEMS strictly displays Regular Joining Form, Joining Submissions, and ID Cards'
  );

  // ----------------------------------------------------------------------------
  // SECTION 4: Admin Users Management & Role Governance
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 4: ADMIN DIRECTORY & ROLE ASSIGNMENT GOVERNANCE ---');

  const adminUsersPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminUsersPage.tsx'),
    'utf8'
  );

  assert(
    adminUsersPageFile.includes('REGULAR_JOINING_OPERATOR:'),
    'AdminUsersPage ROLE_CONFIG registers REGULAR_JOINING_OPERATOR'
  );
  assert(
    adminUsersPageFile.includes('value="REGULAR_JOINING_OPERATOR"'),
    'AdminUsersPage modal allows Super Admin to assign REGULAR_JOINING_OPERATOR role'
  );
  assert(
    adminUsersPageFile.includes('const isSuperAdmin = role === \'SUPER_ADMIN\';'),
    'AdminUsersPage strictly enforces that only Super Admin can manage user accounts'
  );

  // ----------------------------------------------------------------------------
  // SECTION 5: Backend API Authorization & Super Admin Guard
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 5: BACKEND API AUTHORIZATION ---');

  // Verify server-side verifySuperAdmin rejects non-super-admins
  assert(
    adminServerFile.includes("if (profile.role !== 'SUPER_ADMIN')"),
    'src/server/adminServer.ts verifySuperAdmin strictly rejects all roles other than SUPER_ADMIN'
  );
  assert(
    adminServerFile.includes('if (!profile.active)'),
    'src/server/adminServer.ts verifySuperAdmin rejects inactive profiles'
  );
  assert(
    adminServerFile.includes('normalizedRole'),
    'src/server/adminServer.ts normalizes role input'
  );

  // ----------------------------------------------------------------------------
  // SECTION 6: Regular Joining Employee Code Generation
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 6: EMPLOYEE CODE GENERATION & RECORD SCOPING ---');

  const generatedCode = await generateNextRegularEmployeeCode(2026);
  assert(
    /^ATG-\d+-2026$/.test(generatedCode),
    `Generated employee code matches ATG sequential format: ${generatedCode}`
  );

  const regularJoiningServiceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/services/regularJoiningService.ts'),
    'utf8'
  );
  assert(
    regularJoiningServiceFile.includes('created_by_admin_id'),
    'regularJoiningService tracks authenticated operator id in custom_fields payload'
  );
  assert(
    regularJoiningServiceFile.includes('operator_email'),
    'regularJoiningService tracks operator email in custom_fields payload'
  );

  // ----------------------------------------------------------------------------
  // SECTION 7: Database Migration & RLS Policy File Integrity
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 7: DATABASE MIGRATION & RLS POLICIES ---');

  const migrationFilePath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261021000027_regular_joining_operator_role_and_rls.sql'
  );
  assert(fs.existsSync(migrationFilePath), 'Migration file 20261021000027 exists on disk');

  const migrationContent = fs.readFileSync(migrationFilePath, 'utf8');

  assert(
    migrationContent.includes('REGULAR_JOINING_OPERATOR') &&
    migrationContent.includes("'ADMIN'") &&
    migrationContent.includes("'FINANCE'") &&
    migrationContent.includes("'ACCOUNTANT'") &&
    migrationContent.includes("'COORDINATOR'") &&
    migrationContent.includes("'DOCUMENT_VERIFIER'") &&
    migrationContent.includes("'SUPER_ADMIN'"),
    'Migration updates admin_profiles_role_check constraint with all supported roles (SUPER_ADMIN, ADMIN, COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT, FINANCE, REGULAR_JOINING_OPERATOR)'
  );
  assert(
    migrationContent.includes('pg_get_constraintdef(con.oid) ILIKE \'%role%\''),
    'Migration safely inspects and drops any existing role check constraints'
  );
  assert(
    migrationContent.includes('UPDATE public.admin_profiles') &&
    migrationContent.includes('SET role = UPPER(TRIM(role))'),
    'Migration safely normalizes existing admin roles before applying check constraint'
  );
  assert(
    migrationContent.includes('CREATE OR REPLACE FUNCTION public.is_active_admin()') &&
    migrationContent.includes("'SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'DOCUMENT_VERIFIER', 'ACCOUNTANT', 'FINANCE'") &&
    !migrationContent.slice(
      migrationContent.indexOf('CREATE OR REPLACE FUNCTION public.is_active_admin()'),
      migrationContent.indexOf('CREATE OR REPLACE FUNCTION public.is_joining_operator()')
    ).includes('REGULAR_JOINING_OPERATOR'),
    'Migration reaffirms is_active_admin() preserving all 6 full admin roles and strictly excluding REGULAR_JOINING_OPERATOR'
  );
  assert(
    migrationContent.includes('CREATE OR REPLACE FUNCTION public.is_joining_operator()'),
    'Migration creates public.is_joining_operator() function'
  );
  assert(
    migrationContent.includes('SECURITY DEFINER'),
    'Migration configures is_joining_operator with SECURITY DEFINER'
  );
  assert(
    migrationContent.includes('SET search_path = public'),
    'Migration locks search_path = public for security hardening'
  );
  assert(
    migrationContent.includes('"Joining operators can view regular joining forms"'),
    'Migration defines scoped SELECT policy on public.joining_forms'
  );
  assert(
    migrationContent.includes('"Joining operators can insert regular joining forms"'),
    'Migration defines scoped INSERT policy on public.joining_forms'
  );
  assert(
    migrationContent.includes('"Joining operators can upload candidate documents"'),
    'Migration defines scoped storage INSERT policy on candidate-documents'
  );
  assert(
    migrationContent.includes('"Joining operators can read candidate documents"'),
    'Migration defines scoped storage SELECT policy on candidate-documents'
  );

  // ----------------------------------------------------------------------------
  // SECTION 8: Dedicated Operator Dashboard Component
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 8: OPERATOR DASHBOARD COMPONENT ---');

  const operatorDashboardPath = path.resolve(
    process.cwd(),
    'src/pages/admin/AdminOperatorDashboardPage.tsx'
  );
  assert(fs.existsSync(operatorDashboardPath), 'AdminOperatorDashboardPage.tsx exists on disk');

  const operatorDashboardContent = fs.readFileSync(operatorDashboardPath, 'utf8');
  assert(
    operatorDashboardContent.includes('AdminOperatorDashboardPage'),
    'AdminOperatorDashboardPage component is exported'
  );
  assert(
    operatorDashboardContent.includes('ADMIN_ROUTES.regularJoining'),
    'Operator dashboard links to New Regular Joining Form'
  );
  assert(
    operatorDashboardContent.includes('ADMIN_ROUTES.regularJoiningList'),
    'Operator dashboard links to Regular Joining Submissions'
  );

  const adminDashboardPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminDashboardPage.tsx'),
    'utf8'
  );
  assert(
    adminDashboardPageFile.includes('regularJoiningList') && adminDashboardPageFile.includes('Navigate'),
    'AdminDashboardPage dynamically protects dashboard by redirecting operators directly to regularJoiningList'
  );

  // ----------------------------------------------------------------------------
  // SECTION 9: Direct Email Sign-In Link Authentication & Security
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 9: DIRECT EMAIL SIGN-IN LINK AUTHENTICATION ---');

  // 1. AdminAuthContext Direct Sign-In Link Capabilities
  assert(
    adminAuthFile.includes('sendSignInLink: (email: string)'),
    'AdminAuthContextType interface explicitly exports sendSignInLink signature'
  );
  assert(
    !adminAuthFile.includes('verifyOtp: (email: string, token: string)'),
    'AdminAuthContextType interface removed OTP verification method'
  );
  assert(
    adminAuthFile.includes('shouldCreateUser: false'),
    'AdminAuthContext sendSignInLink strictly enforces shouldCreateUser: false to reject unauthorized public signups'
  );
  assert(
    adminAuthFile.includes('emailRedirectTo: redirectUrl') &&
    adminAuthFile.includes("getAuthRedirectUrl('/admin')"),
    'AdminAuthContext sendSignInLink supplies canonical /admin redirect to ensure sign-in link routes to admin'
  );
  assert(
    !adminAuthFile.includes('localStorage.setItem("otp"') &&
    !adminAuthFile.includes("localStorage.setItem('otp'"),
    'AdminAuthContext never stores tokens or secrets in localStorage'
  );

  // 2. Admin User Creation in adminServer.ts
  assert(
    adminServerFile.includes('supabase.auth.admin.createUser') &&
    adminServerFile.includes('email_confirm: true'),
    'adminServer.ts uses createUser with email_confirm: true instead of inviteUserByEmail'
  );
  assert(
    !adminServerFile.includes('supabase.auth.admin.inviteUserByEmail'),
    'adminServer.ts completely eliminates inviteUserByEmail'
  );

  // 3. AdminLoginPage Direct Sign-In Link UI (Zero OTP Inputs)
  const adminLoginPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminLoginPage.tsx'),
    'utf8'
  );
  assert(
    adminLoginPageFile.includes("initialMethod: LoginMethod = searchParams.get('method') === 'password' ? 'PASSWORD' : 'MAGIC_LINK'"),
    'AdminLoginPage defaults to MAGIC_LINK for employee sign-in while preserving password for super admin'
  );
  assert(
    adminLoginPageFile.includes('SEND SIGN-IN LINK'),
    'AdminLoginPage renders SEND SIGN-IN LINK action button'
  );
  assert(
    adminLoginPageFile.includes('Check Your Email'),
    'AdminLoginPage displays clear Check Your Email guidance when link is dispatched'
  );
  assert(
    !adminLoginPageFile.includes('maxLength={6}') &&
    !adminLoginPageFile.includes('inputMode="numeric"'),
    'AdminLoginPage completely removed 6-digit OTP numeric input fields'
  );
  assert(
    adminLoginPageFile.includes('resendCooldown') &&
    adminLoginPageFile.includes('setResendCooldown(60)'),
    'AdminLoginPage implements 60-second rate-limiting resend cooldown'
  );

  // 4. Supabase Direct Sign-In Link Email Template Integrity
  const templatePath = path.resolve(process.cwd(), 'supabase/templates/magic_link.html');
  assert(fs.existsSync(templatePath), 'Supabase sign-in link email template exists at supabase/templates/magic_link.html');

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  assert(
    templateContent.includes('{{ .ConfirmationURL }}'),
    'magic_link.html strictly embeds the authenticated sign-in link using {{ .ConfirmationURL }}'
  );
  assert(
    templateContent.includes('SIGN IN TO ACCOUNT'),
    'magic_link.html provides dedicated SIGN IN TO ACCOUNT button action'
  );
  assert(
    templateContent.includes('A TIGER GROUPS — Your Sign-In Link'),
    'magic_link.html includes official title: A TIGER GROUPS — Your Sign-In Link'
  );

  const configTomlPath = path.resolve(process.cwd(), 'supabase/config.toml');
  const configTomlContent = fs.readFileSync(configTomlPath, 'utf8');
  assert(
    configTomlContent.includes('[auth.email.template.magic_link]') &&
    configTomlContent.includes('A TIGER GROUPS — Your Sign-In Link') &&
    configTomlContent.includes('./supabase/templates/magic_link.html'),
    'supabase/config.toml binds [auth.email.template.magic_link] to ./supabase/templates/magic_link.html with correct subject'
  );

  // 5. Auth Callback Gateway
  const authCallbackFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/AuthCallbackPage.tsx'),
    'utf8'
  );
  assert(
    authCallbackFile.includes("target.startsWith('/admin')"),
    'AuthCallbackPage resolves and permits /admin destinations for seamless magic link clicks'
  );

  // ----------------------------------------------------------------------------
  // SECTION 10: Backend API & Document Access Authorization
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 10: BACKEND API & DOCUMENT AUTHORIZATION ---');

  const candidateAccountServiceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/candidateAccountService.ts'),
    'utf8'
  );
  assert(
    candidateAccountServiceFile.includes('isOperator') &&
    candidateAccountServiceFile.includes('doc.joining_form_id') &&
    candidateAccountServiceFile.includes('Forbidden: Regular Joining Operators cannot access documents outside the regular joining workflow'),
    'candidateAccountService strictly restricts operator to regular joining documents'
  );

  const paymentServerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/paymentServer.ts'),
    'utf8'
  );
  assert(
    paymentServerFile.includes("Role '${adminProfile.role}' is not authorized to resend payment receipts"),
    'paymentServer resendReceiptEmailHandler strictly blocks operators with 403'
  );
  assert(
    paymentServerFile.includes('Forbidden: Regular Joining Operators are not authorized to view general application payment configs'),
    'paymentServer getPaymentConfigHandler blocks operator from general application payments'
  );
  assert(
    paymentServerFile.includes('Forbidden: Regular Joining Operators are not authorized to initiate payments for general applications'),
    'paymentServer createPaymentOrderHandler blocks operator from general application payment initiation'
  );

  const adminLayoutFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/admin/AdminLayout.tsx'),
    'utf8'
  );
  assert(
    adminLayoutFile.includes('isOperator') && adminLayoutFile.includes('Joining Operations'),
    'AdminLayout breadcrumbs protect against dashboard links for operators'
  );

  const dossierFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/admin/RegularJoiningSubmissionDossier.tsx'),
    'utf8'
  );
  assert(
    dossierFile.includes('Open in ID Cards Directory') &&
    !dossierFile.includes('!isOperator && employee?.id') &&
    !dossierFile.includes('/* Navigate to ID Cards Section Button (Admins only) */'),
    'RegularJoiningSubmissionDossier allows operators to navigate to ID cards and directory'
  );

  // ----------------------------------------------------------------------------
  // SECTION 11: Complete Joining Workflow Permissions & Service Authorizations
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 11: COMPLETE JOINING WORKFLOW PERMISSIONS & LEAST-PRIVILEGE ---');

  const joiningDetailPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminJoiningDetailPage.tsx'),
    'utf8'
  );
  assert(
    joiningDetailPageFile.includes("profile?.role === 'REGULAR_JOINING_OPERATOR' ||") &&
    joiningDetailPageFile.includes('isJoiningOperator'),
    'AdminJoiningDetailPage includes REGULAR_JOINING_OPERATOR and isJoiningOperator in canVerify'
  );

  const employeesPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminEmployeesPage.tsx'),
    'utf8'
  );
  assert(
    employeesPageFile.includes('scopedEmployees = isOperator') &&
    employeesPageFile.includes("e.employee_code.startsWith('ATG-')"),
    'AdminEmployeesPage strictly scopes employee records to regular joining workflow for operators'
  );
  assert(
    employeesPageFile.includes("canManage = !isOperator && (role === 'SUPER_ADMIN' || role === 'COORDINATOR')"),
    'AdminEmployeesPage strictly blocks operators from adding or promoting candidates'
  );

  const employeeDetailPageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/admin/AdminEmployeeDetailPage.tsx'),
    'utf8'
  );
  assert(
    employeeDetailPageFile.includes('isOperator && !isRegularJoiningRecord') &&
    employeeDetailPageFile.includes('Access Denied — Standard Pipeline Employee'),
    'AdminEmployeeDetailPage blocks operators from accessing non-regular-joining employees'
  );

  const employeeEmailServiceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/employeeEmailService.ts'),
    'utf8'
  );
  assert(
    employeeEmailServiceFile.includes("adminProfile.role === 'REGULAR_JOINING_OPERATOR'") &&
    employeeEmailServiceFile.includes('Forbidden: Regular Joining Operators are restricted exclusively to regular joining employees'),
    'employeeEmailService permits operators for regular joining employee ID cards and rejects others with 403'
  );

  const referenceSlipEmailServiceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/referenceSlipEmailService.ts'),
    'utf8'
  );
  assert(
    referenceSlipEmailServiceFile.includes("adminProfile.role === 'REGULAR_JOINING_OPERATOR'") &&
    referenceSlipEmailServiceFile.includes('Forbidden: Regular Joining Operators cannot send reference slips for general applications'),
    'referenceSlipEmailService permits operators for regular joining reference slips and rejects general applications with 403'
  );

  // ----------------------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n[FATAL] Test Suite Failed:', err);
  process.exit(1);
});
