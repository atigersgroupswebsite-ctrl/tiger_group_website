// ==============================================================================
// File: scripts/test_sub_admin_complete_lifecycle.ts
// Description: Automated End-to-End Verification of Sub-Admin Provisioning, Directory,
//              Permissions, Status Toggle, Duplicate Prevention, and Persistence.
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// ==============================================================================

process.env.NODE_ENV = 'test';

import {
  listAdminUsersHandler,
  createSubAdminHandler,
  updateSubAdminPermissionsHandler,
  toggleAdminStatusHandler,
  resetSubAdminPasswordHandler,
  deleteSubAdminHandler
} from '../src/server/adminServer.js';
import type { PermissionKey } from '../src/types/rbac.js';

async function main() {
  console.log('================================================================');
  console.log('VERIFYING SUB-ADMIN COMPLETE LIFECYCLE & PERSISTENCE (TESTS A-I)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // Simulated authenticated Super Admin JWT header
  const superAdminUserId = 'a2cfac08-38d8-4907-b35d-1f0fa8c14701';
  const superAdminAuth = `Bearer mock_superadmin_${superAdminUserId}`;

  // TEST A: Create a new Sub-Admin with a unique test email
  console.log('--- TEST A: CREATE NEW SUB-ADMIN ---');
  const testSubAdminEmail = `test_subadmin_${Date.now()}@atigergroups.com`;
  const initialPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.view',
    'regular_joining.submissions',
    'regular_joining.verify',
    'regular_joining.generate_slip',
    'regular_joining.generate_id_card'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Vikramaditya Rathore',
      email: testSubAdminEmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Senior Joining Verification Officer',
      role: 'SUB_ADMIN',
      active: true,
      permissions: initialPerms
    },
    superAdminAuth
  );

  assert(createRes.status === 200, `createSubAdminHandler returned 200 (got ${createRes.status})`);
  assert(createRes.data.success === true, 'Response contains { success: true }');
  assert(Boolean(createRes.data.user?.id), `Created user has valid identifier: ${createRes.data.user?.id}`);
  assert(createRes.data.user?.email === testSubAdminEmail, 'Created user has correct email');
  assert(createRes.data.user?.role === 'SUB_ADMIN', 'Created user role is SUB_ADMIN');
  assert(createRes.data.user?.designation === 'Senior Joining Verification Officer', 'Designation saved correctly');
  assert(createRes.data.user?.permissions.length === 6, 'All 6 initial permissions returned');

  const createdUserId = createRes.data.user.id;

  // TEST B: Open the Sub-Admin Directory (GET /api/admin/users)
  console.log('\n--- TEST B: SUB-ADMIN DIRECTORY QUERY ---');
  const listRes = await listAdminUsersHandler(superAdminAuth);
  assert(listRes.status === 200, 'listAdminUsersHandler returned 200');
  assert(listRes.data.success === true, 'Directory response contains { success: true }');
  assert(Array.isArray(listRes.data.admins), 'Directory returns admins array');

  const foundUser = listRes.data.admins.find((a: any) => a.id === createdUserId || a.email === testSubAdminEmail);
  assert(Boolean(foundUser), `Newly created Sub-Admin (${testSubAdminEmail}) is present in directory`);
  assert(foundUser.email === testSubAdminEmail, `Directory shows registered corporate email: ${foundUser.email}`);
  assert(foundUser.designation === 'Senior Joining Verification Officer', `Directory shows designation: ${foundUser.designation}`);
  assert(foundUser.role === 'SUB_ADMIN', `Directory shows role: ${foundUser.role}`);
  assert(foundUser.active === true, `Directory shows active: ${foundUser.active}`);

  // TEST C: Check the displayed account count
  console.log('\n--- TEST C: SUB-ADMIN ACCOUNT COUNT ---');
  const subAdminsCount = listRes.data.admins.filter((a: any) => a.role === 'SUB_ADMIN').length;
  assert(subAdminsCount >= 1, `Sub-Admin count reflects persisted records (count: ${subAdminsCount} >= 1)`);
  assert(listRes.data.totalActive >= 1, `Total active reflects records (totalActive: ${listRes.data.totalActive})`);

  // TEST D: Admin Users Page view
  console.log('\n--- TEST D: ADMIN USERS VIEW ---');
  const adminUsersList = listRes.data.admins;
  const userInAdminList = adminUsersList.find((u: any) => u.id === createdUserId);
  assert(Boolean(userInAdminList), 'Newly created Sub-Admin is visible in Admin Users list');

  // TEST E: Permissions inspection
  console.log('\n--- TEST E: PERMISSIONS VERIFICATION ---');
  assert(
    Array.isArray(foundUser.permissions) && foundUser.permissions.length === 6,
    `Assigned permissions count is exactly 6 (got ${foundUser.permissions.length})`
  );
  assert(foundUser.permissions.includes('regular_joining.verify'), 'Includes regular_joining.verify');
  assert(foundUser.permissions.includes('regular_joining.generate_slip'), 'Includes regular_joining.generate_slip');

  // TEST F: Change a permission and save
  console.log('\n--- TEST F: PERMISSION UPDATE & ENFORCEMENT ---');
  const updatedPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.view',
    'regular_joining.submissions',
    'regular_joining.verify',
    'regular_joining.generate_slip',
    'regular_joining.generate_id_card',
    'regular_joining.export_excel' // 7th permission added
  ];

  const updatePermsRes = await updateSubAdminPermissionsHandler(
    {
      adminId: createdUserId,
      permissions: updatedPerms
    },
    superAdminAuth
  );

  assert(updatePermsRes.status === 200, 'updateSubAdminPermissionsHandler returned 200');
  assert(updatePermsRes.data.success === true, 'Permissions updated successfully');

  // TEST G: Refresh directory list (Persistence check)
  console.log('\n--- TEST G: REFRESH DIRECTORY & VERIFY PERSISTENCE ---');
  const refreshedList = await listAdminUsersHandler(superAdminAuth);
  const refreshedUser = refreshedList.data.admins.find((a: any) => a.id === createdUserId);
  assert(Boolean(refreshedUser), 'Sub-Admin persists after directory refresh');
  assert(refreshedUser.permissions.length === 7, `Sub-Admin has updated 7 permissions (got: ${refreshedUser.permissions.length})`);
  assert(refreshedUser.permissions.includes('regular_joining.export_excel'), 'New permission regular_joining.export_excel persists');

  // TEST G2: Toggle status to INACTIVE and back to ACTIVE
  console.log('\n--- TEST G2: TOGGLE ACTIVE / INACTIVE STATUS ---');
  const toggleRes = await toggleAdminStatusHandler(
    { adminId: createdUserId, active: false },
    superAdminAuth
  );
  assert(toggleRes.status === 200 && toggleRes.data.success === true, 'Deactivation returned 200 success');

  const deactiveCheck = await listAdminUsersHandler(superAdminAuth);
  const deactiveUser = deactiveCheck.data.admins.find((a: any) => a.id === createdUserId);
  assert(deactiveUser.active === false, 'Sub-Admin status reflects INACTIVE');

  // Reactivate
  const reactivateRes = await toggleAdminStatusHandler(
    { adminId: createdUserId, active: true },
    superAdminAuth
  );
  assert(reactivateRes.status === 200 && reactivateRes.data.success === true, 'Reactivation returned 200 success');

  // TEST G3: Reset Password
  console.log('\n--- TEST G3: PASSWORD RESET ---');
  const resetRes = await resetSubAdminPasswordHandler(
    {
      adminId: createdUserId,
      newPassword: 'NewTigerPassword@2026#',
      confirmPassword: 'NewTigerPassword@2026#'
    },
    superAdminAuth
  );
  assert(resetRes.status === 200 && resetRes.data.success === true, 'Password reset succeeded');

  // TEST H: Attempt to create another account using the same email
  console.log('\n--- TEST H: DUPLICATE EMAIL REJECTION ---');
  const duplicateRes = await createSubAdminHandler(
    {
      fullName: 'Duplicate User',
      email: testSubAdminEmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Duplicate Tester',
      role: 'SUB_ADMIN',
      permissions: ['dashboard.view']
    },
    superAdminAuth
  );
  assert(duplicateRes.status === 409, `Duplicate account creation safely rejected with 409 Conflict (got ${duplicateRes.status})`);
  assert(duplicateRes.data.success === false, 'Duplicate response contains { success: false }');

  // Clean up test user
  console.log('\n--- CLEANING UP TEST SUB-ADMIN ---');
  const deleteRes = await deleteSubAdminHandler({ adminId: createdUserId }, superAdminAuth);
  assert(deleteRes.status === 200 && deleteRes.data.success === true, 'Sub-Admin test account cleaned up');

  const postDeleteCheck = await listAdminUsersHandler(superAdminAuth);
  const deletedUser = postDeleteCheck.data.admins.find((a: any) => a.id === createdUserId);
  assert(!deletedUser, 'Deleted Sub-Admin is no longer present in directory');

  // TEST I: Verify existing Super Admin accounts
  console.log('\n--- TEST I: EXISTING FUNCTIONALITY INTEGRITY ---');
  const superAdminInDir = postDeleteCheck.data.admins.find((a: any) => a.role === 'SUPER_ADMIN');
  assert(Boolean(superAdminInDir), 'Super Admin profile continues to exist intact');
  assert(
    superAdminInDir.permissions.length === 36,
    `Super Admin retains all universal permissions (got ${superAdminInDir.permissions.length})`
  );

  console.log('\n================================================================');
  console.log(`ALL TESTS COMPLETED SUCCESSFULLY: ${passed} / ${total} tests passed!`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nLifecycle test failed:\n', err);
  process.exit(1);
});
