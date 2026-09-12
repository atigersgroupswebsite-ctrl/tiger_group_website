// ==============================================================================
// File: src/pages/admin/AdminSettingsPage.tsx
// Description: Centralized Administrative Settings & Operational Configuration
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Backed by public.system_settings and enforced by database RLS
//   - Zero secret/credential storage (service keys/passwords remain server-only)
//   - Role-governed: SUPER_ADMIN & COORDINATOR can edit; others are read-only
//   - All modifications validated and audited in public.activity_logs (SETTINGS_UPDATED)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminNotifications } from '../../contexts/AdminNotificationContext';
import {
  getSystemSettings,
  updateSystemSetting,
  type EnrichedSystemSetting
} from '../../services/settingsService';
import {
  Settings,
  ShieldCheck,
  Phone,
  Mail,
  Volume2,
  VolumeX,
  Save,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Layers
} from 'lucide-react';

import { CompanySignatureSettingsSection } from '../../components/admin/CompanySignatureSettingsSection';

export const AdminSettingsPage: React.FC = () => {
  const { role } = useAdminAuth();
  const { setSoundEnabled } = useAdminNotifications();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Can the current user edit settings? (SUPER_ADMIN and COORDINATOR have RLS UPDATE permission)
  const canEdit = isSuperAdmin || role === 'COORDINATOR';

  const [settings, setSettings] = useState<EnrichedSystemSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'FINANCIAL' | 'OPERATIONS' | 'SUPPORT' | 'PREFERENCES' | 'COMPANY_ASSETS'>('ALL');

  // Form edit states (keyed by setting key)
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ key: string; type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSystemSettings();
      setSettings(data);

      // Initialize form state
      const initialForm: Record<string, any> = {};
      data.forEach((s) => {
        initialForm[s.key] = s.value;
      });
      setFormState(initialForm);
    } catch (err) {
      console.error('[AdminSettingsPage] Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleFieldChange = (key: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value
    }));
    if (statusMessage?.key === key) {
      setStatusMessage(null);
    }
  };

  const handleNestedFieldChange = (parentKey: string, nestedKey: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [nestedKey]: value
      }
    }));
    if (statusMessage?.key === parentKey) {
      setStatusMessage(null);
    }
  };

  const handleSaveSetting = async (key: string) => {
    if (!canEdit || (key === 'default_registration_fee' && !isSuperAdmin)) {
      setStatusMessage({
        key,
        type: 'error',
        text: key === 'default_registration_fee'
          ? 'Permission denied. Only Super Administrators can modify the authoritative registration fee.'
          : 'Permission denied. Your role has read-only access to settings.'
      });
      return;
    }

    const val = formState[key];
    setSavingKey(key);
    setStatusMessage(null);

    try {
      const res = await updateSystemSetting(key, val);
      if (res.success) {
        setStatusMessage({ key, type: 'success', text: 'Setting successfully updated and audited.' });

        // If toggling sound, also sync with the live context
        if (key === 'notification_sound_enabled' && typeof val === 'boolean') {
          setSoundEnabled(val);
        }

        // Reload to refresh updated_at and updated_by metadata
        const refreshed = await getSystemSettings();
        setSettings(refreshed);
      } else {
        setStatusMessage({ key, type: 'error', text: res.error || 'Failed to update setting.' });
      }
    } catch (err: any) {
      console.error('Error saving setting:', err);
      setStatusMessage({ key, type: 'error', text: err?.message || 'Unexpected error occurred.' });
    } finally {
      setSavingKey(null);
    }
  };

  const filteredSettings = settings.filter((s) => {
    if (activeTab === 'ALL') return true;
    return s.category === activeTab;
  });

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <Settings size={26} style={{ color: 'var(--color-champagne-dark)' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
              SYSTEM CONFIGURATION &amp; SETTINGS
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            A TIGER GROUP&apos;S — Centralized administrative parameters, operational defaults, and governance preferences.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/admin/joining-form-settings"
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <Layers size={16} />
            <span>Joining Form Settings</span>
            <ExternalLink size={13} />
          </Link>

          <Link
            to="/admin/settings/admin-users"
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <Users size={16} />
            <span>Admin User Directory</span>
            <ExternalLink size={13} />
          </Link>

          <button
            onClick={loadSettings}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Security & Access Banner */}
      <div
        style={{
          background: canEdit ? '#F0FDF4' : '#F8FAFC',
          border: canEdit ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canEdit ? (
            <ShieldCheck size={22} style={{ color: '#059669', flexShrink: 0 }} />
          ) : (
            <Lock size={22} style={{ color: '#64748B', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: canEdit ? '#065F46' : '#334155' }}>
              {canEdit ? 'Administrative Modification Privileges Active' : 'Read-Only Administrative Access'}
            </div>
            <div style={{ fontSize: '0.75rem', color: canEdit ? '#047857' : '#64748B' }}>
              {canEdit
                ? `Signed in with ${role} credentials. Changes are validated and permanently audited in the Activity Center.`
                : `Signed in as ${role}. You have view-only access to system configuration parameters.`}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          <strong>Notice:</strong> Storage &amp; payment credentials remain locked in secure server environment variables.
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}
      >
        {[
          { id: 'ALL', label: 'All Settings' },
          { id: 'COMPANY_ASSETS', label: 'Company Assets (Signature)' },
          { id: 'FINANCIAL', label: 'Financial Defaults' },
          { id: 'OPERATIONS', label: 'Operational Defaults' },
          { id: 'SUPPORT', label: 'Support & Helpline' },
          { id: 'PREFERENCES', label: 'Platform Preferences' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--color-champagne-dark)' : '#64748B',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-champagne-dark)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {activeTab === 'COMPANY_ASSETS' ? (
        <CompanySignatureSettingsSection isSuperAdmin={isSuperAdmin} />
      ) : (
        <>
          {/* Settings Grid */}
          {loading ? (
        <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--color-champagne-dark)' }} />
          <div>Loading system configuration...</div>
        </div>
      ) : filteredSettings.length === 0 ? (
        <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <Layers size={36} style={{ color: '#CBD5E1', margin: '0 auto 0.5rem auto' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: 0 }}>No Settings in this Category</h3>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Select another category tab or refresh the configuration ledger.
          </p>
        </div>
      ) : (
        <div className="admin-settings-grid">
          {filteredSettings.map((s) => {
            const isSaving = savingKey === s.key;
            const currentVal = formState[s.key];
            const msg = statusMessage?.key === s.key ? statusMessage : null;

            return (
              <div
                key={s.id}
                className="admin-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop:
                    s.category === 'FINANCIAL'
                      ? '3px solid #D97706'
                      : s.category === 'OPERATIONS'
                      ? '3px solid #1E40AF'
                      : s.category === 'SUPPORT'
                      ? '3px solid #059669'
                      : '3px solid #86198F'
                }}
              >
                <div>
                  {/* Category & Status Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background:
                          s.category === 'FINANCIAL'
                            ? '#FEF3C7'
                            : s.category === 'OPERATIONS'
                            ? '#DBEAFE'
                            : s.category === 'SUPPORT'
                            ? '#D1FAE5'
                            : '#F3E8FF',
                        color:
                          s.category === 'FINANCIAL'
                            ? '#92400E'
                            : s.category === 'OPERATIONS'
                            ? '#1E40AF'
                            : s.category === 'SUPPORT'
                            ? '#065F46'
                            : '#6B21A8'
                      }}
                    >
                      {s.category}
                    </span>

                    <code style={{ fontSize: '0.725rem', color: '#94A3B8' }}>{s.key}</code>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0 0 0.35rem 0' }}>
                    {s.key
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4, margin: '0 0 1.25rem 0' }}>
                    {s.description || 'System operational parameter.'}
                  </p>

                  {/* Form Input based on Key */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    {/* 1. Notification Sound Setting */}
                    {s.key === 'notification_sound_enabled' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#F8FAFC',
                          padding: '0.85rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {currentVal ? (
                            <Volume2 size={18} style={{ color: '#059669' }} />
                          ) : (
                            <VolumeX size={18} style={{ color: '#94A3B8' }} />
                          )}
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                            {currentVal ? 'Audio Chime Enabled' : 'Muted (Silent Mode)'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!canEdit || isSaving}
                          onClick={() => handleFieldChange(s.key, !currentVal)}
                          style={{
                            width: '46px',
                            height: '24px',
                            borderRadius: '12px',
                            background: currentVal ? '#059669' : '#CBD5E1',
                            border: 'none',
                            cursor: canEdit ? 'pointer' : 'not-allowed',
                            position: 'relative',
                            transition: 'background-color 0.2s ease',
                            padding: 0
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: currentVal ? '24px' : '2px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#FFFFFF',
                              transition: 'left 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                          />
                        </button>
                      </div>
                    )}

                    {/* 2. Fee Settings */}
                    {(s.key === 'default_registration_fee' || s.key === 'default_consultancy_fee') && (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '0.85rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontWeight: 700,
                              color: '#64748B'
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="50"
                            disabled={(s.key === 'default_registration_fee' ? !isSuperAdmin : !canEdit) || isSaving}
                            value={currentVal ?? ''}
                            onChange={(e) => handleFieldChange(s.key, Number(e.target.value))}
                            className="admin-input"
                            style={{ paddingLeft: '2rem', width: '100%', fontSize: '1rem', fontWeight: 700 }}
                          />
                        </div>
                        <p style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.4rem', margin: '0.4rem 0 0 0' }}>
                          {s.key === 'default_registration_fee'
                            ? 'Authoritative registration and verification fee charged to new candidates through Cashfree.'
                            : 'Reference standard fee coordinated after 1 month of active placement.'}
                        </p>
                        {!isSuperAdmin && s.key === 'default_registration_fee' && (
                          <p style={{ fontSize: '0.725rem', color: '#EF4444', marginTop: '0.25rem', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Lock size={12} /> Super Admin privileges required to modify registration fee.
                          </p>
                        )}
                      </div>
                    )}

                    {/* 3. Platform Helpline */}
                    {s.key === 'platform_helpline' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Helpline Phone
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input
                              type="text"
                              disabled={!canEdit || isSaving}
                              value={currentVal?.phone ?? ''}
                              onChange={(e) => handleNestedFieldChange(s.key, 'phone', e.target.value)}
                              className="admin-input"
                              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Support Email
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input
                              type="email"
                              disabled={!canEdit || isSaving}
                              value={currentVal?.email ?? ''}
                              onChange={(e) => handleNestedFieldChange(s.key, 'email', e.target.value)}
                              className="admin-input"
                              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Office Timings */}
                    {s.key === 'office_timings' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Operating Days
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit || isSaving}
                            value={currentVal?.days ?? ''}
                            onChange={(e) => handleNestedFieldChange(s.key, 'days', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Operating Hours
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit || isSaving}
                            value={currentVal?.hours ?? ''}
                            onChange={(e) => handleNestedFieldChange(s.key, 'hours', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 5. Company Defaults */}
                    {s.key === 'company_defaults' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            City
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit || isSaving}
                            value={currentVal?.city ?? ''}
                            onChange={(e) => handleNestedFieldChange(s.key, 'city', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            State
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit || isSaving}
                            value={currentVal?.state ?? ''}
                            onChange={(e) => handleNestedFieldChange(s.key, 'state', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Country
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit || isSaving}
                            value={currentVal?.country ?? ''}
                            onChange={(e) => handleNestedFieldChange(s.key, 'country', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metadata & Action */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  {msg && (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        marginBottom: '0.75rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: msg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                        color: msg.type === 'success' ? '#047857' : '#B91C1C',
                        border: `1px solid ${msg.type === 'success' ? '#A7F3D0' : '#FECACA'}`
                      }}
                    >
                      {msg.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      <span>{msg.text}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                      {s.updaterName ? (
                        <span>
                          Updated by <strong>{s.updaterName}</strong>
                        </span>
                      ) : (
                        <span>Initial System Default</span>
                      )}
                      <div style={{ fontSize: '0.675rem' }}>
                        {new Date(s.updated_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    {(s.key === 'default_registration_fee' ? isSuperAdmin : canEdit) ? (
                      <button
                        onClick={() => handleSaveSetting(s.key)}
                        disabled={isSaving}
                        className="admin-btn admin-btn-primary"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.775rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.725rem',
                          color: '#94A3B8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Lock size={12} />
                        {s.key === 'default_registration_fee' ? 'Super Admin Only' : 'View Only'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Company Assets Section (Founder / CEO Signature) when viewing ALL */}
      {activeTab === 'ALL' && (
        <CompanySignatureSettingsSection isSuperAdmin={isSuperAdmin} />
      )}
    </>
  )}

      {/* Admin User Management Callout Card */}
      <div
        className="admin-card"
        style={{
          marginTop: '2.5rem',
          padding: '1.75rem',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Users size={20} style={{ color: 'var(--color-champagne-light)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Administrator Directory &amp; Role Governance
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#94A3B8', maxWidth: '640px' }}>
              Manage internal administrative accounts, invite new corporate staff, assign role privileges (Super Admin,
              Coordinator, Document Verifier, Accountant), and monitor active authentication sessions.
            </p>
          </div>

          <Link
            to="/admin/settings/admin-users"
            className="admin-btn"
            style={{
              background: 'var(--color-champagne-dark)',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '0.65rem 1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              borderRadius: '6px'
            }}
          >
            <span>Open Admin Directory</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
