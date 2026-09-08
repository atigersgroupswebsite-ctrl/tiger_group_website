// ==============================================================================
// File: src/pages/admin/AdminActivityPage.tsx
// Description: Global Administrative Audit Center & Organization-Wide Activity Ledger
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Zero exposure of secrets, tokens, passwords, or raw private storage paths
//   - Sensitive KYC (full Aadhaar, PAN, bank accounts) sanitized and masked
//   - Immutable audit trail (read-only; zero arbitrary edit/delete UI)
//   - Strict database-level filtering, pagination, and role governance
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getActivityLogs,
  getActivityStats,
  getAvailableActivityFilterOptions,
  type EnrichedActivityLog,
  type ActivityStats,
  type ActivityFilterOptions
} from '../../services/activityService';
import {
  Activity,
  Search,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  ExternalLink,
  Layers,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Building2,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  FolderArchive,
  UserCheck,
  Settings
} from 'lucide-react';

// Category color configurations for actions
type ActionCategory =
  | 'CREATION'
  | 'VERIFICATION'
  | 'GENERATION'
  | 'FINANCIAL'
  | 'SECURITY_DELETION'
  | 'DISPATCH'
  | 'ACCESS_CONTROL'
  | 'UPDATE_STATUS';

function getActionCategory(action: string): ActionCategory {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('REJECTED') || a.includes('FAILED')) return 'SECURITY_DELETION';
  if (a.includes('CREATED') || a.includes('SUBMITTED')) return 'CREATION';
  if (a.includes('VERIFIED') || a.includes('ACCEPTED')) return 'VERIFICATION';
  if (a.includes('GENERATED') || a.includes('REGENERATED')) return 'GENERATION';
  if (a.includes('PAYMENT') || a.includes('RECEIPT')) return 'FINANCIAL';
  if (a.includes('SENT')) return 'DISPATCH';
  if (a.includes('ACCESS')) return 'ACCESS_CONTROL';
  return 'UPDATE_STATUS';
}

