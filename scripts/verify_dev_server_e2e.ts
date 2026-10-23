async function verifyDevServerE2E() {
  console.log('================================================================================');
  console.log('E2E VERIFICATION AGAINST LIVE DEV SERVER (http://localhost:5173)');
  console.log('================================================================================\n');

  // Step 1: Login as Super Admin
  console.log('1. Logging in as Super Admin via /api/admin/users/login...');
  const loginRes = await fetch('http://localhost:5173/api/admin/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@atigergroups.com', password: 'TigerSecurePass@2026!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(`Super Admin login failed: ${JSON.stringify(loginData)}`);
  }
  const superToken = loginData.token;
  console.log('   -> Super Admin authenticated. Token received. Role:', loginData.profile?.role);

  const authHeader = `Bearer ${superToken}`;

  // Step 2: Query directory
  console.log('\n2. Querying directory as Super Admin via GET /api/admin/users...');
  const listRes1 = await fetch('http://localhost:5173/api/admin/users', {
    headers: { Authorization: authHeader }
  });
  const listData1 = await listRes1.json();
  console.log('   -> Status:', listRes1.status, 'Total admins in directory:', listData1.admins?.length);

  // Step 3: Create Sub-Admin with role COORDINATOR and 5 permissions
  const targetEmail = `e2e.subadmin.${Date.now()}@gmail.com`;
  const initial5Perms = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip'
  ];
  console.log(`\n3. Creating new Sub-Admin: ${targetEmail} (Role: COORDINATOR, 5 perms)...`);
  const createRes = await fetch('http://localhost:5173/api/admin/users/create-sub-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      fullName: 'Vikramaditya Rathore',
      email: targetEmail,
      initialPassword: 'TigerSecurePass@2026!',
      confirmPassword: 'TigerSecurePass@2026!',
      designation: 'Field Operations Lead',
      role: 'COORDINATOR',
      active: true,
      permissions: initial5Perms
    })
  });
  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Failed to create sub-admin: ${JSON.stringify(createData)}`);
  }
  const targetAdminId = createData.user?.id;
  console.log('   -> Created successfully. ID:', targetAdminId, 'Role:', createData.user?.role, 'Perms:', createData.user?.permissions?.length);

  // Step 4: Verify directory reflects COORDINATOR and 5 permissions (Simulating browser refresh)
  console.log('\n4. Re-fetching directory (simulating page reload)...');
  const listRes2 = await fetch('http://localhost:5173/api/admin/users', {
    headers: { Authorization: authHeader }
  });
  const listData2 = await listRes2.json();
  const createdInDir = listData2.admins?.find((a: any) => a.email === targetEmail);
  console.log('   -> Directory record:', {
    email: createdInDir?.email,
    role: createdInDir?.role,
    designation: createdInDir?.designation,
    permissionsCount: createdInDir?.permissions?.length
  });
  if (createdInDir?.role !== 'COORDINATOR') {
    throw new Error(`Role reverted! Expected COORDINATOR, got: ${createdInDir?.role}`);
  }
  if (createdInDir?.permissions?.length !== 5) {
    throw new Error(`Permissions reverted! Expected 5, got: ${createdInDir?.permissions?.length}`);
  }

  // Step 5: Super Admin updates role to DOCUMENT_VERIFIER and grants 7 permissions
  const updated7Perms = [
    'dashboard.view',
    'regular_joining.submissions',
    'regular_joining.candidate_details',
    'regular_joining.verify',
    'regular_joining.generate_slip',
    'documents.view',
    'documents.download'
  ];
  console.log('\n5. Updating sub-admin role to DOCUMENT_VERIFIER and 7 permissions...');
  const updateRes = await fetch('http://localhost:5173/api/admin/users/update-permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      adminId: targetAdminId,
      email: targetEmail,
      role: 'DOCUMENT_VERIFIER',
      designation: 'Senior Document Verifier',
      permissions: updated7Perms
    })
  });
  const updateData = await updateRes.json();
  console.log('   -> Update response:', {
    success: updateData.success,
    role: updateData.role,
    designation: updateData.designation,
    permissionsCount: updateData.permissions?.length
  });
  if (updateData.role !== 'DOCUMENT_VERIFIER') {
    throw new Error(`Updated role mismatch! Expected DOCUMENT_VERIFIER, got: ${updateData.role}`);
  }

  // Step 6: Reload directory from dev server to verify persistence
  console.log('\n6. Re-fetching directory after update (simulating page reload / reopening modal)...');
  const listRes3 = await fetch('http://localhost:5173/api/admin/users', {
    headers: { Authorization: authHeader }
  });
  const listData3 = await listRes3.json();
  const updatedInDir = listData3.admins?.find((a: any) => a.email === targetEmail);
  console.log('   -> Directory record after update:', {
    email: updatedInDir?.email,
    role: updatedInDir?.role,
    designation: updatedInDir?.designation,
    permissionsCount: updatedInDir?.permissions?.length
  });
  if (updatedInDir?.role !== 'DOCUMENT_VERIFIER') {
    throw new Error(`Role reverted after update! Expected DOCUMENT_VERIFIER, got: ${updatedInDir?.role}`);
  }
  if (updatedInDir?.permissions?.length !== 7) {
    throw new Error(`Permissions count reverted after update! Expected 7, got: ${updatedInDir?.permissions?.length}`);
  }

  // Step 7: Sub-Admin authenticates with their own credentials
  console.log('\n7. Sub-Admin logs in with their own account credentials...');
  const subLoginRes = await fetch('http://localhost:5173/api/admin/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: targetEmail, password: 'TigerSecurePass@2026!' })
  });
  const subLoginData = await subLoginRes.json();
  console.log('   -> Sub-Admin login response:', {
    success: subLoginData.success,
    role: subLoginData.profile?.role,
    permissionsCount: subLoginData.permissions?.length
  });
  if (subLoginData.profile?.role !== 'DOCUMENT_VERIFIER') {
    throw new Error(`Sub-Admin login profile role mismatch! Expected DOCUMENT_VERIFIER, got: ${subLoginData.profile?.role}`);
  }
  if (subLoginData.permissions?.length !== 7) {
    throw new Error(`Sub-Admin login permissions count mismatch! Expected 7, got: ${subLoginData.permissions?.length}`);
  }

  const subAdminToken = subLoginData.token;

  // Step 8: Sub-Admin queries /api/admin/users/me/permissions
  console.log('\n8. Sub-Admin verifies session permissions via GET /api/admin/users/me/permissions...');
  const meRes = await fetch('http://localhost:5173/api/admin/users/me/permissions', {
    headers: { Authorization: `Bearer ${subAdminToken}` }
  });
  const meData = await meRes.json();
  console.log('   -> /me/permissions response:', {
    success: meData.success,
    role: meData.role || meData.user?.role,
    permissionsCount: meData.permissions?.length
  });
  if ((meData.role || meData.user?.role) !== 'DOCUMENT_VERIFIER') {
    throw new Error(`/me/permissions role mismatch! Expected DOCUMENT_VERIFIER, got: ${meData.role}`);
  }
  if (meData.permissions?.length !== 7) {
    throw new Error(`/me/permissions count mismatch! Expected 7, got: ${meData.permissions?.length}`);
  }

  // Step 9: Super Admin queries directory again after Sub-Admin logged in
  console.log('\n9. Super Admin queries directory again to verify ZERO reversion after sub-admin session activity...');
  const listRes4 = await fetch('http://localhost:5173/api/admin/users', {
    headers: { Authorization: authHeader }
  });
  const listData4 = await listRes4.json();
  const finalInDir = listData4.admins?.find((a: any) => a.email === targetEmail);
  console.log('   -> Final directory record:', {
    email: finalInDir?.email,
    role: finalInDir?.role,
    designation: finalInDir?.designation,
    permissionsCount: finalInDir?.permissions?.length
  });
  if (finalInDir?.role !== 'DOCUMENT_VERIFIER') {
    throw new Error(`Role reverted after login! Expected DOCUMENT_VERIFIER, got: ${finalInDir?.role}`);
  }
  if (finalInDir?.permissions?.length !== 7) {
    throw new Error(`Permissions count reverted after login! Expected 7, got: ${finalInDir?.permissions?.length}`);
  }

  console.log('\n================================================================================');
  console.log('E2E VERIFICATION AGAINST LIVE DEV SERVER PASSED 100%!');
  console.log('================================================================================');
}

verifyDevServerE2E().catch((err) => {
  console.error('\nE2E verification failed:', err);
  process.exit(1);
});
