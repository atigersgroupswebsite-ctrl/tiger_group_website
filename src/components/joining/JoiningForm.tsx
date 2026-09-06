import React, { useState, useEffect } from 'react';
import { FormProgress } from './FormProgress';
import { FormNavigation } from './FormNavigation';
import { FormError } from './FormError';
import { FormSuccess } from './FormSuccess';
import { EmploymentSection } from './EmploymentSection';
import { PersonalSection } from './PersonalSection';
import { AddressSection } from './AddressSection';
import { BankSection } from './BankSection';
import { EducationTable } from './EducationTable';
import { FamilyTable } from './FamilyTable';
import { DocumentUploader } from './DocumentUploader';
import { DeclarationSection } from './DeclarationSection';
import { ReviewSection } from './ReviewSection';

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
  DeclarationsInfo
} from '../../types/joining';
import {
  validateEmployment,
  validatePersonal,
  validateAddress,
  validateBank,
  validateEducation,
  validateFamily,
  validateDocuments,
  validateDeclarations,
  validateAllSteps
} from '../../utils/joiningValidation';

const DRAFT_STORAGE_KEY = 'ATG_JOINING_FORM_DRAFT';

export const JoiningForm: React.FC = () => {
  // Initialize from draft or default initial state
  const [formData, setFormData] = useState<JoiningFormData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_JOINING_FORM_DATA,
          ...parsed,
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

  const [currentStep, setCurrentStep] = useState<number>(formData.currentStep || 1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [confirmationChecked, setConfirmationChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(formData.status === 'SUBMITTED');

  // Auto-sync draft to localStorage on significant changes
  useEffect(() => {
    if (formData.status !== 'SUBMITTED') {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...formData, currentStep })
        );
      } catch (err) {
        // Handle potential quota errors with large base64 strings gracefully
        console.warn('Draft auto-save notice:', err);
      }
    }
  }, [formData, currentStep]);

  // Sync signatory name with candidate name if empty
  useEffect(() => {
    if (formData.personal.employeeName && !formData.declarations.signatoryName) {
      setFormData((prev) => ({
        ...prev,
        declarations: {
          ...prev.declarations,
          signatoryName: prev.personal.employeeName
        }
      }));
    }
  }, [formData.personal.employeeName]);

  // Handler: Manual save draft
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ ...formData, currentStep })
      );
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSaveNotice(`Draft progress saved to this browser at ${timeStr}.`);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (e) {
      setSaveNotice('Unable to save draft (Storage limit reached).');
      setTimeout(() => setSaveNotice(null), 4000);
    }
  };

  // Step Navigation Validation Check
  const validateCurrentStep = (step: number): boolean => {
    let result = { isValid: true, errors: {} as Record<string, string> };

    switch (step) {
      case 1:
        result = validateEmployment();
        break;
      case 2:
        result = validatePersonal(formData.personal);
        break;
      case 3:
        result = validateAddress(
          formData.permanentAddress,
          formData.currentAddress,
          formData.sameAsPermanentAddress,
          formData.emergencyContacts
        );
        break;
      case 4:
        result = validateBank(formData.bank);
        break;
      case 5:
        result = validateEducation(formData.education);
        break;
      case 6:
        result = validateFamily(formData.family);
        break;
      case 7:
        result = validateDocuments(formData.documents);
        break;
      case 8:
        result = validateDeclarations(
          formData.declarations,
          !!formData.documents.SIGNATURE?.file?.dataUrl
        );
        break;
      case 9:
        result = { isValid: true, errors: {} };
        break;
      default:
        break;
    }

    setStepErrors(result.errors);
    return result.isValid;
  };

  const handleNext = () => {
    const isValid = validateCurrentStep(currentStep);
    if (!isValid) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setStepErrors({});
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }

    if (currentStep < 9) {
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
      setFormData((prev) => ({ ...prev, currentStep: prevStep }));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleSelectStep = (step: number) => {
    setStepErrors({});
    setCurrentStep(step);
    setFormData((prev) => ({ ...prev, currentStep: step }));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Field update handlers
  const handlePersonalChange = (field: keyof PersonalInfo, value: string) => {
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
    setFormData((prev) => ({
      ...prev,
      sameAsPermanentAddress: checked,
      currentAddress: checked ? { ...prev.permanentAddress } : prev.currentAddress
    }));
  };

  const handleEmergencyChange = (id: string, field: keyof EmergencyContact, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleAddEmergencyContact = () => {
    if (formData.emergencyContacts.length >= 3) return;
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
    if (formData.emergencyContacts.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id)
    }));
  };

  const handleBankChange = (field: keyof BankDetails, value: string) => {
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
    if (formData.education.length >= 5) return;
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
    if (formData.education.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((r) => r.id !== id)
    }));
  };

  const handleEducationChange = (id: string, field: keyof EducationRecord, value: string) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    }));
  };

  const handleAddFamily = () => {
    if (formData.family.length >= 5) return;
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
    if (formData.family.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      family: prev.family.filter((r) => r.id !== id)
    }));
  };

  const handleFamilyChange = (id: string, field: keyof FamilyMemberRecord, value: string) => {
    setFormData((prev) => ({
      ...prev,
      family: prev.family.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    }));
  };

  const handleDocumentChange = (
    category: DocumentCategory,
    fileMeta: { name: string; size: number; type: string; dataUrl?: string } | undefined
  ) => {
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
  const handleSubmit = () => {
    const allStepValidation = validateAllSteps(formData);
    const hasAnyError = Object.values(allStepValidation).some((res) => !res.isValid);

    if (hasAnyError) {
      alert('Please complete all mandatory fields in the form before submitting.');
      setCurrentStep(9);
      return;
    }

    if (!confirmationChecked) {
      alert('Please acknowledge the accuracy confirmation checkbox before submitting.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      const submittedData: JoiningFormData = {
        ...formData,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      };
      setFormData(submittedData);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(submittedData));
      } catch (err) {
        console.warn('Storage error on submit:', err);
      }
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 800);
  };

  // In review mode or already submitted
  if (isSubmitted) {
    return (
      <FormSuccess
        formData={formData}
        onViewSubmission={() => {
          setIsSubmitted(false);
          setCurrentStep(9);
        }}
        onReset={() => {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setFormData(INITIAL_JOINING_FORM_DATA);
          setIsSubmitted(false);
          setCurrentStep(1);
          setCompletedSteps([1]);
        }}
      />
    );
  }

  const allStepValidation = validateAllSteps(formData);
  const currentErrorList = Object.values(stepErrors);

  return (
    <div className="joining-layout">
      {/* Step Progress Bar & Sidebar */}
      <FormProgress
        currentStep={currentStep}
        applicationId={formData.applicationId}
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

          {/* STEP 01 — EMPLOYMENT */}
          {currentStep === 1 && (
            <EmploymentSection employment={formData.employment} />
          )}

          {/* STEP 02 — PERSONAL */}
          {currentStep === 2 && (
            <PersonalSection
              data={formData.personal}
              onChange={handlePersonalChange}
              errors={stepErrors}
            />
          )}

          {/* STEP 03 — ADDRESS & EMERGENCY */}
          {currentStep === 3 && (
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
            />
          )}

          {/* STEP 04 — BANK */}
          {currentStep === 4 && (
            <BankSection
              data={formData.bank}
              onChange={handleBankChange}
              errors={stepErrors}
            />
          )}

          {/* STEP 05 — EDUCATION */}
          {currentStep === 5 && (
            <EducationTable
              records={formData.education}
              onAdd={handleAddEducation}
              onRemove={handleRemoveEducation}
              onChange={handleEducationChange}
            />
          )}

          {/* STEP 06 — FAMILY */}
          {currentStep === 6 && (
            <FamilyTable
              records={formData.family}
              onAdd={handleAddFamily}
              onRemove={handleRemoveFamily}
              onChange={handleFamilyChange}
            />
          )}

          {/* STEP 07 — DOCUMENTS */}
          {currentStep === 7 && (
            <DocumentUploader
              documents={formData.documents}
              onDocumentChange={handleDocumentChange}
              errors={stepErrors}
            />
          )}

          {/* STEP 08 — DECLARATIONS */}
          {currentStep === 8 && (
            <DeclarationSection
              declarations={formData.declarations}
              signatureDataUrl={formData.documents.SIGNATURE?.file?.dataUrl}
              candidateName={formData.personal.employeeName}
              onChange={handleDeclarationChange}
              errors={stepErrors}
            />
          )}

          {/* STEP 09 — REVIEW */}
          {currentStep === 9 && (
            <ReviewSection
              formData={formData}
              stepValidation={allStepValidation}
              onEditStep={handleSelectStep}
              confirmationChecked={confirmationChecked}
              onConfirmationToggle={setConfirmationChecked}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Form Navigation Controls (Steps 1-8) */}
          {currentStep < 9 && (
            <FormNavigation
              currentStep={currentStep}
              totalSteps={JOINING_STEPS.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onSaveDraft={handleSaveDraft}
              saveNotice={saveNotice}
            />
          )}
        </div>
      </main>
    </div>
  );
};
