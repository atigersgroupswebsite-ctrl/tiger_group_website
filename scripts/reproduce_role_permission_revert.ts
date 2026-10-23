import {
  listAdminUsersHandler,
  createSubAdminHandler,
  updateSubAdminPermissionsHandler,
  getCurrentUserPermissionsHandler,
  adminLoginHandler
} from '../src/server/adminServer.js';
import type { PermissionKey } from '../src/types/rbac.js';

process.env.NODE_ENV = 'test';

async function reproduce() {
  console.log('=== STEP 1: CREATE SUB-ADMIN WITH ROLE AND PERMISSIONS ===');
  const superAdminAuth = 'Bearer mock_superadmin_superadmin@atigergroups.com';
  const testEmail = `revert.test.${Date.now()}@gmail.com`;

  const initialPerms: PermissionKey[] = [
    'dashboard.view',
    'regular_joining.submissions',
    'employees.view'
  ];

  const createRes = await createSubAdminHandler(
    {
      fullName: 'Vikram Singh',
      email: testEmail,
      initialPassword: 'TigerAdmin@2026!',
      confirmPassword: 'TigerAdmin@2026!',
      designation: 'Operations Lead',
      role: 'COORDINATOR',
      active: true,
      permissions: initialPerms
    },
    superAdminAuth
  );

  console.log('Create Response:', createRes.status, createRes.data?.success, 'Assigned Role:', createRes.data?.user?.role);
  const subAdminId = createRes.data?.user?.id;

  console.log('\n=== STEP 2: CHECK DIRECTORY AFTER CREATION ===');
  const list1 = await listAdminUsersHandler(superAdminAuth);
  const found1 = list1.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory Entry 1:', {
    id: found1?.id,
    email: found1?.email,
    role: found1?.role,
    permissionsCount: found1?.permissions?.length,
    permissions: found1?.permissions
  });

  console.log('\n=== STEP 3: UPDATE PERMISSIONS AND ROLE (ASSIGNING NEW PERMISSIONS) ===');
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
      adminId: subAdminId,
      email: testEmail,
      role: 'DOCUMENT_VERIFIER',
      permissions: updatedPerms
    },
    superAdminAuth
  );
  console.log('Update Response:', updateRes.status, updateRes.data?.success, 'Assigned Role:', updateRes.data?.role, 'Count:', updateRes.data?.permissions?.length);

  console.log('\n=== STEP 4: CHECK DIRECTORY AFTER UPDATE ===');
  const list2 = await listAdminUsersHandler(superAdminAuth);
  const found2 = list2.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory Entry 2:', {
    id: found2?.id,
    email: found2?.email,
    role: found2?.role,
    permissionsCount: found2?.permissions?.length,
    permissions: found2?.permissions
  });

  console.log('\n=== STEP 5: SUB-ADMIN LOGS IN VIA GMAIL / CURRENT USER PERMISSIONS ===');
  const gmailAuthToken = `Bearer mock_gmail_uid_${Date.now()}:${testEmail}`;
  const permRes = await getCurrentUserPermissionsHandler(gmailAuthToken);
  console.log('Permissions on Login:', {
    status: permRes.status,
    role: permRes.data?.role,
    userRole: permRes.data?.user?.role,
    permissionsCount: permRes.data?.permissions?.length,
    permissions: permRes.data?.permissions
  });

  console.log('\n=== STEP 6: CHECK DIRECTORY AFTER LOGIN ===');
  const list3 = await listAdminUsersHandler(superAdminAuth);
  const found3 = list3.data?.admins?.find((a: any) => a.email === testEmail);
  console.log('Directory Entry 3:', {
    id: found3?.id,
    email: found3?.email,
    role: found3?.role,
    permissionsCount: found3?.permissions?.length,
    permissions: found3?.permissions
  });

  console.log('\n=== STEP 7: DIRECT PASSWORD LOGIN (IF SUB-ADMIN LOGS IN VIA DIRECT CREDENTIALS) ===');
  const loginRes = await adminLoginHandler({
    email: testEmail,
    password: 'TigerAdmin@2026!'
  });
  console.log('Direct Login Result:', {
    status: loginRes.status,
    role: loginRes.data?.profile?.role,
    permissionsCount: loginRes.data?.permissions?.length,
    permissions: loginRes.data?.permissions
  });
}

reproduce().catch(console.error);
