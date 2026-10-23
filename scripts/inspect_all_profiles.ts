import { getSupabaseClient } from '../src/server/supabaseServer.js';

async function listAll() {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('admin_profiles').select('*');
  console.log('Error:', error);
  console.log('Count:', data?.length);
  console.log('Data:', JSON.stringify(data, null, 2));
}

listAll().catch(console.error);
