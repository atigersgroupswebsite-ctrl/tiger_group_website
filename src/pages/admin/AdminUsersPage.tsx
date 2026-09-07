// ==============================================================================
// File: src/pages/admin/AdminUsersPage.tsx
// Description: Official Internal Admin Directory for A TIGER GROUPS
// Access: SUPER_ADMIN only
// Features: List admin users, role management, invitation/creation, activation toggle
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  listAdminUsers,
  inviteAdminUser,
  toggleAdminStatus,
  type AdminDirectoryUser
} from '../../services/adminUsersService';
import type { AdminRole } from '../../types/database';
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
  Lock,
  Mail,
  Calendar,
  Clock,
  X
} from 'lucide-react';

const ROLE_CONFIG: Record<AdminRole, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#991B1B', bg: '#FEE2E2' },
  COORDINATOR: { label: 'Coordinator', color: '#1E40AF', bg: '#DBEAFE' },
  DOCUMENT_VERIFIER: { label: 'Doc Verifier', color: '#065F46', bg: '#D1FAE5' },
  ACCOUNTANT: { label: 'Accountant', color: '#92400E', bg: '#FEF3C7' }
};

export const AdminUsersPage: React.FC = () => {
  const { role, user: currentUser } = useAdminAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Add Admin Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalFullName, setModalFullName] = useState<string>('');
  const [modalEmail, setModalEmail] = useState<string>('');
  const [modalRole, setModalRole] = useState<AdminRole>('COORDINATOR');
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toggle status loading state (adminId -> boolean)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await listAdminUsers();
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load admin directory.');
      } else {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while fetching users.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (targetUser: AdminDirectoryUser) => {
    if (togglingId) return;

    if (targetUser.id === currentUser?.id && targetUser.active) {
      alert('Security Policy: You cannot deactivate your own active SUPER_ADMIN account.');
      return;
    }

    const nextStatus = !targetUser.active;
    const confirmMsg = nextStatus
      ? `Are you sure you want to activate access for ${targetUser.fullName}?`
      : `Are you sure you want to DEACTIVATE access for ${targetUser.fullName}? They will immediately be denied access to all /admin/* routes.`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingId(targetUser.id);
    setError(null);

    try {
      const res = await toggleAdminStatus(targetUser.id, nextStatus);
      if (!res.success) {
        alert(res.error || 'Failed to update user status.');
      } else {
        setSuccessMessage(`Access for ${targetUser.fullName} updated to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, active: nextStatus } : u))
        );
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSubmitting) return;

    if (!modalFullName.trim()) {
      setModalError('Full Name is required.');
      return;
    }

    if (!modalEmail.trim() || !modalEmail.includes('@')) {
      setModalError('A valid corporate email address is required.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      const res = await inviteAdminUser({
        fullName: modalFullName.trim(),
        email: modalEmail.trim().toLowerCase(),
        role: modalRole
      });

      if (!res.success || !res.data) {
        setModalError(res.error || 'Failed to authorize admin user.');
      } else {
        setIsModalOpen(false);
        setModalFullName('');
        setModalEmail('');
        setModalRole('COORDINATOR');
        setSuccessMessage(`Administrator ${res.data.email} successfully invited and authorized.`);
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setModalError(err.message || 'Error authorizing user.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.active) ||
      (statusFilter === 'INACTIVE' && !u.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <Lock size={44} style={{ color: '#991B1B', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
          RESTRICTED DIRECTORY ACCESS
        </h2>
        <p style={{ color: '#64748B', maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
          The Admin Directory is accessible exclusively to administrators with the <strong>SUPER_ADMIN</strong> role. Your account role is <strong>{role || 'RESTRICTED'}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ShieldCheck size={22} style={{ color: '#C5A880' }} />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F1B38' }}>
              ADMIN DIRECTORY
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>
            Internal governance portal to manage administrators, role assignments, and platform access.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#0F1B38',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <UserPlus size={16} />
          <span>ADD ADMIN</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button
            onClick={fetchUsers}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#991B1B', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar / Search & Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid #E2E8F0'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={15} style={{ color: '#64748B' }} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              backgroundColor: '#FFFFFF',
              color: '#334155'
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="DOCUMENT_VERIFIER">Doc Verifier</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              backgroundColor: '#FFFFFF',
              color: '#334155'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.5rem 0.75rem',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            color: '#475569',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginLeft: 'auto'
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Directory Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0F1B38', margin: '0 auto 0.75rem auto' }} />
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>Loading admin profiles...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
            <Users size={38} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1rem', color: '#1E293B', marginBottom: '0.25rem' }}>No Administrators Found</h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try clearing the search query or filters.'
                : 'Click "ADD ADMIN" to authorize your first administrator.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Administrator</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Last Access</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const roleCfg = ROLE_CONFIG[item.role] || { label: item.role, color: '#334155', bg: '#F1F5F9' };
                  const isCurrent = item.id === currentUser?.id;
                  const isToggling = togglingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: item.active ? '#0F1B38' : '#94A3B8',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}
                          >
                            {item.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{item.fullName}</span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: '#E2E8F0',
                                    color: '#475569',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 700
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail size={12} />
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            backgroundColor: roleCfg.bg,
                            color: roleCfg.color,
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>

                      {/* Active Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {item.active ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '20px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '20px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <XCircle size={12} />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} style={{ color: '#94A3B8' }} />
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>

                      {/* Last Access */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} style={{ color: '#94A3B8' }} />
                          <span>
                            {item.lastSignInAt
                              ? new Date(item.lastSignInAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : 'Never'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          disabled={isToggling || (isCurrent && item.active)}
                          title={isCurrent && item.active ? 'Cannot deactivate self' : undefined}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: `1px solid ${item.active ? '#FCA5A5' : '#86EFAC'}`,
                            backgroundColor: item.active ? '#FEF2F2' : '#F0FDF4',
                            color: item.active ? '#991B1B' : '#166534',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: isCurrent && item.active ? 'not-allowed' : 'pointer',
                            opacity: isCurrent && item.active ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isToggling ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : item.active ? (
                            'DEACTIVATE'
                          ) : (
                            'ACTIVATE'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} style={{ color: '#0F1B38' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F1B38' }}>
                  ADD ADMINISTRATOR
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAdmin} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {modalError && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  {modalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={modalFullName}
                  onChange={(e) => setModalFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh.sharma@atigergroups.com"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Administrative Role *
                </label>
                <select
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value as AdminRole)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="COORDINATOR">Coordinator (Operations Access)</option>
                  <option value="DOCUMENT_VERIFIER">Document Verifier (Verification Access)</option>
                  <option value="ACCOUNTANT">Accountant (Payment Reconciliation Access)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full Governance Access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    backgroundColor: '#0F1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>AUTHORIZING...</span>
                    </>
                  ) : (
                    <span>CONFIRM & AUTHORIZE</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
