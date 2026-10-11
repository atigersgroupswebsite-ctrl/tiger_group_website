// ==============================================================================
// File: src/pages/admin/AdminRegularJoiningPage.tsx
// Description: Official Admin-Operated Regular Joining Form Workflow
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
// Features:
//   - Collision-safe sequential ATG employee code generation (ATG-501-2026, ATG-502-2026)
//   - Auto-populated joining date with current date
//   - Zero PAN field as strictly requested
//   - Device camera capture for Candidate Live Photo with file upload fallback
//   - Aadhaar, Bank Passbook, and Signature document uploads
//   - Comprehensive Review and Verification Modal
//   - Official 1-page Employee Reference Slip generation & preview
//   - Native Employee ID Card integration
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileCheck2,
  User,
  CreditCard,
  Briefcase,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  ShieldCheck,
  Save,
  Loader2,
  ArrowLeft,
  FileSpreadsheet
} from 'lucide-react';
import { AdminBreadcrumbs } from '../../components/admin/AdminBreadcrumbs';
import { EmployeeIdCardPanel } from '../../components/admin/EmployeeIdCardPanel';
import { RegularJoiningReviewModal } from '../../components/admin/RegularJoiningReviewModal';
import { RegularReferenceSlipModal } from '../../components/admin/RegularReferenceSlipModal';
import { RegularJoiningSubmittedModal } from '../../components/admin/RegularJoiningSubmittedModal';
import {
  generateNextRegularEmployeeCode,
  saveRegularJoiningForm,
  getRegularJoiningForm,
  type RegularJoiningFormData,
  type RegularJoiningDocItem
} from '../../services/regularJoiningService';
import { uploadCandidateDocument } from '../../services/joiningService';
import { downloadRegularReferenceSlipPdf } from '../../services/regularReferenceSlipPdfGenerator';
import { exportIndividualRegularJoiningXlsx } from '../../services/regularJoiningExportService';
import type { EmployeeRow } from '../../types/database';

