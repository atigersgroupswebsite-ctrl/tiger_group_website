import React, { useRef, useState } from 'react';
import { CheckCircle2, Trash2, RefreshCw, UploadCloud, Loader2 } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader';
import { SignatureUploader } from './SignatureUploader';
import type { DocumentCategory, UploadedDocument } from '../../types/joining';
import { uploadCandidateDocument, removeCandidateDocument } from '../../services/joiningService';

interface DocumentUploaderProps {
  applicationId?: string;
  uploadSessionId?: string;
  documents: Record<DocumentCategory, UploadedDocument>;
  onDocumentChange: (
    category: DocumentCategory,
    fileMeta: { name: string; size: number; type: string; dataUrl?: string; storagePath?: string } | undefined
  ) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  applicationId,
  uploadSessionId,
  documents,
  onDocumentChange,
  errors,
  readOnly = false
}) => {
  const [uploadingCategory, setUploadingCategory] = useState<DocumentCategory | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (category: DocumentCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const isDocRejected = documents[category]?.verificationStatus === 'REJECTED';
    if (readOnly && !isDocRejected) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Document file size must be less than 5MB.');
      return;
    }

    const effectiveOwner = applicationId || uploadSessionId || 'temp_candidate';
    setUploadingCategory(category);
    try {
      const res = await uploadCandidateDocument(effectiveOwner, category, file);
      if (res.success && res.data) {
        onDocumentChange(category, {
          name: res.data.name,
          size: res.data.size,
          type: res.data.type,
          dataUrl: res.data.dataUrl,
          storagePath: res.data.storagePath
        });
      } else {
        alert(res.error || 'Document upload failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Document upload error.');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDocumentRemove = async (category: DocumentCategory) => {
    if (readOnly) return;
    const effectiveOwner = applicationId || uploadSessionId;
    if (effectiveOwner) {
      setUploadingCategory(category);
      try {
        await removeCandidateDocument(effectiveOwner, category);
      } catch (err) {
        console.warn('Document remove error:', err);
      } finally {
        setUploadingCategory(null);
      }
    }
    onDocumentChange(category, undefined);
  };

  const otherCategories: DocumentCategory[] = [
    'AADHAAR_FRONT',
    'AADHAAR_BACK',
    'PAN',
    'BANK_PASSBOOK',
    'EDUCATION_CERTIFICATE',
    'ADDRESS_PROOF',
    'EXPERIENCE_CERTIFICATE',
    'OTHER'
  ];

  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 07</span>
        <h2 className="joining-step-title">DOCUMENT ARCHIVES & BIOMETRICS</h2>
        <p className="joining-step-desc">
          Upload clear scanned copies or smartphone photos of mandatory statutory documents. Both front and back of Aadhaar must be uploaded separately. Max 5MB per file (PDF, JPG, PNG).
        </p>
      </div>

      {/* Primary Biometrics: Photo & Signature */}
      <div className="photo-signature-grid">
        <PhotoUploader
          applicationId={applicationId}
          uploadSessionId={uploadSessionId}
          photoDataUrl={documents.PHOTO?.file?.dataUrl}
          onPhotoChange={(dataUrl, fileMeta) => {
            if (dataUrl && fileMeta) {
              onDocumentChange('PHOTO', { ...fileMeta, dataUrl });
            } else {
              onDocumentChange('PHOTO', undefined);
            }
          }}
          error={errors['PHOTO']}
          readOnly={readOnly}
        />

        <SignatureUploader
          applicationId={applicationId}
          uploadSessionId={uploadSessionId}
          signatureDataUrl={documents.SIGNATURE?.file?.dataUrl}
          onSignatureChange={(dataUrl, fileMeta) => {
            if (dataUrl && fileMeta) {
              onDocumentChange('SIGNATURE', { ...fileMeta, dataUrl });
            } else {
              onDocumentChange('SIGNATURE', undefined);
            }
          }}
          error={errors['SIGNATURE']}
          readOnly={readOnly}
        />
      </div>

      {/* Standard Documents Grid */}
      <div className="upload-grid">
        {otherCategories.map((cat) => {
          const doc = documents[cat];
          if (!doc) return null;
          const hasFile = Boolean(doc.file);
          const isUploadingThis = uploadingCategory === cat;

          return (
            <DocumentCardItem
              key={cat}
              category={cat}
              doc={doc}
              hasFile={hasFile}
              isUploading={isUploadingThis}
              onUpload={handleFileUpload}
              onRemove={() => handleDocumentRemove(cat)}
              formatFileSize={formatFileSize}
              error={errors[cat]}
              readOnly={readOnly}
            />
          );
        })}
      </div>
    </div>
  );
};

interface DocumentCardItemProps {
  category: DocumentCategory;
  doc: UploadedDocument;
  hasFile: boolean;
  isUploading?: boolean;
  onUpload: (category: DocumentCategory, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  formatFileSize: (size?: number) => string;
  error?: string;
  readOnly?: boolean;
}

const DocumentCardItem: React.FC<DocumentCardItemProps> = ({
  category,
  doc,
  hasFile,
  isUploading = false,
  onUpload,
  onRemove,
  formatFileSize,
  error,
  readOnly = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = Boolean(doc.file?.dataUrl && (doc.file.type.startsWith('image/') || doc.file.dataUrl.startsWith('data:image/')));
  const isRejected = doc.verificationStatus === 'REJECTED';
  const isEditable = !readOnly || isRejected;

  return (
    <div className={`upload-card ${hasFile ? 'has-file' : ''}`}>
      <div>
        <div className="upload-card-header">
          <div>
            <h4 className="upload-card-title">{doc.title}</h4>
            {doc.side && (
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Slot: {doc.side} SIDE
              </span>
            )}
          </div>
          {doc.required ? (
            <span className="upload-badge-required">Required *</span>
          ) : (
            <span className="upload-badge-optional">Optional</span>
          )}
        </div>

        {/* Rejection Alert Banner */}
        {isRejected && (
          <div
            style={{
              padding: '0.5rem 0.65rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              marginBottom: '0.75rem',
              fontSize: '11px',
              lineHeight: 1.35
            }}
          >
            <div style={{ fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
              Status: ACTION REQUIRED
            </div>
            {doc.rejectionReason && (
              <div style={{ color: '#991B1B', marginTop: '2px' }}>
                Reason: {doc.rejectionReason}
              </div>
            )}
          </div>
        )}

        {isEditable && (
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => onUpload(category, e)}
          />
        )}

        {isUploading ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--color-midnight-navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(25, 42, 86, 0.04)', borderRadius: 'var(--radius-md)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Saving document to cloud...</span>
          </div>
        ) : hasFile && doc.file ? (
          <div>
            {/* Independent Image Preview Thumbnail if available */}
            {isImage && doc.file.dataUrl && (
              <div
                style={{
                  marginBottom: 'var(--space-3)',
                  height: '110px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={doc.file.dataUrl}
                  alt={doc.title}
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            )}

            <div className="uploaded-file-preview">
              <div className="uploaded-file-info">
                <CheckCircle2 size={18} style={{ color: isRejected ? '#DC2626' : 'var(--color-champagne-dark)', flexShrink: 0 }} />
                <div>
                  <div className="uploaded-file-name" title={doc.file.name}>
                    {doc.file.name}
                  </div>
                  <span className="uploaded-file-size">
                    {formatFileSize(doc.file.size)} • {doc.file.type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                  </span>
                </div>
              </div>

              {isEditable ? (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => inputRef.current?.click()}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    title={isRejected ? 'Re-upload compliant document' : 'Replace file'}
                  >
                    <RefreshCw size={12} />
                    {isRejected && <span style={{ marginLeft: '3px' }}>Replace</span>}
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={onRemove}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#C62828', borderColor: '#C62828' }}
                      title="Remove file"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Locked
                </span>
              )}
            </div>
          </div>
        ) : readOnly ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', background: 'rgba(25, 42, 86, 0.02)', borderRadius: 'var(--radius-md)' }}>
            Not Uploaded
          </div>
        ) : (
          <div
            className="dropzone-box"
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
          >
            <UploadCloud size={24} style={{ color: 'var(--color-midnight-navy)', margin: '0 auto 0.4rem', opacity: 0.7 }} />
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
              Click to select {doc.title}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              PDF, JPG, or PNG up to 5MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <span className="field-error-msg" style={{ marginTop: '0.4rem' }}>
          {error}
        </span>
      )}
    </div>
  );
};
