import type { JoiningFormData } from '../types/joining';

export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidMobile = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const isValidPinCode = (pin: string): boolean => {
  return /^\d{6}$/.test(pin.trim());
};

export const isValidAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/[\s\-]/g, '');
  return /^\d{12}$/.test(cleaned);
};

export const isValidPan = (pan: string): boolean => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
};

export const isValidIfsc = (ifsc: string): boolean => {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
};

export const isValidBankAccount = (acc: string): boolean => {
  const cleaned = acc.replace(/[\s\-]/g, '');
  return /^\d{9,18}$/.test(cleaned);
};

// Validate Step 01: Employment (Admin controlled, always valid)
export const validateEmployment = (): StepValidationResult => {
  return { isValid: true, errors: {}, missingFields: [] };
};

// Validate Step 02: Personal Information
export const validatePersonal = (data: JoiningFormData['personal']): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!data.employeeName.trim()) {
    errors.employeeName = 'Employee Name is required as per Aadhaar';
    missingFields.push('Full Name');
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of Birth is required';
    missingFields.push('Date of Birth');
  } else {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      errors.dateOfBirth = 'Candidate must be at least 18 years of age';
      missingFields.push('Candidate Age >= 18');
    }
  }

  if (!data.gender) {
    errors.gender = 'Please select gender';
    missingFields.push('Gender');
  }

  if (!data.fatherName.trim()) {
    errors.fatherName = "Father's Name is required";
    missingFields.push("Father's Name");
  }

  if (!data.motherOrHusbandName.trim()) {
    errors.motherOrHusbandName = "Mother's / Husband's Name is required";
    missingFields.push("Mother's Name");
  }

  if (!data.maritalStatus) {
    errors.maritalStatus = 'Please select marital status';
    missingFields.push('Marital Status');
  } else if (data.maritalStatus === 'Married' && !data.spouseName?.trim()) {
    errors.spouseName = 'Spouse name is required for married candidates';
    missingFields.push('Spouse Name');
  }

  if (!data.bloodGroup) {
    errors.bloodGroup = 'Please select blood group';
    missingFields.push('Blood Group');
  }

  if (!data.aadhaarNumber.trim()) {
    errors.aadhaarNumber = '12-digit Aadhaar Number is required';
    missingFields.push('Aadhaar Number');
  } else if (!isValidAadhaar(data.aadhaarNumber)) {
    errors.aadhaarNumber = 'Enter a valid 12-digit Aadhaar Number';
    missingFields.push('Valid Aadhaar Number');
  }

  if (!data.panNumber.trim()) {
    errors.panNumber = '10-character PAN is required';
    missingFields.push('PAN Number');
  } else if (!isValidPan(data.panNumber)) {
    errors.panNumber = 'Enter a valid PAN (e.g. ABCDE1234F)';
    missingFields.push('Valid PAN');
  }

  if (!data.employeeContactNumber.trim()) {
    errors.employeeContactNumber = '10-digit mobile number is required';
    missingFields.push('Contact Number');
  } else if (!isValidMobile(data.employeeContactNumber)) {
    errors.employeeContactNumber = 'Enter a valid 10-digit Indian mobile number';
    missingFields.push('Valid Mobile Number');
  }

  if (data.otherContactNumber && data.otherContactNumber.trim()) {
    if (!isValidMobile(data.otherContactNumber)) {
      errors.otherContactNumber = 'Enter a valid alternate 10-digit mobile number';
    }
  }

  if (!data.emailId.trim()) {
    errors.emailId = 'Email address is required';
    missingFields.push('Email Address');
  } else if (!isValidEmail(data.emailId)) {
    errors.emailId = 'Please enter a valid email address';
    missingFields.push('Valid Email Address');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 03: Address & Emergency Contacts
export const validateAddress = (
  perm: JoiningFormData['permanentAddress'],
  curr: JoiningFormData['currentAddress'],
  sameAsPerm: boolean,
  emergency: JoiningFormData['emergencyContacts']
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // Permanent
  if (!perm.address.trim()) {
    errors.perm_address = 'Permanent address is required';
    missingFields.push('Permanent Street Address');
  }
  if (!perm.city.trim()) {
    errors.perm_city = 'Permanent city is required';
    missingFields.push('Permanent City');
  }
  if (!perm.district.trim()) {
    errors.perm_district = 'Permanent district is required';
    missingFields.push('Permanent District');
  }
  if (!perm.state.trim()) {
    errors.perm_state = 'Permanent state is required';
    missingFields.push('Permanent State');
  }
  if (!perm.pinCode.trim()) {
    errors.perm_pinCode = 'Permanent 6-digit PIN code is required';
    missingFields.push('Permanent PIN Code');
  } else if (!isValidPinCode(perm.pinCode)) {
    errors.perm_pinCode = 'Enter a valid 6-digit PIN code';
    missingFields.push('Valid Permanent PIN Code');
  }

  // Current (if not same)
  if (!sameAsPerm) {
    if (!curr.address.trim()) {
      errors.curr_address = 'Current address is required';
      missingFields.push('Current Street Address');
    }
    if (!curr.city.trim()) {
      errors.curr_city = 'Current city is required';
      missingFields.push('Current City');
    }
    if (!curr.district.trim()) {
      errors.curr_district = 'Current district is required';
      missingFields.push('Current District');
    }
    if (!curr.state.trim()) {
      errors.curr_state = 'Current state is required';
      missingFields.push('Current State');
    }
    if (!curr.pinCode.trim()) {
      errors.curr_pinCode = 'Current 6-digit PIN code is required';
      missingFields.push('Current PIN Code');
    } else if (!isValidPinCode(curr.pinCode)) {
      errors.curr_pinCode = 'Enter a valid 6-digit PIN code';
      missingFields.push('Valid Current PIN Code');
    }
  }

  // Emergency contacts
  if (!emergency || emergency.length === 0) {
    errors.emergency = 'At least one emergency contact is required';
    missingFields.push('Emergency Family Contact');
  } else {
    emergency.forEach((ec, idx) => {
      if (!ec.name.trim()) {
        errors[`emergency_${ec.id}_name`] = `Emergency contact #${idx + 1} name is required`;
        missingFields.push(`Emergency Contact #${idx + 1} Name`);
      }
      if (!ec.contactNumber.trim()) {
        errors[`emergency_${ec.id}_phone`] = `Emergency contact #${idx + 1} phone is required`;
        missingFields.push(`Emergency Contact #${idx + 1} Phone`);
      } else if (!isValidMobile(ec.contactNumber)) {
        errors[`emergency_${ec.id}_phone`] = `Emergency contact #${idx + 1} phone must be 10 digits`;
        missingFields.push(`Valid Emergency Contact #${idx + 1} Phone`);
      }
      if (!ec.relation.trim()) {
        errors[`emergency_${ec.id}_relation`] = `Emergency contact #${idx + 1} relation is required`;
        missingFields.push(`Emergency Contact #${idx + 1} Relation`);
      }
      if (!ec.address.trim()) {
        errors[`emergency_${ec.id}_address`] = `Emergency contact #${idx + 1} address is required`;
        missingFields.push(`Emergency Contact #${idx + 1} Address`);
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 04: Bank Details
export const validateBank = (bank: JoiningFormData['bank']): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!bank.accountHolderName.trim()) {
    errors.accountHolderName = 'Account Holder Name is required';
    missingFields.push('Account Holder Name');
  }

  if (!bank.bankAccountNumber.trim()) {
    errors.bankAccountNumber = 'Bank Account Number is required';
    missingFields.push('Bank Account Number');
  } else if (!isValidBankAccount(bank.bankAccountNumber)) {
    errors.bankAccountNumber = 'Account Number must be between 9 and 18 digits';
    missingFields.push('Valid Account Number');
  }

  if (!bank.confirmBankAccountNumber.trim()) {
    errors.confirmBankAccountNumber = 'Please confirm your Bank Account Number';
    missingFields.push('Confirm Bank Account');
  } else if (bank.confirmBankAccountNumber.trim() !== bank.bankAccountNumber.trim()) {
    errors.confirmBankAccountNumber = 'Account Numbers do not match';
    missingFields.push('Matching Account Numbers');
  }

  if (!bank.ifscCode.trim()) {
    errors.ifscCode = 'IFSC Code is required';
    missingFields.push('IFSC Code');
  } else if (!isValidIfsc(bank.ifscCode)) {
    errors.ifscCode = 'Enter a valid 11-character IFSC (e.g. SBIN0001234)';
    missingFields.push('Valid IFSC Code');
  }

  if (!bank.bankName.trim()) {
    errors.bankName = 'Bank Name is required';
    missingFields.push('Bank Name');
  }

  if (!bank.branchName.trim()) {
    errors.branchName = 'Branch Name is required';
    missingFields.push('Branch Name');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 05: Education Details
export const validateEducation = (records: JoiningFormData['education']): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!records || records.length === 0) {
    errors.education = 'Please add at least one qualification record';
    missingFields.push('At least one qualification');
  } else {
    records.forEach((rec, idx) => {
      if (!rec.qualification.trim()) {
        errors[`edu_${rec.id}_qualification`] = `Row #${idx + 1}: Qualification is required`;
        missingFields.push(`Row #${idx + 1} Qualification`);
      }
      if (!rec.boardOrUniversity.trim()) {
        errors[`edu_${rec.id}_board`] = `Row #${idx + 1}: Board / University is required`;
        missingFields.push(`Row #${idx + 1} Board/University`);
      }
      if (!rec.yearOfPassing.trim()) {
        errors[`edu_${rec.id}_year`] = `Row #${idx + 1}: Year of Passing is required`;
        missingFields.push(`Row #${idx + 1} Year of Passing`);
      } else if (!/^\d{4}$/.test(rec.yearOfPassing.trim())) {
        errors[`edu_${rec.id}_year`] = `Row #${idx + 1}: Year must be a 4-digit number`;
        missingFields.push(`Row #${idx + 1} Valid 4-digit Year`);
      }
      if (!rec.percentageOrGrade.trim()) {
        errors[`edu_${rec.id}_percentage`] = `Row #${idx + 1}: Percentage or Grade is required`;
        missingFields.push(`Row #${idx + 1} Percentage/Grade`);
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 06: Family Details
export const validateFamily = (records: JoiningFormData['family']): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!records || records.length === 0) {
    errors.family = 'Please add at least one family member record';
    missingFields.push('At least one family member');
  } else {
    records.forEach((rec, idx) => {
      if (!rec.name.trim()) {
        errors[`fam_${rec.id}_name`] = `Family member #${idx + 1} name is required`;
        missingFields.push(`Family Member #${idx + 1} Name`);
      }
      if (!rec.dateOfBirthOrAge.trim()) {
        errors[`fam_${rec.id}_dob`] = `Family member #${idx + 1} DOB / Age is required`;
        missingFields.push(`Family Member #${idx + 1} Age`);
      }
      if (!rec.relation.trim()) {
        errors[`fam_${rec.id}_relation`] = `Family member #${idx + 1} relation is required`;
        missingFields.push(`Family Member #${idx + 1} Relation`);
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 07: Documents
export const validateDocuments = (docs: JoiningFormData['documents']): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // Required documents
  if (!docs.PHOTO?.file?.name) {
    errors.PHOTO = 'Passport Size Photograph is required';
    missingFields.push('Passport Photo');
  }

  if (!docs.SIGNATURE?.file?.name) {
    errors.SIGNATURE = 'Specimen Signature is required';
    missingFields.push('Specimen Signature');
  }

  // Independent Aadhaar Front & Back validation
  if (!docs.AADHAAR_FRONT?.file?.name) {
    errors.AADHAAR_FRONT = 'Aadhaar Card (Front Side) is required';
    missingFields.push('Aadhaar Front');
  }

  if (!docs.AADHAAR_BACK?.file?.name) {
    errors.AADHAAR_BACK = 'Aadhaar Card (Back Side) is required';
    missingFields.push('Aadhaar Back');
  }

  if (!docs.PAN?.file?.name) {
    errors.PAN = 'PAN Card Copy is required';
    missingFields.push('PAN Card Copy');
  }

  if (!docs.BANK_PASSBOOK?.file?.name) {
    errors.BANK_PASSBOOK = 'Bank Passbook / Cancelled Cheque is required';
    missingFields.push('Bank Passbook / Cheque');
  }

  if (!docs.EDUCATION_CERTIFICATE?.file?.name) {
    errors.EDUCATION_CERTIFICATE = 'Highest Qualification Marksheet / Certificate is required';
    missingFields.push('Education Certificate');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 08: Declarations & Consent
export const validateDeclarations = (
  decl: JoiningFormData['declarations'],
  hasSignature: boolean
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!decl.candidateDeclarationAcknowledged) {
    errors.candidateDeclarationAcknowledged = 'You must acknowledge the Joining Undertaking';
    missingFields.push('Joining Undertaking');
  }

  if (!decl.rulesAndConductAccepted) {
    errors.rulesAndConductAccepted = 'You must accept the Company Code of Conduct';
    missingFields.push('Code of Conduct Acceptance');
  }

  if (!decl.backgroundVerificationConsent) {
    errors.backgroundVerificationConsent = 'Consent for Aadhaar/KYC background verification is mandatory';
    missingFields.push('Background Verification Consent');
  }

  if (!decl.signatoryName.trim()) {
    errors.signatoryName = 'Candidate signatory name is required';
    missingFields.push('Signatory Name');
  }

  if (!decl.declarationDate) {
    errors.declarationDate = 'Declaration date is required';
    missingFields.push('Declaration Date');
  }

  if (!hasSignature) {
    errors.signature = 'Specimen Signature upload is required in Step 07';
    missingFields.push('Specimen Signature (Step 07)');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Comprehensive Validation Map
export const validateAllSteps = (
  formData: JoiningFormData
): Record<number, StepValidationResult> => {
  const hasSignature = !!formData.documents.SIGNATURE?.file?.dataUrl;

  return {
    1: validateEmployment(),
    2: validatePersonal(formData.personal),
    3: validateAddress(
      formData.permanentAddress,
      formData.currentAddress,
      formData.sameAsPermanentAddress,
      formData.emergencyContacts
    ),
    4: validateBank(formData.bank),
    5: validateEducation(formData.education),
    6: validateFamily(formData.family),
    7: validateDocuments(formData.documents),
    8: validateDeclarations(formData.declarations, hasSignature),
    9: { isValid: true, errors: {}, missingFields: [] }
  };
};
