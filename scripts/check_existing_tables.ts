import { getSupabaseServer } from '../src/server/supabaseServer.js';

async function checkTables() {
  const sb = getSupabaseServer();
  const tables = [
    'admin_profiles',
    'permissions',
    'admin_permissions',
    'admin_audit_logs',
    'candidate_joining_applications',
    'regular_joining_forms',
    'payment_orders',
    'companies',
    'job_postings'
  ];

  for (const t of tables) {
    const { error, count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}:`, error ? `ERROR: ${error.message}` : `EXISTS (count: ${count})`);
  }
}

checkTables().catch(console.error);
