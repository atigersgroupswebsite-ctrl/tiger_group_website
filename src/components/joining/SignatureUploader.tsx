import React, { useRef, useState } from 'react';
import { PenTool, Trash2, RefreshCw, UploadCloud, Loader2 } from 'lucide-react';
import { uploadCandidateDocument, removeCandidateDocument } from '../../services/joiningService';

interface SignatureUploaderProps {
  applicationId?: string;
  signatureDataUrl?: string;
  onSignatureChange: (dataUrl: string | undefined, fileMeta?: { name: string; size: number; type: string }) => void;
  error?: string;
  readOnly?: boolean;
}

export const SignatureUploader: React.FC<SignatureUploaderProps> = ({
  applicationId,
  signatureDataUrl,
  onSignatureChange,
  error,
  readOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid JPG, JPEG, or PNG signature image.');
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Signature file size must be less than 2MB.');
      return;
    }

    if (applicationId) {
      setIsUploading(true);
      try {
        const res = await uploadCandidateDocument(applicationId, 'SIGNATURE', file);
        if (res.success && res.data) {
          onSignatureChange(res.data.dataUrl, {
            name: res.data.name,
            size: res.data.size,
            type: res.data.type
          });
        } else {
          alert(res.error || 'Signature upload failed.');
        }
      } catch (err: any) {
        alert(err.message || 'Signature upload error.');
      } finally {
        setIsUploading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;
        onSignatureChange(result, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = async () => {
    if (readOnly) return;
    if (applicationId) {
      setIsUploading(true);
      try {
        await removeCandidateDocument(applicationId, 'SIGNATURE');
      } catch (err) {
        console.warn('Signature remove error:', err);
      } finally {
        setIsUploading(false);
      }
    }
    onSignatureChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-card has-file">
      <div className="upload-card-header">
        <div>
          <h4 className="upload-card-title">Specimen Signature</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Sign on plain white paper and take a clear photo
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

      <div className="signature-preview-box">
        {signatureDataUrl ? (
          <img
            src={signatureDataUrl}
            alt="Candidate Specimen Signature"
            className="signature-preview-img"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--color-text-muted)' }}>
            <PenTool size={24} style={{ margin: '0 auto 0.35rem', opacity: 0.6 }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>No Signature Uploaded</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        {readOnly ? (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {signatureDataUrl ? '✓ Specimen Signature Attached (Locked)' : 'No Signature Attached'}
          </span>
        ) : isUploading ? (
          <button type="button" disabled className="btn btn-navy btn-sm" style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', opacity: 0.75 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>SAVING...</span>
          </button>
        ) : signatureDataUrl ? (
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
            <span>UPLOAD SIGNATURE</span>
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
