import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function check() {
  const sb = getSupabaseServer();
  // Intentionally select non-existent column to see allowed columns in PostgREST error
  const r = await sb.from('admin_profiles').select('non_existent_column_for_test');
  console.log('Error message:', r.error?.message);
}

check().catch(console.error);