const CATEGORY_STYLES: Record<ActionCategory, { label: string; color: string; bg: string; border: string }> = {
  CREATION: { label: 'Creation', color: '#065F46', bg: '#D1FAE5', border: '#A7F3D0' },
  VERIFICATION: { label: 'Verification', color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  GENERATION: { label: 'Generation', color: '#6B21A8', bg: '#F3E8FF', border: '#E9D5FF' },
  FINANCIAL: { label: 'Financial', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  SECURITY_DELETION: { label: 'Security / Alert', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  DISPATCH: { label: 'Notification', color: '#3730A3', bg: '#E0E7FF', border: '#C7D2FE' },
  ACCESS_CONTROL: { label: 'Access Control', color: '#0E7490', bg: '#CFFAFE', border: '#A5F3FC' },
  UPDATE_STATUS: { label: 'Lifecycle Update', color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE' }
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  APPLICATION: FileText,
  JOINING_FORM: UserCheck,
  COMPANY: Building2,
  JOB: Briefcase,
  EMPLOYEE: Users,
  REFERENCE_SLIP: FileText,
  PAYMENT: CreditCard,
  GENERATED_FILE: FolderArchive,
  EMPLOYER_ENQUIRY: Building2,
  ADMIN_USER: ShieldCheck,
  SETTINGS: Settings
};

export const AdminActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<EnrichedActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalCount: 0,
    todayCount: 0,
    activeActorsCount: 0,
    distinctEntitiesCount: 0
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');

  // Dynamic filter options
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableActors, setAvailableActors] = useState<{ id: string; name: string; role?: string }[]>([]);

  // Selected Log Detail Modal
  const [selectedLog, setSelectedLog] = useState<EnrichedActivityLog | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load filter options once on mount
  useEffect(() => {
    let mounted = true;
    getAvailableActivityFilterOptions().then((opts) => {
      if (!mounted) return;
      setAvailableEntityTypes(opts.entityTypes);
      setAvailableActions(opts.actions);
      setAvailableActors(opts.actors);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch KPI stats
  const loadStats = useCallback(async () => {
    try {
      const s = await getActivityStats();
      setStats(s);
    } catch (err) {
      console.error('[AdminActivityPage] Error loading stats:', err);
    }
  }, []);

  // Fetch paginated logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const options: ActivityFilterOptions = {
        page,
        pageSize: 25,
        searchQuery: searchQuery.trim() || undefined,
        entityType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        actorId: actorFilter !== 'ALL' ? actorFilter : undefined,
        dateRange: dateRangeFilter !== 'ALL' ? dateRangeFilter : undefined
      };

      const res = await getActivityLogs(options);
      setLogs(res.logs);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('[AdminActivityPage] Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, entityTypeFilter, actionFilter, actorFilter, dateRangeFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityTypeFilter('ALL');
    setActionFilter('ALL');
    setActorFilter('ALL');
    setDateRangeFilter('ALL');
    setPage(1);
  };

  const handleCopyText = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isFiltersActive =
    searchQuery.trim() !== '' ||
    entityTypeFilter !== 'ALL' ||
    actionFilter !== 'ALL' ||
    actorFilter !== 'ALL' ||
    dateRangeFilter !== 'ALL';

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
            <Activity size={26} style={{ color: 'var(--color-champagne-dark)' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
              GLOBAL AUDIT &amp; ACTIVITY CENTER
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            A TIGER GROUP&apos;S — Centralized, immutable governance activity ledger and audit trail.
          </p>
        </div>

        <button
          onClick={() => {
            loadLogs();
            loadStats();
          }}
          className="admin-btn admin-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Ledger
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#64748B' }}>Total Audit Entries</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.25rem' }}>
            {stats.totalCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Permanent governance records
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#047857' }}>Today&apos;s Events</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#065F46', marginTop: '0.25rem' }}>
            {stats.todayCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#059669', marginTop: '0.25rem' }}>
            Recorded since 00:00 IST
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #1E40AF' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#1E40AF' }}>Active Actors</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E3A8A', marginTop: '0.25rem' }}>
            {stats.activeActorsCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#3B82F6', marginTop: '0.25rem' }}>
            Administrators with log activity
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#B45309' }}>Monitored Entities</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#92400E', marginTop: '0.25rem' }}>
            {stats.distinctEntitiesCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#D97706', marginTop: '0.25rem' }}>
            Active operational categories
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="admin-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8'
                }}
              />
              <input
                type="text"
                placeholder="Search by action, description, or entity ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="admin-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            {isFiltersActive && (
              <button
                onClick={handleResetFilters}
                className="admin-btn admin-btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {/* Entity Type Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                Entity Type
              </label>
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="admin-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Entity Types</option>
                {availableEntityTypes.map((et) => (
                  <option key={et} value={et}>
                    {et.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="admin-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Actions</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {act.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                Actor
              </label>
              <select
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value);
                  setPage(1);
                }}
                className="admin-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Actors</option>
                <option value="SYSTEM">System / Candidate</option>
                {availableActors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name} ({actor.role || 'Admin'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                Date Range
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="admin-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.775rem', color: '#475569' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1rem' }}>Actor</th>
                <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                <th style={{ padding: '0.85rem 1rem' }}>Entity</th>
                <th style={{ padding: '0.85rem 1rem' }}>Reference / Source</th>
                <th style={{ padding: '0.85rem 1rem' }}>Description / Summary</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-champagne-dark)' }} />
                      <span>Loading organization audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                    <Database size={40} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem auto' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.25rem 0' }}>
                      No Activity Records Found
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748B', maxWidth: '440px', margin: '0 auto' }}>
                      {isFiltersActive
                        ? 'No events match your current filter parameters. Try clearing filters to see full audit history.'
                        : 'No activity logs have been recorded in the audit ledger yet.'}
                    </p>
                    {isFiltersActive && (
                      <button
                        onClick={handleResetFilters}
                        className="admin-btn admin-btn-secondary"
                        style={{ marginTop: '1rem', fontSize: '0.825rem' }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const category = getActionCategory(log.action);
                  const catStyle = CATEGORY_STYLES[category];
                  const EntityIcon = ENTITY_ICONS[log.entity_type || 'APPLICATION'] || Layers;
                  const dateObj = new Date(log.created_at);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        fontSize: '0.825rem',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="admin-table-row"
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#1E293B' }}>
                          <Clock size={14} style={{ color: '#94A3B8' }} />
                          {dateObj.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748B', marginLeft: '1.25rem' }}>
                          {dateObj.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} style={{ color: '#64748B' }} />
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{log.actorName}</span>
                        </div>
                        <div style={{ marginTop: '0.15rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background:
                                log.actorRole === 'SUPER_ADMIN'
                                  ? '#FEE2E2'
                                  : log.actorRole === 'SYSTEM'
                                  ? '#F1F5F9'
                                  : '#DBEAFE',
                              color:
                                log.actorRole === 'SUPER_ADMIN'
                                  ? '#991B1B'
                                  : log.actorRole === 'SYSTEM'
                                  ? '#475569'
                                  : '#1E40AF'
                            }}
                          >
                            {log.actorRole}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: catStyle.bg,
                            color: catStyle.color,
                            border: `1px solid ${catStyle.border}`,
                            letterSpacing: '0.02em'
                          }}
                        >
                          {log.action}
                        </span>
                        <div style={{ fontSize: '0.675rem', color: '#64748B', marginTop: '0.2rem' }}>
                          Category: {catStyle.label}
                        </div>
                      </td>

                      {/* Entity */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#334155' }}>
                          <EntityIcon size={14} style={{ color: '#64748B' }} />
                          <span>{log.entity_type || 'APPLICATION'}</span>
                        </div>
                        {log.entity_id && (
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                            ID: {log.entity_id.length > 12 ? `${log.entity_id.slice(0, 8)}...` : log.entity_id}
                          </div>
                        )}
                      </td>

                      {/* Reference / Source */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {log.applicationNumber ? (
                          <div>
                            <Link
                              to={`/admin/applications/${log.application_id || log.entity_id}`}
                              style={{
                                color: 'var(--color-champagne-dark)',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <span>{log.applicationNumber}</span>
                              <ExternalLink size={12} />
                            </Link>
                            {log.candidateName && (
                              <div style={{ fontSize: '0.725rem', color: '#475569', marginTop: '0.15rem' }}>
                                {log.candidateName}
                              </div>
                            )}
                          </div>
                        ) : log.joiningReference ? (
                          <div>
                            <Link
                              to={`/admin/joining/${log.entity_id}`}
                              style={{
                                color: '#047857',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <span>{log.joiningReference}</span>
                              <ExternalLink size={12} />
                            </Link>
                            {log.candidateName && (
                              <div style={{ fontSize: '0.725rem', color: '#475569', marginTop: '0.15rem' }}>
                                {log.candidateName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>

                      {/* Description / Summary */}
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                        <div
                          style={{
                            color: '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.4
                          }}
                          title={log.description || 'No descriptive text recorded.'}
                        >
                          {log.description || 'Audit action logged.'}
                        </div>
                        {log.sanitizedMetadata && Object.keys(log.sanitizedMetadata).length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>
                            {Object.keys(log.sanitizedMetadata).length} metadata parameter(s) attached
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="admin-btn admin-btn-secondary"
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Eye size={13} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Showing {Math.min(totalCount, (page - 1) * 25 + 1)} to {Math.min(totalCount, page * 25)} of{' '}
              {totalCount} audit entries
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Audit Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="admin-card"
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--color-champagne-dark)' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
                    Audit Log Dossier
                  </h2>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', color: '#64748B' }}>
                  Immutable log record ID: <code style={{ fontSize: '0.75rem' }}>{selectedLog.id}</code>
                </p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Key Specs Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '0.75rem',
                  background: '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Action</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedLog.action}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Category</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF' }}>
                    {CATEGORY_STYLES[getActionCategory(selectedLog.action)].label}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Entity Type</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    {selectedLog.entity_type || 'APPLICATION'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Actor</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                    {selectedLog.actorName} ({selectedLog.actorRole})
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Timestamp</span>
                  <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                    {new Date(selectedLog.created_at).toLocaleString('en-GB')}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block' }}>Reference</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-champagne-dark)' }}>
                    {selectedLog.applicationNumber || selectedLog.joiningReference || 'Standalone Entity'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', margin: '0 0 0.35rem 0' }}>
                  Operational Description
                </h4>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    color: '#1E293B',
                    lineHeight: 1.5
                  }}
                >
                  {selectedLog.description || 'No descriptive commentary attached to this entry.'}
                </div>
              </div>

              {/* Sanitized Metadata */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', margin: 0 }}>
                    Attached Payload Metadata (Sanitized)
                  </h4>
                  {selectedLog.sanitizedMetadata && (
                    <button
                      onClick={() =>
                        handleCopyText(JSON.stringify(selectedLog.sanitizedMetadata, null, 2), 'metadata')
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-champagne-dark)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {copiedKey === 'metadata' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'metadata' ? 'Copied' : 'Copy JSON'}
                    </button>
                  )}
                </div>

                {selectedLog.sanitizedMetadata && Object.keys(selectedLog.sanitizedMetadata).length > 0 ? (
                  <pre
                    style={{
                      background: '#0F172A',
                      color: '#38BDF8',
                      padding: '1rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '220px',
                      margin: 0
                    }}
                  >
                    {JSON.stringify(selectedLog.sanitizedMetadata, null, 2)}
                  </pre>
                ) : (
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.775rem',
                      color: '#94A3B8',
                      textAlign: 'center'
                    }}
                  >
                    No additional JSON payload parameters attached to this log.
                  </div>
                )}
              </div>

              {/* Direct Link to Related Resource */}
              {selectedLog.resourceLink && (
                <div
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>
                      Associated Administrative Dossier Available
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#3B82F6' }}>
                      Directly inspect the parent {selectedLog.entity_type || 'APPLICATION'} record.
                    </div>
                  </div>
                  <Link
                    to={selectedLog.resourceLink}
                    className="admin-btn admin-btn-primary"
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.775rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Inspect Resource</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button onClick={() => setSelectedLog(null)} className="admin-btn admin-btn-secondary">
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActivityPage;
