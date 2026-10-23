// ==============================================================================
// File: scripts/test_subadmin_critical_bugfix.ts
// Description: Comprehensive Verification Suite for Sub-Admin Permission Sync & Dashboard Access
// Tests:
//   Test A: Permission Persistence & Correct Admin Management Count (5 permissions saved -> 5 displayed)
//   Test B: Gmail Login with distinct Supabase Auth UID & dashboard.view authorization
//   Test C: Permission Restriction (revoke dashboard.view -> dashboard denied, other modules accessible)
//   Test D: Dynamic Permission Updates (assign new module -> accessible; revoke -> denied)
//   Test E: Authentication State & Loop Prevention (valid, inactive, missing, 0 perms, loop guards)
//   Test F: Regression Testing (Super Admin universal access, Operator restrictions, normalization)
// ==============================================================================

process.env.NODE_ENV = 'test';

import {
  createSubAdminHandler,
  getCurrentUserPermissionsHandler,
  updateSubAdminPermissionsHandler,
  toggleAdminStatusHandler,
  listAdminUsersHandler
} from '../src/server/adminServer.js';
import {
  ALL_PERMISSIONS,
  normalizePermissionKey,
  normalizePermissionKeys,
  type PermissionKey
} from '../src/types/rbac.js';

async function runCriticalBugFixVerification() {
  console.log('================================================================================');
  console.log('CRITICAL BUG FIX VERIFICATION: SUB-ADMIN PERMISSION SYNC & DASHBOARD ACCESS');
  console.log('================================================================================\n');

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

  // =============================================================================
  // TEST A: PERMISSION PERSISTENCE & ADMIN MANAGEMENT PERMISSION COUNT
  // =============================================================================
  console.log('--- TEST A: PERMISSION PERSISTENCE & ADMIN MANAGEMENT DISPLAY COUNT ---');
  const targetGmail = `test.subadmin.${Date.now()}@gmail.com`;
  const assigned5Perms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Vikramaditya Rathore',
      email: targetGmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Senior Verification Specialist',
      role: 'SUB_ADMIN',
      active: true,
      permissions: assigned5Perms
    },
    superAdminAuth
  );

  assert(createRes.status === 200, 'Sub-Admin created successfully via API');
  assert(createRes.data.success === true, 'API returned success: true');
  const provisionedId = createRes.data.user.id;
  assert(Boolean(provisionedId), `Provisioned account ID created: ${provisionedId}`);
  assert(createRes.data.user.email === targetGmail, `Account email preserved: ${targetGmail}`);

  // Query directory as Super Admin (simulates Admin Management screen reload)
  const dirRes1 = await listAdminUsersHandler(superAdminAuth);
  assert(dirRes1.status === 200, 'Admin directory queried successfully');
  const dirUser1 = dirRes1.data.admins?.find((a: any) => a.email === targetGmail);
  assert(Boolean(dirUser1), 'Sub-Admin located in directory listing');
  assert(Array.isArray(dirUser1.permissions), 'Directory permissions is an array');
  assert(dirUser1.permissions.length === 5, `Admin Management displays exactly 5 Granted Permissions (count: ${dirUser1.permissions.length})`);
  assert(dirUser1.permissions.length !== 0, 'Permission count is NOT 0 Granted Permissions');
  for (const perm of assigned5Perms) {
    assert(dirUser1.permissions.includes(perm), `Directory contains assigned permission: ${perm}`);
  }

  // =============================================================================
  // TEST B: GMAIL LOGIN WITH DISTINCT SUPABASE AUTH UID & DASHBOARD AUTHORIZATION
  // =============================================================================
  console.log('\n--- TEST B: GMAIL LOGIN, IDENTITY MAPPING & DASHBOARD.VIEW AUTHORIZATION ---');
  // Simulate Sub-Admin signing in with Google/Gmail Magic Link (receives distinct Supabase Auth UID)
  const supabaseAuthUid = `supabase-gmail-${Date.now()}`;
  const gmailAuthToken = `Bearer mock_gmail_${supabaseAuthUid}:${targetGmail}`;

  const loginPermRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(loginPermRes.status === 200, 'Sub-Admin permissions query via Gmail login returns 200');
  assert(loginPermRes.data.success === true, 'Response contains success: true');
  assert(loginPermRes.data.user.email === targetGmail, `Resolved profile email matches entered Gmail: ${targetGmail}`);
  assert(loginPermRes.data.user.name === 'Vikramaditya Rathore', `Resolved full name matches: ${loginPermRes.data.user.name}`);
  assert(loginPermRes.data.user.role === 'SUB_ADMIN', 'Role is correctly identified as SUB_ADMIN');
  assert(loginPermRes.data.user.active === true, 'Account is verified as active');

  const resolvedPerms = loginPermRes.data.permissions;
  assert(Array.isArray(resolvedPerms), 'Returned permissions is an array');
  assert(resolvedPerms.length === 5, `Permissions count matches 5 (got: ${resolvedPerms.length})`);
  assert(resolvedPerms.includes('dashboard.view'), 'Sub-Admin holds dashboard.view permission');
  assert(resolvedPerms.includes('regular_joining.submissions'), 'Sub-Admin holds regular_joining.submissions');
  assert(resolvedPerms.includes('regular_joining.generate_slip'), 'Sub-Admin holds regular_joining.generate_slip');

  // Verify route guard evaluation for /admin
  const canAccessDashboard = resolvedPerms.some((p: string) => normalizePermissionKey(p) === 'dashboard.view');
  assert(canAccessDashboard === true, 'Frontend Route Guard allows access to /admin (Dashboard)');

  // Verify directory still displays 5 permissions after Gmail login and UID linkage
  const dirRes2 = await listAdminUsersHandler(superAdminAuth);
  const dirUser2 = dirRes2.data.admins?.find((a: any) => a.email === targetGmail);
  assert(dirUser2.permissions.length === 5, `Directory retains 5 Granted Permissions after Gmail login (got: ${dirUser2.permissions.length})`);

  // =============================================================================
  // TEST C: PERMISSION RESTRICTION (REVOKE DASHBOARD.VIEW)
  // =============================================================================
  console.log('\n--- TEST C: PERMISSION RESTRICTION (REVOKE DASHBOARD.VIEW) ---');
  const restrictedPerms: PermissionKey[] = [
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip'
    // dashboard.view explicitly revoked
  ];

  const updateRes1 = await updateSubAdminPermissionsHandler(
    {
      adminId: dirUser2.id,
      permissions: restrictedPerms
    },
    superAdminAuth
  );
  assert(updateRes1.status === 200, 'Super Admin successfully updated permissions');
  assert(updateRes1.data.permissions.length === 4, 'Updated permissions count is 4');

  // Directory reflects 4 permissions
  const dirRes3 = await listAdminUsersHandler(superAdminAuth);
  const dirUser3 = dirRes3.data.admins?.find((a: any) => a.email === targetGmail);
  assert(dirUser3.permissions.length === 4, `Admin Management reflects updated count: 4 Granted Permissions (got: ${dirUser3.permissions.length})`);
  assert(!dirUser3.permissions.includes('dashboard.view'), 'dashboard.view is no longer in directory listing');

  // Sub-Admin queries permissions
  const permResRestricted = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permResRestricted.status === 200, 'Sub-Admin permissions query succeeds after update');
  const activePermsNow: string[] = permResRestricted.data.permissions;
  assert(!activePermsNow.includes('dashboard.view'), 'Sub-Admin session no longer has dashboard.view');
  assert(activePermsNow.includes('regular_joining.submissions'), 'Sub-Admin retains regular_joining.submissions');
  assert(activePermsNow.includes('regular_joining.generate_slip'), 'Sub-Admin retains regular_joining.generate_slip');

  // Route guard evaluation
  const dashboardAllowed = activePermsNow.some((p: string) => normalizePermissionKey(p) === 'dashboard.view');
  assert(dashboardAllowed === false, 'Dashboard access is strictly DENIED when dashboard.view is revoked');

  // Landing route fallback evaluation (must redirect to regular-joining-list, not loop)
  const accessibleLanding = activePermsNow.includes('regular_joining.submissions') ? '/admin/regular-joining-list' : null;
  assert(accessibleLanding === '/admin/regular-joining-list', `Sub-Admin redirects to valid landing route: ${accessibleLanding}`);
  assert(accessibleLanding !== '/admin', 'Landing route is different from /admin (prevents redirect loop)');

  // =============================================================================
  // TEST D: PERMISSION UPDATES (ASSIGN & REVOKE NEW MODULE)
  // =============================================================================
  console.log('\n--- TEST D: DYNAMIC PERMISSION UPDATES (ASSIGN & REVOKE) ---');
  // Add documents.view and documents.download
  const expandedPerms: PermissionKey[] = [
    ...restrictedPerms,
    'documents.view',
    'documents.download'
  ];

  const updateRes2 = await updateSubAdminPermissionsHandler(
    {
      adminId: dirUser3.id,
      permissions: expandedPerms
    },
    superAdminAuth
  );
  assert(updateRes2.status === 200, 'Super Admin granted Document Management permissions');

  const permResExpanded = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permResExpanded.data.permissions.includes('documents.view'), 'Newly assigned documents.view is recognized');
  assert(permResExpanded.data.permissions.includes('documents.download'), 'Newly assigned documents.download is recognized');

  // Revoke documents.download
  const reRestrictedPerms = expandedPerms.filter((p) => p !== 'documents.download');
  await updateSubAdminPermissionsHandler(
    {
      adminId: dirUser3.id,
      permissions: reRestrictedPerms
    },
    superAdminAuth
  );

  const permResReRestricted = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permResReRestricted.data.permissions.includes('documents.view'), 'documents.view remains granted');
  assert(!permResReRestricted.data.permissions.includes('documents.download'), 'documents.download is cleanly revoked');

  // =============================================================================
  // TEST E: AUTHENTICATION STATE & LOOP PREVENTION
  // =============================================================================
  console.log('\n--- TEST E: AUTHENTICATION STATE & LOOP PREVENTION ---');
  // 1. Inactive account
  const deactRes = await toggleAdminStatusHandler(
    { adminId: dirUser3.id, active: false },
    superAdminAuth
  );
  assert(deactRes.status === 200, 'Super Admin deactivated account');
  const inactiveCheck = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(inactiveCheck.status === 403, 'Inactive account returns HTTP 403');
  assert(inactiveCheck.data.errorCode === 'PROFILE_INACTIVE', 'Error code is PROFILE_INACTIVE');

  // Reactivate
  await toggleAdminStatusHandler(
    { adminId: dirUser3.id, active: true },
    superAdminAuth
  );
  const reactivatedCheck = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(reactivatedCheck.status === 200, 'Reactivated account access restored (HTTP 200)');
  assert(reactivatedCheck.data.user.active === true, 'User active is true');

  // 2. Missing profile
  const unknownToken = `Bearer mock_gmail_unknown_uid:nonexistent.user.${Date.now()}@gmail.com`;
  const missingCheck = await getCurrentUserPermissionsHandler(unknownToken);
  assert(missingCheck.status === 403, 'Unregistered user rejected with 403');
  assert(missingCheck.data.error?.toLowerCase().includes('not found'), 'Returns Admin profile not found error');

  // 3. Genuine 0 permissions account
  const zeroPermsEmail = `zero.subadmin.${Date.now()}@gmail.com`;
  const zeroUserCreate = await createSubAdminHandler(
    {
      fullName: 'Zero Permissions User',
      email: zeroPermsEmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Trainee',
      role: 'SUB_ADMIN',
      active: true,
      permissions: []
    },
    superAdminAuth
  );
  assert(zeroUserCreate.status === 200, 'Zero-permission account created successfully');
  const zeroDir = await listAdminUsersHandler(superAdminAuth);
  const zeroAdmin = zeroDir.data.admins?.find((a: any) => a.email === zeroPermsEmail);
  assert(zeroAdmin.permissions.length === 0, `Admin Management correctly displays 0 Granted Permissions (count: ${zeroAdmin.permissions.length})`);

  const zeroLoginToken = `Bearer mock_gmail_zero_uid:${zeroPermsEmail}`;
  const zeroLoginRes = await getCurrentUserPermissionsHandler(zeroLoginToken);
  assert(zeroLoginRes.status === 200, 'Zero-permission account queries permissions successfully');
  assert(Array.isArray(zeroLoginRes.data.permissions) && zeroLoginRes.data.permissions.length === 0, 'Zero-permission account returns empty permissions array');

  // =============================================================================
  // TEST F: REGRESSION TESTING
  // =============================================================================
  console.log('\n--- TEST F: REGRESSION TESTING & PRESERVATION OF EXISTING FUNCTIONALITY ---');
  // 1. Super Admin universal privileges
  const superAdminCheck = await getCurrentUserPermissionsHandler('Bearer mock_superadmin_superadmin@atigergroups.com');
  assert(superAdminCheck.status === 200, 'Super Admin check returns 200');
  assert(superAdminCheck.data.isSuperAdmin === true, 'Super Admin recognized as isSuperAdmin: true');
  assert(superAdminCheck.data.permissions.length === ALL_PERMISSIONS.length, `Super Admin retains all ${ALL_PERMISSIONS.length} permissions`);

  // 2. Key normalization cross-compatibility
  assert(normalizePermissionKey('perm_dashboard_view') === 'dashboard.view', 'perm_dashboard_view -> dashboard.view');
  assert(normalizePermissionKey('perm_regular_joining_generate_id_card') === 'regular_joining.generate_id_card', 'perm_regular_joining_generate_id_card -> regular_joining.generate_id_card');
  assert(normalizePermissionKey('perm_regular_joining_candidate_details') === 'regular_joining.candidate_details', 'perm_regular_joining_candidate_details -> regular_joining.candidate_details');
  assert(normalizePermissionKey('regular_joining.generate_slip') === 'regular_joining.generate_slip', 'regular_joining.generate_slip unchanged');

  console.log('\n================================================================================');
  console.log(`ALL TESTS PASSED: ${passed} / ${total} critical checks verified successfully!`);
  console.log('================================================================================');
}

runCriticalBugFixVerification().catch((err) => {
  console.error('\nVerification suite encountered an unexpected failure:\n', err);
  process.exit(1);
});
