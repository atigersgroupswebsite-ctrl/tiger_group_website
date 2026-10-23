import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function testUpdateWithoutDesignation() {
  const sb = getSupabaseServer();
  // We check updating an imaginary ID with role DOCUMENT_VERIFIER without designation
  const { data, error, count } = await sb
    .from('admin_profiles')
    .update({ role: 'DOCUMENT_VERIFIER' })
    .eq('id', '00000000-0000-0000-0000-000000000001');

  console.log('Update without designation error:', error?.message || null);
}

testUpdateWithoutDesignation().catch(console.error);
