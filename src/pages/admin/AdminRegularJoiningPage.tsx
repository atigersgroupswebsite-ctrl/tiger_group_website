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
  FileSpreadsheet,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { AdminBreadcrumbs } from '../../components/admin/AdminBreadcrumbs';
import { EmployeeIdCardPanel } from '../../components/admin/EmployeeIdCardPanel';
import { RegularJoiningReviewModal } from '../../components/admin/RegularJoiningReviewModal';
import { RegularReferenceSlipModal } from '../../components/admin/RegularReferenceSlipModal';
import { RegularJoiningSubmittedModal } from '../../components/admin/RegularJoiningSubmittedModal';
import { DocumentCameraModal } from '../../components/admin/DocumentCameraModal';
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
import type { DocumentSide, EmployeeRow } from '../../types/database';

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
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState<RegularJoiningDocItem | null>(null);
  const [bankPassbookDoc, setBankPassbookDoc] = useState<RegularJoiningDocItem | null>(null);
  const [bankPassbookBackDoc, setBankPassbookBackDoc] = useState<RegularJoiningDocItem | null>(null);
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

  // Camera Modal State
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    preferredFacingMode: 'user' | 'environment';
    guideType: 'portrait' | 'card' | 'document';
    target: 'photo' | 'aadhaar_front' | 'aadhaar_back' | 'passbook_front' | 'passbook_back' | 'signature';
  }>({
    isOpen: false,
    title: '',
    preferredFacingMode: 'environment',
    guideType: 'card',
    target: 'photo'
  });

  // Hidden File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const aadhaarFrontInputRef = useRef<HTMLInputElement>(null);
  const aadhaarBackInputRef = useRef<HTMLInputElement>(null);
  const passbookFrontInputRef = useRef<HTMLInputElement>(null);
  const passbookBackInputRef = useRef<HTMLInputElement>(null);
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
          setAadhaarBackDoc(d.aadhaarBack || null);
          setBankPassbookDoc(d.bankPassbook);
          setBankPassbookBackDoc(d.bankPassbookBack || null);
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

  // Helper: Open Camera for Target Document
  const openCameraFor = (
    target: 'photo' | 'aadhaar_front' | 'aadhaar_back' | 'passbook_front' | 'passbook_back' | 'signature'
  ) => {
    switch (target) {
      case 'photo':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Candidate Live Photo',
          subtitle: 'Position the applicant face within the oval framing guide.',
          preferredFacingMode: 'user',
          guideType: 'portrait',
          target: 'photo'
        });
        break;
      case 'aadhaar_front':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Aadhaar Card — Front Side',
          subtitle: 'Position the front side of the Aadhaar card with photo and details inside the guide.',
          preferredFacingMode: 'environment',
          guideType: 'card',
          target: 'aadhaar_front'
        });
        break;
      case 'aadhaar_back':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Aadhaar Card — Back Side',
          subtitle: 'Position the back side of the Aadhaar card with address & QR code inside the guide.',
          preferredFacingMode: 'environment',
          guideType: 'card',
          target: 'aadhaar_back'
        });
        break;
      case 'passbook_front':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Bank Passbook — Front Page',
          subtitle: 'Ensure account number, IFSC code, and candidate name are clearly legible.',
          preferredFacingMode: 'environment',
          guideType: 'document',
          target: 'passbook_front'
        });
        break;
      case 'passbook_back':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Bank Passbook — Inner / Back Page (Optional)',
          subtitle: 'Capture the second page or reverse endorsement if applicable.',
          preferredFacingMode: 'environment',
          guideType: 'document',
          target: 'passbook_back'
        });
        break;
      case 'signature':
        setCameraModalConfig({
          isOpen: true,
          title: 'Capture Candidate Signature',
          subtitle: 'Capture the candidate signature on plain white paper in good lighting.',
          preferredFacingMode: 'environment',
          guideType: 'card',
          target: 'signature'
        });
        break;
    }
  };

  // Helper: Trigger File Input for Target Document
  const triggerFileInputFor = (target: string) => {
    switch (target) {
      case 'photo':
        photoInputRef.current?.click();
        break;
      case 'aadhaar_front':
        aadhaarFrontInputRef.current?.click();
        break;
      case 'aadhaar_back':
        aadhaarBackInputRef.current?.click();
        break;
      case 'passbook_front':
        passbookFrontInputRef.current?.click();
        break;
      case 'passbook_back':
        passbookBackInputRef.current?.click();
        break;
      case 'signature':
        signatureInputRef.current?.click();
        break;
    }
  };

  // Handler: Camera Capture Confirmation
  const handleCameraCaptureConfirm = async (file: File, dataUrl: string) => {
    const target = cameraModalConfig.target;
    const ownerTag = employeeCode || 'cand_regular';
    let category: any = 'PHOTO';
    let side: DocumentSide | undefined = undefined;
    let setter: (doc: RegularJoiningDocItem) => void = () => {};

    switch (target) {
      case 'photo':
        category = 'PHOTO';
        setter = (d) => setPhotoDoc(d);
        break;
      case 'aadhaar_front':
        category = 'AADHAAR';
        side = 'FRONT';
        setter = (d) => setAadhaarDoc(d);
        break;
      case 'aadhaar_back':
        category = 'AADHAAR_BACK';
        side = 'BACK';
        setter = (d) => setAadhaarBackDoc(d);
        break;
      case 'passbook_front':
        category = 'BANK_PASSBOOK';
        side = 'FRONT';
        setter = (d) => setBankPassbookDoc(d);
        break;
      case 'passbook_back':
        category = 'BANK_PASSBOOK_BACK';
        side = 'BACK';
        setter = (d) => setBankPassbookBackDoc(d);
        break;
      case 'signature':
        category = 'SIGNATURE';
        setter = (d) => setSignatureDoc(d);
        break;
    }

    try {
      const uploadRes = await uploadCandidateDocument(ownerTag, category, file);
      setter({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl,
        storagePath: uploadRes.success ? uploadRes.data?.storagePath : undefined,
        side
      });
    } catch (err: any) {
      console.warn('[handleCameraCaptureConfirm] Upload fallback to local:', err);
      setter({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl,
        side
      });
    }
  };

  // Handler: Generic File Upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'PHOTO' | 'AADHAAR' | 'AADHAAR_BACK' | 'BANK_PASSBOOK' | 'BANK_PASSBOOK_BACK' | 'SIGNATURE',
    setter: React.Dispatch<React.SetStateAction<RegularJoiningDocItem | null>>,
    side?: DocumentSide
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(`File size must be less than 5MB.`);
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
        storagePath: res.success ? res.data?.storagePath : undefined,
        side
      });
    } catch (err: any) {
      console.warn(`[handleFileUpload] ${type} upload warning:`, err);
      setter({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl: localDataUrl,
        side
      });
    } finally {
      e.target.value = '';
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
    aadhaarBack: aadhaarBackDoc,
    bankPassbook: bankPassbookDoc,
    bankPassbookBack: bankPassbookBackDoc,
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

          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem' }}>
            {/* 27. Live Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.photo ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  27. Live Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {photoDoc && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
              </div>

              {photoDoc?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <img
                    src={photoDoc.dataUrl}
                    alt="Live Photo"
                    style={{ width: '120px', height: '145px', objectFit: 'cover', borderRadius: '6px', margin: '0 auto', border: '1px solid #CBD5E1', display: 'block', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, marginTop: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photoDoc.name}
                  </div>
                  {photoDoc.size ? (
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{(photoDoc.size / 1024).toFixed(1)} KB</div>
                  ) : null}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => openCameraFor('photo')}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      title="Retake photo using camera"
                    >
                      <RotateCcw size={12} />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      title="Replace photo from file"
                    >
                      <UploadCloud size={12} />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoDoc(null)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.35rem 0.55rem' }}
                      title="Remove photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ minHeight: '140px', border: '1px dashed #CBD5E1', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '1rem', marginBottom: '0.75rem', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'center' }}>
                    <Camera size={30} style={{ color: '#94A3B8' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>No Live Photo Captured</span>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Take a live selfie or upload passport photo</span>
                  </div>

                  {fieldErrors.photo && (
                    <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginBottom: '0.5rem' }}>
                      {fieldErrors.photo}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => openCameraFor('photo')}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', backgroundColor: '#0F1B38', borderColor: '#0F1B38' }}
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
                  </div>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'PHOTO', setPhotoDoc)}
              />
            </div>

            {/* 28. Aadhaar Card Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.aadhaar ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  28. Aadhaar Card Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {aadhaarDoc && aadhaarBackDoc ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                    <CheckCircle2 size={11} /> Both Sides
                  </span>
                ) : aadhaarDoc ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: '4px' }}>
                    <CheckCircle2 size={11} /> Front Ready
                  </span>
                ) : null}
              </div>

              {/* Sub-panel: Front Side */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.65rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Front Side <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  {aadhaarDoc && <CheckCircle2 size={13} style={{ color: '#10B981' }} />}
                </div>

                {aadhaarDoc?.dataUrl ? (
                  <div>
                    <img
                      src={aadhaarDoc.dataUrl}
                      alt="Aadhaar Front"
                      style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {aadhaarDoc.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('aadhaar_front')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <RotateCcw size={11} />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarFrontInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <UploadCloud size={11} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAadhaarDoc(null)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.25rem 0.45rem' }}
                        title="Remove Front"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ height: '55px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#94A3B8', fontSize: '0.72rem', backgroundColor: '#FFFFFF', marginBottom: '0.45rem' }}>
                      <Camera size={16} />
                      <span>Front side image required</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('aadhaar_front')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <Camera size={12} />
                        <span>Use Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarFrontInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <UploadCloud size={12} />
                        <span>Select File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-panel: Back Side */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.65rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Back Side (Address & QR)
                  </span>
                  {aadhaarBackDoc && <CheckCircle2 size={13} style={{ color: '#10B981' }} />}
                </div>

                {aadhaarBackDoc?.dataUrl ? (
                  <div>
                    <img
                      src={aadhaarBackDoc.dataUrl}
                      alt="Aadhaar Back"
                      style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {aadhaarBackDoc.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('aadhaar_back')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <RotateCcw size={11} />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarBackInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <UploadCloud size={11} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAadhaarBackDoc(null)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.25rem 0.45rem' }}
                        title="Remove Back"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ height: '55px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#94A3B8', fontSize: '0.72rem', backgroundColor: '#FFFFFF', marginBottom: '0.45rem' }}>
                      <Camera size={16} />
                      <span>Back side (address / QR)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('aadhaar_back')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <Camera size={12} />
                        <span>Use Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarBackInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <UploadCloud size={12} />
                        <span>Select File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {fieldErrors.aadhaar && (
                <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginTop: '0.5rem' }}>
                  {fieldErrors.aadhaar}
                </span>
              )}

              <input
                ref={aadhaarFrontInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'AADHAAR', setAadhaarDoc, 'FRONT')}
              />
              <input
                ref={aadhaarBackInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'AADHAAR_BACK', setAadhaarBackDoc, 'BACK')}
              />
            </div>

            {/* 29. Bank Passbook Photo */}
            <div style={{ border: `1.5px solid ${fieldErrors.bankPassbook ? '#EF4444' : '#CBD5E1'}`, borderRadius: '8px', padding: '1rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1B38' }}>
                  29. Bank Passbook Photo <span style={{ color: '#EF4444' }}>*</span>
                </span>
                {bankPassbookDoc && bankPassbookBackDoc ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                    <CheckCircle2 size={11} /> Both Sides
                  </span>
                ) : bankPassbookDoc ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: '4px' }}>
                    <CheckCircle2 size={11} /> Front Ready
                  </span>
                ) : null}
              </div>

              {/* Sub-panel: Front Page */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.65rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Front Page / Cheque <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  {bankPassbookDoc && <CheckCircle2 size={13} style={{ color: '#10B981' }} />}
                </div>

                {bankPassbookDoc?.dataUrl ? (
                  <div>
                    <img
                      src={bankPassbookDoc.dataUrl}
                      alt="Bank Passbook Front"
                      style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bankPassbookDoc.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('passbook_front')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <RotateCcw size={11} />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => passbookFrontInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <UploadCloud size={11} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankPassbookDoc(null)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.25rem 0.45rem' }}
                        title="Remove Front"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ height: '55px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#94A3B8', fontSize: '0.72rem', backgroundColor: '#FFFFFF', marginBottom: '0.45rem' }}>
                      <CreditCard size={16} />
                      <span>Account number & IFSC page</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('passbook_front')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <Camera size={12} />
                        <span>Use Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => passbookFrontInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <UploadCloud size={12} />
                        <span>Select File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-panel: Back Side */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.65rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Back Side / Inner Page (Optional)
                  </span>
                  {bankPassbookBackDoc && <CheckCircle2 size={13} style={{ color: '#10B981' }} />}
                </div>

                {bankPassbookBackDoc?.dataUrl ? (
                  <div>
                    <img
                      src={bankPassbookBackDoc.dataUrl}
                      alt="Bank Passbook Back"
                      style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bankPassbookBackDoc.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('passbook_back')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <RotateCcw size={11} />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => passbookBackInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                      >
                        <UploadCloud size={11} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankPassbookBackDoc(null)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.25rem 0.45rem' }}
                        title="Remove Back"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ height: '55px', border: '1px dashed #CBD5E1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#94A3B8', fontSize: '0.72rem', backgroundColor: '#FFFFFF', marginBottom: '0.45rem' }}>
                      <CreditCard size={16} />
                      <span>Back side / inner statement page</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => openCameraFor('passbook_back')}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <Camera size={12} />
                        <span>Use Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => passbookBackInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        <UploadCloud size={12} />
                        <span>Select File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {fieldErrors.bankPassbook && (
                <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginTop: '0.5rem' }}>
                  {fieldErrors.bankPassbook}
                </span>
              )}

              <input
                ref={passbookFrontInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'BANK_PASSBOOK', setBankPassbookDoc, 'FRONT')}
              />
              <input
                ref={passbookBackInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'BANK_PASSBOOK_BACK', setBankPassbookBackDoc, 'BACK')}
              />
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
                    style={{ width: '100%', height: '110px', objectFit: 'contain', margin: '0 auto', border: '1px solid #CBD5E1', borderRadius: '4px', display: 'block', backgroundColor: '#F8FAFC' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, marginTop: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {signatureDoc.name}
                  </div>
                  {signatureDoc.size ? (
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{(signatureDoc.size / 1024).toFixed(1)} KB</div>
                  ) : null}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => openCameraFor('signature')}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      title="Retake signature using camera"
                    >
                      <RotateCcw size={12} />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      title="Replace signature from file"
                    >
                      <UploadCloud size={12} />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureDoc(null)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '0.35rem 0.55rem' }}
                      title="Remove signature"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ minHeight: '140px', border: '1px dashed #CBD5E1', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '1rem', marginBottom: '0.75rem', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'center' }}>
                    <FileCheck2 size={30} style={{ color: '#94A3B8' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>No Signature Captured</span>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Capture signature with camera or select file</span>
                  </div>

                  {fieldErrors.signature && (
                    <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginBottom: '0.5rem' }}>
                      {fieldErrors.signature}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => openCameraFor('signature')}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', backgroundColor: '#0F1B38', borderColor: '#0F1B38' }}
                    >
                      <Camera size={13} />
                      <span>Use Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <UploadCloud size={13} />
                      <span>Select File</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'SIGNATURE', setSignatureDoc)}
              />
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

      {/* Universal Document Camera Capture Modal */}
      <DocumentCameraModal
        isOpen={cameraModalConfig.isOpen}
        onClose={() => setCameraModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={cameraModalConfig.title}
        subtitle={cameraModalConfig.subtitle}
        preferredFacing={cameraModalConfig.preferredFacingMode}
        isPortraitGuide={cameraModalConfig.guideType === 'portrait'}
        onCapture={handleCameraCaptureConfirm}
        onSelectFileFallback={() => {
          const target = cameraModalConfig.target;
          setCameraModalConfig((prev) => ({ ...prev, isOpen: false }));
          setTimeout(() => triggerFileInputFor(target), 150);
        }}
      />
    </div>
  );
};
