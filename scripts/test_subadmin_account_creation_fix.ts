// ==============================================================================
// File: scripts/test_subadmin_account_creation_fix.ts
// Description: Targeted Verification Suite for Sub-Admin Email & Account Creation Fix
// Tests:
//   1. Create a Sub-Admin using a real Gmail address
//   2. Verify that the stored email matches the entered email
//   3. Confirm that the application does not generate an unintended email address
//   4. Assign permissions and save the account
//   5. Sign in using Gmail Magic Link (simulated with unique Supabase Auth UID)
//   6. Confirm that the existing Sub-Admin profile is reused
//   7. Confirm that no duplicate application profile is created
//   8. Confirm that the assigned permissions are loaded correctly
//   9. Sign in again and verify that no additional account is created
//   10. Verify that inactive accounts remain blocked
//   11. Verify that the main administrator and existing Sub-Admins continue to work
//   12. Verify duplicate creation prevention (same email rejected with 409)
// ==============================================================================

process.env.NODE_ENV = 'test';

import {
  createSubAdminHandler,
  getCurrentUserPermissionsHandler,
  updateSubAdminPermissionsHandler,
  toggleAdminStatusHandler,
  listAdminUsersHandler,
  deleteSubAdminHandler
} from '../src/server/adminServer.js';
import type { PermissionKey } from '../src/types/rbac.js';

