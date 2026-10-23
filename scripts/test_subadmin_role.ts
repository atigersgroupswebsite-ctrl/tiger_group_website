import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function testSubAdminRole() {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('admin_profiles')
    .update({ role: 'SUB_ADMIN' })
    .eq('id', '00000000-0000-0000-0000-000000000001');

  console.log('Update SUB_ADMIN role error:', error?.message || null);
}

testSubAdminRole().catch(console.error);
