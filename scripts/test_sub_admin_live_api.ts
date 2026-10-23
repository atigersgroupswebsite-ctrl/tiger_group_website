// ==============================================================================
// File: scripts/test_sub_admin_live_api.ts
// Description: Automated HTTP Live API Integration Test for Sub-Admin RBAC Endpoints
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// ==============================================================================

async function runLiveApiTests() {
  console.log('================================================================');
  console.log('TESTING LIVE VITE RBAC HTTP ENDPOINTS (http://localhost:5173)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, msg: string) {
    total++;
    if (cond) {
      console.log(`  [PASS] Test ${total}: ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  const BASE_URL = 'http://localhost:5173';

  // 1. GET /api/admin/permissions (Public catalog for admin UI)
  console.log('--- 1. PERMISSIONS CATALOG ENDPOINT ---');
  const permRes = await fetch(`${BASE_URL}/api/admin/permissions`);
  assert(permRes.status === 200, `GET /api/admin/permissions returned HTTP 200 (got: ${permRes.status})`);
  const permData = await permRes.json();
  assert(permData.success === true, 'Response contains { success: true }');
  assert(Array.isArray(permData.permissions) && permData.permissions.length === 36, `Returned all 36 permissions (count: ${permData.permissions.length})`);
  assert(Array.isArray(permData.modules) && permData.modules.length === 8, `Returned all 8 modules (count: ${permData.modules.length})`);

  // 2. GET /api/admin/users (Protected endpoint: requires Super Admin)
  console.log('\n--- 2. UNAUTHENTICATED PROTECTION ---');
  const unauthUsersRes = await fetch(`${BASE_URL}/api/admin/users`);
  assert(
    unauthUsersRes.status === 401 || unauthUsersRes.status === 403,
    `GET /api/admin/users without auth rejected with 401/403 (got: ${unauthUsersRes.status})`
  );

  // 3. POST /api/admin/users/create-sub-admin (Unauthorized creation attempt)
  console.log('\n--- 3. UNAUTHORIZED SUB-ADMIN CREATION ATTEMPT ---');
  const unauthCreateRes = await fetch(`${BASE_URL}/api/admin/users/create-sub-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Hacker User',
      email: 'hacker@example.com',
      initialPassword: 'TigerSecurePass@2026',
      role: 'SUB_ADMIN',
      permissions: ['admin_management.create']
    })
  });
  assert(
    unauthCreateRes.status === 401 || unauthCreateRes.status === 403,
    `POST /api/admin/users/create-sub-admin without auth rejected with 401/403 (got: ${unauthCreateRes.status})`
  );

  // 4. POST /api/admin/users/reset-password (Unauthorized reset attempt)
  console.log('\n--- 4. UNAUTHORIZED PASSWORD RESET ATTEMPT ---');
  const unauthResetRes = await fetch(`${BASE_URL}/api/admin/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUserId: 'some-user-id',
      newPassword: 'NewPassword@2026'
    })
  });
  assert(
    unauthResetRes.status === 401 || unauthResetRes.status === 403,
    `POST /api/admin/users/reset-password without auth rejected with 401/403 (got: ${unauthResetRes.status})`
  );

  // 5. POST /api/admin/users/delete (Unauthorized delete attempt)
  console.log('\n--- 5. UNAUTHORIZED ACCOUNT DELETION ATTEMPT ---');
  const unauthDeleteRes = await fetch(`${BASE_URL}/api/admin/users/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUserId: 'target-sub-admin-id'
    })
  });
  assert(
    unauthDeleteRes.status === 401 || unauthDeleteRes.status === 403,
    `POST /api/admin/users/delete without auth rejected with 401/403 (got: ${unauthDeleteRes.status})`
  );

  console.log('\n================================================================');
  console.log(`LIVE API INTEGRATION VERIFIED: ${passed} / ${total} tests passed!`);
  console.log('================================================================');
}

runLiveApiTests().catch((err) => {
  console.error('\nLive API test failed:\n', err);
  process.exit(1);
});