async function runAccountCreationVerificationTests() {
  console.log('====================================================================');
  console.log('TASK VERIFICATION: SUB-ADMIN EMAIL/ACCOUNT CREATION FIX');
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
  // TEST 1: CREATE A SUB-ADMIN USING A REAL GMAIL ADDRESS
  // -----------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: CREATE SUB-ADMIN WITH REAL GMAIL & VERIFY STORED EMAIL ---');
  const targetGmail = `parvez.test.${Date.now()}@gmail.com`;
  const assignedPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Parvez Khan',
      email: targetGmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Joining Verification Specialist',
      role: 'SUB_ADMIN',
      active: true,
      permissions: assignedPerms
    },
    superAdminAuth
  );

  assert(createRes.status === 200, 'Sub-Admin created successfully (Status: 200)');
  assert(createRes.data.success === true, 'Sub-Admin response success: true');
  const provisionedUserId = createRes.data.user.id;
  assert(Boolean(provisionedUserId), `Provisioned profile ID created: ${provisionedUserId}`);

  // TEST 2: VERIFY THAT THE STORED EMAIL MATCHES THE ENTERED EMAIL
  assert(createRes.data.user.email === targetGmail, `Stored email matches entered email: ${createRes.data.user.email}`);

  // TEST 3: CONFIRM NO UNINTENDED EMAIL ADDRESS IS GENERATED
  assert(!createRes.data.user.email.includes('subadmin@atigergroups.com'), 'Email is NOT subadmin@atigergroups.com');
  assert(!createRes.data.user.email.includes('admin@atigergroups.com'), 'Email is NOT admin@atigergroups.com');
  assert(createRes.data.user.email === targetGmail.toLowerCase().trim(), 'Exact normalized email preserved');

  // TEST 4: VERIFY ASSIGNED PERMISSIONS AND DIRECTORY LISTING
  console.log('\n--- TEST 4: VERIFY DIRECTORY LISTING BEFORE LOGIN ---');
  const listBefore = await listAdminUsersHandler(superAdminAuth);
  assert(listBefore.status === 200, 'Admin directory queried successfully');
  const matchingBefore = (listBefore.data.admins || []).filter((a: any) => a.email === targetGmail);
  assert(matchingBefore.length === 1, `Exactly ONE account found in directory for ${targetGmail} (count: ${matchingBefore.length})`);
  assert(matchingBefore[0].permissions.length === assignedPerms.length, `Permissions count matches: ${assignedPerms.length}`);
  assert(matchingBefore[0].permissions.includes('regular_joining.generate_slip'), 'Assigned permission regular_joining.generate_slip present');

  // -----------------------------------------------------------------------------
  // TEST 5: SIGN IN USING GMAIL MAGIC LINK (DIFFERING SUPABASE AUTH UID)
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 5 & 6: GMAIL MAGIC LINK LOGIN & PROFILE REUSE ---');
  const supabaseAuthUid = `supabase-gmail-uid-${Date.now()}`;
  const gmailAuthToken = `Bearer mock_gmail_${supabaseAuthUid}:${targetGmail}`;

  const permRes1 = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permRes1.status === 200, 'Gmail Magic Link login returns 200');
  assert(permRes1.data.success === true, 'Login permissions query returns success: true');

  // TEST 6: CONFIRM EXISTING SUB-ADMIN PROFILE IS REUSED
  assert(permRes1.data.user.email === targetGmail, `Profile email matches original entered email: ${targetGmail}`);
  assert(permRes1.data.user.name === 'Parvez Khan', `Profile name matches original entered name: ${permRes1.data.user.name}`);
  assert(permRes1.data.user.designation === 'Joining Verification Specialist', `Profile designation preserved: ${permRes1.data.user.designation}`);
  assert(permRes1.data.user.role === 'SUB_ADMIN', 'Role is SUB_ADMIN');

  // TEST 7: CONFIRM THAT NO DUPLICATE APPLICATION PROFILE IS CREATED
  console.log('\n--- TEST 7: CONFIRM NO DUPLICATE APPLICATION PROFILE IN DIRECTORY ---');
  const listAfter1 = await listAdminUsersHandler(superAdminAuth);
  assert(listAfter1.status === 200, 'Directory queried after first login');
  const matchingAfter1 = (listAfter1.data.admins || []).filter(
    (a: any) => a.email === targetGmail || a.fullName === 'Parvez Khan'
  );
  assert(matchingAfter1.length === 1, `Directory has exactly ONE account for ${targetGmail} after login (count: ${matchingAfter1.length})`);
  assert(matchingAfter1[0].email === targetGmail, `Directory entry email is exactly ${targetGmail}`);
  assert(matchingAfter1[0].email !== 'N/A', 'Directory entry email is NOT N/A');

  // TEST 8: CONFIRM ASSIGNED PERMISSIONS LOADED CORRECTLY AFTER LOGIN
  console.log('\n--- TEST 8: CONFIRM ASSIGNED PERMISSIONS LOADED ---');
  const permsAfter1: string[] = permRes1.data.permissions;
  assert(permsAfter1.length === assignedPerms.length, `Expected ${assignedPerms.length} permissions, got ${permsAfter1.length}`);
  assert(permsAfter1.includes('dashboard.view'), 'Permissions include dashboard.view');
  assert(permsAfter1.includes('regular_joining.submissions'), 'Permissions include regular_joining.submissions');
  assert(permsAfter1.includes('regular_joining.generate_slip'), 'Permissions include regular_joining.generate_slip');
  assert(!permsAfter1.includes('admin_management.view'), 'Permissions correctly exclude admin_management.view');
  assert(!permsAfter1.includes('settings.view'), 'Permissions correctly exclude settings.view');

  // -----------------------------------------------------------------------------
  // TEST 9: SIGN IN AGAIN AND VERIFY NO ADDITIONAL ACCOUNT IS CREATED
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 9: REPEAT LOGIN & CONFIRM NO ADDITIONAL ACCOUNT ---');
  const permRes2 = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(permRes2.status === 200, 'Second Gmail login returns 200');
  assert(permRes2.data.success === true, 'Second login returns success: true');
  assert(permRes2.data.user.email === targetGmail, 'Second login email is still targetGmail');

  const listAfter2 = await listAdminUsersHandler(superAdminAuth);
  const matchingAfter2 = (listAfter2.data.admins || []).filter(
    (a: any) => a.email === targetGmail || a.fullName === 'Parvez Khan'
  );
  assert(matchingAfter2.length === 1, `Directory still has exactly ONE account after second login (count: ${matchingAfter2.length})`);
  assert(matchingAfter2[0].email === targetGmail, 'Email remains intact after second login');

  // -----------------------------------------------------------------------------
  // TEST 10: VERIFY THAT INACTIVE ACCOUNTS REMAIN BLOCKED
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 10: INACTIVE ACCOUNTS REMAIN BLOCKED ---');
  // Deactivate account using current mapped ID
  const activeUserId = matchingAfter2[0].id;
  const deactRes = await toggleAdminStatusHandler(
    { adminId: activeUserId, active: false },
    superAdminAuth
  );
  assert(deactRes.status === 200, 'Super Admin deactivated account');

  // Verify permissions endpoint blocks deactivated Sub-Admin
  const deactPermRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(deactPermRes.status === 403, `Deactivated account blocked with 403 (Status: ${deactPermRes.status})`);
  assert(deactPermRes.data.success === false, 'Deactivated query returns success: false');
  assert(
    deactPermRes.data.error?.toLowerCase().includes('inactive'),
    `Error message mentions inactive account: "${deactPermRes.data.error}"`
  );

  // Reactivate account
  const reactRes = await toggleAdminStatusHandler(
    { adminId: activeUserId, active: true },
    superAdminAuth
  );
  assert(reactRes.status === 200, 'Super Admin reactivated account');

  const reactPermRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  assert(reactPermRes.status === 200, 'Reactivated account access restored with 200');
  assert(reactPermRes.data.success === true, 'Reactivated account query returns success: true');

  // -----------------------------------------------------------------------------
  // TEST 11: VERIFY MAIN ADMINISTRATOR AND OTHER SUB-ADMINS CONTINUE TO WORK
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 11: VERIFY SUPER ADMIN & OTHER SUB-ADMINS CONTINUE TO WORK ---');
  const superAdminCheck = await getCurrentUserPermissionsHandler(superAdminAuth);
  assert(superAdminCheck.status === 200, 'Super Admin permissions endpoint returns 200');
  assert(superAdminCheck.data.user.role === 'SUPER_ADMIN', 'Super Admin role recognized');
  assert(superAdminCheck.data.isSuperAdmin === true, 'isSuperAdmin is true');
  assert(superAdminCheck.data.permissions.includes('admin_management.view'), 'Super Admin has admin_management.view');
  assert(superAdminCheck.data.permissions.includes('settings.view'), 'Super Admin has settings.view');

  // Verify other Sub-Admins in directory remain intact
  const finalDirectory = await listAdminUsersHandler(superAdminAuth);
  assert(finalDirectory.status === 200, 'Final directory query returns 200');
  assert(finalDirectory.data.admins.length >= 2, `Directory contains multiple accounts (count: ${finalDirectory.data.admins.length})`);
  const superInDir = finalDirectory.data.admins.find((a: any) => a.role === 'SUPER_ADMIN');
  assert(Boolean(superInDir), 'Super Admin is present in directory');

  // -----------------------------------------------------------------------------
  // TEST 12: DUPLICATE PREVENTION (SAME EMAIL REJECTED WITH 409)
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 12: DUPLICATE PREVENTION (SAME EMAIL REJECTED WITH 409) ---');
  const duplicateCreateRes = await createSubAdminHandler(
    {
      fullName: 'Parvez Khan Clone',
      email: targetGmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Clone',
      role: 'SUB_ADMIN',
      permissions: ['dashboard.view']
    },
    superAdminAuth
  );

  assert(duplicateCreateRes.status === 409, `Duplicate creation rejected with 409 (Status: ${duplicateCreateRes.status})`);
  assert(duplicateCreateRes.data.success === false, 'Duplicate creation returns success: false');
  assert(
    duplicateCreateRes.data.error?.toLowerCase().includes('already registered'),
    `Duplicate rejection explains account is already registered: "${duplicateCreateRes.data.error}"`
  );

  // Clean up test account
  await deleteSubAdminHandler({ adminId: activeUserId }, superAdminAuth);

  console.log('\n====================================================================');
  console.log(`ALL SUB-ADMIN ACCOUNT CREATION TESTS PASSED: ${passed}/${total} assertions verified!`);
  console.log('====================================================================\n');
}

runAccountCreationVerificationTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
