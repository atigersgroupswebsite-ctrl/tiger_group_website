import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function checkColumns() {
  const sb = getSupabaseServer();
  const cols = ['id', 'full_name', 'role', 'active', 'designation', 'created_by', 'created_at', 'updated_at', 'email'];
  for (const c of cols) {
    const res = await sb.from('admin_profiles').select(c).limit(1);
    console.log(`Column ${c}:`, res.error ? `ERROR: ${res.error.message}` : 'EXISTS');
  }
}

checkColumns().catch(console.error);
