// ==============================================================================
// File: src/components/admin/CompanySignatureSettingsSection.tsx
// Description: Founder / CEO Signature and Official Company Stamp Management Section
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Strictly SUPER_ADMIN governed for modifications; all admins can inspect status
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Stamp
} from 'lucide-react';
import {
  getCompanySignatureSettings,
  getActiveCompanySignatureSignedUrl,
  uploadCompanySignature,
  removeCompanySignature,
  toggleCompanySignatureEnabled,
  SIGNATURE_CONSTRAINTS,
  type CompanySignatureMetadata,
  getCompanyStampSettings,
  getActiveCompanyStampSignedUrl,
  uploadCompanyStamp,
  removeCompanyStamp,
  toggleCompanyStampEnabled,
  STAMP_CONSTRAINTS,
  type CompanyStampMetadata
} from '../../services/companySignatureService';

interface CompanySignatureSettingsSectionProps {
  isSuperAdmin: boolean;
}

export const CompanySignatureSettingsSection: React.FC<CompanySignatureSettingsSectionProps> = ({
  isSuperAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'SIGNATURE' | 'STAMP'>('SIGNATURE');

  // --- SIGNATURE STATE ---
  const [signatureMeta, setSignatureMeta] = useState<CompanySignatureMetadata | null>(null);
  const [signatureSignedUrl, setSignatureSignedUrl] = useState<string | null>(null);
  const [selectedSigFile, setSelectedSigFile] = useState<File | null>(null);
  const [selectedSigPreview, setSelectedSigPreview] = useState<string | null>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // --- STAMP STATE ---
  const [stampMeta, setStampMeta] = useState<CompanyStampMetadata | null>(null);
  const [stampSignedUrl, setStampSignedUrl] = useState<string | null>(null);
  const [selectedStampFile, setSelectedStampFile] = useState<File | null>(null);
  const [selectedStampPreview, setSelectedStampPreview] = useState<string | null>(null);
  const stampFileInputRef = useRef<HTMLInputElement>(null);

  // --- COMMON STATE ---
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllState = useCallback(async () => {
    setLoading(true);
    try {
      const [sigMeta, stMeta] = await Promise.all([
        getCompanySignatureSettings(),
        getCompanyStampSettings()
      ]);
      setSignatureMeta(sigMeta);
      setStampMeta(stMeta);

      const [sigUrl, stUrl] = await Promise.all([
        sigMeta.storage_path ? getActiveCompanySignatureSignedUrl(3600) : Promise.resolve(null),
        stMeta.storage_path ? getActiveCompanyStampSignedUrl(3600) : Promise.resolve(null)
      ]);
      setSignatureSignedUrl(sigUrl);
      setStampSignedUrl(stUrl);
    } catch (err) {
      console.error('[CompanySignatureSettingsSection] Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllState();
  }, [loadAllState]);

  // --- SIGNATURE HANDLERS ---
  const handleSigFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);

    const mimeType = file.type.toLowerCase();
    if (!SIGNATURE_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please choose a PNG, JPG, or WebP image.'
      });
      if (sigFileInputRef.current) sigFileInputRef.current.value = '';
      setSelectedSigFile(null);
      setSelectedSigPreview(null);
      return;
    }

    if (file.size > SIGNATURE_CONSTRAINTS.maxSizeBytes) {
      setStatusMessage({
        type: 'error',
        text: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      });
      if (sigFileInputRef.current) sigFileInputRef.current.value = '';
      setSelectedSigFile(null);
      setSelectedSigPreview(null);
      return;
    }

    setSelectedSigFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedSigPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSelectedSigFile = () => {
    setSelectedSigFile(null);
    setSelectedSigPreview(null);
    if (sigFileInputRef.current) sigFileInputRef.current.value = '';
  };

  const handleUploadSignature = async () => {
    if (!selectedSigFile) {
      setStatusMessage({ type: 'error', text: 'Please choose a signature image file first.' });
      return;
    }

    if (!isSuperAdmin) {
      setStatusMessage({ type: 'error', text: 'Unauthorized: Only SUPER_ADMIN accounts can upload the signature.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await uploadCompanySignature(selectedSigFile);
      if (!res.success) throw new Error(res.error || 'Failed to upload signature asset.');

      setStatusMessage({
        type: 'success',
        text: `Authorized Signatory Signature successfully ${signatureMeta?.storage_path ? 'replaced' : 'uploaded'}. Active on Reference Slips & Joining Documents.`
      });

      handleClearSelectedSigFile();
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Signature upload encountered an error.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSigEnabled = async () => {
    if (!isSuperAdmin) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const nextEnabled = !signatureMeta?.enabled;
      const res = await toggleCompanySignatureEnabled(nextEnabled);
      if (!res.success) throw new Error(res.error || 'Failed to toggle status.');
      setStatusMessage({
        type: 'success',
        text: `Authorized Signatory Signature ${nextEnabled ? 'enabled' : 'disabled'}.`
      });
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error toggling signature.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Are you sure you want to remove the Authorized Signatory Signature?')) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await removeCompanySignature();
      if (!res.success) throw new Error(res.error || 'Failed to remove signature.');
      setStatusMessage({
        type: 'success',
        text: 'Authorized Signatory Signature asset removed from active company identity.'
      });
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove signature.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- STAMP HANDLERS ---
  const handleStampFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);

    const mimeType = file.type.toLowerCase();
    if (!STAMP_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please choose a PNG, JPG, or WebP image.'
      });
      if (stampFileInputRef.current) stampFileInputRef.current.value = '';
      setSelectedStampFile(null);
      setSelectedStampPreview(null);
      return;
    }

    if (file.size > STAMP_CONSTRAINTS.maxSizeBytes) {
      setStatusMessage({
        type: 'error',
        text: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      });
      if (stampFileInputRef.current) stampFileInputRef.current.value = '';
      setSelectedStampFile(null);
      setSelectedStampPreview(null);
      return;
    }

    setSelectedStampFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedStampPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSelectedStampFile = () => {
    setSelectedStampFile(null);
    setSelectedStampPreview(null);
    if (stampFileInputRef.current) stampFileInputRef.current.value = '';
  };

  const handleUploadStamp = async () => {
    if (!selectedStampFile) {
      setStatusMessage({ type: 'error', text: 'Please choose an official company stamp image first.' });
      return;
    }

    if (!isSuperAdmin) {
      setStatusMessage({ type: 'error', text: 'Unauthorized: Only SUPER_ADMIN accounts can upload the company stamp.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await uploadCompanyStamp(selectedStampFile);
      if (!res.success) throw new Error(res.error || 'Failed to upload stamp asset.');

      setStatusMessage({
        type: 'success',
        text: `Official Company Stamp successfully ${stampMeta?.storage_path ? 'replaced' : 'uploaded'}. Active on Reference Slips & Joining Documents.`
      });

      handleClearSelectedStampFile();
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Stamp upload encountered an error.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStampEnabled = async () => {
    if (!isSuperAdmin) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const nextEnabled = !stampMeta?.enabled;
      const res = await toggleCompanyStampEnabled(nextEnabled);
      if (!res.success) throw new Error(res.error || 'Failed to toggle status.');
      setStatusMessage({
        type: 'success',
        text: `Official Company Stamp ${nextEnabled ? 'enabled' : 'disabled'}.`
      });
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error toggling stamp.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveStamp = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Are you sure you want to remove the Official Company Stamp?')) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await removeCompanyStamp();
      if (!res.success) throw new Error(res.error || 'Failed to remove company stamp.');
      setStatusMessage({
        type: 'success',
        text: 'Official Company Stamp asset removed from active company identity.'
      });
      await loadAllState();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove stamp.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const isSigConfigured = Boolean(signatureMeta?.storage_path);
  const isSigActive = isSigConfigured && signatureMeta?.enabled;

  const isStampConfigured = Boolean(stampMeta?.storage_path);
  const isStampActive = isStampConfigured && stampMeta?.enabled;

  return (
    <div
      className="admin-card"
      style={{
        marginTop: '1.5rem',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={sigFileInputRef}
        type="file"
        accept={SIGNATURE_CONSTRAINTS.allowedMimeTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleSigFileSelected}
      />
      <input
        ref={stampFileInputRef}
        type="file"
        accept={STAMP_CONSTRAINTS.allowedMimeTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleStampFileSelected}
      />

      {/* Header Banner */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#0F1B38',
              color: '#C5A880',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(15, 27, 56, 0.15)'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F1B38' }}>
                OFFICIAL COMPANY ASSETS & AUTHORIZATION SEALS
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Manage official company stamp and authorized signatory signature for Reference Slips, Complete Joining Documents & ID Cards
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('SIGNATURE'); setStatusMessage(null); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: activeTab === 'SIGNATURE' ? '1px solid #0F1B38' : '1px solid #CBD5E1',
              backgroundColor: activeTab === 'SIGNATURE' ? '#0F1B38' : '#F8FAFC',
              color: activeTab === 'SIGNATURE' ? '#FFFFFF' : '#475569',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileCheck size={14} />
            <span>Authorized Signature</span>
            {isSigActive && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('STAMP'); setStatusMessage(null); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: activeTab === 'STAMP' ? '1px solid #0F1B38' : '1px solid #CBD5E1',
              backgroundColor: activeTab === 'STAMP' ? '#0F1B38' : '#F8FAFC',
              color: activeTab === 'STAMP' ? '#FFFFFF' : '#475569',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Stamp size={14} />
            <span>Official Company Stamp</span>
            {isStampActive && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />}
          </button>

          <button
            type="button"
            onClick={loadAllState}
            disabled={loading || isProcessing}
            title="Refresh assets status"
            style={{
              background: 'none',
              border: '1px solid #E2E8F0',
              padding: '0.45rem',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            backgroundColor: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${statusMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: statusMessage.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* MAIN BODY: SIGNATURE PANEL */}
      {activeTab === 'SIGNATURE' && (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left: Specimen Display */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F1B38' }}>Active Signature Specimen</span>
                {isSigActive ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>NOT UPLOADED</span>
                )}
              </div>

              <div
                style={{
                  height: '140px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {selectedSigPreview ? (
                  <img src={selectedSigPreview} alt="Selected Signature Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : signatureSignedUrl ? (
                  <img src={signatureSignedUrl} alt="Active Company Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                    <FileCheck size={28} style={{ margin: '0 auto 0.25rem', opacity: 0.5 }} />
                    <span>No signature uploaded</span>
                  </div>
                )}
              </div>

              {signatureMeta?.storage_path && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Version: {signatureMeta.version || 1}</span>
                  <span>Type: {signatureMeta.mime_type || 'image/png'}</span>
                  <span>Updated: {signatureMeta.uploaded_at ? new Date(signatureMeta.uploaded_at).toLocaleDateString() : '—'}</span>
                </div>
              )}
            </div>

            {/* Right: Upload & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F1B38' }}>
                  Authorized Signatory Administration
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
                  This official signature is embedded directly onto generated <strong>Employee Reference Slips</strong>, <strong>Complete Joining Documents</strong>, and <strong>Employee ID Cards</strong>.
                </p>

                {selectedSigFile && (
                  <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#1E40AF' }}>
                    <strong>Selected: </strong>{selectedSigFile.name} ({(selectedSigFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {selectedSigFile ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUploadSignature}
                      disabled={isProcessing}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: '#C5A059',
                        color: '#0F1B38',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isProcessing ? 'Saving...' : 'Confirm Upload'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedSigFile}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      disabled={!isSuperAdmin || isProcessing}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: '#0F1B38',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <UploadCloud size={15} />
                      <span>{isSigConfigured ? 'Replace Signature' : 'Upload Signature'}</span>
                    </button>

                    {isSigConfigured && (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleSigEnabled}
                          disabled={!isSuperAdmin || isProcessing}
                          style={{
                            padding: '0.6rem 1rem',
                            backgroundColor: signatureMeta?.enabled ? '#FFFBEB' : '#ECFDF5',
                            color: signatureMeta?.enabled ? '#B45309' : '#047857',
                            border: `1px solid ${signatureMeta?.enabled ? '#FDE68A' : '#A7F3D0'}`,
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {signatureMeta?.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSignature}
                          disabled={!isSuperAdmin || isProcessing}
                          style={{
                            padding: '0.6rem 1rem',
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN BODY: STAMP PANEL */}
      {activeTab === 'STAMP' && (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left: Specimen Display */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F1B38' }}>Active Company Stamp Specimen</span>
                {isStampActive ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>NOT UPLOADED</span>
                )}
              </div>

              <div
                style={{
                  height: '140px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {selectedStampPreview ? (
                  <img src={selectedStampPreview} alt="Selected Stamp Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : stampSignedUrl ? (
                  <img src={stampSignedUrl} alt="Active Company Stamp" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                    <Stamp size={28} style={{ margin: '0 auto 0.25rem', opacity: 0.5 }} />
                    <span>No official company stamp uploaded</span>
                  </div>
                )}
              </div>

              {stampMeta?.storage_path && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Version: {stampMeta.version || 1}</span>
                  <span>Type: {stampMeta.mime_type || 'image/png'}</span>
                  <span>Updated: {stampMeta.uploaded_at ? new Date(stampMeta.uploaded_at).toLocaleDateString() : '—'}</span>
                </div>
              )}
            </div>

            {/* Right: Upload & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F1B38' }}>
                  Official Company Stamp & Registration Seal
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
                  This official corporate registration seal is embedded alongside the authorized signatory in Section 3 of <strong>Employee Reference Slips</strong>, Section H of <strong>Complete Joining Documents</strong>, and <strong>Statutory Declarations</strong>.
                </p>

                {selectedStampFile && (
                  <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#1E40AF' }}>
                    <strong>Selected: </strong>{selectedStampFile.name} ({(selectedStampFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {selectedStampFile ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUploadStamp}
                      disabled={isProcessing}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: '#C5A059',
                        color: '#0F1B38',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isProcessing ? 'Saving...' : 'Confirm Upload'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedStampFile}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => stampFileInputRef.current?.click()}
                      disabled={!isSuperAdmin || isProcessing}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: '#0F1B38',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <UploadCloud size={15} />
                      <span>{isStampConfigured ? 'Replace Stamp' : 'Upload Stamp'}</span>
                    </button>

                    {isStampConfigured && (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleStampEnabled}
                          disabled={!isSuperAdmin || isProcessing}
                          style={{
                            padding: '0.6rem 1rem',
                            backgroundColor: stampMeta?.enabled ? '#FFFBEB' : '#ECFDF5',
                            color: stampMeta?.enabled ? '#B45309' : '#047857',
                            border: `1px solid ${stampMeta?.enabled ? '#FDE68A' : '#A7F3D0'}`,
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {stampMeta?.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveStamp}
                          disabled={!isSuperAdmin || isProcessing}
                          style={{
                            padding: '0.6rem 1rem',
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
