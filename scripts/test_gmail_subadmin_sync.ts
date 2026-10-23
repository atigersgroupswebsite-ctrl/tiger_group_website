// ==============================================================================
// File: scripts/test_gmail_subadmin_sync.ts
// Description: Targeted Test Suite for Gmail Login & Sub-Admin Permission Synchronization
// Features:
//   - Sub-Admin creation by Super Admin with specific permissions
//   - Gmail Authentication simulation where Supabase Auth UID differs from provisioned ID
//   - Permission retrieval, key normalization, and identity linkage
//   - Permission updates / revocation verification
//   - Account deactivation & reactivation verification
//   - Module access validation (permitted vs restricted)
// ==============================================================================

process.env.NODE_ENV = 'test';

import {
  createSubAdminHandler,
  getCurrentUserPermissionsHandler,
  updateSubAdminPermissionsHandler,
  toggleAdminStatusHandler,
  listAdminUsersHandler
} from '../src/server/adminServer.js';
import { normalizePermissionKey, normalizePermissionKeys } from '../src/types/rbac.js';
import type { PermissionKey } from '../src/types/rbac.js';

async function runGmailSubAdminSyncTests() {
  console.log('====================================================================');
  console.log('TASK VERIFICATION: GMAIL SUB-ADMIN PERMISSIONS SYNCHRONIZATION');
  console.log('====================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${testName}`);
      if (details) console.log(`         -> ${details}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${testName}`);
      if (details) console.error(`         -> Details: ${details}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  const superAdminUserId = 'a2cfac08-38d8-4907-b35d-1f0fa8c14701';
  const superAdminAuth = `Bearer mock_superadmin_${superAdminUserId}`;

  // -----------------------------------------------------------------------------
  // STEP 1: SUPER ADMIN CREATES SUB-ADMIN FOR A GMAIL ACCOUNT
  // -----------------------------------------------------------------------------
  console.log('--- STEP 1: SUPER ADMIN CREATES SUB-ADMIN FOR GMAIL ACCOUNT ---');
  const gmailAddress = `tiger.subadmin.${Date.now()}@gmail.com`;
  const initialAssignedPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'employees.view'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Rahul Verma',
      email: gmailAddress,
      initialPassword: 'TigerGmail@2026!',
      confirmPassword: 'TigerGmail@2026!',
      designation: 'Operations Coordinator',
      role: 'SUB_ADMIN',
      active: true,
      permissions: initialAssignedPerms
    },
    superAdminAuth
  );

  assert(createRes.status === 200, 'Sub-Admin created successfully');
  assert(createRes.data.success === true, 'Sub-Admin response success: true');
  const provisionedUserId = createRes.data.user.id;
  assert(Boolean(provisionedUserId), `Provisioned UUID generated: ${provisionedUserId}`);
  assert(createRes.data.user.email === gmailAddress, `Provisioned email matches: ${gmailAddress}`);

  // -----------------------------------------------------------------------------
  // STEP 2: VERIFY SUB-ADMIN LISTING IN ADMIN MANAGEMENT
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 2: VERIFY LISTING IN ADMIN MANAGEMENT ---');
  const listRes = await listAdminUsersHandler(superAdminAuth);
  assert(listRes.status === 200, 'Admin directory queried successfully');
  const foundAdmin = listRes.data.admins?.find((a: any) => a.email === gmailAddress);
  assert(Boolean(foundAdmin), 'Sub-Admin found in directory listing');
  assert(foundAdmin.permissions.length === initialAssignedPerms.length, 'Directory reflects assigned permissions count');
  assert(foundAdmin.permissions.includes('dashboard.view'), 'Directory has dashboard.view permission');
  assert(foundAdmin.permissions.includes('employees.view'), 'Directory has employees.view permission');

  // -----------------------------------------------------------------------------
  // STEP 3: SUB-ADMIN LOGS IN VIA GMAIL MAGIC LINK
  // Simulate Supabase Auth issuing a user UID distinct from provisioned UUID
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 3: GMAIL AUTHENTICATION & IDENTITY LINKAGE ---');
  const supabaseAuthGmailUid = `auth-gmail-${Date.now()}`;
  // Token formatted as Bearer mock_gmail_<uid>:<email> to simulate authenticated Supabase JWT
  const gmailAuthToken = `Bearer mock_gmail_${supabaseAuthGmailUid}:${gmailAddress}`;

  const permRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permRes.status === 200, 'Gmail authenticated user permissions query returns 200');
  assert(permRes.data.success === true, 'Permissions query returns success: true');
  assert(permRes.data.user.email === gmailAddress, 'Returned profile email matches Gmail account');
  assert(permRes.data.user.role === 'SUB_ADMIN', 'Role is correctly identified as SUB_ADMIN');
  assert(permRes.data.user.active === true, 'Account is active');

  // Verify that permissions were linked and normalized
  const returnedPerms: string[] = permRes.data.permissions;
  assert(Array.isArray(returnedPerms), 'Returned permissions is an array');
  assert(returnedPerms.length === initialAssignedPerms.length, `Expected ${initialAssignedPerms.length} permissions, got ${returnedPerms.length}`);
  assert(returnedPerms.includes('dashboard.view'), 'Permissions include dashboard.view');
  assert(returnedPerms.includes('regular_joining.submissions'), 'Permissions include regular_joining.submissions');
  assert(returnedPerms.includes('employees.view'), 'Permissions include employees.view');
  assert(!returnedPerms.includes('admin_management.view'), 'Permissions correctly exclude admin_management.view');
  assert(!returnedPerms.includes('settings.view'), 'Permissions correctly exclude settings.view');

  // -----------------------------------------------------------------------------
  // STEP 4: PERMISSION KEY NORMALIZATION VERIFICATION
  // Verify that database perm_ format maps to standard dotted format
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 4: PERMISSION KEY NORMALIZATION VERIFICATION ---');
  assert(normalizePermissionKey('perm_dashboard_view') === 'dashboard.view', 'perm_dashboard_view normalizes to dashboard.view');
  assert(normalizePermissionKey('perm_regular_joining_submissions') === 'regular_joining.submissions', 'perm_regular_joining_submissions normalizes to regular_joining.submissions');
  assert(normalizePermissionKey('perm_employees_view') === 'employees.view', 'perm_employees_view normalizes to employees.view');
  assert(normalizePermissionKey('dashboard.view') === 'dashboard.view', 'dashboard.view remains unchanged');

  // Simulate frontend hasPermission logic
  const frontendHasPermission = (key: string) => {
    const targetKey = normalizePermissionKey(key);
    return returnedPerms.some((p) => normalizePermissionKey(p) === targetKey);
  };

  assert(frontendHasPermission('dashboard.view') === true, 'Frontend check passes for dashboard.view');
  assert(frontendHasPermission('perm_dashboard_view') === true, 'Frontend check passes for perm_dashboard_view (cross-compatibility)');
  assert(frontendHasPermission('employees.view') === true, 'Frontend check passes for employees.view');
  assert(frontendHasPermission('admin_management.view') === false, 'Frontend check correctly denies admin_management.view');
  assert(frontendHasPermission('website.view') === false, 'Frontend check correctly denies website.view');

  // -----------------------------------------------------------------------------
  // STEP 5: PERMISSION UPDATES (ADD & REVOKE) BY SUPER ADMIN
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 5: PERMISSION UPDATES & SYNCHRONIZATION ---');
  const updatedPerms: PermissionKey[] = [
    'regular_joining.submissions',
    'regular_joining.verify',
    'documents.view',
    'documents.download'
    // Note: dashboard.view and employees.view are REVOKED
  ];

  const updateRes = await updateSubAdminPermissionsHandler(
    {
      adminId: provisionedUserId,
      permissions: updatedPerms
    },
    superAdminAuth
  );

  assert(updateRes.status === 200, 'Super Admin updated permissions with 200');
  assert(updateRes.data.success === true, 'Update permissions returns success: true');
  assert(updateRes.data.permissions.length === updatedPerms.length, 'Updated permissions count matches');

  // Sub-admin re-fetches permissions with Gmail session
  const permResAfterUpdate = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permResAfterUpdate.status === 200, 'Sub-Admin re-queried permissions successfully');
  const newPerms: string[] = permResAfterUpdate.data.permissions;

  assert(newPerms.includes('documents.view'), 'Newly granted documents.view is recognized');
  assert(newPerms.includes('documents.download'), 'Newly granted documents.download is recognized');
  assert(!newPerms.includes('dashboard.view'), 'Revoked dashboard.view is no longer present');
  assert(!newPerms.includes('employees.view'), 'Revoked employees.view is no longer present');

  // -----------------------------------------------------------------------------
  // STEP 6: ACCOUNT STATUS (DEACTIVATION & REACTIVATION)
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 6: ACCOUNT STATUS (DEACTIVATION & REACTIVATION) ---');
  // Deactivate
  const deactRes = await toggleAdminStatusHandler(
    { adminId: provisionedUserId, active: false },
    superAdminAuth
  );
  assert(deactRes.status === 200, 'Super Admin deactivated account');

  // Sub-admin queries permissions while deactivated
  const deactPermRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(deactPermRes.status === 403, `Deactivated account blocked from permissions (Status: ${deactPermRes.status})`);
  assert(deactPermRes.data.success === false, 'Deactivated account returns success: false');

  // Reactivate
  const reactRes = await toggleAdminStatusHandler(
    { adminId: provisionedUserId, active: true },
    superAdminAuth
  );
  assert(reactRes.status === 200, 'Super Admin reactivated account');

  // Sub-admin queries permissions after reactivation
  const reactPermRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(reactPermRes.status === 200, 'Reactivated account access restored with 200');
  assert(reactPermRes.data.success === true, 'Reactivated account returns success: true');
  assert(reactPermRes.data.user.active === true, 'Account status is active: true');
  assert(reactPermRes.data.permissions.includes('documents.view'), 'Reactivated account retains assigned permissions');
  assert(!reactPermRes.data.permissions.includes('dashboard.view'), 'Reactivated account does NOT gain revoked permissions');

  // -----------------------------------------------------------------------------
  // STEP 7: SUPER ADMIN ACCESS PRESERVATION
  // -----------------------------------------------------------------------------
  console.log('\n--- STEP 7: SUPER ADMIN ACCESS PRESERVATION ---');
  const superAdminFinalCheck = await getCurrentUserPermissionsHandler(superAdminAuth);
  assert(superAdminFinalCheck.status === 200, 'Super Admin final query returns 200');
  assert(superAdminFinalCheck.data.user.role === 'SUPER_ADMIN', 'Super Admin role retained');
  assert(superAdminFinalCheck.data.permissions.includes('dashboard.view'), 'Super Admin has dashboard.view');
  assert(superAdminFinalCheck.data.permissions.includes('admin_management.view'), 'Super Admin has admin_management.view');
  assert(superAdminFinalCheck.data.permissions.includes('settings.view'), 'Super Admin has settings.view');

  console.log('\n====================================================================');
  console.log(`ALL GMAIL SUB-ADMIN SYNCHRONIZATION TESTS PASSED: ${passed}/${total} assertions verified!`);
  console.log('====================================================================\n');
}

runGmailSubAdminSyncTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
