import React, { useRef } from 'react';
import { Camera, Trash2, RefreshCw, UploadCloud } from 'lucide-react';

interface PhotoUploaderProps {
  photoDataUrl?: string;
  onPhotoChange: (dataUrl: string | undefined, fileMeta?: { name: string; size: number; type: string }) => void;
  error?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoDataUrl,
  onPhotoChange,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid JPG, JPEG, or PNG photograph.');
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Photograph file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      onPhotoChange(result, {
        name: file.name,
        size: file.size,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onPhotoChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-card has-file">
      <div className="upload-card-header">
        <div>
          <h4 className="upload-card-title">Passport Size Photograph</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Recent color photo with clear front face view
          </span>
        </div>
        <span className="upload-badge-required">Required *</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="avatar-preview-box">
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Candidate Passport Photograph"
            className="avatar-preview-img"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
            <Camera size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>No Photo</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        {photoDataUrl ? (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              <RefreshCw size={13} />
              <span>REPLACE</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleRemove}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#C62828', borderColor: '#C62828' }}
            >
              <Trash2 size={13} />
              <span>REMOVE</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-navy btn-sm"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
          >
            <UploadCloud size={14} />
            <span>UPLOAD PHOTO</span>
          </button>
        )}
      </div>

      {error && (
        <span className="field-error-msg" style={{ textAlign: 'center', justifyContent: 'center', marginTop: '0.5rem' }}>
          {error}
        </span>
      )}
    </div>
  );
};
