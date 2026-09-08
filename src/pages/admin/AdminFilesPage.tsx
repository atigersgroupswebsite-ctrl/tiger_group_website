// ==============================================================================
// File: src/pages/admin/AdminFilesPage.tsx
// Description: Central Administrative Repository for Generated Files & Document Ledger
// Brand: A Tiger Group's — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Zero raw storage path exposure in list view
//   - Strict authenticated signed URL access (no permanent public URLs)
//   - Role-based governance (SUPER_ADMIN, COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT)
//   - Dual candidate source support (INQ-... and JOIN-...)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getGeneratedFiles,
  getGeneratedDocumentSignedUrl,
  type GeneratedFileListItem,
  type GeneratedFilesKPIs,
  type GeneratedFilesFilters
} from '../../services/filePersistenceService';
import type { GeneratedFileType } from '../../types/database';
import {
  FolderArchive,
  Search,
  RefreshCw,
  FileText,
  FileCheck,
  CreditCard,
  FileSpreadsheet,
  Eye,
  Download,
  Loader2
} from 'lucide-react';

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeBadge(type: GeneratedFileType) {
  switch (type) {
    case 'JOINING_PACKET_PDF':
      return { label: 'Joining Packet', bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', icon: FileText };
    case 'REFERENCE_SLIP_PDF':
      return { label: 'Reference Slip', bg: '#FDF4FF', color: '#86198F', border: '#F5D0FE', icon: FileCheck };
    case 'ID_CARD_PDF':
      return { label: 'Employee ID Card', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', icon: CreditCard };
    case 'RECEIPT_PDF':
      return { label: 'Payment Receipt', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', icon: CreditCard };
    case 'EXCEL_EXPORT':
      return { label: 'Excel Export', bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', icon: FileSpreadsheet };
    default:
      return { label: type, bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: FileText };
  }
}

export const AdminFilesPage: React.FC = () => {
  const [files, setFiles] = useState<GeneratedFileListItem[]>([]);
  const [kpis, setKpis] = useState<GeneratedFilesKPIs>({
    totalFiles: 0,
    joiningPacketsCount: 0,
    referenceSlipsCount: 0,
    idCardsCount: 0,
    receiptsCount: 0,
    exportsCount: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'APPLICATION' | 'JOINING_FORM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const filters: GeneratedFilesFilters = {
        search: search.trim() || undefined,
        fileType: fileTypeFilter !== 'ALL' ? fileTypeFilter : undefined,
        sourceType: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const res = await getGeneratedFiles(filters);
      setFiles(res.data);
      setKpis(res.kpis);
    } catch (err) {
      console.error('[AdminFilesPage] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, fileTypeFilter, sourceFilter, startDate, endDate]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleQuickDownload = async (storagePath: string, fileName: string) => {
    try {
      const { url } = await getGeneratedDocumentSignedUrl(storagePath, 60);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Could not retrieve secure download URL.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error initiating file download.');
    }
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <FolderArchive size={24} style={{ color: 'var(--color-champagne-dark)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-midnight-navy)', margin: 0 }}>
              GENERATED FILES REPOSITORY
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Centralized document ledger and private archive for official system-generated files.
          </p>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#64748B' }}>Total Generated Files</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-midnight-navy)', marginTop: '0.25rem' }}>
            {kpis.totalFiles}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Private ledger archive
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #86198F' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#86198F' }}>Reference Slips</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#701A75', marginTop: '0.25rem' }}>
            {kpis.referenceSlipsCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#A21CAF', marginTop: '0.25rem' }}>
            2-page official slips
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#047857' }}>Employee ID Cards</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#065F46', marginTop: '0.25rem' }}>
            {kpis.idCardsCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#059669', marginTop: '0.25rem' }}>
            Official identity badges
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#B45309' }}>Payment Receipts</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#92400E', marginTop: '0.25rem' }}>
            {kpis.receiptsCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#D97706', marginTop: '0.25rem' }}>
            Persisted transaction receipts
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #4338CA' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#4338CA' }}>Joining Packets</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#312E81', marginTop: '0.25rem' }}>
            {kpis.joiningPacketsCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#4338CA', marginTop: '0.25rem' }}>
            Full onboarding dossiers
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={16} color="#64748B" style={{ position: 'absolute', left: '0.85rem' }} />
          <input
            type="text"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search file name, candidate name, INQ-... or JOIN-..."
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* File Type Filter */}
          <select
            className="form-control form-select"
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '170px' }}
          >
            <option value="ALL">All Document Types</option>
            <option value="REFERENCE_SLIP_PDF">Reference Slips</option>
            <option value="ID_CARD_PDF">Employee ID Cards</option>
            <option value="JOINING_PACKET_PDF">Joining Packets</option>
            <option value="RECEIPT_PDF">Payment Receipts</option>
            <option value="EXCEL_EXPORT">Excel Exports</option>
          </select>

          {/* Candidate Source Filter */}
          <select
            className="form-control form-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="ALL">All Sources</option>
            <option value="APPLICATION">Applications (INQ)</option>
            <option value="JOINING_FORM">Standalone (JOIN)</option>
          </select>

          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="From date"
              style={{ width: 'auto', padding: '0.45rem 0.65rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>to</span>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="To date"
              style={{ width: 'auto', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <button
            type="button"
            onClick={loadFiles}
            title="Refresh Directory"
            className="btn btn-outline"
            style={{ padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Files Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1rem' }}>File Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Candidate / Source</th>
                <th style={{ padding: '0.85rem 1rem' }}>Version</th>
                <th style={{ padding: '0.85rem 1rem' }}>Size</th>
                <th style={{ padding: '0.85rem 1rem' }}>Generated Date</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 size={28} className="animate-spin" color="var(--color-champagne-dark)" style={{ margin: '0 auto 0.5rem' }} />
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>Loading generated files ledger...</span>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '4rem',
                        height: '4rem',
                        borderRadius: '50%',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem'
                      }}
                    >
                      <FolderArchive size={32} color="#94A3B8" />
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-midnight-navy)' }}>
                      No Generated Files Found
                    </p>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                      Official documents generated through Employee ID Cards, Reference Slips, and candidate dossiers will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const badge = getFileTypeBadge(file.fileType);
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={file.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* File Name */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        <Link
                          to={`/admin/files/${file.id}`}
                          style={{
                            color: 'var(--color-midnight-navy)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Icon size={16} style={{ color: badge.color, flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-word' }}>{file.fileName}</span>
                        </Link>
                      </td>

                      {/* File Type */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Candidate / Reference */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{file.candidateName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              backgroundColor: file.sourceType === 'APPLICATION' ? '#EEF2FF' : '#DCFCE7',
                              color: file.sourceType === 'APPLICATION' ? '#4338CA' : '#15803D'
                            }}
                          >
                            {file.sourceReference}
                          </span>
                        </div>
                      </td>

                      {/* Version */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569'
                          }}
                        >
                          v{file.version}
                        </span>
                      </td>

                      {/* Size */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                        {formatBytes(file.fileSize)}
                      </td>

                      {/* Generated Date */}
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        {new Date(file.generatedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Link
                            to={`/admin/files/${file.id}`}
                            title="View File Details"
                            className="btn btn-outline"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleQuickDownload(file.storagePath, file.fileName)}
                            title="Download File"
                            className="btn btn-outline"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
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
    </div>
  );
};