export const AdminRegularJoiningPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const formId = id || searchParams.get('id') || undefined;
  const navigate = useNavigate();

  // Initial Form State
  const todayStr = new Date().toISOString().split('T')[0];

  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState<string>(todayStr);
  const [department, setDepartment] = useState<string>('Operations');
  const [designation, setDesignation] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [unitName, setUnitName] = useState<string>('');
  const [factorySupervisorName, setFactorySupervisorName] = useState<string>('');
  const [salaryCtc, setSalaryCtc] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState<string>('');

  // Personal Details
  const [fullName, setFullName] = useState<string>('');
  const [fatherName, setFatherName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>('MALE');
  const [maritalStatus, setMaritalStatus] = useState<string>('SINGLE');
  const [aadhaarNumber, setAadhaarNumber] = useState<string>('');
  const [permanentAddress, setPermanentAddress] = useState<string>('');
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [sameAsPermanent, setSameAsPermanent] = useState<boolean>(true);
  const [uanNumber, setUanNumber] = useState<string>('');
  const [esicNumber, setEsicNumber] = useState<string>('');
  const [ptNumber, setPtNumber] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [alternateMobile, setAlternateMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Bank Details
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [upiNumber, setUpiNumber] = useState<string>('');

  // Documents
  const [photoDoc, setPhotoDoc] = useState<RegularJoiningDocItem | null>(null);
  const [aadhaarDoc, setAadhaarDoc] = useState<RegularJoiningDocItem | null>(null);
  const [bankPassbookDoc, setBankPassbookDoc] = useState<RegularJoiningDocItem | null>(null);
  const [signatureDoc, setSignatureDoc] = useState<RegularJoiningDocItem | null>(null);

  // Status & metadata
  const [submissionStatus, setSubmissionStatus] = useState<'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'>('DRAFT');
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [verifiedBy, setVerifiedBy] = useState<string | null>(null);
  const [existingEmployee, setExistingEmployee] = useState<EmployeeRow | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);
  const [isSubmittedModalOpen, setIsSubmittedModalOpen] = useState<boolean>(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [submittedInfo, setSubmittedInfo] = useState<{
    formId?: string;
    employeeCode: string;
    candidateName: string;
    joiningDate?: string;
  } | null>(null);

  // Camera Capture State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Hidden File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const passbookInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Load existing record or generate sequential code
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      if (formId) {
        // Fetch existing form
        const res = await getRegularJoiningForm(formId);
        if (res.success && res.data) {
          const d = res.data.formData;
          setEmployeeCode(d.employeeCode);
          setJoiningDate(d.joiningDate || todayStr);
          setDepartment(d.department);
          setDesignation(d.designation);
          setCompanyName(d.companyName);
          setUnitName(d.unitName);
          setFactorySupervisorName(d.factorySupervisorName);
          setSalaryCtc(d.salaryCtc ? String(d.salaryCtc) : '');
          setInterviewDate(d.interviewDate || '');

          setFullName(d.fullName);
          setFatherName(d.fatherName);
          setDob(d.dob);
          setGender(d.gender || 'MALE');
          setMaritalStatus(d.maritalStatus || 'SINGLE');
          setAadhaarNumber(d.aadhaarNumber);
          setPermanentAddress(d.permanentAddress);
          setCurrentAddress(d.currentAddress);
          setSameAsPermanent(d.sameAsPermanent);
          setUanNumber(d.uanNumber);
          setEsicNumber(d.esicNumber);
          setPtNumber(d.ptNumber);
          setMobile(d.mobile);
          setAlternateMobile(d.alternateMobile);
          setEmail(d.email);

          setBankAccountNumber(d.bankAccountNumber);
          setIfscCode(d.ifscCode);
          setBankName(d.bankName);
          setBranchName(d.branchName);
          setUpiNumber(d.upiNumber);

          setPhotoDoc(d.photo);
          setAadhaarDoc(d.aadhaar);
          setBankPassbookDoc(d.bankPassbook);
          setSignatureDoc(d.signature);

          setSubmissionStatus(d.submissionStatus || 'DRAFT');
          setVerifiedAt(d.verifiedAt || null);
          setVerifiedBy(d.verifiedBy || null);
          if (res.data.employeeRecord) {
            setExistingEmployee(res.data.employeeRecord);
          }
        } else {
          throw new Error(res.error || 'Failed to load regular joining form.');
        }
      } else {
        // New Record: Generate next safe sequential ATG code
        const nextCode = await generateNextRegularEmployeeCode();
        setEmployeeCode(nextCode);
        setJoiningDate(todayStr);
      }
    } catch (err: any) {
      console.error('[AdminRegularJoiningPage] Error loading data:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Initialization failed.' });
    } finally {
      setLoading(false);
    }
  }, [formId, todayStr]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Camera Handlers
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.warn('[Camera] Access failed:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings, or select a photo file directly.'
          : (err.message || 'Unable to open camera. Please upload an image file instead.')
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Convert dataUrl to File for storage persistence
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `live_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Upload to private candidate-documents storage
      const ownerTag = employeeCode || 'cand_regular';
      const uploadRes = await uploadCandidateDocument(ownerTag, 'PHOTO', file);

      setPhotoDoc({
        name: file.name,
        size: file.size,
        type: 'image/jpeg',
        dataUrl,
        storagePath: uploadRes.success ? uploadRes.data?.storagePath : undefined
      });

      stopCamera();
    } catch (err: any) {
      console.error('[capturePhoto] Error:', err);
      alert('Failed to capture photograph. Please try uploading an image.');
    }
  };

  // Generic Document Upload Handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'PHOTO' | 'AADHAAR' | 'BANK_PASSBOOK' | 'SIGNATURE',
    setter: React.Dispatch<React.SetStateAction<RegularJoiningDocItem | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`${type} file size must be less than 5MB.`);
      return;
    }

    const ownerTag = employeeCode || 'cand_regular';
    const localDataUrl = URL.createObjectURL(file);

    try {
      const res = await uploadCandidateDocument(ownerTag, type as any, file);
      setter({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl: localDataUrl,
        storagePath: res.success ? res.data?.storagePath : undefined
      });
    } catch (err: any) {
      console.warn(`[handleFileUpload] ${type} upload warning:`, err);
      setter({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl: localDataUrl
      });
    }
  };

  // Compile Current Form State
  const currentFormData: RegularJoiningFormData = {
    id: formId,
    employeeCode: employeeCode.trim(),
    joiningDate: joiningDate || todayStr,
    department: department.trim(),
    designation: designation.trim(),
    companyName: companyName.trim(),
    unitName: unitName.trim(),
    factorySupervisorName: factorySupervisorName.trim(),
    salaryCtc: salaryCtc ? parseFloat(salaryCtc) : null,
    interviewDate: interviewDate || null,

    fullName: fullName.trim(),
    fatherName: fatherName.trim(),
    dob: dob,
    gender: gender,
    maritalStatus: maritalStatus,
    aadhaarNumber: aadhaarNumber.replace(/\D/g, ''),
    permanentAddress: permanentAddress.trim(),
    currentAddress: sameAsPermanent ? permanentAddress.trim() : currentAddress.trim(),
    sameAsPermanent: sameAsPermanent,
    uanNumber: uanNumber.trim(),
    esicNumber: esicNumber.trim(),
    ptNumber: ptNumber.trim(),
    mobile: mobile.replace(/\D/g, ''),
    alternateMobile: alternateMobile.replace(/\D/g, ''),
    email: email.trim(),

    bankAccountNumber: bankAccountNumber.trim(),
    ifscCode: ifscCode.trim().toUpperCase(),
    bankName: bankName.trim(),
    branchName: branchName.trim(),
    upiNumber: upiNumber.trim(),

    photo: photoDoc,
    aadhaar: aadhaarDoc,
    bankPassbook: bankPassbookDoc,
    signature: signatureDoc,

    submissionStatus: submissionStatus,
    verifiedAt: verifiedAt,
    verifiedBy: verifiedBy
  };

  // Validation
  const validateForm = (isVerificationCheck: boolean = false): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Full Name is required (minimum 2 characters).';
    }

    if (!employeeCode || !employeeCode.trim()) {
      errors.employeeCode = 'Employee Code is required.';
    }

    if (!joiningDate) {
      errors.joiningDate = 'Joining Date is required.';
    }

    if (mobile) {
      const cleanMob = mobile.replace(/\D/g, '');
      if (cleanMob.length !== 10) {
        errors.mobile = 'Mobile number must be exactly 10 digits.';
      }
    } else if (isVerificationCheck) {
      errors.mobile = 'Aadhaar-Linked Mobile Number is required for verification.';
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    if (aadhaarNumber) {
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
      if (cleanAadhaar.length !== 12) {
        errors.aadhaarNumber = 'Aadhaar Card Number must be 12 digits.';
      }
    }

    if (ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
      if (!ifscRegex.test(ifscCode.trim())) {
        errors.ifscCode = 'IFSC must follow 11-character Indian banking format (e.g. SBIN0001234).';
      }
    }

    if (isVerificationCheck) {
      if (!photoDoc) errors.photo = 'Candidate Live Photo is required.';
      if (!aadhaarDoc) errors.aadhaar = 'Aadhaar Card Photo is required.';
      if (!bankPassbookDoc) errors.bankPassbook = 'Bank Passbook Photo is required.';
      if (!signatureDoc) errors.signature = 'Candidate Signature is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler: Save Draft
  const handleSaveDraft = async () => {
    if (!validateForm(false)) {
      setStatusMessage({ type: 'error', text: 'Please correct validation errors before saving draft.' });
      return;
    }

    setIsSavingDraft(true);
    setStatusMessage(null);

    try {
      const res = await saveRegularJoiningForm(currentFormData, 'DRAFT');
      if (res.success && res.data) {
        setSubmissionStatus('DRAFT');
        setStatusMessage({
          type: 'success',
          text: `Draft saved successfully for ${fullName} (${res.data.employeeCode}).`
        });
        if (!formId && res.data.formId) {
          navigate(`/admin/regular-joining/${res.data.formId}`, { replace: true });
        }
      } else {
        throw new Error(res.error || 'Failed to save draft.');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Draft saving failed.' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Handler: Trigger Review Modal
  const handleOpenReview = () => {
    if (!validateForm(true)) {
      setStatusMessage({
        type: 'error',
        text: 'All required personal details, mobile number, and 4 statutory documents must be provided before review.'
      });
      return;
    }
    setIsReviewModalOpen(true);
  };

  // Handler: Submit Regular Joining Form (Saves as Pending Verification)
  const handleSubmitRegularJoining = async () => {
    if (!validateForm(true)) {
      setStatusMessage({
        type: 'error',
        text: 'All required candidate details, mobile number, and 4 statutory documents must be provided before submission.'
      });
      return;
    }

    setIsSubmittingForm(true);
    setStatusMessage(null);

    try {
      // Save form with 'SUBMITTED' status (Pending Verification)
      const res = await saveRegularJoiningForm(currentFormData, 'SUBMITTED');

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to submit regular joining form.');
      }

      const savedFormId = res.data.formId;
      const savedCode = res.data.employeeCode;

      setSubmissionStatus('SUBMITTED');
      setIsReviewModalOpen(false);

      setSubmittedInfo({
        formId: savedFormId,
        employeeCode: savedCode,
        candidateName: fullName.trim(),
        joiningDate: joiningDate
      });
      setIsSubmittedModalOpen(true);

      setStatusMessage({
        type: 'success',
        text: `Regular Joining Form SUBMITTED for ${fullName} (${savedCode})! Status: Pending Verification.`
      });
    } catch (err: any) {
      console.error('[AdminRegularJoiningPage] Submission failed:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Submission failed. Please check form data and retry.'
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleCreateAnother = async () => {
    setIsSubmittedModalOpen(false);
    setSubmittedInfo(null);
    setFullName('');
    setFatherName('');
    setDob('');
    setGender('MALE');
    setMaritalStatus('SINGLE');
    setAadhaarNumber('');
    setPermanentAddress('');
    setCurrentAddress('');
    setSameAsPermanent(true);
    setUanNumber('');
    setEsicNumber('');
    setPtNumber('');
    setMobile('');
    setAlternateMobile('');
    setEmail('');
    setBankAccountNumber('');
    setIfscCode('');
    setBankName('');
    setBranchName('');
    setUpiNumber('');
    setPhotoDoc(null);
    setAadhaarDoc(null);
    setBankPassbookDoc(null);
    setSignatureDoc(null);
    setSubmissionStatus('DRAFT');
    setVerifiedAt(null);
    setVerifiedBy(null);

    try {
      const nextCode = await generateNextRegularEmployeeCode();
      setEmployeeCode(nextCode);
    } catch (e) {
      console.warn('Could not generate next code:', e);
    }

    navigate('/admin/regular-joining', { replace: true });
  };


  // State: Export Individual Excel
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Handler: Download Individual Employee Excel
  const handleExportIndividualExcel = async () => {
    if (!fullName || !employeeCode) {
      setStatusMessage({ type: 'error', text: 'Candidate details and employee code are required to export.' });
      return;
    }

    setIsExportingExcel(true);
    try {
      const res = await exportIndividualRegularJoiningXlsx(currentFormData);
      setStatusMessage({
        type: 'success',
        text: `Excel dossier '${res.filename}' downloaded successfully for ${fullName} (${employeeCode}).`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to export employee details to Excel.'
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handler: Download 1-Page Reference Slip
  const handleDownloadSlip = async () => {
    await downloadRegularReferenceSlipPdf(currentFormData);
  };

  if (loading) {
    return (
      <div className="admin-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#0F1B38' }} />
          <p style={{ color: '#64748B', fontWeight: 600 }}>Loading Regular Joining Workflow...</p>
        </div>
      </div>
    );
  }

  const isVerified = submissionStatus === 'VERIFIED';

  return (
    <div className="admin-page-container">
      {/* Breadcrumbs */}
      <AdminBreadcrumbs
        items={[
          { label: 'Joining Submissions', path: '/admin/joining' },
          { label: 'Regular Joining Form' }
        ]}
      />

      {/* Top Header Card */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
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
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.02em', color: '#FFFFFF' }}>
              REGULAR JOINING FORM
            </h1>
            {isVerified ? (
              <span style={{ backgroundColor: '#10B981', color: '#FFFFFF', padding: '0.2rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                VERIFIED
              </span>
            ) : (
              <span style={{ backgroundColor: '#F59E0B', color: '#FFFFFF', padding: '0.2rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                {submissionStatus}
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
            Admin-operated deployment onboarding • Unique ATG Code: <strong>{employeeCode}</strong>
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="btn btn-outline btn-sm"
            style={{ color: '#FFFFFF', borderColor: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {isSavingDraft ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleOpenReview}
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: '#C5A059', borderColor: '#C5A059', color: '#0F1B38', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ShieldCheck size={14} />
            <span>Review & Verify</span>
          </button>

          {isVerified && (
            <>
              <button
                type="button"
                onClick={() => setIsSlipModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ color: '#FFFFFF', borderColor: '#C5A059', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Printer size={14} style={{ color: '#C5A059' }} />
                <span>Reference Slip (1-Page)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSlip}
                className="btn btn-outline btn-sm"
                style={{ color: '#FFFFFF', borderColor: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </>
          )}

          {/* Individual Excel Export */}
          {(formId || employeeCode) && (
            <button
              type="button"
              onClick={handleExportIndividualExcel}
              disabled={isExportingExcel}
              className="btn btn-outline btn-sm"
              style={{ color: '#10B981', borderColor: '#10B981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Download Individual Employee Details in Excel (.xlsx)"
            >
              {isExportingExcel ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FileSpreadsheet size={14} />
              )}
              <span>Export Excel</span>
            </button>
          )}

          <Link
            to="/admin/joining"
            className="btn btn-outline btn-sm"
            style={{ color: '#94A3B8', borderColor: '#334155', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: statusMessage.type === 'success' ? '#ECFDF5' : statusMessage.type === 'error' ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${statusMessage.type === 'success' ? '#10B981' : statusMessage.type === 'error' ? '#EF4444' : '#CBD5E1'}`,
            color: statusMessage.type === 'success' ? '#065F46' : statusMessage.type === 'error' ? '#991B1B' : '#1E293B',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={(e) => { e.preventDefault(); handleOpenReview(); }}>
        {/* ================================================================== */}
        {/* SECTION A: JOINING DETAILS */}
        {/* ================================================================== */}
        <div className="admin-card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
            <Briefcase size={20} style={{ color: '#0F1B38' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38' }}>
                SECTION A: JOINING DETAILS
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Official deployment metadata & sequential ATG identification
              </span>
            </div>
          </div>

          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* 1. Joining Reference Number / Employee Code */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                1. Joining Reference Number / Employee Code <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={employeeCode}
                readOnly
                className="form-control"
                style={{
                  backgroundColor: '#F1F5F9',
                  fontWeight: 700,
                  color: '#0F1B38',
                  letterSpacing: '0.04em',
                  cursor: 'not-allowed'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                Single authoritative identifier (e.g. ATG-501-2026)
              </span>
            </div>

            {/* 2. Joining Date */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                2. Joining Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="form-control"
                style={{ borderColor: fieldErrors.joiningDate ? '#EF4444' : undefined }}
                required
              />
              {fieldErrors.joiningDate && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.joiningDate}</span>}
            </div>

            {/* 3. Department */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                3. Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations, Security, Production"
                className="form-control"
              />
            </div>

            {/* 4. Designation */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                4. Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Security Guard, Operator, Associate"
                className="form-control"
              />
            </div>

            {/* 5. Company Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                5. Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Haldirams, Geeta Glass, Signet"
                className="form-control"
              />
            </div>

            {/* 6. Unit Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                6. Unit Name
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Plant 1, Hingna MIDC, Unit A"
                className="form-control"
              />
            </div>

            {/* 7. Factory / Supervisor Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                7. Factory / Supervisor Name
              </label>
              <input
                type="text"
                value={factorySupervisorName}
                onChange={(e) => setFactorySupervisorName(e.target.value)}
                placeholder="e.g. Mr. Rajesh Sharma"
                className="form-control"
              />
            </div>

            {/* Reference Slip Section 2 Terms (Company Placement Information) */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Reference Slip Placement Terms (For Company Use Only)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                    Salary (CTC) per Month (INR)
                  </label>
                  <input
                    type="number"
                    value={salaryCtc}
                    onChange={(e) => setSalaryCtc(e.target.value)}
                    placeholder="e.g. 18500"
                    className="form-control"
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    Auto-formatted in Section 2 of Reference Slip
                  </span>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                    Date of Interview
                  </label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="form-control"
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    Auto-formatted in Section 2 of Reference Slip
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION B: CANDIDATE PERSONAL DETAILS */}
        {/* ================================================================== */}
        <div className="admin-card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
            <User size={20} style={{ color: '#0F1B38' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38' }}>
                SECTION B: CANDIDATE PERSONAL DETAILS
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Full Name, KYC demographics, and statutory identification (Zero PAN field)
              </span>
            </div>
          </div>

          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* 8. Full Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                8. Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Candidate's official full name"
                className="form-control"
                style={{ borderColor: fieldErrors.fullName ? '#EF4444' : undefined }}
                required
              />
              {fieldErrors.fullName && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.fullName}</span>}
            </div>

            {/* 9. Father's Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                9. Father's Name
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Father's full name"
                className="form-control"
              />
            </div>

            {/* 10. Date of Birth */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                10. Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="form-control"
              />
            </div>

            {/* 11. Gender */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                11. Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="form-control"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* 12. Marital Status */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                12. Marital Status
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="form-control"
              >
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </div>

            {/* 13. Aadhaar Card Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                13. Aadhaar Card Number
              </label>
              <input
                type="text"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="12-digit Aadhaar number"
                className="form-control"
                maxLength={12}
                style={{ borderColor: fieldErrors.aadhaarNumber ? '#EF4444' : undefined }}
              />
              {fieldErrors.aadhaarNumber && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.aadhaarNumber}</span>}
            </div>

            {/* 14. Permanent Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                14. Permanent Address
              </label>
              <textarea
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                placeholder="Complete postal address as per Aadhaar Card"
                rows={2}
                className="form-control"
              />
            </div>

            {/* 15. Current Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                  15. Current Address
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sameAsPermanent}
                    onChange={(e) => setSameAsPermanent(e.target.checked)}
                  />
                  <span>Same as Permanent Address</span>
                </label>
              </div>
              {!sameAsPermanent && (
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="Current residential address if different from Aadhaar"
                  rows={2}
                  className="form-control"
                />
              )}
            </div>

            {/* 16. UAN Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                16. UAN Number (Optional)
              </label>
              <input
                type="text"
                value={uanNumber}
                onChange={(e) => setUanNumber(e.target.value)}
                placeholder="12-digit EPF UAN if available"
                className="form-control"
              />
            </div>

            {/* 17. ESIC Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                17. ESIC Number (Optional)
              </label>
              <input
                type="text"
                value={esicNumber}
                onChange={(e) => setEsicNumber(e.target.value)}
                placeholder="17-digit ESIC if available"
                className="form-control"
              />
            </div>

            {/* 18. PT Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                18. PT Number (Optional)
              </label>
              <input
                type="text"
                value={ptNumber}
                onChange={(e) => setPtNumber(e.target.value)}
                placeholder="Profession tax enrolment number"
                className="form-control"
              />
            </div>

            {/* 19. Aadhaar-Linked Mobile Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                19. Aadhaar-Linked Mobile Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="form-control"
                maxLength={10}
                style={{ borderColor: fieldErrors.mobile ? '#EF4444' : undefined }}
                required
              />
              {fieldErrors.mobile && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.mobile}</span>}
            </div>

            {/* 20. Alternate Mobile Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                20. Alternate Mobile Number
              </label>
              <input
                type="tel"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Optional secondary contact"
                className="form-control"
                maxLength={10}
              />
            </div>

            {/* 21. Email ID */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                21. Email ID
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="form-control"
                style={{ borderColor: fieldErrors.email ? '#EF4444' : undefined }}
              />
              {fieldErrors.email && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.email}</span>}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION C: BANK DETAILS */}
        {/* ================================================================== */}
        <div className="admin-card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
            <CreditCard size={20} style={{ color: '#0F1B38' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38' }}>
                SECTION C: BANK DETAILS
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Payroll disbursement account & UPI credentials
              </span>
            </div>
          </div>

          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* 22. Bank Account Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                22. Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\s+/g, ''))}
                placeholder="Account number"
                className="form-control"
              />
            </div>

            {/* 23. IFSC Code */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                23. IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 11))}
                placeholder="e.g. SBIN0001234"
                className="form-control"
                maxLength={11}
                style={{ borderColor: fieldErrors.ifscCode ? '#EF4444' : undefined }}
              />
              {fieldErrors.ifscCode && <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>{fieldErrors.ifscCode}</span>}
            </div>

            {/* 24. Bank Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                24. Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="form-control"
              />
            </div>

            {/* 25. Branch Name */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                25. Branch Name
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Nagpur Main Branch"
                className="form-control"
              />
            </div>

            {/* 26. PhonePe / UPI Number */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1B38' }}>
                26. PhonePe / UPI Number
              </label>
              <input
                type="text"
                value={upiNumber}
                onChange={(e) => setUpiNumber(e.target.value.trim())}
                placeholder="e.g. 9876543210@upi or 9876543210"
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION D: REQUIRED DOCUMENTS */}
        {/* ================================================================== */}
        <div className="admin-card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
            <FileCheck2 size={20} style={{ color: '#0F1B38' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F1B38' }}>
                SECTION D: REQUIRED DOCUMENTS
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Live camera capture & secure document upload architecture
              </span>
            </div>
          </div>

          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* 27. Live Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.photo ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  27. Live Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {photoDoc && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
              </div>

              {/* Camera Stream Viewfinder */}
              {isCameraActive ? (
                <div style={{ marginBottom: '0.75rem', position: 'relative', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000000', textAlign: 'center' }}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: '100%', height: '170px', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#10B981', borderColor: '#10B981', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#FFFFFF', borderColor: '#FFFFFF', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : photoDoc?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <img
                    src={photoDoc.dataUrl}
                    alt="Live Photo"
                    style={{ width: '110px', height: '135px', objectFit: 'cover', borderRadius: '4px', margin: '0 auto', border: '1px solid #E2E8F0', display: 'block' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
                    {photoDoc.name}
                  </span>
                </div>
              ) : (
                <div style={{ height: '135px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.75rem', color: '#94A3B8' }}>
                  <Camera size={28} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>No live photo captured</span>
                </div>
              )}

              {cameraError && (
                <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginBottom: '0.5rem' }}>
                  {cameraError}
                </span>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Camera size={13} />
                  <span>Use Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <UploadCloud size={13} />
                  <span>Select File</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'PHOTO', setPhotoDoc)}
                />
              </div>
            </div>

            {/* 28. Aadhaar Card Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.aadhaar ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  28. Aadhaar Card Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {aadhaarDoc && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
              </div>

              {aadhaarDoc?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <img
                    src={aadhaarDoc.dataUrl}
                    alt="Aadhaar Card"
                    style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px', margin: '15px auto', border: '1px solid #E2E8F0', display: 'block' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
                    {aadhaarDoc.name}
                  </span>
                </div>
              ) : (
                <div style={{ height: '135px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.75rem', color: '#94A3B8' }}>
                  <UploadCloud size={28} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload Aadhaar Card Image</span>
                </div>
              )}

              <input
                ref={aadhaarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'AADHAAR', setAadhaarDoc)}
              />

              <button
                type="button"
                onClick={() => aadhaarInputRef.current?.click()}
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <UploadCloud size={13} />
                <span>{aadhaarDoc ? 'Replace Aadhaar' : 'Upload Aadhaar'}</span>
              </button>
            </div>

            {/* 29. Bank Passbook Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.bankPassbook ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  29. Bank Passbook Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {bankPassbookDoc && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
              </div>

              {bankPassbookDoc?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <img
                    src={bankPassbookDoc.dataUrl}
                    alt="Bank Passbook"
                    style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px', margin: '15px auto', border: '1px solid #E2E8F0', display: 'block' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
                    {bankPassbookDoc.name}
                  </span>
                </div>
              ) : (
                <div style={{ height: '135px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.75rem', color: '#94A3B8' }}>
                  <CreditCard size={28} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload Bank Passbook Image</span>
                </div>
              )}

              <input
                ref={passbookInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'BANK_PASSBOOK', setBankPassbookDoc)}
              />

              <button
                type="button"
                onClick={() => passbookInputRef.current?.click()}
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <UploadCloud size={13} />
                <span>{bankPassbookDoc ? 'Replace Passbook' : 'Upload Passbook'}</span>
              </button>
            </div>

            {/* 30. Signature Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.signature ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  30. Signature Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {signatureDoc && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
              </div>

              {signatureDoc?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <img
                    src={signatureDoc.dataUrl}
                    alt="Candidate Signature"
                    style={{ width: '150px', height: '80px', objectFit: 'contain', margin: '25px auto', border: '1px solid #E2E8F0', display: 'block', backgroundColor: '#F8FAFC' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
                    {signatureDoc.name}
                  </span>
                </div>
              ) : (
                <div style={{ height: '135px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.75rem', color: '#94A3B8' }}>
                  <FileCheck2 size={28} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload Signature Image</span>
                </div>
              )}

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'SIGNATURE', setSignatureDoc)}
              />

              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <UploadCloud size={13} />
                <span>{signatureDoc ? 'Replace Signature' : 'Upload Signature'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls at Bottom */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#64748B' }}>
            <ShieldCheck size={18} style={{ color: isVerified ? '#10B981' : '#F59E0B' }} />
            <span>
              {isVerified
                ? `Verified on ${new Date(verifiedAt || '').toLocaleDateString('en-IN')} by ${verifiedBy || 'Administrator'}`
                : 'Form pending administrative review and document verification.'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={handleOpenReview}
              className="btn btn-navy"
              style={{
                fontSize: '0.85rem',
                backgroundColor: '#0F1B38',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <FileCheck2 size={16} style={{ color: '#C5A059' }} />
              <span>Preview & Review Joining Form</span>
            </button>
          </div>
        </div>
      </form>

      {/* ================================================================== */}
      {/* INTEGRATED EMPLOYEE ID CARD PANEL (When Record is Created/Verified) */}
      {/* ================================================================== */}
      {formId && (
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={22} style={{ color: '#0F1B38' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F1B38' }}>
              EMPLOYEE IDENTITY CARD INTEGRATION
            </h3>
          </div>
          <EmployeeIdCardPanel
            joiningFormId={formId}
            candidateName={fullName}
            candidateEmail={email}
            candidateMobile={mobile}
            dob={dob}
            address={currentAddress || permanentAddress}
            photoUrl={photoDoc?.storagePath}
            signatureUrl={signatureDoc?.storagePath}
            existingEmployee={existingEmployee}
            onEmployeeUpdated={(emp: EmployeeRow) => setExistingEmployee(emp)}
          />
        </div>
      )}

      {/* Review and Preview Modal (Pre-Submission Inspection) */}
      <RegularJoiningReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        formData={currentFormData}
        onSubmit={handleSubmitRegularJoining}
        isSubmitting={isSubmittingForm}
      />

      {/* Regular Joining Submitted Success Modal */}
      <RegularJoiningSubmittedModal
        isOpen={isSubmittedModalOpen}
        onClose={() => setIsSubmittedModalOpen(false)}
        formId={submittedInfo?.formId}
        employeeCode={submittedInfo?.employeeCode || employeeCode}
        candidateName={submittedInfo?.candidateName || fullName}
        joiningDate={submittedInfo?.joiningDate || joiningDate}
        onGoToJoiningSubmissions={() => navigate('/admin/joining')}
        onViewDossier={() => {
          if (submittedInfo?.formId) {
            navigate(`/admin/joining/${submittedInfo.formId}`);
          }
        }}
        onCreateAnother={handleCreateAnother}
      />

      {/* 1-Page Reference Slip Modal */}
      <RegularReferenceSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        formData={currentFormData}
      />
    </div>
  );
};
