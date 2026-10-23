import { getSupabaseServer, hasServiceRoleKey } from '../src/server/supabaseServer.js';

async function main() {
  console.log('hasServiceRoleKey:', hasServiceRoleKey());
  const sb = getSupabaseServer();

  // 1. Profiles
  const { data: profiles, error: pErr } = await sb.from('admin_profiles').select('*');
  console.log('admin_profiles query error:', pErr?.message || null);
  console.log('admin_profiles count:', profiles?.length);
  if (profiles && profiles.length > 0) {
    console.log('Profiles:');
    for (const p of profiles) {
      console.log(' - ID:', p.id, 'Role:', p.role, 'Active:', p.active, 'Name:', p.full_name, 'Designation:', p.designation);
    }
  }

  // 2. Permissions catalog
  const { data: perms, error: permErr } = await sb.from('permissions').select('id, permission_key, module_name');
  console.log('permissions catalog error:', permErr?.message || null);
  console.log('permissions catalog count:', perms?.length);

  // 3. Admin permissions junction table
  const { data: adminPerms, error: apErr } = await sb.from('admin_permissions').select('*');
  console.log('admin_permissions error:', apErr?.message || null);
  console.log('admin_permissions count:', adminPerms?.length);
  if (adminPerms && adminPerms.length > 0) {
    console.log('Admin permissions:');
    for (const ap of adminPerms) {
      console.log(' - admin_id:', ap.admin_id, 'perm_id:', ap.permission_id);
    }
  }
}

main().catch(console.error);
