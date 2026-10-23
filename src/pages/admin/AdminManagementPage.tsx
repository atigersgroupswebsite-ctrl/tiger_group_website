// ==============================================================================
// File: src/pages/admin/AdminManagementPage.tsx
// Description: Super Admin Sub-Admin Management & Granular RBAC Control Center
// Brand: A TIGER GROUPS — Super Admin User Management & Access Governance
// Security:
//   - Strictly Super Admin authorized
//   - Role templates (Joining Verification, HR, Reports, Custom)
//   - Granular module permissions with Select All / Deselect All / Module toggles
//   - Strong password complexity validator
//   - Non-repudiable audit log viewer
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  listSubAdmins,
  createSubAdmin,
  updateSubAdminPermissions,
  resetSubAdminPassword,
  toggleSubAdminStatus,
  deleteSubAdmin,
  fetchAdminAuditLogs
} from '../../services/adminManagementService';
import {
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
  ROLE_TEMPLATES,
  type PermissionKey,
  type ModuleKey,
  type SubAdminUser,
  type AdminAuditLogEntry
} from '../../types/rbac';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Key,
  Trash2,
  Power,
  Eye,
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { AdminBreadcrumbs } from '../../components/admin/AdminBreadcrumbs';

export const AdminManagementPage: React.FC = () => {
  const { user: currentUser } = useAdminAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'AUDIT'>('LIST');

  // Directory state
  const [admins, setAdmins] = useState<SubAdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Create Form State
  const [formFullName, setFormFullName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formDesignation, setFormDesignation] = useState<string>('');
  const [formInitialPassword, setFormInitialPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('JOINING_VERIFICATION_ADMIN');
  const [formPermissions, setFormPermissions] = useState<Set<PermissionKey>>(
    new Set(ROLE_TEMPLATES.JOINING_VERIFICATION_ADMIN.permissions)
  );
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals state
  const [viewingUser, setViewingUser] = useState<SubAdminUser | null>(null);
  const [editingPermsUser, setEditingPermsUser] = useState<SubAdminUser | null>(null);
  const [editingPermsSet, setEditingPermsSet] = useState<Set<PermissionKey>>(new Set());
  const [permsSaving, setPermsSaving] = useState<boolean>(false);
  const [permsError, setPermsError] = useState<string | null>(null);

  const [resettingUser, setResettingUser] = useState<SubAdminUser | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [togglingUser, setTogglingUser] = useState<SubAdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SubAdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Fetch directory list
  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSubAdmins();
      if (res.success && res.data) {
        setAdmins(res.data);
      } else {
        setError(res.error || 'Failed to fetch Sub-Admin directory.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with administration server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetchAdminAuditLogs();
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.active).length;
    const inactive = total - active;
    const subAdmins = admins.filter((a) => a.role === 'SUB_ADMIN').length;
    return { total, active, inactive, subAdmins };
  }, [admins]);

  // Filtered & Paginated records
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        admin.fullName.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        (admin.designation && admin.designation.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && admin.active) ||
        (statusFilter === 'INACTIVE' && !admin.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [admins, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredAdmins.length / pageSize) || 1;
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(start, start + pageSize);
  }, [filteredAdmins, currentPage]);

  // Role Template change handler in Create Form
  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const tmpl = ROLE_TEMPLATES[templateKey];
    if (tmpl) {
      setFormPermissions(new Set(tmpl.permissions));
    }
  };

  // Toggle single permission checkbox
  const toggleFormPermission = (key: PermissionKey) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setSelectedTemplate('CUSTOM_ADMIN');
  };

  // Module bulk select / deselect
  const toggleModulePermissions = (
    moduleName: ModuleKey,
    currentSet: Set<PermissionKey>,
    setter: React.Dispatch<React.SetStateAction<Set<PermissionKey>>>
  ) => {
    const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === moduleName).map((p) => p.key);
    const allSelected = modulePerms.every((k) => currentSet.has(k));

    setter((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePerms.forEach((k) => next.delete(k));
      } else {
        modulePerms.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  // Select / Deselect All
  const handleSelectAll = (setter: React.Dispatch<React.SetStateAction<Set<PermissionKey>>>) => {
    setter(new Set(ALL_PERMISSIONS.map((p) => p.key)));
  };

  const handleDeselectAll = (setter: React.Dispatch<React.SetStateAction<Set<PermissionKey>>>) => {
    setter(new Set());
  };

  // Create Sub-Admin Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;

    if (!formFullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('A valid corporate email address is required.');
      return;
    }
    if (!formInitialPassword) {
      setFormError('Initial password is required.');
      return;
    }
    if (formInitialPassword !== formConfirmPassword) {
      setFormError('Initial password and confirm password do not match.');
      return;
    }
    if (formInitialPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await createSubAdmin({
        fullName: formFullName.trim(),
        email: formEmail.trim().toLowerCase(),
        initialPassword: formInitialPassword,
        confirmPassword: formConfirmPassword,
        designation: formDesignation.trim() || 'Sub-Admin Executive',
        role: 'SUB_ADMIN',
        active: formActive,
        permissions: Array.from(formPermissions)
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create Sub-Admin account.');
      } else {
        setSuccessMessage(`Sub-Admin account for ${formEmail} created successfully with ${formPermissions.size} assigned permissions!`);
        // Reset form
        setFormFullName('');
        setFormEmail('');
        setFormDesignation('');
        setFormInitialPassword('');
        setFormConfirmPassword('');
        setFormPermissions(new Set(ROLE_TEMPLATES.JOINING_VERIFICATION_ADMIN.permissions));
        setSelectedTemplate('JOINING_VERIFICATION_ADMIN');
        if (res.data) {
          setAdmins((prev) => [res.data!, ...prev.filter((a) => a.id !== res.data!.id)]);
        }
        setActiveTab('LIST');
        await fetchDirectory();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setFormError(err.message || 'Error submitting account form.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Permissions Modal
  const openEditPermissionsModal = (target: SubAdminUser) => {
    setEditingPermsUser(target);
    setEditingPermsSet(new Set(target.permissions));
    setPermsError(null);
  };

  // Save Permissions Modal
  const handleSavePermissions = async () => {
    if (!editingPermsUser || permsSaving) return;
    setPermsSaving(true);
    setPermsError(null);

    try {
      const permsArray = Array.from(editingPermsSet);
      const res = await updateSubAdminPermissions(editingPermsUser.id, permsArray);
      if (!res.success) {
        setPermsError(res.error || 'Failed to update permissions.');
      } else {
        setSuccessMessage(`Permissions for ${editingPermsUser.fullName} updated successfully (${permsArray.length} active).`);
        setAdmins((prev) =>
          prev.map((a) => (a.id === editingPermsUser.id ? { ...a, permissions: permsArray } : a))
        );
        setEditingPermsUser(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setPermsError(err.message || 'Error updating permissions.');
    } finally {
      setPermsSaving(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (target: SubAdminUser) => {
    setResettingUser(target);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError(null);
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || resetSubmitting) return;

    if (!newPassword) {
      setResetError('New password is required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }

    setResetSubmitting(true);
    setResetError(null);

    try {
      const res = await resetSubAdminPassword(resettingUser.id, newPassword, confirmNewPassword);
      if (!res.success) {
        setResetError(res.error || 'Failed to reset password.');
      } else {
        setSuccessMessage(`Password successfully reset for ${resettingUser.fullName}. They can now log in with the new credentials.`);
        setResettingUser(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setResetError(err.message || 'Error updating password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Confirm Activate / Deactivate
  const handleConfirmToggleStatus = async () => {
    if (!togglingUser || actionLoading) return;
    setActionLoading(true);

    try {
      const nextStatus = !togglingUser.active;
      const res = await toggleSubAdminStatus(togglingUser.id, nextStatus);
      if (!res.success) {
        alert(res.error || 'Failed to update account status.');
      } else {
        setSuccessMessage(`Account for ${togglingUser.fullName} has been ${nextStatus ? 'ACTIVATED' : 'DEACTIVATED'}.`);
        setAdmins((prev) =>
          prev.map((a) => (a.id === togglingUser.id ? { ...a, active: nextStatus } : a))
        );
        setTogglingUser(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete Account
  const handleConfirmDelete = async () => {
    if (!deletingUser || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await deleteSubAdmin(deletingUser.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete Sub-Admin account.');
      } else {
        setSuccessMessage(`Sub-Admin account for ${deletingUser.fullName} permanently deleted.`);
        setAdmins((prev) => prev.filter((a) => a.id !== deletingUser.id));
        setDeletingUser(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting account.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumbs
        items={[
          { label: 'Dashboard', path: '/admin' },
          { label: 'Admin Management' }
        ]}
      />

      {/* Header Banner */}
      <div className="admin-page-header">
        <div className="admin-header-title-group">
          <div className="admin-header-icon-badge" style={{ backgroundColor: '#1E293B', color: '#F7D794' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="admin-page-title">Super Admin–Controlled Sub-Admin Management</h1>
            <p className="admin-page-subtitle">
              Authorize, configure granular module permissions, reset credentials, and monitor Sub-Admin access governance.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            className={`btn btn-sm ${activeTab === 'LIST' ? 'btn-navy' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Users size={15} />
            <span>Sub-Admin Directory ({admins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            className={`btn btn-sm ${activeTab === 'CREATE' ? 'btn-gold' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={15} />
            <span>Create Sub-Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`btn btn-sm ${activeTab === 'AUDIT' ? 'btn-navy' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <History size={15} />
            <span>Audit Activity Log</span>
          </button>

          <button
            type="button"
            onClick={fetchDirectory}
            className="btn btn-outline btn-sm"
            title="Refresh Directory"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Global Success Banner */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #10B981',
            color: '#065F46',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #EF4444',
            color: '#991B1B',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SUB-ADMIN DIRECTORY LIST                                           */}
      {/* ========================================================================= */}
      {activeTab === 'LIST' && (
        <>
          {/* Stat Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(15, 27, 56, 0.08)', color: '#0F1B38', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Admin Accounts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F1B38' }}>{stats.total}</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Accounts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>{stats.active}</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Inactive Accounts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991B1B' }}>{stats.inactive}</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(247, 215, 148, 0.25)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Sub-Admin Profiles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B45309' }}>{stats.subAdmins}</div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div style={{ background: '#FFFFFF', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ color: '#94A3B8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by full name, email address, or designation..."
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748B' }}>
                <Filter size={15} />
                <span>Role:</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="SUB_ADMIN">Sub-Admin</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="DOCUMENT_VERIFIER">Document Verifier</option>
                <option value="REGULAR_JOINING_OPERATOR">Joining Operator</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748B' }}>
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Sub-Admin Table */}
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Admin Name</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Email Address</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Assigned Role</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Assigned Permissions</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Account Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Created Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Last Login</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: '#0F1B38' }} />
                        <span>Loading Sub-Admin Directory...</span>
                      </td>
                    </tr>
                  ) : paginatedAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                        <ShieldCheck size={36} style={{ color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>No accounts found matching search filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAdmins.map((admin) => {
                      const isSelf = admin.id === currentUser?.id;
                      const isSuper = admin.role === 'SUPER_ADMIN';

                      return (
                        <tr key={admin.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          {/* Name & Designation */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#0F1B38' }}>{admin.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {admin.designation || (isSuper ? 'Executive Director' : 'Administrator')}
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{ padding: '0.85rem 1rem', color: '#1E293B', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {admin.email}
                          </td>

                          {/* Role */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isSuper ? '#FEE2E2' : admin.role === 'SUB_ADMIN' ? '#FEF3C7' : '#E0F2FE',
                                color: isSuper ? '#991B1B' : admin.role === 'SUB_ADMIN' ? '#92400E' : '#0369A1'
                              }}
                            >
                              {admin.role.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Permissions */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {isSuper ? (
                              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={13} />
                                <span>Universal (All Modules)</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEditPermissionsModal(admin)}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#0F1B38',
                                  cursor: 'pointer'
                                }}
                                title="Click to view & edit permissions"
                              >
                                {admin.permissions.length} Granted Permissions
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {admin.active ? (
                              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={12} />
                                <span>ACTIVE</span>
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <XCircle size={12} />
                                <span>INACTIVE</span>
                              </span>
                            )}
                          </td>

                          {/* Created */}
                          <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                            {admin.lastSignInAt ? new Date(admin.lastSignInAt).toLocaleString() : 'Never'}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setViewingUser(admin)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.25rem 0.45rem' }}
                                title="View Details Dossier"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit Permissions (Not editable for Super Admin) */}
                              {!isSuper && (
                                <button
                                  type="button"
                                  onClick={() => openEditPermissionsModal(admin)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '0.25rem 0.45rem', borderColor: '#F7D794', color: '#B45309' }}
                                  title="Edit Module Permissions"
                                >
                                  <Sliders size={13} />
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => openResetPasswordModal(admin)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.25rem 0.45rem' }}
                                title="Reset Sub-Admin Password"
                              >
                                <Key size={13} />
                              </button>

                              {/* Activate / Deactivate (Cannot deactivate self) */}
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setTogglingUser(admin)}
                                  className="btn btn-outline btn-sm"
                                  style={{
                                    padding: '0.25rem 0.45rem',
                                    color: admin.active ? '#B45309' : '#166534',
                                    borderColor: admin.active ? '#FCD34D' : '#86EFAC'
                                  }}
                                  title={admin.active ? 'Deactivate Account' : 'Activate Account'}
                                >
                                  <Power size={13} />
                                </button>
                              )}

                              {/* Delete Account (Cannot delete self or Super Admin) */}
                              {!isSelf && !isSuper && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingUser(admin)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '0.25rem 0.45rem', color: '#DC2626', borderColor: '#FECACA' }}
                                  title="Permanently Delete Sub-Admin Account"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Showing page {currentPage} of {totalPages} ({filteredAdmins.length} total entries)
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE SUB-ADMIN FORM                                              */}
      {/* ========================================================================= */}
      {activeTab === 'CREATE' && (
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.75rem', maxWidth: '950px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>Provision New Sub-Admin Account</h2>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                Set up administrative credentials and configure exact module authorization boundaries.
              </p>
            </div>
          </div>

          {formError && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit}>
            {/* Account Credentials Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. ramesh.sharma@atigergroups.com"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Designation / Operational Title
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="e.g. Senior Verification Officer / HR Executive"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Initial Account Status
                </label>
                <select
                  value={formActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setFormActive(e.target.value === 'ACTIVE')}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="ACTIVE">Active (Immediate Login Enabled)</option>
                  <option value="INACTIVE">Inactive (Pending Authorization)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={formInitialPassword}
                  onChange={(e) => setFormInitialPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 upper, 1 digit, 1 symbol"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Confirm Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  placeholder="Repeat initial password"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Role Templates Preset Selector */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F1B38' }}>Choose a Role Template Preset</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Preset serves as a starting point. Permissions can be individually customized below.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {Object.values(ROLE_TEMPLATES).map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.key;
                  return (
                    <button
                      key={tmpl.key}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.key)}
                      style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #0F1B38' : '1px solid #CBD5E1',
                        backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.825rem', color: isSelected ? '#0F1B38' : '#334155' }}>
                        {tmpl.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem', lineHeight: 1.3 }}>
                        {tmpl.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Permission Assignment Matrix */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>
                    Granular Permission Matrix ({formPermissions.size} Selected)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                    Select exactly which operational modules and actions this Sub-Admin is authorized to perform.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(setFormPermissions)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll(setFormPermissions)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Module Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {PERMISSION_MODULES.map((moduleName) => {
                  const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === moduleName);
                  const allModuleSelected = modulePerms.every((p) => formPermissions.has(p.key));

                  return (
                    <div
                      key={moduleName}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '1rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      {/* Module Header with Toggle */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #F1F5F9',
                          paddingBottom: '0.5rem',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>{moduleName}</span>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(moduleName, formPermissions, setFormPermissions)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {allModuleSelected ? 'Deselect Module' : 'Select Module'}
                        </button>
                      </div>

                      {/* Individual Checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {modulePerms.map((perm) => {
                          const isChecked = formPermissions.has(perm.key);
                          return (
                            <label
                              key={perm.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                fontSize: '0.78rem',
                                color: '#334155',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleFormPermission(perm.key)}
                                style={{ marginTop: '2px' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{perm.name}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{perm.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="btn btn-outline"
                disabled={formSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-navy"
                disabled={formSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>Provision Sub-Admin Account</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT ACTIVITY LOGS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT' && (
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>
                Administrative Audit Activity Log
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                Immutable security trail documenting Sub-Admin creations, permission updates, activations, and credential resets.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="btn btn-outline btn-sm"
              disabled={auditLoading}
            >
              <RefreshCw size={14} className={auditLoading ? 'animate-spin' : ''} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Action Event</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Target Account / ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                      <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                      <span>Loading audit history...</span>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                      <History size={32} style={{ color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                      <span>No administrative audit events recorded yet.</span>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F1B38' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {log.targetId || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW DETAILS DOSSIER                                             */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,56,0.7)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setViewingUser(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#0F1B38', color: '#F7D794', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>{viewingUser.fullName}</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{viewingUser.designation || 'Administrator'} • {viewingUser.email}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div><strong>Account ID:</strong> <span style={{ fontFamily: 'monospace' }}>{viewingUser.id}</span></div>
              <div><strong>Role:</strong> {viewingUser.role}</div>
              <div><strong>Status:</strong> {viewingUser.active ? 'ACTIVE' : 'INACTIVE'}</div>
              <div><strong>Created:</strong> {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : '—'}</div>
              <div><strong>Last Sign In:</strong> {viewingUser.lastSignInAt ? new Date(viewingUser.lastSignInAt).toLocaleString() : 'Never'}</div>
              <div><strong>Total Permissions:</strong> {viewingUser.permissions.length}</div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F1B38', marginBottom: '0.75rem' }}>
              Assigned Permissions Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {PERMISSION_MODULES.map((mod) => {
                const modPerms = ALL_PERMISSIONS.filter((p) => p.module === mod && viewingUser.permissions.includes(p.key));
                if (modPerms.length === 0) return null;
                return (
                  <div key={mod} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#F1F5F9', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: '#0F1B38', marginBottom: '0.25rem' }}>
                      {mod} ({modPerms.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {modPerms.map((p) => (
                        <span key={p.key} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setViewingUser(null)} className="btn btn-navy btn-sm">
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PERMISSIONS MODAL                                           */}
      {/* ========================================================================= */}
      {editingPermsUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,56,0.7)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setEditingPermsUser(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>
                Edit Permissions: {editingPermsUser.fullName}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                Toggle granular authority for {editingPermsUser.email}. Sub-Admins can only perform actions explicitly granted.
              </p>
            </div>

            {permsError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {permsError}
              </div>
            )}

            {/* Quick Bulk Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F1B38' }}>
                {editingPermsSet.size} Active Permissions Selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAll(setEditingPermsSet)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleDeselectAll(setEditingPermsSet)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Module Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {PERMISSION_MODULES.map((modName) => {
                const modPerms = ALL_PERMISSIONS.filter((p) => p.module === modName);
                const allSelected = modPerms.every((p) => editingPermsSet.has(p.key));

                return (
                  <div key={modName} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F1B38' }}>{modName}</span>
                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(modName, editingPermsSet, setEditingPermsSet)}
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        {allSelected ? 'Clear' : 'Select'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {modPerms.map((perm) => {
                        const checked = editingPermsSet.has(perm.key);
                        return (
                          <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setEditingPermsSet((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(perm.key)) next.delete(perm.key);
                                  else next.add(perm.key);
                                  return next;
                                });
                              }}
                            />
                            <span>{perm.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
              <button type="button" onClick={() => setEditingPermsUser(null)} className="btn btn-outline btn-sm" disabled={permsSaving}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="btn btn-navy btn-sm"
                disabled={permsSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {permsSaving && <Loader2 size={14} className="animate-spin" />}
                <span>Save Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD MODAL                                             */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,56,0.7)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '1.75rem', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setResettingUser(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F1B38' }}>Reset Sub-Admin Password</h3>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{resettingUser.fullName} ({resettingUser.email})</div>
              </div>
            </div>

            {resetError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 upper, 1 digit, 1 symbol"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResettingUser(null)} className="btn btn-outline btn-sm" disabled={resetSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-navy btn-sm"
                  disabled={resetSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {resetSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Set New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ACTIVATE / DEACTIVATE CONFIRMATION DIALOG                        */}
      {/* ========================================================================= */}
      {togglingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,56,0.7)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '1.75rem', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: togglingUser.active ? '#FEF2F2' : '#DCFCE7', color: togglingUser.active ? '#DC2626' : '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Power size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#0F1B38' }}>
              {togglingUser.active ? 'Deactivate Sub-Admin Account?' : 'Activate Sub-Admin Account?'}
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {togglingUser.active ? (
                <>
                  Are you sure you want to deactivate <strong>{togglingUser.fullName}</strong> ({togglingUser.email})?
                  They will immediately be denied access to all /admin/* portals and their active sessions will be terminated.
                </>
              ) : (
                <>
                  Are you sure you want to restore access for <strong>{togglingUser.fullName}</strong> ({togglingUser.email})?
                  They will regain access to their assigned modules immediately.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" onClick={() => setTogglingUser(null)} className="btn btn-outline btn-sm" disabled={actionLoading}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`btn btn-sm ${togglingUser.active ? 'btn-red' : 'btn-navy'}`}
                disabled={actionLoading}
                style={{
                  backgroundColor: togglingUser.active ? '#DC2626' : '#0F1B38',
                  color: '#FFFFFF'
                }}
              >
                {actionLoading ? 'Processing...' : togglingUser.active ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE ACCOUNT CONFIRMATION DIALOG                               */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,56,0.7)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '1.75rem', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#991B1B' }}>
              Delete Sub-Admin Account?
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              Are you sure you want to permanently delete the Sub-Admin account for <strong>{deletingUser.fullName}</strong> ({deletingUser.email})?
              This will remove all assigned permissions and delete their authentication credentials permanently. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDeletingUser(null)} className="btn btn-outline btn-sm" disabled={actionLoading}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn btn-sm"
                disabled={actionLoading}
                style={{ backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', fontWeight: 700 }}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
