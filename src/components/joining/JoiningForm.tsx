import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { FormProgress } from './FormProgress';
import { FormNavigation } from './FormNavigation';
import { FormError } from './FormError';
import { FormSuccess } from './FormSuccess';
import { CandidateEmailEntry } from './CandidateEmailEntry';
import { PersonalSection } from './PersonalSection';
import { AddressSection } from './AddressSection';
import { BankSection } from './BankSection';
import { EducationTable } from './EducationTable';
import { FamilyTable } from './FamilyTable';
import { DocumentUploader } from './DocumentUploader';
import { DeclarationSection } from './DeclarationSection';
import { ReviewSection } from './ReviewSection';
import { supabase } from '../../lib/supabaseClient';

import { INITIAL_JOINING_FORM_DATA, JOINING_STEPS } from '../../data/mockJoiningData';
import type {
  JoiningFormData,
  PersonalInfo,
  AddressDetails,
  EmergencyContact,
  BankDetails,
  EducationRecord,
  FamilyMemberRecord,
  DocumentCategory,
  DeclarationsInfo,
  JoiningFieldConfig
} from '../../types/joining';
import {
  validatePersonal,
  validateAddress,
  validateBank,
  validateEducation,
  validateFamily,
  validateDocuments,
  validateDeclarations,
  validateAllSteps
} from '../../utils/joiningValidation';
import {
  getJoiningForm,
  saveJoiningDraft,
  submitJoiningForm,
  sanitizeEducationRecords
} from '../../services/joiningService';
import { getJoiningFieldConfigMap } from '../../services/joiningConfigService';

const DRAFT_STORAGE_KEY = 'ATG_JOINING_FORM_DRAFT';

interface JoiningFormProps {
  applicationId?: string;
  applicationNumber?: string;
}

