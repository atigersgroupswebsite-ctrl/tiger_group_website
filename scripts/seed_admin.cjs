const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || 'https://bhfxqtaesvfsbdckgeka.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function createAdmin() {
  const email = 'admin@atigergroups.com';
  const password = 'TigerAdmin@2026!';

  console.log('Creating admin auth user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'A Tiger Global Administrator' }
  });

  if (error) {
    console.error('Error creating auth user:', error);
    return;
  }

  const userId = data.user.id;
  console.log('User created with id:', userId);

  // Insert into admin_profiles
  const { error: profileError } = await supabase.from('admin_profiles').upsert({
    id: userId,
    full_name: 'A Tiger Global Administrator',
    role: 'SUPER_ADMIN',
    active: true
  });

  if (profileError) {
    console.error('Error inserting admin profile:', profileError);
  } else {
    console.log('Admin profile successfully configured for SUPER_ADMIN!');
  }
}

createAdmin().catch(console.error);
