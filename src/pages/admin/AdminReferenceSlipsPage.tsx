// ==============================================================================
// File: src/pages/admin/AdminReferenceSlipsPage.tsx
// Description: Central Administrative Directory of Reference Slips & Consultancy Returns
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Security:
//   - Zero KYC PII exposure (Aadhaar/PAN strictly omitted from list view)
//   - Strict role-based permissions (SUPER_ADMIN, COORDINATOR, DOCUMENT_VERIFIER, ACCOUNTANT)
//   - Supports dual candidate sources: Application (INQ-...) & Standalone Joining (JOIN-...)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  getReferenceSlips,
  saveReferenceSlip,
  getReferenceSlipById,
  type ReferenceSlipListItem,
  type ReferenceSlipKPIs,
  type ReferenceSlipFilters,
  type ReferenceSlipFormData
} from '../../services/referenceSlipService';
import { generateAndPersistReferenceSlipPdf } from '../../services/referenceSlipPdfGenerator';
import { getGeneratedDocumentSignedUrl } from '../../services/filePersistenceService';
import { CreateReferenceSlipModal } from '../../components/admin/CreateReferenceSlipModal';
import { ReferenceSlipFormModal } from '../../components/admin/ReferenceSlipFormModal';
import { ReferenceSlipPreviewModal } from '../../components/admin/ReferenceSlipPreviewModal';
import { formatIndianPhoneNumber } from '../../utils/phoneUtils';
import {
  FileCheck,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';

export const AdminReferenceSlipsPage: React.FC = () => {
  const { role, user } = useAdminAuth();

  const canCreate = role === 'SUPER_ADMIN' || role === 'COORDINATOR';
  const canGenerate = role === 'SUPER_ADMIN' || role === 'COORDINATOR';

  const [slips, setSlips] = useState<ReferenceSlipListItem[]>([]);
  const [kpis, setKpis] = useState<ReferenceSlipKPIs>({
    totalSlips: 0,
    selectedCount: 0,
    holdCount: 0,
    rejectedCount: 0,
    generatedPackets: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState<boolean>(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedCandidateForNewSlip, setSelectedCandidateForNewSlip] = useState<{
    type: 'APPLICATION' | 'JOINING_FORM';
    id: string;
    reference: string;
    candidateName: string;
  } | null>(null);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [editingSlipInitialData, setEditingSlipInitialData] = useState<any>(null);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{
    refNo: string;
    candidateName: string;
    sourceRef: string;
    consultancyAccepted: boolean;
    acceptedAt: string | null;
    genFile: any;
    slipId: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const loadSlips = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ReferenceSlipFilters = {
        search: search.trim() || undefined,
        result: resultFilter !== 'ALL' ? resultFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const res = await getReferenceSlips(filters);
      setSlips(res.data);
      setKpis(res.kpis);
    } catch (err) {
      console.error('[AdminReferenceSlipsPage] Error loading slips:', err);
    } finally {
      setLoading(false);
    }
  }, [search, resultFilter, startDate, endDate]);

  useEffect(() => {
    loadSlips();
  }, [loadSlips]);

  // Open Edit Modal
  const handleOpenEdit = async (item: ReferenceSlipListItem) => {
    setEditingSlipId(item.id);
    setSelectedCandidateForNewSlip({
      type: item.sourceType,
      id: item.sourceType === 'APPLICATION' ? item.applicationId! : item.joiningFormId!,
      reference: item.sourceReference,
      candidateName: item.candidateName
    });
    setEditingSlipInitialData({
      companyId: item.companyId,
      companyName: item.companyName,
      interviewDate: item.interviewDate,
      reportingDate: item.reportingDate,
      reportingTime: item.reportingTime,
      department: item.department,
      designation: item.designation,
      salaryCtc: item.salaryCtc,
      interviewResult: item.interviewResult || 'SELECTED',
      selectedDesignation: item.selectedDesignation,
      joiningDate: item.joiningDate,
      remarks: item.remarks
    });
    setIsFormModalOpen(true);
  };

  // Open Preview Modal
  const handleOpenPreview = async (item: ReferenceSlipListItem) => {
    if (item.latestGeneratedFile?.storage_path) {
      const { url } = await getGeneratedDocumentSignedUrl(item.latestGeneratedFile.storage_path, 3600);
      if (url) {
        setActivePreviewUrl(url);
        setPreviewMeta({
          refNo: item.referenceNumber,
          candidateName: item.candidateName,
          sourceRef: item.sourceReference,
          consultancyAccepted: item.consultancyAccepted,
          acceptedAt: item.consultancyAcceptedAt,
          genFile: item.latestGeneratedFile,
          slipId: item.id
        });
        setIsPreviewOpen(true);
        return;
      }
    }

    // If not generated, generate now
    if (canGenerate) {
      setIsGenerating(true);
      try {
        const detailRes = await getReferenceSlipById(item.id);
        if (detailRes.success && detailRes.data) {
          const genRes = await generateAndPersistReferenceSlipPdf(detailRes.data, user?.id);
          if (genRes.success && genRes.signedUrl) {
            setActivePreviewUrl(genRes.signedUrl);
            setPreviewMeta({
              refNo: item.referenceNumber,
              candidateName: item.candidateName,
              sourceRef: item.sourceReference,
              consultancyAccepted: item.consultancyAccepted,
              acceptedAt: item.consultancyAcceptedAt,
              genFile: { version: genRes.version },
              slipId: item.id
            });
            setIsPreviewOpen(true);
            await loadSlips();
          } else {
            alert(genRes.error || 'Failed to generate PDF packet.');
          }
        }
      } catch (err: any) {
        alert(err?.message || 'Error generating PDF.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // Handle Form Submit
  const handleFormSubmit = async (formData: ReferenceSlipFormData): Promise<boolean> => {
    if (!selectedCandidateForNewSlip) return false;
    try {
      const isApp = selectedCandidateForNewSlip.type === 'APPLICATION';
      const res = await saveReferenceSlip({
        applicationId: isApp ? selectedCandidateForNewSlip.id : null,
        joiningFormId: !isApp ? selectedCandidateForNewSlip.id : null,
        slipId: editingSlipId,
        formData,
        adminUser: { id: user?.id || 'admin', name: user?.email || 'Admin', role: role || undefined }
      });

      if (res.success) {
        setIsFormModalOpen(false);
        setEditingSlipId(null);
        setSelectedCandidateForNewSlip(null);
        await loadSlips();
        return true;
      } else {
        alert(res.error || 'Failed to save reference slip.');
        return false;
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving reference slip.');
      return false;
    }
  };

  // Handle Candidate Selected from Selector Modal
  const handleCandidateSelected = (cand: any) => {
    setIsCandidateModalOpen(false);
    setSelectedCandidateForNewSlip(cand);
    setEditingSlipId(null);
    setEditingSlipInitialData(null);
    setIsFormModalOpen(true);
  };

  // Regenerate PDF from inside preview
  const handleRegenerateFromPreview = async () => {
    if (!previewMeta?.slipId) return;
    setIsGenerating(true);
    try {
      const detailRes = await getReferenceSlipById(previewMeta.slipId);
      if (detailRes.success && detailRes.data) {
        const genRes = await generateAndPersistReferenceSlipPdf(detailRes.data, user?.id);
        if (genRes.success && genRes.signedUrl) {
          setActivePreviewUrl(genRes.signedUrl);
          setPreviewMeta((prev) => (prev ? { ...prev, genFile: { version: genRes.version } } : null));
          await loadSlips();
        } else {
          alert(genRes.error || 'Failed to regenerate PDF.');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error regenerating PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileCheck size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Employee Reference Slips & Consultancy Returns
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                Central directory of official 2-page candidate reference slips and statutory return forms
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsCandidateModalOpen(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Plus size={18} />
            <span>Create Reference Slip</span>
          </button>
        )}
      </div>

      {/* 5 KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#64748B' }}>Total Reference Slips</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>
            {kpis.totalSlips}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Both Application & Standalone
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#047857' }}>Selected Candidates</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#065F46', marginTop: '0.25rem' }}>
            {kpis.selectedCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#059669', marginTop: '0.25rem' }}>
            Approved for placement
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#B45309' }}>On Hold / In Review</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#92400E', marginTop: '0.25rem' }}>
            {kpis.holdCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#D97706', marginTop: '0.25rem' }}>
            Awaiting company feedback
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#B91C1C' }}>Rejected / Declined</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#991B1B', marginTop: '0.25rem' }}>
            {kpis.rejectedCount}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#DC2626', marginTop: '0.25rem' }}>
            Not selected by employer
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', borderLeft: '4px solid #4F46E5' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#4338CA' }}>Generated 2-Page Packets</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#312E81', marginTop: '0.25rem' }}>
            {kpis.generatedPackets}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#4F46E5', marginTop: '0.25rem' }}>
            Ready for print & distribution
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
            placeholder="Search reference no., candidate name, INQ-... or JOIN-..."
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Result Filter */}
          <select
            className="form-control form-select"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="SELECTED">Selected</option>
            <option value="HOLD">Hold</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Filter from date"
              style={{ width: 'auto', padding: '0.45rem 0.65rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>to</span>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Filter to date"
              style={{ width: 'auto', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <button
            type="button"
            onClick={loadSlips}
            title="Refresh Directory"
            className="btn btn-outline"
            style={{ padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1rem' }}>Reference No.</th>
                <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                <th style={{ padding: '0.85rem 1rem' }}>Employer / Company</th>
                <th style={{ padding: '0.85rem 1rem' }}>Interview Date</th>
                <th style={{ padding: '0.85rem 1rem' }}>Result</th>
                <th style={{ padding: '0.85rem 1rem' }}>Joining Date</th>
                <th style={{ padding: '0.85rem 1rem' }}>Consultancy Return</th>
                <th style={{ padding: '0.85rem 1rem' }}>Packet</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 size={28} className="animate-spin" color="var(--color-champagne-dark)" style={{ margin: '0 auto 0.5rem' }} />
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>Loading reference slips...</span>
                  </td>
                </tr>
              ) : slips.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
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
                      <FileCheck size={32} color="#94A3B8" />
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-midnight-navy)' }}>
                      No Reference Slips Found
                    </p>
                    <p style={{ margin: '0.35rem 0 1.5rem', fontSize: '0.85rem', color: '#64748B' }}>
                      Click "Create Reference Slip" to issue an official 2-page reference slip for a candidate.
                    </p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setIsCandidateModalOpen(true)}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1.25rem',
                          fontSize: '0.875rem',
                          fontWeight: 700
                        }}
                      >
                        <Plus size={16} />
                        <span>CREATE REFERENCE SLIP</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                slips.map((row) => {
                  const resUpper = (row.interviewResult || '').toUpperCase();
                  const isSel = resUpper === 'SELECTED';
                  const isHold = resUpper === 'HOLD';
                  const isRej = resUpper === 'REJECTED';

                  return (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Reference No */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                        <Link
                          to={`/admin/reference-slips/${row.id}`}
                          style={{ color: '#4F46E5', textDecoration: 'none' }}
                        >
                          {row.referenceNumber}
                        </Link>
                        <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                          Issued: {row.date}
                        </div>
                      </td>

                      {/* Candidate */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{row.candidateName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              backgroundColor: row.sourceType === 'APPLICATION' ? '#EEF2FF' : '#DCFCE7',
                              color: row.sourceType === 'APPLICATION' ? '#4338CA' : '#15803D'
                            }}
                          >
                            {row.sourceReference}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {row.candidateMobile ? formatIndianPhoneNumber(row.candidateMobile) : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{row.companyName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.designation || '—'}</div>
                      </td>

                      {/* Interview Date */}
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        {row.interviewDate || '—'}
                      </td>

                      {/* Result */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: isSel ? '#DCFCE7' : isHold ? '#FEF3C7' : isRej ? '#FEE2E2' : '#F1F5F9',
                            color: isSel ? '#15803D' : isHold ? '#B45309' : isRej ? '#B91C1C' : '#475569',
                            border: `1px solid ${isSel ? '#86EFAC' : isHold ? '#FDE68A' : isRej ? '#FCA5A5' : '#CBD5E1'}`
                          }}
                        >
                          {row.interviewResult || 'PENDING'}
                        </span>
                      </td>

                      {/* Joining Date */}
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        {row.joiningDate || '—'}
                      </td>

                      {/* Consultancy Return Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {row.consultancyAccepted ? (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              color: '#15803D',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <CheckCircle2 size={13} />
                            Accepted
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              color: '#B45309',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Clock size={13} />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Generated Packet */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {row.latestGeneratedFile ? (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              backgroundColor: '#EEF2FF',
                              color: '#4F46E5',
                              border: '1px solid #C7D2FE'
                            }}
                          >
                            v{row.latestGeneratedFile.version} Ready
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Not Generated</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(row)}
                            title={row.latestGeneratedFile ? 'View 2-Page Document' : 'Generate & View 2-Page PDF'}
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {row.latestGeneratedFile ? <Printer size={13} /> : <FileCheck size={13} />}
                            <span>{row.latestGeneratedFile ? 'Print / View' : 'Generate'}</span>
                          </button>

                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row)}
                              title="Edit Slip Details"
                              style={{
                                padding: '0.35rem',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#64748B',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          <Link
                            to={`/admin/reference-slips/${row.id}`}
                            title="View Full Detail Dossier"
                            style={{
                              padding: '0.35rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Eye size={14} />
                          </Link>
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

      {/* Candidate Selector Modal */}
      {isCandidateModalOpen && (
        <CreateReferenceSlipModal
          isOpen={isCandidateModalOpen}
          onClose={() => setIsCandidateModalOpen(false)}
          onSelectCandidate={handleCandidateSelected}
        />
      )}

      {/* Slip Form Modal */}
      {isFormModalOpen && (
        <ReferenceSlipFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingSlipId(null);
            setSelectedCandidateForNewSlip(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingSlipInitialData}
          candidateInfo={
            selectedCandidateForNewSlip
              ? {
                sourceType: selectedCandidateForNewSlip.type,
                sourceId: selectedCandidateForNewSlip.id,
                sourceReference: selectedCandidateForNewSlip.reference,
                fullName: selectedCandidateForNewSlip.candidateName,
                fatherName: '',
                mobile: '',
                email: '',
                address: ''
              }
              : null
          }
        />
      )}

      {/* PDF Preview Modal */}
      {isPreviewOpen && previewMeta && (
        <ReferenceSlipPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          signedUrl={activePreviewUrl}
          referenceNumber={previewMeta.refNo}
          candidateName={previewMeta.candidateName}
          sourceReference={previewMeta.sourceRef}
          consultancyAccepted={previewMeta.consultancyAccepted}
          acceptedAt={previewMeta.acceptedAt}
          generatedFile={previewMeta.genFile}
          onRegenerate={canGenerate ? handleRegenerateFromPreview : undefined}
          isRegenerating={isGenerating}
          canManage={canGenerate}
        />
      )}
    </div>
  );
};