export const JoiningForm: React.FC<JoiningFormProps> = ({ applicationId, applicationNumber }) => {
  // Initialize from default initial state or local cache
  const [formData, setFormData] = useState<JoiningFormData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolvedStatus =
          parsed.status === 'SUBMITTED' || parsed.submissionStatus === 'SUBMITTED'
            ? 'SUBMITTED'
            : 'DRAFT';

        return {
          ...INITIAL_JOINING_FORM_DATA,
          ...parsed,
          education: sanitizeEducationRecords(parsed.education || []),
          status: resolvedStatus,
          submissionStatus: resolvedStatus,
          documents: {
            ...INITIAL_JOINING_FORM_DATA.documents,
            ...(parsed.documents || {})
          }
        };
      }
    } catch (e) {
      console.warn('Could not restore joining draft from storage:', e);
    }
    return INITIAL_JOINING_FORM_DATA;
  });

  const [isLoadingDossier, setIsLoadingDossier] = useState<boolean>(Boolean(applicationId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  const [uploadSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ATG_JOINING_UPLOAD_SESSION');
      if (saved) return saved;
      const newId = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ATG_JOINING_UPLOAD_SESSION', newId);
      return newId;
    } catch {
      return `cand_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  });

  const [candidateAuthUser, setCandidateAuthUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Single authoritative source of truth for submission state
  const isSubmitted = formData.status === 'SUBMITTED' || formData.submissionStatus === 'SUBMITTED';
  const isReadOnly = isSubmitted;

  // Track whether the success acknowledgment screen is shown
  const [showSuccessScreen, setShowSuccessScreen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === 'SUBMITTED' || parsed.submissionStatus === 'SUBMITTED') {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (isSubmitted) {
      return formData.currentStep || 8;
    }
    return formData.currentStep || 1;
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>(
    isSubmitted ? [1, 2, 3, 4, 5, 6, 7, 8] : [1]
  );
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [confirmationChecked, setConfirmationChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [configMap, setConfigMap] = useState<Record<string, JoiningFieldConfig>>({});

  const handleEmailContinue = (email: string, user?: any) => {
    if (user) {
      setCandidateAuthUser(user);
    } else {
      supabase.auth.getUser().then(({ data: { user: fetchedUser } }) => {
        if (fetchedUser) {
          setCandidateAuthUser(fetchedUser);
        }
      });
    }
    setFormData((prev) => ({
      ...prev,
      personal: { ...prev.personal, emailId: email },
      userEmail: email
    }));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    setCandidateAuthUser(null);
  };

  const handleReset = async () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem('ATG_JOINING_UPLOAD_SESSION');
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Draft cleanup notice:', e);
    }
    setCandidateAuthUser(null);
    setFormData(INITIAL_JOINING_FORM_DATA);
    setCurrentStep(1);
    setCompletedSteps([1]);
    setShowSuccessScreen(false);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Load from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    // Load dynamic field configuration
    const loadFieldConfigs = async () => {
      try {
        const map = await getJoiningFieldConfigMap(false);
        if (isMounted) {
          setConfigMap(map);
        }
      } catch (err) {
        console.warn('Could not load dynamic joining configs:', err);
      }
    };
    loadFieldConfigs();

    // Check if candidate already has an active authenticated session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      if (user?.email) {
        setCandidateAuthUser(user);
        setFormData((prev) => ({
          ...prev,
          personal: {
            ...prev.personal,
            emailId: prev.personal?.emailId || user.email!
          },
          userEmail: prev.userEmail || user.email!
        }));
      } else {
        setCandidateAuthUser(null);
      }
      setIsCheckingAuth(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user?.email) {
        setCandidateAuthUser(session.user);
        setFormData((prev) => ({
          ...prev,
          personal: {
            ...prev.personal,
            emailId: prev.personal?.emailId || session.user.email!
          },
          userEmail: prev.userEmail || session.user.email!
        }));
      } else {
        setCandidateAuthUser(null);
      }
    });

    const loadRemoteDossier = async () => {
      // Check if we have an applicationId or an authenticated candidate session
      const hasSession = Boolean(candidateAuthUser);
      if (!applicationId && !hasSession) {
        setIsLoadingDossier(false);
        return;
      }

      setIsLoadingDossier(true);
      setLoadError(null);

      try {
        const res = await getJoiningForm(applicationId || null);
        if (!isMounted) return;

        if (!res.success || !res.data) {
          // If standalone candidate without an existing saved dossier, continue with current state
          setIsLoadingDossier(false);
          return;
        }

        const dbData = res.data;
        const isDbSubmitted = dbData.status === 'SUBMITTED' || dbData.submissionStatus === 'SUBMITTED';

        if (isDbSubmitted) {
          setFormData(dbData);
          setShowSuccessScreen(true);
          setCurrentStep(8);
          setCompletedSteps([1, 2, 3, 4, 5, 6, 7, 8]);
          setIsLoadingDossier(false);
          return;
        }

        // Local Storage Migration Check (PART 36)
        const migrationKey = `ATG_JOINING_MIGRATED_${applicationId || candidateAuthUser?.id || 'standalone'}`;
        const hasMigrated = localStorage.getItem(migrationKey) === 'true';
        let finalData = dbData;

        if (!hasMigrated) {
          const localRaw = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (localRaw) {
            try {
              const localParsed = JSON.parse(localRaw);
              if (localParsed && localParsed.submissionStatus !== 'SUBMITTED') {
                finalData = {
                  ...dbData,
                  personal: { ...dbData.personal, ...localParsed.personal },
                  permanentAddress: { ...dbData.permanentAddress, ...localParsed.permanentAddress },
                  currentAddress: { ...dbData.currentAddress, ...localParsed.currentAddress },
                  sameAsPermanentAddress: localParsed.sameAsPermanentAddress ?? dbData.sameAsPermanentAddress,
                  bank: { ...dbData.bank, ...localParsed.bank },
                  education: Array.isArray(localParsed.education)
                    ? sanitizeEducationRecords(localParsed.education)
                    : sanitizeEducationRecords(dbData.education || []),
                  family: (localParsed.family && localParsed.family.length > 0) ? localParsed.family : dbData.family,
                  emergencyContacts: (localParsed.emergencyContacts && localParsed.emergencyContacts.length > 0) ? localParsed.emergencyContacts : dbData.emergencyContacts,
                  declarations: { ...dbData.declarations, ...localParsed.declarations }
                };
                if (applicationId) {
                  await saveJoiningDraft(applicationId, finalData);
                }
              }
            } catch (err) {
              console.warn('Draft migration parse warning:', err);
            }
          }
          localStorage.setItem(migrationKey, 'true');
        }

        if (finalData.formId || finalData.joiningReference || (finalData.personal?.employeeName && finalData.personal.employeeName.length > 0)) {
          setFormData(finalData);
          if (finalData.currentStep && finalData.currentStep > 1) {
            setCurrentStep(finalData.currentStep);
            setCompletedSteps(Array.from({ length: finalData.currentStep }, (_, i) => i + 1));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Could not load remote dossier for candidate:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoadingDossier(false);
        }
      }
    };

    loadRemoteDossier();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [applicationId, candidateAuthUser?.id]);

  // Auto-sync draft to localStorage on changes with 600ms debounce
  useEffect(() => {
    if (isSubmitted || isLoadingDossier) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...formData, currentStep })
        );
      } catch (err) {
        console.warn('Draft auto-save notice:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData, currentStep, isSubmitted, isLoadingDossier]);

  // Sync signatory name with candidate name if empty
  useEffect(() => {
    if (formData.personal.employeeName && !formData.declarations.signatoryName && !isReadOnly) {
      setFormData((prev) => ({
        ...prev,
        declarations: {
          ...prev.declarations,
          signatoryName: prev.personal.employeeName
        }
      }));
    }
  }, [formData.personal.employeeName, isReadOnly]);

  // Handler: Manual save draft to Supabase
  const handleSaveDraft = async () => {
    if (isReadOnly || isSavingDraft) return;

    setIsSavingDraft(true);
    setSaveNotice('Saving draft to secure cloud registry...');

    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ ...formData, currentStep })
      );

      if (applicationId && !applicationId.startsWith('PREVIEW')) {
        const res = await saveJoiningDraft(applicationId, { ...formData, currentStep });
        if (!res.success) {
          throw new Error(res.error || 'Failed to save draft to database.');
        }
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSaveNotice(`Draft progress saved to cloud registry at ${timeStr}.`);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (e: any) {
      setSaveNotice(e.message || 'Unable to save draft to cloud registry.');
      setTimeout(() => setSaveNotice(null), 5000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Custom field value change handler
  const handleCustomFieldChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...(prev.customFields || {}),
        [fieldKey]: value
      }
    }));
  };

  // Step Navigation Validation Check
  const validateCurrentStep = (step: number): boolean => {
    if (isReadOnly) {
      return true;
    }

    let result = { isValid: true, errors: {} as Record<string, string> };

    switch (step) {
      case 1:
        result = validatePersonal(formData.personal, configMap, formData.customFields);
        break;
      case 2:
        result = validateAddress(
          formData.permanentAddress,
          formData.currentAddress,
          formData.sameAsPermanentAddress,
          formData.emergencyContacts,
          configMap,
          formData.customFields
        );
        break;
      case 3:
        result = validateBank(formData.bank, configMap, formData.customFields);
        break;
      case 4:
        result = validateEducation(formData.education, configMap, formData.customFields);
        break;
      case 5:
        result = validateFamily(formData.family, configMap, formData.customFields);
        break;
      case 6:
        result = validateDocuments(formData.documents, configMap);
        break;
      case 7:
        result = validateDeclarations(
          formData.declarations,
          !!formData.documents.SIGNATURE?.file?.dataUrl,
          configMap,
          formData.customFields
        );
        break;
      case 8:
        result = { isValid: true, errors: {} };
        break;
      default:
        break;
    }

    setStepErrors(result.errors);
    return result.isValid;
  };

  const handleNext = () => {
    if (isReadOnly) {
      if (currentStep < 8) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
      return;
    }

    const isValid = validateCurrentStep(currentStep);
    if (!isValid) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setStepErrors({});
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }

    if (currentStep < 8) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setFormData((prev) => ({ ...prev, currentStep: nextStep }));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setStepErrors({});
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (!isReadOnly) {
        setFormData((prev) => ({ ...prev, currentStep: prevStep }));
      }
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleSelectStep = (step: number) => {
    setStepErrors({});
    setCurrentStep(step);
    if (!isReadOnly) {
      setFormData((prev) => ({ ...prev, currentStep: step }));
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Field update handlers (guarded against updates if submitted/read-only)
  const handlePersonalChange = (field: keyof PersonalInfo, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
    if (stepErrors[field]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handlePermanentAddressChange = (field: keyof AddressDetails, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => {
      const updatedPerm = { ...prev.permanentAddress, [field]: value };
      return {
        ...prev,
        permanentAddress: updatedPerm,
        currentAddress: prev.sameAsPermanentAddress ? { ...updatedPerm } : prev.currentAddress
      };
    });
    if (stepErrors[`perm_${field}`]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[`perm_${field}`];
        return copy;
      });
    }
  };

  const handleCurrentAddressChange = (field: keyof AddressDetails, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      currentAddress: { ...prev.currentAddress, [field]: value }
    }));
    if (stepErrors[`curr_${field}`]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[`curr_${field}`];
        return copy;
      });
    }
  };

  const handleSameAsPermanentToggle = (checked: boolean) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      sameAsPermanentAddress: checked,
      currentAddress: checked ? { ...prev.permanentAddress } : prev.currentAddress
    }));
  };

  const handleEmergencyChange = (id: string, field: keyof EmergencyContact, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleAddEmergencyContact = () => {
    if (isReadOnly || formData.emergencyContacts.length >= 3) return;
    const newContact: EmergencyContact = {
      id: `ec-${Date.now()}`,
      name: '',
      contactNumber: '',
      relation: '',
      address: ''
    };
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, newContact]
    }));
  };

  const handleRemoveEmergencyContact = (id: string) => {
    if (isReadOnly || formData.emergencyContacts.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id)
    }));
  };

  const handleBankChange = (field: keyof BankDetails, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      bank: { ...prev.bank, [field]: value }
    }));
    if (stepErrors[field]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleAddEducation = () => {
    if (isReadOnly || formData.education.length >= 5) return;
    const newRecord: EducationRecord = {
      id: `edu-${Date.now()}`,
      qualification: '',
      boardOrUniversity: '',
      yearOfPassing: '',
      percentageOrGrade: ''
    };
    setFormData((prev) => ({
      ...prev,
      education: [...prev.education, newRecord]
    }));
  };

  const handleRemoveEducation = (id: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((r) => r.id !== id)
    }));
  };

  const handleEducationChange = (id: string, field: keyof EducationRecord, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      education: prev.education.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    }));
  };

  const handleAddFamily = () => {
    if (isReadOnly || formData.family.length >= 5) return;
    const newRecord: FamilyMemberRecord = {
      id: `fam-${Date.now()}`,
      name: '',
      dateOfBirthOrAge: '',
      relation: 'Dependent'
    };
    setFormData((prev) => ({
      ...prev,
      family: [...prev.family, newRecord]
    }));
  };

  const handleRemoveFamily = (id: string) => {
    if (isReadOnly || formData.family.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      family: prev.family.filter((r) => r.id !== id)
    }));
  };

  const handleFamilyChange = (id: string, field: keyof FamilyMemberRecord, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      family: prev.family.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    }));
  };

  const handleDocumentChange = (
    category: DocumentCategory,
    fileMeta: { name: string; size: number; type: string; dataUrl?: string } | undefined
  ) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [category]: {
          ...prev.documents[category],
          file: fileMeta
        }
      }
    }));
    if (stepErrors[category]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[category];
        return copy;
      });
    }
  };

  const handleDeclarationChange = (field: keyof DeclarationsInfo, value: any) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      declarations: {
        ...prev.declarations,
        [field]: value
      }
    }));
    if (stepErrors[field]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Final submit handler
  const handleSubmit = async () => {
    if (isReadOnly || isSubmitting) return;

    const allStepValidation = validateAllSteps(formData, configMap);
    const hasAnyError = Object.values(allStepValidation).some((res) => !res.isValid);

    if (hasAnyError) {
      alert('Please complete all mandatory fields in the form before submitting.');
      setCurrentStep(8);
      return;
    }

    if (!confirmationChecked) {
      alert('Please acknowledge the accuracy confirmation checkbox before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalSubmittedAt = new Date().toISOString();
      let generatedJoiningRef = formData.joiningReference;

      const res = await submitJoiningForm(formData.formId || applicationId, formData);
      if (!res.success || !res.data) {
        alert(res.error || 'Submission failed. Please check all fields and try again.');
        setIsSubmitting(false);
        return;
      }
      finalSubmittedAt = res.data.submittedAt;
      if (res.data.joiningReference) {
        generatedJoiningRef = res.data.joiningReference;
      }

      const submittedData: JoiningFormData = {
        ...formData,
        formId: res.data.formId || formData.formId,
        status: 'SUBMITTED',
        submissionStatus: 'SUBMITTED',
        submittedAt: finalSubmittedAt,
        joiningReference: generatedJoiningRef,
        currentStep: 8
      };
      setFormData(submittedData);
      setShowSuccessScreen(true);
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...submittedData, viewMode: 'SUCCESS' })
        );
      } catch (err) {
        console.warn('Storage error on submit:', err);
      }
    } catch (e: any) {
      alert(e.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Handler to open the read-only submitted dossier from FormSuccess
  const handleViewSubmission = () => {
    setShowSuccessScreen(false);
    setCurrentStep(8);
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          ...formData,
          status: 'SUBMITTED',
          submissionStatus: 'SUBMITTED',
          viewMode: 'REVIEW',
          currentStep: 8
        })
      );
    } catch (e) {
      console.warn('Storage error on view submission:', e);
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Handler to return to the success confirmation acknowledgment from the read-only review
  const handleBackToSuccess = () => {
    setShowSuccessScreen(true);
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          ...formData,
          status: 'SUBMITTED',
          submissionStatus: 'SUBMITTED',
          viewMode: 'SUCCESS',
          currentStep: 8
        })
      );
    } catch (e) {
      console.warn('Storage error on back to success:', e);
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Post-submission acknowledgment view (Read-only lock, with optional reset)
  if (isSubmitted && showSuccessScreen) {
    return (
      <FormSuccess
        formData={formData}
        onViewSubmission={handleViewSubmission}
        onReset={handleReset}
      />
    );
  }

  if (isLoadingDossier) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto 1.25rem auto' }} />
        <h3 style={{ color: 'var(--color-midnight-navy)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          LOADING JOINING DOSSIER
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          Connecting to cloud recruitment registry and loading authorized candidate dossier...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 'var(--radius-lg)', color: '#991B1B' }}>
        <AlertCircle size={36} style={{ margin: '0 auto 0.75rem' }} />
        <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Dossier Access Error</h3>
        <p style={{ fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto 1.25rem auto' }}>{loadError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-navy btn-sm">
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  // Check auth state: if auth check in progress, show session loading
  if (isCheckingAuth) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto 1.25rem auto' }} />
        <h3 style={{ color: 'var(--color-midnight-navy)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          CHECKING CANDIDATE ACCESS
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          Verifying secure candidate account credentials...
        </p>
      </div>
    );
  }

  // Candidate Account Creation Gate: Candidate MUST have an active Supabase Auth account
  if (!candidateAuthUser && !isSubmitted) {
    return (
      <CandidateEmailEntry
        initialEmail={formData.personal?.emailId || ''}
        onContinue={handleEmailContinue}
      />
    );
  }

  const allStepValidation = validateAllSteps(formData, configMap);
  const currentErrorList = Object.values(stepErrors);

  return (
    <div className="joining-layout">
      {candidateAuthUser && (
        <div className="candidate-session-bar" style={{
          gridColumn: '1 / -1',
          marginBottom: '1rem',
          padding: '0.65rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.8125rem'
        }}>
          <span className="candidate-session-email" style={{ color: 'var(--color-midnight-navy)', fontWeight: 600 }}>
            Candidate Session: <strong>{candidateAuthUser.email}</strong>
          </span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a
              href="/joining/portal"
              style={{
                color: 'var(--color-midnight-navy)',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              My Joining Dossier(s) &rarr;
            </a>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      {/* Step Progress Bar & Sidebar */}
      <FormProgress
        currentStep={currentStep}
        applicationId={formData.joiningReference || applicationNumber || formData.applicationId || 'Active Session'}
        onSelectStep={handleSelectStep}
        completedSteps={completedSteps}
      />

      {/* Main Step Form Area */}
      <main className="joining-main-content">
        <div className="joining-form-card">
          {currentErrorList.length > 0 && (
            <FormError
              message="Please resolve the required fields below to proceed:"
              errors={currentErrorList}
            />
          )}

          {/* STEP 01 — PERSONAL */}
          {currentStep === 1 && (
            <PersonalSection
              data={formData.personal}
              onChange={handlePersonalChange}
              errors={stepErrors}
              readOnly={isReadOnly}
              configMap={configMap}
              customFields={formData.customFields}
              onCustomFieldChange={handleCustomFieldChange}
            />
          )}

          {/* STEP 02 — ADDRESS & EMERGENCY */}
          {currentStep === 2 && (
            <AddressSection
              permanentAddress={formData.permanentAddress}
              currentAddress={formData.currentAddress}
              sameAsPermanent={formData.sameAsPermanentAddress}
              emergencyContacts={formData.emergencyContacts}
              onPermanentChange={handlePermanentAddressChange}
              onCurrentChange={handleCurrentAddressChange}
              onSameAsPermanentToggle={handleSameAsPermanentToggle}
              onEmergencyChange={handleEmergencyChange}
              onAddEmergencyContact={handleAddEmergencyContact}
              onRemoveEmergencyContact={handleRemoveEmergencyContact}
              errors={stepErrors}
              readOnly={isReadOnly}
              configMap={configMap}
              customFields={formData.customFields}
              onCustomFieldChange={handleCustomFieldChange}
            />
          )}

          {/* STEP 03 — BANK */}
          {currentStep === 3 && (
            <BankSection
              data={formData.bank}
              onChange={handleBankChange}
              errors={stepErrors}
              readOnly={isReadOnly}
              configMap={configMap}
              customFields={formData.customFields}
              onCustomFieldChange={handleCustomFieldChange}
            />
          )}

          {/* STEP 04 — EDUCATION */}
          {currentStep === 4 && (
            <EducationTable
              records={formData.education}
              onAdd={handleAddEducation}
              onRemove={handleRemoveEducation}
              onChange={handleEducationChange}
              readOnly={isReadOnly}
            />
          )}

          {/* STEP 05 — FAMILY */}
          {currentStep === 5 && (
            <FamilyTable
              records={formData.family}
              onAdd={handleAddFamily}
              onRemove={handleRemoveFamily}
              onChange={handleFamilyChange}
              readOnly={isReadOnly}
            />
          )}

          {/* STEP 06 — DOCUMENTS */}
          {currentStep === 6 && (
            <DocumentUploader
              applicationId={formData.formId || applicationId}
              uploadSessionId={uploadSessionId}
              documents={formData.documents}
              onDocumentChange={handleDocumentChange}
              errors={stepErrors}
              readOnly={isReadOnly}
            />
          )}

          {/* STEP 07 — DECLARATIONS */}
          {currentStep === 7 && (
            <DeclarationSection
              declarations={formData.declarations}
              signatureDataUrl={formData.documents.SIGNATURE?.file?.dataUrl}
              candidateName={formData.personal.employeeName}
              candidateGender={formData.personal.gender}
              candidateAddress={
                formData.permanentAddress.city || formData.permanentAddress.address
                  ? `${formData.permanentAddress.address || ''}, ${formData.permanentAddress.city || ''}, ${formData.permanentAddress.district || ''}`
                  : ''
              }
              candidateDesignation={formData.employment.designation}
              onChange={handleDeclarationChange}
              errors={stepErrors}
              readOnly={isReadOnly}
              configMap={configMap}
              customFields={formData.customFields}
              onCustomFieldChange={handleCustomFieldChange}
            />
          )}

          {/* STEP 08 — REVIEW */}
          {currentStep === 8 && (
            <ReviewSection
              formData={formData}
              stepValidation={allStepValidation}
              onEditStep={handleSelectStep}
              confirmationChecked={confirmationChecked}
              onConfirmationToggle={setConfirmationChecked}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onBackToSuccess={handleBackToSuccess}
            />
          )}

          {/* Form Navigation Controls (Steps 1-7) */}
          {currentStep < 8 && (
            <FormNavigation
              currentStep={currentStep}
              totalSteps={JOINING_STEPS.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onSaveDraft={handleSaveDraft}
              saveNotice={saveNotice}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </main>
    </div>
  );
};
