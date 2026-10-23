import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function testRoleConstraint() {
  const sb = getSupabaseServer();
  // We try inserting a fake uuid with different roles to see check constraint errors
  const testRoles = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUB_ADMIN',
    'COORDINATOR',
    'DOCUMENT_VERIFIER',
    'ACCOUNTANT',
    'REGULAR_JOINING_OPERATOR',
    'INVALID_ROLE_XYZ'
  ];

  for (const r of testRoles) {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await sb.from('admin_profiles').insert({
      id: fakeId,
      full_name: 'Test Role Check',
      role: r,
      active: true
    });
    console.log(`Role ${r}:`, res.error?.message);
    // Cleanup if somehow inserted
    if (!res.error) {
      await sb.from('admin_profiles').delete().eq('id', fakeId);
    }
  }
}

testRoleConstraint().catch(console.error);
