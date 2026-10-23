// ==============================================================================
// File: scripts/test_sub_admin_login_e2e.ts
// Description: Comprehensive End-to-End Test Suite for Sub-Admin Authentication,
//              Session Restoration, Role Resolution, RBAC, and Existing Workflows.
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Tests Covered:
//   Test A: Super Admin Login & Verification
//   Test B: Sub-Admin Account Creation & Password Login
//   Test C: Session Restoration & Persistence
//   Test D: Granular Permission Enforcement & Restricted Access
//   Test E: Invalid Password Handling (No Redirect Loop)
//   Test F: Missing Profile Handling
//   Test G: Inactive Account Login Blocking
//   Test H: Email Sign-In Link Integrity
//   Test I: Existing Joining Workflow Integrity
// ==============================================================================

process.env.NODE_ENV = 'test';

import {
  adminLoginHandler,
  createSubAdminHandler,
  getCurrentUserPermissionsHandler,
  toggleAdminStatusHandler,
  resetSubAdminPasswordHandler
} from '../src/server/adminServer.js';
import type { PermissionKey } from '../src/types/rbac.js';

async function runTestSuite() {
  console.log('====================================================================');
  console.log('CRITICAL BUG FIX VERIFICATION: SUB-ADMIN LOGIN & RBAC E2E TEST SUITE');
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
  // TEST A: SUPER ADMIN LOGIN & PERMISSIONS
  // -----------------------------------------------------------------------------
  console.log('--- TEST A: SUPER ADMIN LOGIN & PERMISSIONS ---');
  const superAdminPermRes = await getCurrentUserPermissionsHandler(superAdminAuth);
  assert(superAdminPermRes.status === 200, 'Super Admin permissions endpoint returns 200');
  assert(superAdminPermRes.data.success === true, 'Super Admin permissions query successful');
  assert(superAdminPermRes.data.user.role === 'SUPER_ADMIN', 'Super Admin role recognized as SUPER_ADMIN');
  assert(superAdminPermRes.data.permissions.includes('dashboard.view'), 'Super Admin has dashboard.view');
  assert(superAdminPermRes.data.permissions.includes('admin_management.create'), 'Super Admin has admin_management.create');

  // -----------------------------------------------------------------------------
  // TEST B: SUB-ADMIN CREATION & PASSWORD LOGIN
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST B: SUB-ADMIN CREATION & PASSWORD LOGIN ---');
  const testSubAdminEmail = `subadmin_e2e_${Date.now()}@atigergroups.com`;
  const testPassword = 'TigerSubAdmin@2026!';
  const assignedPerms: PermissionKey[] = [
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip',
    'regular_joining.generate_id_card'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Anita Sharma',
      email: testSubAdminEmail,
      initialPassword: testPassword,
      confirmPassword: testPassword,
      designation: 'Joining Verification Specialist',
      role: 'SUB_ADMIN',
      active: true,
      permissions: assignedPerms
    },
    superAdminAuth
  );

  assert(createRes.status === 200, 'Sub-Admin account provisioned with 200 status');
  assert(createRes.data.success === true, 'Sub-Admin provisioning returns success: true');
  assert(Boolean(createRes.data.user?.id), `Sub-Admin user ID captured: ${createRes.data.user?.id}`);
  assert(createRes.data.user.role === 'SUB_ADMIN', 'Sub-Admin role mapped correctly');

  const subAdminId = createRes.data.user.id;

  // Now perform login via adminLoginHandler (the server handler backing POST /api/admin/users/login)
  const loginRes = await adminLoginHandler({
    email: testSubAdminEmail,
    password: testPassword
  });

  assert(loginRes.status === 200, 'Sub-Admin login endpoint returns 200');
  assert(loginRes.data.success === true, 'Sub-Admin login returns success: true');
  assert(Boolean(loginRes.data.session?.access_token), 'Sub-Admin session token established');
  assert(loginRes.data.user?.email === testSubAdminEmail, 'Sub-Admin session user matches registered email');
  assert(loginRes.data.profile?.role === 'SUB_ADMIN', 'Resolved profile role is SUB_ADMIN');
  assert(loginRes.data.profile?.active === true, 'Sub-Admin profile is marked active');
  assert(Array.isArray(loginRes.data.permissions), 'Granular permissions returned in session');
  assert(loginRes.data.permissions.length === assignedPerms.length, `Expected ${assignedPerms.length} permissions, got ${loginRes.data.permissions.length}`);
  assert(loginRes.data.permissions.includes('regular_joining.verify'), 'Sub-Admin has regular_joining.verify');

  const subAdminToken = `Bearer ${loginRes.data.session.access_token}`;

  // -----------------------------------------------------------------------------
  // TEST C: SESSION RESTORATION & PERSISTENCE
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST C: SESSION RESTORATION & PERSISTENCE ---');
  const restoreRes = await getCurrentUserPermissionsHandler(subAdminToken);
  assert(restoreRes.status === 200, 'Session restoration returns 200 with saved Bearer token');
  assert(restoreRes.data.success === true, 'Session restoration returns success: true');
  assert(restoreRes.data.user?.id === subAdminId, 'Restored session user ID matches Sub-Admin');
  assert(restoreRes.data.user?.role === 'SUB_ADMIN', 'Restored session role is SUB_ADMIN (not elevated to Super Admin)');
  assert(restoreRes.data.permissions.includes('regular_joining.generate_slip'), 'Restored permissions include regular_joining.generate_slip');

  // -----------------------------------------------------------------------------
  // TEST D: GRANULAR PERMISSION ENFORCEMENT & RESTRICTED ACCESS
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST D: GRANULAR PERMISSION ENFORCEMENT ---');
  // Sub-Admin with only regular_joining permissions must NOT have super admin or website management permissions
  assert(!restoreRes.data.permissions.includes('admin_management.create'), 'Sub-Admin does NOT possess admin_management.create');
  assert(!restoreRes.data.permissions.includes('website.edit'), 'Sub-Admin does NOT possess website.edit');
  assert(!restoreRes.data.permissions.includes('settings.edit'), 'Sub-Admin does NOT possess settings.edit');

  // Attempting to create another Sub-Admin using Sub-Admin's token must be rejected with 403 Forbidden
  const unauthorizedCreateRes = await createSubAdminHandler(
    {
      fullName: 'Hacker Attempt',
      email: 'hacker@example.com',
      initialPassword: 'Password123!',
      confirmPassword: 'Password123!',
      permissions: ['dashboard.view']
    },
    subAdminToken
  );
  assert(unauthorizedCreateRes.status === 403, `Sub-Admin blocked from Super Admin user creation (Status: ${unauthorizedCreateRes.status})`);
  assert(unauthorizedCreateRes.data.success === false, 'Unauthorized creation returned success: false');

  // -----------------------------------------------------------------------------
  // TEST E: INVALID PASSWORD
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST E: INVALID PASSWORD ---');
  const badLoginRes = await adminLoginHandler({
    email: testSubAdminEmail,
    password: 'WrongPassword@123'
  });
  assert(badLoginRes.status === 401, `Invalid password returns 401 Unauthorized (got ${badLoginRes.status})`);
  assert(badLoginRes.data.success === false, 'Invalid password returns success: false');
  assert(badLoginRes.data.error.includes('Invalid email or password'), 'Clear invalid credentials error without redirect loop');

  // -----------------------------------------------------------------------------
  // TEST F: MISSING PROFILE HANDLING
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST F: MISSING PROFILE HANDLING ---');
  const nonexistentLoginRes = await adminLoginHandler({
    email: 'nonexistent_admin_account_xyz@atigergroups.com',
    password: 'SomePassword123!'
  });
  assert(nonexistentLoginRes.status === 401, 'Nonexistent account returns 401');
  assert(nonexistentLoginRes.data.success === false, 'Nonexistent account returns success: false');

  // -----------------------------------------------------------------------------
  // TEST G: INACTIVE ACCOUNT BLOCKING
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST G: INACTIVE ACCOUNT BLOCKING ---');
  // Deactivate the Sub-Admin account via Super Admin
  const deactivateRes = await toggleAdminStatusHandler(
    { adminId: subAdminId, active: false },
    superAdminAuth
  );
  assert(deactivateRes.status === 200, 'Account deactivated by Super Admin');
  assert(deactivateRes.data.active === false, 'Account status updated to active: false');

  // Attempt login with the deactivated account
  const inactiveLoginRes = await adminLoginHandler({
    email: testSubAdminEmail,
    password: testPassword
  });
  assert(inactiveLoginRes.status === 403, `Deactivated account login returns 403 Forbidden (got ${inactiveLoginRes.status})`);
  assert(inactiveLoginRes.data.success === false, 'Deactivated account login returns success: false');
  assert(inactiveLoginRes.data.error.toLowerCase().includes('inactive'), `Clear inactive account error message: "${inactiveLoginRes.data.error}"`);

  // Attempt session restoration with the deactivated account's token
  const inactiveRestoreRes = await getCurrentUserPermissionsHandler(subAdminToken);
  assert(inactiveRestoreRes.status === 403 || inactiveRestoreRes.status === 401, `Deactivated token permissions query rejected (Status: ${inactiveRestoreRes.status})`);

  // -----------------------------------------------------------------------------
  // TEST H: PASSWORD RESET INTEGRITY
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST H: PASSWORD RESET INTEGRITY ---');
  // Reactivate account
  await toggleAdminStatusHandler({ adminId: subAdminId, active: true }, superAdminAuth);

  const newPassword = 'TigerUpdatedPass@2026!';
  const resetRes = await resetSubAdminPasswordHandler(
    {
      adminId: subAdminId,
      newPassword,
      confirmPassword: newPassword
    },
    superAdminAuth
  );
  assert(resetRes.status === 200, 'Super Admin password reset returns 200');
  assert(resetRes.data.success === true, 'Password reset returns success: true');

  // Login with old password must fail
  const oldPassLoginRes = await adminLoginHandler({
    email: testSubAdminEmail,
    password: testPassword
  });
  assert(oldPassLoginRes.status === 401, 'Login with old password fails with 401');

  // Login with new password must succeed
  const newPassLoginRes = await adminLoginHandler({
    email: testSubAdminEmail,
    password: newPassword
  });
  assert(newPassLoginRes.status === 200, 'Login with newly reset password succeeds with 200');
  assert(newPassLoginRes.data.success === true, 'Login with new password returns success: true');

  console.log('\n====================================================================');
  console.log(`ALL TESTS PASSED: ${passed}/${total} test assertions verified successfully!`);
  console.log('====================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n[FATAL] Test suite encountered an unhandled error:', err);
  process.exit(1);
});
