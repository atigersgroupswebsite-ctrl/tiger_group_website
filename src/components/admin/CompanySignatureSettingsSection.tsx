// ==============================================================================
// File: src/components/admin/CompanySignatureSettingsSection.tsx
// Description: Founder / CEO Signature Management Section (Admin Settings)
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security: Strictly SUPER_ADMIN governed for modifications; all admins can inspect status
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  FileCheck,
  Power,
  Info,
  X,
  Image as ImageIcon
} from 'lucide-react';
import {
  getCompanySignatureSettings,
  getActiveCompanySignatureSignedUrl,
  uploadCompanySignature,
  removeCompanySignature,
  toggleCompanySignatureEnabled,
  SIGNATURE_CONSTRAINTS,
  type CompanySignatureMetadata
} from '../../services/companySignatureService';

interface CompanySignatureSettingsSectionProps {
  isSuperAdmin: boolean;
}

export const CompanySignatureSettingsSection: React.FC<CompanySignatureSettingsSectionProps> = ({
  isSuperAdmin
}) => {
  const [metadata, setMetadata] = useState<CompanySignatureMetadata | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSignatureState = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await getCompanySignatureSettings();
      setMetadata(meta);

      if (meta.storage_path) {
        const url = await getActiveCompanySignatureSignedUrl(3600);
        setSignedUrl(url);
      } else {
        setSignedUrl(null);
      }
    } catch (err) {
      console.error('[CompanySignatureSettingsSection] Error loading signature:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignatureState();
  }, [loadSignatureState]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);

    // Validate MIME type
    const mimeType = file.type.toLowerCase();
    if (!SIGNATURE_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please choose a PNG, JPG, or WebP image.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      setSelectedFilePreview(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > SIGNATURE_CONSTRAINTS.maxSizeBytes) {
      setStatusMessage({
        type: 'error',
        text: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      setSelectedFilePreview(null);
      return;
    }

    setSelectedFile(file);

    // Generate local preview for immediate user feedback
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSignature = async () => {
    if (!selectedFile) {
      setStatusMessage({
        type: 'error',
        text: 'Please choose a signature image file first.'
      });
      return;
    }

    if (!isSuperAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'Unauthorized: Only SUPER_ADMIN accounts have permission to upload or replace the company signature.'
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await uploadCompanySignature(selectedFile);
      if (!res.success) {
        throw new Error(res.error || 'Failed to upload signature asset.');
      }

      setStatusMessage({
        type: 'success',
        text: `Founder/CEO signature successfully ${metadata?.storage_path ? 'replaced' : 'uploaded'} (Version ${res.setting?.version || 1}). Active on Employee ID Cards.`
      });

      handleClearSelectedFile();
      await loadSignatureState();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Signature upload encountered an error.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!metadata?.storage_path || !isSuperAdmin) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const targetState = !metadata.enabled;
      const res = await toggleCompanySignatureEnabled(targetState);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update signature state.');
      }

      setStatusMessage({
        type: 'success',
        text: `Founder/CEO signature ${targetState ? 'enabled' : 'disabled'} for ID Card generation.`
      });

      await loadSignatureState();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Action failed.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!isSuperAdmin) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove the current Founder/CEO signature? Future ID Cards will generate with a blank company signature line until a new signature is uploaded.'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await removeCompanySignature();
      if (!res.success) {
        throw new Error(res.error || 'Failed to remove signature asset.');
      }

      setStatusMessage({
        type: 'success',
        text: 'Founder/CEO signature asset removed from active company identity configuration.'
      });

      await loadSignatureState();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to remove signature.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isConfigured = Boolean(metadata?.storage_path);
  const isActive = isConfigured && metadata?.enabled;

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
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F1B38' }}>
                FOUNDER / CEO SIGNATURE
              </h3>
              {/* Status Pill Badge */}
              {loading ? (
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Loading status...</span>
              ) : isActive ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    borderRadius: '20px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: 700
                  }}
                >
                  <CheckCircle2 size={12} />
                  Active (Version {metadata?.version || 1})
                </span>
              ) : isConfigured ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#FFFBEB',
                    color: '#B45309',
                    border: '1px solid #FDE68A',
                    borderRadius: '20px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: 700
                  }}
                >
                  <Power size={12} />
                  Disabled
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#F1F5F9',
                    color: '#64748B',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: 600
                  }}
                >
                  <AlertCircle size={12} />
                  Not Configured
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Official authority signature asset rendered on Employee Identity Cards above{' '}
              <strong>Managing Director &amp; CEO</strong>.
            </p>
          </div>
        </div>

        {/* Permission Indicator */}
        <div style={{ fontSize: '0.75rem', color: isSuperAdmin ? '#047857' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {isSuperAdmin ? (
            <>
              <ShieldCheck size={14} />
              <span>SUPER_ADMIN Authorized</span>
            </>
          ) : (
            <>
              <Lock size={14} />
              <span>SUPER_ADMIN Required to Modify</span>
            </>
          )}
        </div>
      </div>

      {/* Body Section */}
      <div style={{ padding: '1.5rem' }}>
        {statusMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.825rem',
              background: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: statusMessage.type === 'success' ? '#047857' : '#B91C1C',
              border: `1px solid ${statusMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Visual Signature Asset Display */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Signature Preview
            </label>

            <div
              style={{
                width: '100%',
                height: '120px',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '8px',
                background: signedUrl
                  ? 'repeating-conic-gradient(#F8FAFC 0% 25%, #FFFFFF 0% 50%) 50% / 16px 16px'
                  : '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem',
                position: 'relative'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.8rem' }}>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading signature asset...</span>
                </div>
              ) : signedUrl ? (
                <img
                  src={signedUrl}
                  alt="Founder / CEO Signature"
                  style={{
                    maxHeight: '85px',
                    maxWidth: '90%',
                    objectFit: 'contain',
                    filter: isActive ? 'none' : 'grayscale(100%) opacity(0.5)'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                  <FileCheck size={28} style={{ margin: '0 auto 0.4rem auto', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No active signature uploaded</div>
                  <div style={{ fontSize: '0.72rem' }}>ID Cards will generate with a blank company signature line</div>
                </div>
              )}
            </div>

            {/* Asset Metadata */}
            {metadata?.storage_path && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.725rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>
                  <strong>File:</strong> {metadata.file_name || 'founder_signature'}
                  {metadata.file_size ? ` (${(metadata.file_size / 1024).toFixed(1)} KB)` : ''}
                </div>
                {metadata.uploaded_at && (
                  <div>
                    <strong>Updated:</strong>{' '}
                    {new Date(metadata.uploaded_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
                <div>
                  <strong>Authority Title:</strong> Managing Director &amp; CEO
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Actions & Configuration Directives */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Asset Governance &amp; Controls
              </label>

              {/* Upload Specifications Info Box */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                  marginBottom: '1rem',
                  lineHeight: '1.45'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0F1B38', marginBottom: '0.3rem' }}>
                  <Info size={14} style={{ color: '#C5A880' }} />
                  <span>Upload Directives</span>
                </div>
                <div>• Supported formats: <strong>PNG</strong> (recommended for transparent background), <strong>JPG</strong>, <strong>WebP</strong>.</div>
                <div>• Maximum file size: <strong>5 MB</strong>.</div>
                <div>• Secure storage: Stored in private bucket <code>company-assets</code>.</div>
                <div>• Historical safety: Uploading a new signature does not alter previously compiled PDF archives.</div>
              </div>
            </div>

            {/* Action Controls */}
            <div>
              {/* Hidden or standard native input */}
              <input
                ref={fileInputRef}
                id="founder-signature-file-input"
                type="file"
                accept={SIGNATURE_CONSTRAINTS.allowedExtensions.join(',')}
                style={{ display: 'none' }}
                onChange={handleFileSelected}
                disabled={!isSuperAdmin || isProcessing}
              />

              {/* Selected File Stage Card (When file is chosen) */}
              {selectedFile ? (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ImageIcon size={18} style={{ color: '#16A34A' }} />
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#166534' }}>
                        Selected File for Upload
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      disabled={isProcessing}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Clear selection"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: '#334155', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span><strong>Name:</strong> {selectedFile.name}</span>
                    <span><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span><strong>Format:</strong> {selectedFile.type.split('/')[1]?.toUpperCase() || 'IMAGE'}</span>
                  </div>

                  {selectedFilePreview && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          height: '42px',
                          maxWidth: '140px',
                          padding: '2px 8px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          background: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <img
                          src={selectedFilePreview}
                          alt="Selection Preview"
                          style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.725rem', color: '#047857' }}>
                        Ready to upload and activate as official company authority signature.
                      </span>
                    </div>
                  )}

                  {/* Explicit Commit Upload Button */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      id="btn-upload-founder-signature"
                      disabled={!isSuperAdmin || isProcessing}
                      onClick={handleUploadSignature}
                      className="admin-btn admin-btn-primary"
                      style={{
                        padding: '0.55rem 1.25rem',
                        fontSize: '0.825rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        cursor: isSuperAdmin && !isProcessing ? 'pointer' : 'not-allowed',
                        background: '#047857',
                        borderColor: '#047857',
                        color: '#FFFFFF',
                        fontWeight: 700
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Uploading Signature Asset...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} />
                          <span>{isConfigured ? 'Confirm & Replace Signature' : 'Upload Signature'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      disabled={isProcessing}
                      className="admin-btn"
                      style={{
                        padding: '0.55rem 0.85rem',
                        fontSize: '0.8rem',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        color: '#64748B'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Unselected State: Visible Chooser & Governance Controls */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    id="btn-choose-signature-file"
                    disabled={!isSuperAdmin || isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="admin-btn admin-btn-primary"
                    style={{
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.825rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                      opacity: !isSuperAdmin ? 0.6 : 1,
                      fontWeight: 700
                    }}
                  >
                    <UploadCloud size={15} />
                    <span>{isConfigured ? 'Replace Signature (Select File)' : 'Upload Signature (Select File)'}</span>
                  </button>

                  {/* Enable / Disable Button */}
                  {isConfigured && (
                    <button
                      type="button"
                      disabled={!isSuperAdmin || isProcessing}
                      onClick={handleToggleEnabled}
                      className="admin-btn"
                      style={{
                        padding: '0.55rem 1rem',
                        fontSize: '0.825rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: metadata?.enabled ? '#FFFBEB' : '#ECFDF5',
                        color: metadata?.enabled ? '#B45309' : '#047857',
                        border: `1px solid ${metadata?.enabled ? '#FDE68A' : '#A7F3D0'}`,
                        cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                        opacity: !isSuperAdmin ? 0.6 : 1
                      }}
                    >
                      <Power size={13} />
                      <span>{metadata?.enabled ? 'Disable Signature' : 'Enable Signature'}</span>
                    </button>
                  )}

                  {/* Remove Button */}
                  {isConfigured && (
                    <button
                      type="button"
                      disabled={!isSuperAdmin || isProcessing}
                      onClick={handleRemoveSignature}
                      className="admin-btn"
                      style={{
                        padding: '0.55rem 0.9rem',
                        fontSize: '0.825rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#FEF2F2',
                        color: '#B91C1C',
                        border: '1px solid #FECACA',
                        cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                        opacity: !isSuperAdmin ? 0.6 : 1
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
