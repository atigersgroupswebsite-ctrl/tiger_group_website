// ==============================================================================
// File: src/components/admin/DocumentCameraModal.tsx
// Description: Multi-camera Viewfinder Modal for Document & Photo Capture
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Supports desktop webcams and mobile rear/front cameras
//   - Prefers rear camera (environment) for documents, front camera (user) for live photos
//   - One-click camera switching when multiple cameras exist
//   - Visual framing guide overlay (document card frame or portrait oval)
//   - Instant snapshot review with Retake or Confirm & Upload choices
//   - Comprehensive error handling for permission denial, busy camera, or missing devices
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, X, Check, RotateCcw, AlertCircle, UploadCloud, Loader2 } from 'lucide-react';

export interface DocumentCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  preferredFacing?: 'user' | 'environment';
  isPortraitGuide?: boolean;
  onCapture: (file: File, dataUrl: string) => Promise<void> | void;
  onSelectFileFallback?: () => void;
}

export const DocumentCameraModal: React.FC<DocumentCameraModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  preferredFacing = 'environment',
  isPortraitGuide = false,
  onCapture,
  onSelectFileFallback
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(preferredFacing);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop active stream tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('[Camera] Track stop warning:', err);
      }
      streamRef.current = null;
    }
  }, []);

  // Enumerate cameras
  const detectCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
      }
    } catch (err) {
      console.warn('[Camera] Enumerate devices failed:', err);
    }
  }, []);

  // Start video stream
  const startStream = useCallback(
    async (targetFacing: 'user' | 'environment', deviceId?: string) => {
      stopTracks();
      setCameraError(null);
      setIsInitializing(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment.');
        setIsInitializing(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 }
              }
            : {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 }
              }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('[Camera] Play warning:', playErr);
          }
        }

        // Refresh detected cameras once permission granted (gives real device labels)
        await detectCameras();
      } catch (err: any) {
        console.warn('[Camera] Start stream failed:', err);
        const name = err.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Please allow camera access in your browser address bar/settings, or select an image file directly.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera device was found on this computer or phone. Please select an image file.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError(
            'Camera is currently in use by another application. Please close other camera applications and try again, or upload a file.'
          );
        } else {
          // If overconstrained, retry once without width/height constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: deviceId ? { deviceId: { exact: deviceId } } : true,
              audio: false
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
            }
            return;
          } catch (fallbackErr: any) {
            setCameraError(err.message || 'Unable to open camera. Please upload an image file instead.');
          }
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [stopTracks, detectCameras]
  );

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setFacingMode(preferredFacing);
      startStream(preferredFacing);
    } else {
      stopTracks();
      setCapturedPreview(null);
      setCameraError(null);
    }

    return () => {
      stopTracks();
    };
  }, [isOpen, preferredFacing, startStream, stopTracks]);

  // Switch camera toggle (rear vs front or cycle through devices)
  const handleSwitchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((c) => c.deviceId === currentCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextDevice = cameras[nextIndex];
      setCurrentCameraId(nextDevice.deviceId);
      startStream(facingMode, nextDevice.deviceId);
    } else {
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      startStream(nextFacing);
    }
  };

  // Capture snapshot from current video frame
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user/front camera, mirror horizontally for natural preview
    if (facingMode === 'user' && !currentCameraId) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(dataUrl);
  };

  // Retake snapshot
  const handleRetake = () => {
    setCapturedPreview(null);
    if (!streamRef.current) {
      startStream(facingMode, currentCameraId);
    }
  };

  // Confirm and upload captured image
  const handleConfirm = async () => {
    if (!capturedPreview) return;
    setIsSaving(true);
    try {
      const res = await fetch(capturedPreview);
      const blob = await res.blob();
      const filename = `camera_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      await onCapture(file, capturedPreview);
      stopTracks();
      onClose();
    } catch (err: any) {
      console.error('[DocumentCameraModal] Confirm error:', err);
      alert(err.message || 'Failed to save captured photo. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle modal backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSaving) {
      stopTracks();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        backgroundColor: 'rgba(10, 15, 30, 0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #334155'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#0A0F1D',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(197, 160, 89, 0.15)',
                color: '#C5A059',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>
                {subtitle || (isPortraitGuide ? 'Align face inside frame' : 'Place document flat & align within frame')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopTracks();
              onClose();
            }}
            disabled={isSaving}
            aria-label="Close camera"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '380px',
            backgroundColor: '#000000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {capturedPreview ? (
            /* Review captured image */
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={capturedPreview}
                alt="Captured document snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : cameraError ? (
            /* Error state */
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <AlertCircle size={38} style={{ color: '#EF4444' }} />
              <p style={{ fontSize: '0.85rem', color: '#FCA5A5', lineHeight: 1.5, margin: 0 }}>{cameraError}</p>
              {onSelectFileFallback && (
                <button
                  type="button"
                  onClick={() => {
                    stopTracks();
                    onClose();
                    onSelectFileFallback();
                  }}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#C5A059',
                    color: '#0F1B38',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <UploadCloud size={15} />
                  <span>Select File Instead</span>
                </button>
              )}
            </div>
          ) : (
            /* Live camera stream */
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' && !currentCameraId ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Viewfinder Framing Guide Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isPortraitGuide ? (
                  /* Oval guide for live photo portrait */
                  <div
                    style={{
                      width: '200px',
                      height: '250px',
                      borderRadius: '50%',
                      border: '2px dashed rgba(197, 160, 89, 0.85)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)'
                    }}
                  />
                ) : (
                  /* Rectangular card guide for documents */
                  <div
                    style={{
                      width: '84%',
                      maxWidth: '460px',
                      height: '240px',
                      borderRadius: '12px',
                      border: '2px dashed rgba(197, 160, 89, 0.85)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                      position: 'relative'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.9)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                      }}
                    >
                      Align document inside this rectangle
                    </span>
                  </div>
                )}
              </div>

              {isInitializing && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#FFFFFF'
                  }}
                >
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem' }}>Opening camera...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Action Controls */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#0A0F1D',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          {capturedPreview ? (
            /* Choices after photo is taken */
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSaving}
                className="btn btn-outline btn-sm"
                style={{
                  color: '#CBD5E1',
                  borderColor: '#475569',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RotateCcw size={14} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.55rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm & Use Photo</span>
                  </>
                )}
              </button>
            </>
          ) : cameraError ? (
            /* Controls when camera error occurred */
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  stopTracks();
                  onClose();
                }}
                className="btn btn-outline btn-sm"
                style={{ color: '#CBD5E1', borderColor: '#475569', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          ) : (
            /* Live viewfinder controls */
            <>
              <button
                type="button"
                onClick={handleSwitchCamera}
                disabled={isInitializing}
                title="Switch between front and rear camera"
                className="btn btn-outline btn-sm"
                style={{
                  color: '#CBD5E1',
                  borderColor: '#475569',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RefreshCw size={14} />
                <span>{facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'} (Switch)</span>
              </button>

              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={isInitializing}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#C5A059',
                  color: '#0F1B38',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  padding: '0.55rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '999px',
                  boxShadow: '0 2px 10px rgba(197, 160, 89, 0.35)',
                  cursor: isInitializing ? 'not-allowed' : 'pointer'
                }}
              >
                <Camera size={16} />
                <span>Capture Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
