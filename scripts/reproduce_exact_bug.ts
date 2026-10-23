import {
  createSubAdminHandler,
  updateSubAdminPermissionsHandler,
  listAdminUsersHandler,
  getCurrentUserPermissionsHandler
} from '../src/server/adminServer.js';
import type { PermissionKey } from '../src/types/rbac.js';

process.env.NODE_ENV = 'test';

async function runTest() {
  const superAdminAuth = 'Bearer mock_superadmin_superadmin@atigergroups.com';
  const testEmail = `bug.test.${Date.now()}@gmail.com`;

  console.log('=== TEST 1: CREATE SUB-ADMIN WITH ROLE COORDINATOR ===');
  const initialPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Anita Sharma',
      email: testEmail,
      initialPassword: 'TigerSecure@2026!',
      confirmPassword: 'TigerSecure@2026!',
      designation: 'Operations Coordinator',
      role: 'COORDINATOR',
      active: true,
      permissions: initialPerms
    },
    superAdminAuth
  );

  console.log('Created User Role:', createRes.data?.user?.role);
  console.log('Created User Permissions Count:', createRes.data?.user?.permissions?.length);
  const adminId = createRes.data?.user?.id;

  console.log('\n=== TEST 2: QUERY DIRECTORY IMMEDIATELY AFTER CREATE ===');
  const dir1 = await listAdminUsersHandler(superAdminAuth);
  const found1 = dir1.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory after create:', {
    role: found1?.role,
    permsCount: found1?.permissions?.length,
    perms: found1?.permissions
  });

  console.log('\n=== TEST 3: UPDATE ROLE TO DOCUMENT_VERIFIER AND ADD PERMISSIONS ===');
  // Notice: what if client calls with legacy signature (only adminId and permissions) vs with role?
  const updatedPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip',
    'documents.view',
    'documents.download'
  ];

  const updateRes = await updateSubAdminPermissionsHandler(
    {
      adminId,
      // What if email is missing (as was sent by AdminManagementPage)?
      // email: testEmail,
      role: 'DOCUMENT_VERIFIER',
      permissions: updatedPerms
    },
    superAdminAuth
  );
  console.log('Update result:', updateRes.data?.success, 'Returned Role:', updateRes.data?.role, 'Returned Perms Count:', updateRes.data?.permissions?.length);

  console.log('\n=== TEST 4: DIRECTORY AFTER UPDATE ===');
  const dir2 = await listAdminUsersHandler(superAdminAuth);
  const found2 = dir2.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory after update:', {
    role: found2?.role,
    permsCount: found2?.permissions?.length,
    perms: found2?.permissions
  });

  console.log('\n=== TEST 5: SUB-ADMIN LOGS IN WITH GMAIL (DIFFERENT SUPABASE AUTH UID) ===');
  const gmailAuthToken = `Bearer mock_gmail_new_auth_uid_${Date.now()}:${testEmail}`;
  const loginRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  console.log('Login result:', {
    role: loginRes.data?.role,
    userRole: loginRes.data?.user?.role,
    permsCount: loginRes.data?.permissions?.length,
    perms: loginRes.data?.permissions
  });

  console.log('\n=== TEST 6: DIRECTORY AFTER SUB-ADMIN GMAIL LOGIN ===');
  const dir3 = await listAdminUsersHandler(superAdminAuth);
  const found3 = dir3.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory after login:', {
    id: found3?.id,
    role: found3?.role,
    permsCount: found3?.permissions?.length,
    perms: found3?.permissions
  });
}

runTest().catch(console.error);
