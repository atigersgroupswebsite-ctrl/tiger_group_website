// ==============================================================================
// File: src/pages/admin/AdminJoiningSettingsPage.tsx
// Description: Joining Form Configuration & Field Governance Suite
// Brand: A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY
// Access Governance:
//   - SUPER_ADMIN: Full configuration access (toggle required/optional, enable/disable, edit labels, create/delete custom fields)
//   - COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT: Read-only observation mode
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Lock,
  Search,
  Check,
  X
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import {
  getJoiningFieldConfigs,
  updateFieldRequirement,
  toggleFieldEnabled,
  updateFieldConfig,
  createCustomField,
  deleteCustomField,
  type CreateCustomFieldInput
} from '../../services/joiningConfigService';
import type {
  JoiningFieldConfig,
  ConfigurableSection,
  ConfigurableFieldType
} from '../../types/joining';

type TabCategory =
  | 'ALL'
  | 'personal'
  | 'address'
  | 'bank'
  | 'education_family'
  | 'documents'
  | 'declarations'
  | 'custom';

export const AdminJoiningSettingsPage: React.FC = () => {
  const { role } = useAdminAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [configs, setConfigs] = useState<JoiningFieldConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<JoiningFieldConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [deleteConfirmField, setDeleteConfirmField] = useState<JoiningFieldConfig | null>(null);

  // New Custom Field Form State
  const [newFieldData, setNewFieldData] = useState<CreateCustomFieldInput>({
    label: '',
    field_key: '',
    section: 'personal',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    display_order: 99,
    placeholder: '',
    help_text: '',
    options: []
  });
  const [newOptionInput, setNewOptionInput] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJoiningFieldConfigs(true); // include disabled for admin
      setConfigs(data);
    } catch (err: any) {
      console.error('Failed to load field configs:', err);
      setActionNotice({ type: 'error', message: 'Failed to load field configurations from database.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Flash message timeout
  useEffect(() => {
    if (actionNotice) {
      const t = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionNotice]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: configs.length,
      personal: 0,
      address: 0,
      bank: 0,
      education_family: 0,
      documents: 0,
      declarations: 0,
      custom: 0
    };

    for (const c of configs) {
      if (!c.is_system) counts.custom++;
      if (c.section === 'personal') counts.personal++;
      else if (c.section === 'address') counts.address++;
      else if (c.section === 'bank') counts.bank++;
      else if (c.section === 'education' || c.section === 'family') counts.education_family++;
      else if (c.section === 'documents') counts.documents++;
      else if (c.section === 'declarations') counts.declarations++;
    }

    return counts;
  }, [configs]);

  // Filtered list
  const filteredConfigs = useMemo(() => {
    return configs.filter((item) => {
      // Tab filter
      if (activeTab === 'custom') {
        if (item.is_system) return false;
      } else if (activeTab === 'education_family') {
        if (item.section !== 'education' && item.section !== 'family') return false;
      } else if (activeTab !== 'ALL') {
        if (item.section !== activeTab) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesKey = item.field_key.toLowerCase().includes(q);
        const matchesSection = item.section.toLowerCase().includes(q);
        if (!matchesLabel && !matchesKey && !matchesSection) return false;
      }

      return true;
    });
  }, [configs, activeTab, searchQuery]);

  // Handle Toggle Required/Optional
  const handleToggleRequired = async (field: JoiningFieldConfig) => {
    if (!isSuperAdmin) {
      alert('Security Policy: Only administrators with the SUPER_ADMIN role can change field requirement status.');
      return;
    }

    const nextRequired = !field.is_required;
    const res = await updateFieldRequirement(field.id, nextRequired, field.label);
    if (res.success) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === field.id ? { ...c, is_required: nextRequired } : c))
      );
      setActionNotice({
        type: 'success',
        message: `Field "${field.label}" successfully set to ${nextRequired ? 'REQUIRED' : 'OPTIONAL'}.`
      });
    } else {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to update requirement state.'
      });
    }
  };

  // Handle Toggle Enabled/Disabled
  const handleToggleEnabled = async (field: JoiningFieldConfig) => {
    if (!isSuperAdmin) {
      alert('Security Policy: Only administrators with the SUPER_ADMIN role can enable or disable fields.');
      return;
    }

    const nextEnabled = !field.is_enabled;
    const res = await toggleFieldEnabled(field.id, nextEnabled, field.label);
    if (res.success) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === field.id ? { ...c, is_enabled: nextEnabled } : c))
      );
      setActionNotice({
        type: 'success',
        message: `Field "${field.label}" ${nextEnabled ? 'ENABLED' : 'DISABLED'}.`
      });
    } else {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to update enabled state.'
      });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (field: JoiningFieldConfig) => {
    if (!isSuperAdmin) return;
    setEditingField({ ...field });
    setIsEditModalOpen(true);
  };

  // Save Edit Field
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !isSuperAdmin) return;

    const res = await updateFieldConfig(editingField.id, {
      label: editingField.label,
      placeholder: editingField.placeholder,
      help_text: editingField.help_text,
      display_order: Number(editingField.display_order)
    });

    if (res.success) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === editingField.id ? { ...c, ...editingField } : c))
      );
      setIsEditModalOpen(false);
      setEditingField(null);
      setActionNotice({
        type: 'success',
        message: `Field "${editingField.label}" updated successfully.`
      });
    } else {
      alert(res.error || 'Failed to save field edits.');
    }
  };

  // Add Custom Field
  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    if (!newFieldData.label.trim()) {
      alert('Field label is required.');
      return;
    }

    const key = newFieldData.field_key.trim() || newFieldData.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const fullKey = key.startsWith('custom.') ? key : `custom.${key}`;

    const res = await createCustomField({
      ...newFieldData,
      field_key: fullKey,
      display_order: Number(newFieldData.display_order) || 99
    });

    if (res.success && res.data) {
      setConfigs((prev) => [...prev, res.data!]);
      setIsAddModalOpen(false);
      setNewFieldData({
        label: '',
        field_key: '',
        section: 'personal',
        field_type: 'text',
        is_required: false,
        is_enabled: true,
        display_order: 99,
        placeholder: '',
        help_text: '',
        options: []
      });
      setActionNotice({
        type: 'success',
        message: `Custom field "${res.data.label}" created successfully in section "${res.data.section}".`
      });
    } else {
      alert(res.error || 'Failed to create custom field.');
    }
  };

  // Delete Custom Field
  const handleConfirmDelete = async () => {
    if (!deleteConfirmField || !isSuperAdmin) return;

    const res = await deleteCustomField(deleteConfirmField.id, deleteConfirmField.label);
    if (res.success) {
      setConfigs((prev) => prev.filter((c) => c.id !== deleteConfirmField.id));
      setDeleteConfirmField(null);
      setActionNotice({
        type: 'success',
        message: `Custom field "${deleteConfirmField.label}" deleted successfully.`
      });
    } else {
      alert(res.error || 'Failed to delete custom field.');
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <FileCheck2 size={28} style={{ color: '#0A2540' }} />
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0A2540', margin: 0, letterSpacing: '-0.02em' }}>
              JOINING FORM CONFIGURATION
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
            A TIGER GLOBAL — Master dynamic field definitions, mandatory/optional status, and custom field governance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to={ADMIN_ROUTES.settings}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <span>Back to Settings</span>
          </Link>

          <button
            onClick={loadData}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="admin-btn admin-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              <span>Add Custom Field</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Governance Banner */}
      {!isSuperAdmin && (
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#1E40AF',
          fontSize: '0.875rem'
        }}>
          <Lock size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Read-Only Governance Mode:</strong> You are signed in with the role <strong>{role || 'COORDINATOR'}</strong>. Joining Form field requirements and custom definitions can only be altered by <strong>SUPER_ADMIN</strong>.
          </div>
        </div>
      )}

      {/* Action Notification */}
      {actionNotice && (
        <div style={{
          backgroundColor: actionNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${actionNotice.type === 'success' ? '#10B981' : '#EF4444'}`,
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: actionNotice.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Fields' },
            { id: 'personal', label: 'Personal' },
            { id: 'address', label: 'Address & Contacts' },
            { id: 'bank', label: 'Bank & Statutory' },
            { id: 'education_family', label: 'Education & Family' },
            { id: 'documents', label: 'Documents (Statutory)' },
            { id: 'declarations', label: 'Declarations' },
            { id: 'custom', label: 'Custom Fields' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabCategory)}
              style={{
                background: activeTab === tab.id ? '#0A2540' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#4B5563',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                color: activeTab === tab.id ? '#FFFFFF' : '#6B7280',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.7rem'
              }}>
                {tabCounts[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search fields or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem 0.4rem 2rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.8125rem'
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem', width: '60px', textAlign: 'center' }}>Ord</th>
                <th style={{ padding: '0.85rem 1rem' }}>Field Label &amp; Internal Key</th>
                <th style={{ padding: '0.85rem 1rem', width: '130px' }}>Section</th>
                <th style={{ padding: '0.85rem 1rem', width: '100px' }}>Type</th>
                <th style={{ padding: '0.85rem 1rem', width: '140px', textAlign: 'center' }}>Requirement</th>
                <th style={{ padding: '0.85rem 1rem', width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', width: '110px', textAlign: 'center' }}>Scope</th>
                <th style={{ padding: '0.85rem 1rem', width: '110px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0 }}>Loading field configurations...</p>
                  </td>
                </tr>
              ) : filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                    <AlertCircle size={24} style={{ margin: '0 auto 0.5rem auto', color: '#9CA3AF' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No field configurations found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((field) => {
                  const isEnabled = field.is_enabled;

                  return (
                    <tr
                      key={field.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: !isEnabled ? '#F9FAFB' : '#FFFFFF',
                        opacity: !isEnabled ? 0.75 : 1
                      }}
                    >
                      {/* Order */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#9CA3AF', fontWeight: 600, fontSize: '0.8125rem' }}>
                        {field.display_order}
                      </td>

                      {/* Label & Key */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {field.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6B7280', marginTop: '2px' }}>
                          {field.field_key}
                        </div>
                        {field.help_text && (
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px', fontStyle: 'italic' }}>
                            {field.help_text}
                          </div>
                        )}
                      </td>

                      {/* Section */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#F3F4F6',
                          color: '#374151',
                          textTransform: 'capitalize'
                        }}>
                          {field.section}
                        </span>
                      </td>

                      {/* Field Type */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#EDE9FE',
                          color: '#5B21B6',
                          fontFamily: 'monospace'
                        }}>
                          {field.field_type}
                        </span>
                      </td>

                      {/* Requirement Switch (REQUIRED vs OPTIONAL) */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(field)}
                          disabled={!isSuperAdmin}
                          title={isSuperAdmin ? `Click to make ${field.is_required ? 'OPTIONAL' : 'REQUIRED'}` : 'SUPER_ADMIN required to change'}
                          style={{
                            border: 'none',
                            background: field.is_required ? '#FEE2E2' : '#E0F2FE',
                            color: field.is_required ? '#991B1B' : '#0369A1',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: isSuperAdmin ? 'pointer' : 'default',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {field.is_required ? (
                            <>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#991B1B' }}></span>
                              <span>REQUIRED</span>
                            </>
                          ) : (
                            <>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0369A1' }}></span>
                              <span>OPTIONAL</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Status (Enabled / Disabled) */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(field)}
                          disabled={!isSuperAdmin}
                          title={isSuperAdmin ? `Click to ${field.is_enabled ? 'DISABLE' : 'ENABLE'}` : 'SUPER_ADMIN required'}
                          style={{
                            border: 'none',
                            background: field.is_enabled ? '#ECFDF5' : '#F3F4F6',
                            color: field.is_enabled ? '#065F46' : '#6B7280',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: isSuperAdmin ? 'pointer' : 'default',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {field.is_enabled ? (
                            <>
                              <Check size={12} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <X size={12} />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Scope (System vs Custom) */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: field.is_system ? '#4B5563' : '#7C3AED',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {field.is_system ? 'Standard' : '★ Custom'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(field)}
                              title="Edit Field Label &amp; Details"
                              style={{
                                background: 'transparent',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                padding: '4px 7px',
                                color: '#374151',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {!field.is_system && isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmField(field)}
                              title="Delete Custom Field"
                              style={{
                                background: 'transparent',
                                border: '1px solid #FECACA',
                                borderRadius: '4px',
                                padding: '4px 7px',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
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
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingField && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                Edit Field: {editingField.label}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Field Label
                </label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Help / Guidance Text
                </label>
                <textarea
                  rows={2}
                  value={editingField.help_text || ''}
                  onChange={(e) => setEditingField({ ...editingField, help_text: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  value={editingField.display_order}
                  onChange={(e) => setEditingField({ ...editingField, display_order: Number(e.target.value) })}
                  style={{ width: '100px', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOM FIELD MODAL */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                Add New Custom Joining Field
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomField} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Field Label *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Department Preference"
                    value={newFieldData.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoKey = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                      setNewFieldData({
                        ...newFieldData,
                        label: val,
                        field_key: newFieldData.field_key ? newFieldData.field_key : `custom.${autoKey}`
                      });
                    }}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Internal Key *
                  </label>
                  <input
                    type="text"
                    placeholder="custom.department_pref"
                    value={newFieldData.field_key}
                    onChange={(e) => setNewFieldData({ ...newFieldData, field_key: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Section Placement *
                  </label>
                  <select
                    value={newFieldData.section}
                    onChange={(e) => setNewFieldData({ ...newFieldData, section: e.target.value as ConfigurableSection })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                  >
                    <option value="personal">Personal Information (Step 02)</option>
                    <option value="address">Address &amp; Emergency (Step 03)</option>
                    <option value="bank">Bank &amp; Statutory (Step 04)</option>
                    <option value="education">Education (Step 05)</option>
                    <option value="family">Family (Step 06)</option>
                    <option value="declarations">Declarations (Step 08)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Field Type *
                  </label>
                  <select
                    value={newFieldData.field_type}
                    onChange={(e) => setNewFieldData({ ...newFieldData, field_type: e.target.value as ConfigurableFieldType })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="textarea">Textarea (Multi-line)</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone / Mobile</option>
                    <option value="select">Dropdown (Select)</option>
                    <option value="checkbox">Checkbox (Yes / No)</option>
                  </select>
                </div>
              </div>

              {/* Options builder for Select */}
              {newFieldData.field_type === 'select' && (
                <div style={{ marginBottom: '1rem', background: '#F9FAFB', padding: '0.75rem', borderRadius: '6px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Dropdown Options
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Add an option (e.g. Morning Shift)"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.8125rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newOptionInput.trim()) {
                          const val = newOptionInput.trim();
                          setNewFieldData({
                            ...newFieldData,
                            options: [...(newFieldData.options || []), { label: val, value: val }]
                          });
                          setNewOptionInput('');
                        }
                      }}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '0.4rem 0.75rem' }}
                    >
                      Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {(newFieldData.options || []).map((opt, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#E5E7EB',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {opt.label}
                        <X
                          size={12}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setNewFieldData({
                              ...newFieldData,
                              options: (newFieldData.options || []).filter((_, i) => i !== idx)
                            });
                          }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Initial Requirement *
                  </label>
                  <select
                    value={newFieldData.is_required ? 'REQUIRED' : 'OPTIONAL'}
                    onChange={(e) => setNewFieldData({ ...newFieldData, is_required: e.target.value === 'REQUIRED' })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                  >
                    <option value="OPTIONAL">OPTIONAL (Recommended)</option>
                    <option value="REQUIRED">REQUIRED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={newFieldData.display_order}
                    onChange={(e) => setNewFieldData({ ...newFieldData, display_order: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Help / Guidance Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Instructions for the candidate"
                  value={newFieldData.help_text || ''}
                  onChange={(e) => setNewFieldData({ ...newFieldData, help_text: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                >
                  Create Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmField && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#DC2626', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Delete Custom Field?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete custom field <strong>&quot;{deleteConfirmField.label}&quot;</strong> (<code>{deleteConfirmField.field_key}</code>)?
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#B91C1C', background: '#FEF2F2', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <strong>Historical Safety Note:</strong> Candidate submissions that previously saved values for this field will retain their stored records, but new candidates will no longer see or submit this field.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmField(null)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
