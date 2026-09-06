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
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onDocumentChange,
  errors
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (category: DocumentCategory, e: React.ChangeEvent<HTMLInputElement>) => {
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
    'AADHAAR',
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
          Upload clear scanned copies or smartphone photos of mandatory statutory documents. Max 5MB per file (PDF, JPG, PNG).
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
}

const DocumentCardItem: React.FC<DocumentCardItemProps> = ({
  category,
  doc,
  hasFile,
  onUpload,
  onRemove,
  formatFileSize,
  error
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`upload-card ${hasFile ? 'has-file' : ''}`}>
      <div>
        <div className="upload-card-header">
          <h4 className="upload-card-title">{doc.title}</h4>
          {doc.required ? (
            <span className="upload-badge-required">Required *</span>
          ) : (
            <span className="upload-badge-optional">Optional</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => onUpload(category, e)}
        />

        {hasFile && doc.file ? (
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
              Click to select document
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
