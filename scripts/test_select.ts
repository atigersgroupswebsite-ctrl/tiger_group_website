import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function testSelect() {
  const sb = getSupabaseServer();
  const res1 = await sb.from('permissions').select('id');
  console.log('permissions:', res1.error?.message || `success (${res1.data?.length} rows)`);

  const res2 = await sb.from('admin_permissions').select('id');
  console.log('admin_permissions:', res2.error?.message || `success (${res2.data?.length} rows)`);

  const res3 = await sb.from('admin_profiles').select('id, role, full_name');
  console.log('admin_profiles:', res3.error?.message || `success (${res3.data?.length} rows)`);
}

testSelect().catch(console.error);
