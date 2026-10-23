// ==============================================================================
// File: src/pages/admin/AdminRegularJoiningListPage.tsx
// Description: Admin Directory, Record Management & Excel Export for Regular Joining Forms
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Filterable table of regular joining candidates (ATG-501-2026, etc.)
//   - Quick actions: View Details / Edit, Review Documents, Verify, Generate 1-Page Reference Slip
//   - Integrated 3-Sheet Excel Export:
//       1. "Export All Regular Joining Records"
//       2. "Export Selected Records"
//       3. "Download Individual Employee Details" (Per-employee .xlsx)
//   - Batch row selection with "Select All"
//   - Date Range, Department, Designation, and Verification Status filters
//   - Loading spinners & feedback banners
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  FileCheck2,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Loader2,
  FileSpreadsheet,
  Calendar,
  CheckSquare,
  Square,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { AdminBreadcrumbs } from '../../components/admin/AdminBreadcrumbs';
import { RegularReferenceSlipModal } from '../../components/admin/RegularReferenceSlipModal';
import {
  listRegularJoiningForms,
  type RegularJoiningFormData
} from '../../services/regularJoiningService';
import { downloadRegularReferenceSlipPdf } from '../../services/regularReferenceSlipPdfGenerator';
import {
  exportRegularJoiningRecordsXlsx,
  exportIndividualRegularJoiningXlsx
} from '../../services/regularJoiningExportService';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export const AdminRegularJoiningListPage: React.FC = () => {
  const { isSuperAdmin, role, hasPermission } = useAdminAuth();
  const canExportExcel = isSuperAdmin || hasPermission('regular_joining.export_excel') || hasPermission('reports.download_excel') || role !== 'SUB_ADMIN';
  const canGenerateSlip = isSuperAdmin || hasPermission('regular_joining.generate_slip') || role !== 'SUB_ADMIN';

  const [items, setItems] = useState<RegularJoiningFormData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Row Selection for Selective Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Export state
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview Modal
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<RegularJoiningFormData | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRegularJoiningForms();
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        throw new Error(res.error || 'Failed to load regular joining records.');
      }
    } catch (err: any) {
      console.error('[AdminRegularJoiningList] Error:', err);
      setError(err.message || 'Failed to fetch records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.department?.trim()) {
        set.add(it.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Client filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.employeeCode.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        (item.designation && item.designation.toLowerCase().includes(q)) ||
        (item.companyName && item.companyName.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.includes(q));

      const matchesStatus =
        statusFilter === 'ALL' || item.submissionStatus === statusFilter;

      const matchesDepartment =
        departmentFilter === 'ALL' || (item.department || '').toLowerCase() === departmentFilter.toLowerCase();

      const matchesDesignation =
        !designationFilter.trim() ||
        (item.designation || '').toLowerCase().includes(designationFilter.toLowerCase().trim());

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && item.joiningDate >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && item.joiningDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDepartment && matchesDesignation && matchesDate;
    });
  }, [items, searchQuery, statusFilter, departmentFilter, designationFilter, startDate, endDate]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    designationFilter.trim() ||
    startDate ||
    endDate
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setDesignationFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Toggle selection for a single row
  const toggleRowSelect = (idOrCode: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idOrCode)) {
        next.delete(idOrCode);
      } else {
        next.add(idOrCode);
      }
      return next;
    });
  };

  // Toggle select all visible
  const toggleSelectAllVisible = () => {
    const visibleIds = filteredItems.map((it) => it.id || it.employeeCode);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const isAllVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((it) => selectedIds.has(it.id || it.employeeCode));

  // Handler: Export All Records
  const handleExportAll = async () => {
    setExportLoading('ALL');
    setExportFeedback(null);
    try {
      const res = await exportRegularJoiningRecordsXlsx();
      setExportFeedback({
        type: 'success',
        message: `Successfully exported all ${res.recordCount} Regular Joining records to '${res.filename}' (includes 3 sheets: Employee Joining Details, Document Checklist, Joining Summary).`
      });
    } catch (err: any) {
      console.error('[Export All] Error:', err);
      setExportFeedback({
        type: 'error',
        message: err.message || 'Failed to export Regular Joining records.'
      });
    } finally {
      setExportLoading(null);
    }
  };

  // Handler: Export Filtered Records
  const handleExportFiltered = async () => {
    if (filteredItems.length === 0) {
      setExportFeedback({
        type: 'error',
        message: 'No records match the active filters to export.'
      });
      return;
    }

    setExportLoading('FILTERED');
    setExportFeedback(null);
    try {
      const res = await exportRegularJoiningRecordsXlsx({
        explicitRecords: filteredItems
      });
      setExportFeedback({
        type: 'success',
        message: `Successfully exported ${res.recordCount} filtered Regular Joining records to '${res.filename}'.`
      });
    } catch (err: any) {
      console.error('[Export Filtered] Error:', err);
      setExportFeedback({
        type: 'error',
        message: err.message || 'Failed to export filtered records.'
      });
    } finally {
      setExportLoading(null);
    }
  };

  // Handler: Export Selected Records
  const handleExportSelected = async () => {
    const selectedList = items.filter((it) => selectedIds.has(it.id || it.employeeCode));
    if (selectedList.length === 0) {
      setExportFeedback({
        type: 'error',
        message: 'Please select at least one record using the checkboxes to export.'
      });
      return;
    }

    setExportLoading('SELECTED');
    setExportFeedback(null);
    try {
      const res = await exportRegularJoiningRecordsXlsx({
        explicitRecords: selectedList
      });
      setExportFeedback({
        type: 'success',
        message: `Successfully exported ${res.recordCount} selected Regular Joining records to '${res.filename}'.`
      });
    } catch (err: any) {
      console.error('[Export Selected] Error:', err);
      setExportFeedback({
        type: 'error',
        message: err.message || 'Failed to export selected records.'
      });
    } finally {
      setExportLoading(null);
    }
  };

  // Handler: Export Individual Employee
  const handleExportIndividual = async (item: RegularJoiningFormData) => {
    const key = `INDIVIDUAL_${item.employeeCode}`;
    setExportLoading(key);
    setExportFeedback(null);
    try {
      const res = await exportIndividualRegularJoiningXlsx(item);
      setExportFeedback({
        type: 'success',
        message: `Downloaded individual employee dossier for ${item.fullName} (${item.employeeCode}) as '${res.filename}'.`
      });
    } catch (err: any) {
      console.error('[Export Individual] Error:', err);
      setExportFeedback({
        type: 'error',
        message: err.message || 'Failed to export employee details.'
      });
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownload = async (item: RegularJoiningFormData) => {
    await downloadRegularReferenceSlipPdf(item);
  };

  return (
    <div className="admin-page-container">
      {/* Breadcrumbs */}
      <AdminBreadcrumbs
        items={[
          { label: 'Joining Management', path: '/admin/joining' },
          { label: 'Regular Joining Records' }
        ]}
      />

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#0F1B38',
          color: '#FFFFFF',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(15, 27, 56, 0.15)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileCheck2 size={26} style={{ color: '#C5A059' }} />
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
              REGULAR JOINING REGISTER
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
            Administrative records • Sequential ATG codes (ATG-501-2026 onwards) • 1-Page Reference Slips & Excel Reports
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchList()}
            className="btn btn-outline btn-sm"
            style={{ color: '#FFFFFF', borderColor: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/regular-joining"
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: '#C5A059', borderColor: '#C5A059', color: '#0F1B38', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={16} />
            <span>New Regular Joining Form</span>
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {exportFeedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 500,
            backgroundColor: exportFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${exportFeedback.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: exportFeedback.type === 'success' ? '#065F46' : '#991B1B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {exportFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{exportFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Excel Export Toolbar Section */}
      {canExportExcel && (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={20} style={{ color: '#059669' }} />
          <div>
            <strong style={{ fontSize: '0.9rem', color: '#0F1B38' }}>Excel Export & Reporting</strong>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              3-Sheet Workbook (.xlsx) • Sequential ATG Codes • Document Audit & Summary
            </div>
          </div>
        </div>

        {/* Action Buttons: Export All / Export Filtered / Export Selected */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleExportAll}
            disabled={exportLoading !== null || items.length === 0}
            className="btn btn-outline btn-sm"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#059669',
              color: '#059669',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Download complete register of all Regular Joining records in a 3-sheet Excel workbook"
          >
            {exportLoading === 'ALL' ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            <span>Export All Regular Joining Records ({items.length})</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleExportFiltered}
              disabled={exportLoading !== null || filteredItems.length === 0}
              className="btn btn-outline btn-sm"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#2563EB',
                color: '#2563EB',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Download only the records matching your active filters"
            >
              {exportLoading === 'FILTERED' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FileSpreadsheet size={14} />
              )}
              <span>Export Filtered Records ({filteredItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSelected}
            disabled={exportLoading !== null || selectedIds.size === 0}
            className="btn btn-sm"
            style={{
              backgroundColor: selectedIds.size > 0 ? '#0F1B38' : '#E2E8F0',
              borderColor: selectedIds.size > 0 ? '#0F1B38' : '#CBD5E1',
              color: selectedIds.size > 0 ? '#FFFFFF' : '#94A3B8',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed'
            }}
            title="Export only checked records"
          >
            {exportLoading === 'SELECTED' ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <CheckSquare size={14} />
            )}
            <span>Export Selected Records ({selectedIds.size})</span>
          </button>
        </div>
      </div>
      )}

      {/* Comprehensive Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Search Query */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ATG Code, candidate name, phone, company..."
              className="form-control"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={15} style={{ color: '#64748B' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Designation Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '150px' }}>
            <input
              type="text"
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              placeholder="Designation..."
              className="form-control"
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Date Range Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#475569' }}>
              <Calendar size={14} style={{ color: '#64748B' }} />
              <span>Joining Date:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.82rem', width: 'auto', padding: '0.3rem 0.5rem' }}
              title="From Joining Date"
            />
            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.82rem', width: 'auto', padding: '0.3rem 0.5rem' }}
              title="To Joining Date"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> records
              {hasActiveFilters && ' (Filtered)'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#64748B' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '8px', color: '#991B1B', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="admin-card" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#0F1B38', textAlign: 'left' }}>
                {/* Select All Checkbox */}
                <th style={{ padding: '0.75rem 0.75rem', width: '38px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    title={isAllVisibleSelected ? 'Deselect all visible rows' : 'Select all visible rows for export'}
                  >
                    {isAllVisibleSelected ? (
                      <CheckSquare size={17} style={{ color: '#0F1B38' }} />
                    ) : (
                      <Square size={17} style={{ color: '#94A3B8' }} />
                    )}
                  </button>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Employee Code / Ref</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Candidate Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Joining Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Department & Designation</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Company / Unit</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem', color: '#0F1B38' }} />
                    <span>Loading regular records...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <FileCheck2 size={36} style={{ color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No regular joining records found.</p>
                    <Link to="/admin/regular-joining" className="btn btn-navy btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                      Create First Regular Joining Form
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isVerified = item.submissionStatus === 'VERIFIED';
                  const rowKey = item.id || item.employeeCode;
                  const isSelected = selectedIds.has(rowKey);
                  const isIndividualExporting = exportLoading === `INDIVIDUAL_${item.employeeCode}`;

                  return (
                    <tr
                      key={rowKey}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isSelected ? '#F0FDF4' : 'transparent'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleRowSelect(rowKey)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          title={isSelected ? 'Deselect row' : 'Select row for export'}
                        >
                          {isSelected ? (
                            <CheckSquare size={17} style={{ color: '#059669' }} />
                          ) : (
                            <Square size={17} style={{ color: '#CBD5E1' }} />
                          )}
                        </button>
                      </td>

                      {/* Employee Code */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ color: '#0F1B38', letterSpacing: '0.02em' }}>{item.employeeCode}</strong>
                      </td>

                      {/* Candidate Name & Phone */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{item.fullName}</div>
                        {item.mobile && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {formatIndianPhoneNumber(item.mobile)}
                          </div>
                        )}
                      </td>

                      {/* Joining Date */}
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {item.joiningDate ? item.joiningDate.split('-').reverse().join('/') : '—'}
                      </td>

                      {/* Department & Designation */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ color: '#0F1B38', fontWeight: 600 }}>{item.designation || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.department || 'Operations'}</div>
                      </td>

                      {/* Company & Unit */}
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        <div>{item.companyName || '—'}</div>
                        {item.unitName && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.unitName}</div>}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isVerified ? (
                          <span style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={12} />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#FFFBEB', color: '#B45309', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} />
                            <span>DRAFT</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {/* Individual Excel Export Button */}
                          {canExportExcel && (
                            <button
                              type="button"
                              onClick={() => handleExportIndividual(item)}
                              disabled={isIndividualExporting}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#059669', borderColor: '#A7F3D0' }}
                              title="Download Individual Employee Details (Excel .xlsx)"
                            >
                              {isIndividualExporting ? (
                                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <FileSpreadsheet size={13} />
                              )}
                              <span>Excel</span>
                            </button>
                          )}

                          {/* View / Edit */}
                          <Link
                            to={`/admin/regular-joining/${item.id}`}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="View / Edit Record"
                          >
                            <Eye size={13} />
                            <span>{isVerified ? 'View' : 'Edit'}</span>
                          </Link>

                          {/* Reference Slip Actions (Only for Verified + Permitted) */}
                          {isVerified && canGenerateSlip && (
                            <>
                              <button
                                onClick={() => setSelectedSlipRecord(item)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#0F1B38', borderColor: '#C5A059' }}
                                title="Preview 1-Page Reference Slip"
                              >
                                <Printer size={13} style={{ color: '#C5A059' }} />
                                <span>Slip</span>
                              </button>
                              <button
                                onClick={() => handleDownload(item)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                title="Download 1-Page PDF"
                              >
                                <Download size={13} />
                              </button>
                            </>
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

      {/* 1-Page Reference Slip Modal */}
      {selectedSlipRecord && (
        <RegularReferenceSlipModal
          isOpen={!!selectedSlipRecord}
          onClose={() => setSelectedSlipRecord(null)}
          formData={selectedSlipRecord}
        />
      )}
    </div>
  );
};
