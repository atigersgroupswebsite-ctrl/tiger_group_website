import React, { useRef } from 'react';
import { CheckCircle2, Trash2, RefreshCw, UploadCloud } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader';
import { SignatureUploader } from './SignatureUploader';
import type { DocumentCategory, UploadedDocument } from '../../types/joining';

interface DocumentUploaderProps {
  documents: Record<DocumentCategory, UploadedDocument>;
  onDocumentChange: (
    category: DocumentCategory,
    fileMeta: { name: string; size: number; type: string; dataUrl?: string } | undefined
  ) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onDocumentChange,
  errors,
  readOnly = false
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (category: DocumentCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Document file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      onDocumentChange(category, {
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        dataUrl
      });
    };
    reader.readAsDataURL(file);
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

          return (
            <DocumentCardItem
              key={cat}
              category={cat}
              doc={doc}
              hasFile={hasFile}
              onUpload={handleFileUpload}
              onRemove={() => onDocumentChange(cat, undefined)}
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
  onUpload,
  onRemove,
  formatFileSize,
  error,
  readOnly = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = Boolean(doc.file?.dataUrl && (doc.file.type.startsWith('image/') || doc.file.dataUrl.startsWith('data:image/')));

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

        {!readOnly && (
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => onUpload(category, e)}
          />
        )}

        {hasFile && doc.file ? (
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
                <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0 }} />
                <div>
                  <div className="uploaded-file-name" title={doc.file.name}>
                    {doc.file.name}
                  </div>
                  <span className="uploaded-file-size">
                    {formatFileSize(doc.file.size)} • {doc.file.type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                  </span>
                </div>
              </div>

              {!readOnly ? (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => inputRef.current?.click()}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    title="Replace file"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={onRemove}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#C62828', borderColor: '#C62828' }}
                    title="Remove file"
                  >
                    <Trash2 size={12} />
                  </button>
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
