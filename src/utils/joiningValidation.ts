import type { JoiningFormData, JoiningFieldConfig } from '../types/joining';
import { isValidIndianPhoneNumber } from './phoneUtils';

export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidMobile = (phone: string): boolean => {
  return isValidIndianPhoneNumber(phone);
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

/**
 * Checks whether a field is enabled in the active configuration.
 * Defaults to true if no configuration map is supplied or field key is not found.
 */
export const isFieldEnabled = (
  fieldKey: string,
  configMap?: Record<string, JoiningFieldConfig>
): boolean => {
  if (!configMap || !configMap[fieldKey]) return true;
  return configMap[fieldKey].is_enabled !== false;
};

/**
 * Checks whether a field is required in the active configuration.
 * If configMap is provided, the database-backed is_required setting is authoritative.
 * If absent, falls back to the default fallback requirement.
 */
export const isFieldRequired = (
  fieldKey: string,
  configMap?: Record<string, JoiningFieldConfig>,
  defaultRequired: boolean = true
): boolean => {
  if (!configMap || !configMap[fieldKey]) return defaultRequired;
  // If field is disabled, it can never be required
  if (configMap[fieldKey].is_enabled === false) return false;
  return Boolean(configMap[fieldKey].is_required);
};

// Validate Step 01: Employment (Admin controlled, always valid)
export const validateEmployment = (): StepValidationResult => {
  return { isValid: true, errors: {}, missingFields: [] };
};

// Validate Custom Fields belonging to a section
export const validateCustomFields = (
  customFields: Record<string, any> | undefined,
  configMap?: Record<string, JoiningFieldConfig>,
  section?: string
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];
  if (!configMap) return { isValid: true, errors, missingFields };

  const activeCustomConfigs = Object.values(configMap).filter(
    (c) => !c.is_system && c.is_enabled && (!section || c.section === section)
  );

  for (const field of activeCustomConfigs) {
    const val = customFields?.[field.field_key];
    const strVal =
      typeof val === 'string'
        ? val.trim()
        : val !== undefined && val !== null
        ? String(val).trim()
        : '';

    if (field.is_required && !strVal) {
      errors[field.field_key] = `${field.label} is required`;
      missingFields.push(field.label);
      continue;
    }

    if (strVal) {
      if (field.field_type === 'email' && !isValidEmail(strVal)) {
        errors[field.field_key] = `Please enter a valid email address`;
        missingFields.push(`Valid ${field.label}`);
      } else if (field.field_type === 'phone' && !isValidMobile(strVal)) {
        errors[field.field_key] = `Please enter a valid 10-digit mobile number`;
        missingFields.push(`Valid ${field.label}`);
      } else if (field.field_type === 'number' && isNaN(Number(strVal))) {
        errors[field.field_key] = `Please enter a valid number`;
        missingFields.push(`Valid ${field.label}`);
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 02: Personal Information
export const validatePersonal = (
  data: JoiningFormData['personal'],
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // 1. Employee Name
  if (isFieldEnabled('personal.employeeName', configMap)) {
    if (isFieldRequired('personal.employeeName', configMap, true)) {
      if (!data.employeeName?.trim()) {
        errors.employeeName = 'Employee Name is required as per Aadhaar';
        missingFields.push('Full Name');
      }
    }
  }

  // 2. Date of Birth
  if (isFieldEnabled('personal.dateOfBirth', configMap)) {
    if (isFieldRequired('personal.dateOfBirth', configMap, true)) {
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
    } else if (data.dateOfBirth) {
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
  }

  // 3. Gender
  if (isFieldEnabled('personal.gender', configMap)) {
    if (isFieldRequired('personal.gender', configMap, true)) {
      if (!data.gender) {
        errors.gender = 'Please select gender';
        missingFields.push('Gender');
      }
    }
  }

  // 4. Father's Name (AUTHORITATIVELY respect configMap)
  if (isFieldEnabled('personal.fatherName', configMap)) {
    if (isFieldRequired('personal.fatherName', configMap, true)) {
      if (!data.fatherName?.trim()) {
        errors.fatherName = "Father's Name is required";
        missingFields.push("Father's Name");
      }
    }
  }

  // 5. Mother's / Husband's Name
  if (isFieldEnabled('personal.motherOrHusbandName', configMap)) {
    if (isFieldRequired('personal.motherOrHusbandName', configMap, true)) {
      if (!data.motherOrHusbandName?.trim()) {
        errors.motherOrHusbandName = "Mother's / Husband's Name is required";
        missingFields.push("Mother's Name");
      }
    }
  }

  // 6. Marital Status & Spouse
  if (isFieldEnabled('personal.maritalStatus', configMap)) {
    if (isFieldRequired('personal.maritalStatus', configMap, true)) {
      if (!data.maritalStatus) {
        errors.maritalStatus = 'Please select marital status';
        missingFields.push('Marital Status');
      } else if (data.maritalStatus === 'Married') {
        if (isFieldRequired('personal.spouseName', configMap, false) || !configMap) {
          if (!data.spouseName?.trim()) {
            errors.spouseName = 'Spouse name is required for married candidates';
            missingFields.push('Spouse Name');
          }
        }
      }
    }
  }

  // 7. Blood Group
  if (isFieldEnabled('personal.bloodGroup', configMap)) {
    if (isFieldRequired('personal.bloodGroup', configMap, false)) {
      if (!data.bloodGroup) {
        errors.bloodGroup = 'Please select blood group';
        missingFields.push('Blood Group');
      }
    }
  }

  // 8. Aadhaar Number
  if (isFieldEnabled('personal.aadhaarNumber', configMap)) {
    if (isFieldRequired('personal.aadhaarNumber', configMap, true)) {
      if (!data.aadhaarNumber?.trim()) {
        errors.aadhaarNumber = '12-digit Aadhaar Number is required';
        missingFields.push('Aadhaar Number');
      } else if (!isValidAadhaar(data.aadhaarNumber)) {
        errors.aadhaarNumber = 'Enter a valid 12-digit Aadhaar Number';
        missingFields.push('Valid Aadhaar Number');
      }
    } else if (data.aadhaarNumber?.trim() && !isValidAadhaar(data.aadhaarNumber)) {
      errors.aadhaarNumber = 'Enter a valid 12-digit Aadhaar Number';
      missingFields.push('Valid Aadhaar Number');
    }
  }

  // 9. PAN Number
  if (isFieldEnabled('personal.panNumber', configMap)) {
    if (isFieldRequired('personal.panNumber', configMap, true)) {
      if (!data.panNumber?.trim()) {
        errors.panNumber = '10-character PAN is required';
        missingFields.push('PAN Number');
      } else if (!isValidPan(data.panNumber)) {
        errors.panNumber = 'Enter a valid PAN (e.g. ABCDE1234F)';
        missingFields.push('Valid PAN');
      }
    } else if (data.panNumber?.trim() && !isValidPan(data.panNumber)) {
      errors.panNumber = 'Enter a valid PAN (e.g. ABCDE1234F)';
      missingFields.push('Valid PAN');
    }
  }

  // 10. Contact Number
  if (isFieldEnabled('personal.employeeContactNumber', configMap)) {
    if (isFieldRequired('personal.employeeContactNumber', configMap, true)) {
      if (!data.employeeContactNumber?.trim()) {
        errors.employeeContactNumber = '10-digit mobile number is required';
        missingFields.push('Contact Number');
      } else if (!isValidMobile(data.employeeContactNumber)) {
        errors.employeeContactNumber = 'Enter a valid 10-digit Indian mobile number';
        missingFields.push('Valid Mobile Number');
      }
    } else if (data.employeeContactNumber?.trim() && !isValidMobile(data.employeeContactNumber)) {
      errors.employeeContactNumber = 'Enter a valid 10-digit Indian mobile number';
      missingFields.push('Valid Mobile Number');
    }
  }

  // 11. Alternate Contact Number
  if (data.otherContactNumber && data.otherContactNumber.trim()) {
    if (!isValidMobile(data.otherContactNumber)) {
      errors.otherContactNumber = 'Enter a valid alternate 10-digit mobile number';
    }
  }

  // 12. Email Address
  if (isFieldEnabled('personal.emailId', configMap)) {
    if (isFieldRequired('personal.emailId', configMap, true)) {
      if (!data.emailId?.trim()) {
        errors.emailId = 'Email address is required';
        missingFields.push('Email Address');
      } else if (!isValidEmail(data.emailId)) {
        errors.emailId = 'Please enter a valid email address';
        missingFields.push('Valid Email Address');
      }
    } else if (data.emailId?.trim() && !isValidEmail(data.emailId)) {
      errors.emailId = 'Please enter a valid email address';
      missingFields.push('Valid Email Address');
    }
  }

  // 13. Validate any custom fields assigned to personal section
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'personal');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
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
  emergency: JoiningFormData['emergencyContacts'],
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // Permanent Street Address
  if (isFieldEnabled('address.perm_address', configMap)) {
    if (isFieldRequired('address.perm_address', configMap, true)) {
      if (!perm.address?.trim()) {
        errors.perm_address = 'Permanent address is required';
        missingFields.push('Permanent Street Address');
      }
    }
  }

  // Permanent City
  if (isFieldEnabled('address.perm_city', configMap)) {
    if (isFieldRequired('address.perm_city', configMap, true)) {
      if (!perm.city?.trim()) {
        errors.perm_city = 'Permanent city is required';
        missingFields.push('Permanent City');
      }
    }
  }

  // Permanent District
  if (isFieldEnabled('address.perm_district', configMap)) {
    if (isFieldRequired('address.perm_district', configMap, true)) {
      if (!perm.district?.trim()) {
        errors.perm_district = 'Permanent district is required';
        missingFields.push('Permanent District');
      }
    }
  }

  // Permanent State
  if (isFieldEnabled('address.perm_state', configMap)) {
    if (isFieldRequired('address.perm_state', configMap, true)) {
      if (!perm.state?.trim()) {
        errors.perm_state = 'Permanent state is required';
        missingFields.push('Permanent State');
      }
    }
  }

  // Permanent PIN Code
  if (isFieldEnabled('address.perm_pinCode', configMap)) {
    if (isFieldRequired('address.perm_pinCode', configMap, true)) {
      if (!perm.pinCode?.trim()) {
        errors.perm_pinCode = 'Permanent 6-digit PIN code is required';
        missingFields.push('Permanent PIN Code');
      } else if (!isValidPinCode(perm.pinCode)) {
        errors.perm_pinCode = 'Enter a valid 6-digit PIN code';
        missingFields.push('Valid Permanent PIN Code');
      }
    } else if (perm.pinCode?.trim() && !isValidPinCode(perm.pinCode)) {
      errors.perm_pinCode = 'Enter a valid 6-digit PIN code';
      missingFields.push('Valid Permanent PIN Code');
    }
  }

  // Current (if not same)
  if (!sameAsPerm) {
    if (isFieldEnabled('address.curr_address', configMap)) {
      if (isFieldRequired('address.curr_address', configMap, true)) {
        if (!curr.address?.trim()) {
          errors.curr_address = 'Current address is required';
          missingFields.push('Current Street Address');
        }
      }
    }

    if (isFieldEnabled('address.curr_city', configMap)) {
      if (isFieldRequired('address.curr_city', configMap, true)) {
        if (!curr.city?.trim()) {
          errors.curr_city = 'Current city is required';
          missingFields.push('Current City');
        }
      }
    }

    if (isFieldEnabled('address.curr_district', configMap)) {
      if (isFieldRequired('address.curr_district', configMap, true)) {
        if (!curr.district?.trim()) {
          errors.curr_district = 'Current district is required';
          missingFields.push('Current District');
        }
      }
    }

    if (isFieldEnabled('address.curr_state', configMap)) {
      if (isFieldRequired('address.curr_state', configMap, true)) {
        if (!curr.state?.trim()) {
          errors.curr_state = 'Current state is required';
          missingFields.push('Current State');
        }
      }
    }

    if (isFieldEnabled('address.curr_pinCode', configMap)) {
      if (isFieldRequired('address.curr_pinCode', configMap, true)) {
        if (!curr.pinCode?.trim()) {
          errors.curr_pinCode = 'Current 6-digit PIN code is required';
          missingFields.push('Current PIN Code');
        } else if (!isValidPinCode(curr.pinCode)) {
          errors.curr_pinCode = 'Enter a valid 6-digit PIN code';
          missingFields.push('Valid Current PIN Code');
        }
      } else if (curr.pinCode?.trim() && !isValidPinCode(curr.pinCode)) {
        errors.curr_pinCode = 'Enter a valid 6-digit PIN code';
        missingFields.push('Valid Current PIN Code');
      }
    }
  }

  // Emergency contacts
  if (isFieldEnabled('address.emergency', configMap)) {
    const isEmergencyRequired = isFieldRequired('address.emergency', configMap, true);
    if (isEmergencyRequired && (!emergency || emergency.length === 0)) {
      errors.emergency = 'At least one emergency contact is required';
      missingFields.push('Emergency Family Contact');
    } else if (emergency && emergency.length > 0) {
      emergency.forEach((ec, idx) => {
        if (!ec.name?.trim()) {
          errors[`emergency_${ec.id}_name`] = `Emergency contact #${idx + 1} name is required`;
          missingFields.push(`Emergency Contact #${idx + 1} Name`);
        }
        if (!ec.contactNumber?.trim()) {
          errors[`emergency_${ec.id}_phone`] = `Emergency contact #${idx + 1} phone is required`;
          missingFields.push(`Emergency Contact #${idx + 1} Phone`);
        } else if (!isValidMobile(ec.contactNumber)) {
          errors[`emergency_${ec.id}_phone`] = `Emergency contact #${idx + 1} phone must be 10 digits`;
          missingFields.push(`Valid Emergency Contact #${idx + 1} Phone`);
        }
        if (!ec.relation?.trim()) {
          errors[`emergency_${ec.id}_relation`] = `Emergency contact #${idx + 1} relation is required`;
          missingFields.push(`Emergency Contact #${idx + 1} Relation`);
        }
        if (!ec.address?.trim()) {
          errors[`emergency_${ec.id}_address`] = `Emergency contact #${idx + 1} address is required`;
          missingFields.push(`Emergency Contact #${idx + 1} Address`);
        }
      });
    }
  }

  // Custom fields in address
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'address');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 04: Bank Details
export const validateBank = (
  bank: JoiningFormData['bank'],
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // Account Holder Name
  if (isFieldEnabled('bank.accountHolderName', configMap)) {
    if (isFieldRequired('bank.accountHolderName', configMap, true)) {
      if (!bank.accountHolderName?.trim()) {
        errors.accountHolderName = 'Account Holder Name is required';
        missingFields.push('Account Holder Name');
      }
    }
  }

  // Bank Account Number
  if (isFieldEnabled('bank.bankAccountNumber', configMap)) {
    if (isFieldRequired('bank.bankAccountNumber', configMap, true)) {
      if (!bank.bankAccountNumber?.trim()) {
        errors.bankAccountNumber = 'Bank Account Number is required';
        missingFields.push('Bank Account Number');
      } else if (!isValidBankAccount(bank.bankAccountNumber)) {
        errors.bankAccountNumber = 'Account Number must be between 9 and 18 digits';
        missingFields.push('Valid Account Number');
      }
    } else if (bank.bankAccountNumber?.trim() && !isValidBankAccount(bank.bankAccountNumber)) {
      errors.bankAccountNumber = 'Account Number must be between 9 and 18 digits';
      missingFields.push('Valid Account Number');
    }
  }

  // Confirm Account Number
  if (isFieldEnabled('bank.confirmBankAccountNumber', configMap)) {
    if (isFieldRequired('bank.confirmBankAccountNumber', configMap, true)) {
      if (!bank.confirmBankAccountNumber?.trim()) {
        errors.confirmBankAccountNumber = 'Please confirm your Bank Account Number';
        missingFields.push('Confirm Bank Account');
      } else if (bank.confirmBankAccountNumber.trim() !== bank.bankAccountNumber?.trim()) {
        errors.confirmBankAccountNumber = 'Account Numbers do not match';
        missingFields.push('Matching Account Numbers');
      }
    } else if (
      bank.confirmBankAccountNumber?.trim() &&
      bank.confirmBankAccountNumber.trim() !== bank.bankAccountNumber?.trim()
    ) {
      errors.confirmBankAccountNumber = 'Account Numbers do not match';
      missingFields.push('Matching Account Numbers');
    }
  }

  // IFSC Code
  if (isFieldEnabled('bank.ifscCode', configMap)) {
    if (isFieldRequired('bank.ifscCode', configMap, true)) {
      if (!bank.ifscCode?.trim()) {
        errors.ifscCode = 'IFSC Code is required';
        missingFields.push('IFSC Code');
      } else if (!isValidIfsc(bank.ifscCode)) {
        errors.ifscCode = 'Enter a valid 11-character IFSC (e.g. SBIN0001234)';
        missingFields.push('Valid IFSC Code');
      }
    } else if (bank.ifscCode?.trim() && !isValidIfsc(bank.ifscCode)) {
      errors.ifscCode = 'Enter a valid 11-character IFSC (e.g. SBIN0001234)';
      missingFields.push('Valid IFSC Code');
    }
  }

  // Bank Name
  if (isFieldEnabled('bank.bankName', configMap)) {
    if (isFieldRequired('bank.bankName', configMap, true)) {
      if (!bank.bankName?.trim()) {
        errors.bankName = 'Bank Name is required';
        missingFields.push('Bank Name');
      }
    }
  }

  // Branch Name
  if (isFieldEnabled('bank.branchName', configMap)) {
    if (isFieldRequired('bank.branchName', configMap, true)) {
      if (!bank.branchName?.trim()) {
        errors.branchName = 'Branch Name is required';
        missingFields.push('Branch Name');
      }
    }
  }

  // Custom fields in bank
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'bank');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 05: Education Details
export const validateEducation = (
  records: JoiningFormData['education'] | undefined | null,
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  const isEduRequired = isFieldRequired('education.records', configMap, false);

  if (isEduRequired && (!records || records.length === 0)) {
    errors.education = 'At least one education record is required';
    missingFields.push('Academic Qualifications');
    return { isValid: false, errors, missingFields };
  }

  if (!records || records.length === 0) {
    return { isValid: true, errors: {}, missingFields: [] };
  }

  // Filter out completely blank rows or untouched legacy template entries
  const activeRecords = records.filter((rec) => {
    const isLegacyDummy =
      (rec.qualification === '10th / SSC' || rec.qualification === '12th / HSC') &&
      !rec.boardOrUniversity?.trim() &&
      !rec.yearOfPassing?.trim() &&
      !rec.percentageOrGrade?.trim();
    if (isLegacyDummy) return false;

    const hasAnyContent = Boolean(
      rec.qualification?.trim() ||
        rec.boardOrUniversity?.trim() ||
        rec.yearOfPassing?.trim() ||
        rec.percentageOrGrade?.trim()
    );
    return hasAnyContent;
  });

  if (activeRecords.length === 0) {
    if (isEduRequired) {
      errors.education = 'At least one education record is required';
      missingFields.push('Academic Qualifications');
      return { isValid: false, errors, missingFields };
    }
    return { isValid: true, errors: {}, missingFields: [] };
  }

  // If candidate partially fills an active record, validate the entered record
  activeRecords.forEach((rec, idx) => {
    if (!rec.qualification?.trim()) {
      errors[`edu_${rec.id}_qualification`] = `Row #${idx + 1}: Qualification is required`;
      missingFields.push(`Row #${idx + 1} Qualification`);
    }
    if (!rec.boardOrUniversity?.trim()) {
      errors[`edu_${rec.id}_board`] = `Row #${idx + 1}: Board / University is required`;
      missingFields.push(`Row #${idx + 1} Board/University`);
    }
    if (!rec.yearOfPassing?.trim()) {
      errors[`edu_${rec.id}_year`] = `Row #${idx + 1}: Year of Passing is required`;
      missingFields.push(`Row #${idx + 1} Year of Passing`);
    } else if (!/^\d{4}$/.test(rec.yearOfPassing.trim())) {
      errors[`edu_${rec.id}_year`] = `Row #${idx + 1}: Year must be a 4-digit number`;
      missingFields.push(`Row #${idx + 1} Valid 4-digit Year`);
    }
    if (!rec.percentageOrGrade?.trim()) {
      errors[`edu_${rec.id}_percentage`] = `Row #${idx + 1}: Percentage or Grade is required`;
      missingFields.push(`Row #${idx + 1} Percentage/Grade`);
    }
  });

  // Custom fields in education
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'education');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 06: Family Details
export const validateFamily = (
  records: JoiningFormData['family'],
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  const isFamilyRequired = isFieldRequired('family.records', configMap, true);

  if (isFamilyRequired && (!records || records.length === 0)) {
    errors.family = 'Please add at least one family member record';
    missingFields.push('At least one family member');
  } else if (records && records.length > 0) {
    records.forEach((rec, idx) => {
      if (!rec.name?.trim()) {
        errors[`fam_${rec.id}_name`] = `Family member #${idx + 1} name is required`;
        missingFields.push(`Family Member #${idx + 1} Name`);
      }
      if (!rec.dateOfBirthOrAge?.trim()) {
        errors[`fam_${rec.id}_dob`] = `Family member #${idx + 1} DOB / Age is required`;
        missingFields.push(`Family Member #${idx + 1} Age`);
      }
      if (!rec.relation?.trim()) {
        errors[`fam_${rec.id}_relation`] = `Family member #${idx + 1} relation is required`;
        missingFields.push(`Family Member #${idx + 1} Relation`);
      }
    });
  }

  // Custom fields in family
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'family');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Validate Step 07: Documents (Clearly separated document requirement logic)
export const validateDocuments = (
  docs: JoiningFormData['documents'],
  configMap?: Record<string, JoiningFieldConfig>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // 1. Photo
  if (isFieldEnabled('documents.PHOTO', configMap)) {
    if (isFieldRequired('documents.PHOTO', configMap, true)) {
      if (!docs.PHOTO?.file?.name) {
        errors.PHOTO = 'Passport Size Photograph is required';
        missingFields.push('Passport Photo');
      }
    }
  }

  // 2. Signature
  if (isFieldEnabled('documents.SIGNATURE', configMap)) {
    if (isFieldRequired('documents.SIGNATURE', configMap, true)) {
      if (!docs.SIGNATURE?.file?.name) {
        errors.SIGNATURE = 'Specimen Signature is required';
        missingFields.push('Specimen Signature');
      }
    }
  }

  // 3. Aadhaar Front
  if (isFieldEnabled('documents.AADHAAR_FRONT', configMap)) {
    if (isFieldRequired('documents.AADHAAR_FRONT', configMap, true)) {
      if (!docs.AADHAAR_FRONT?.file?.name) {
        errors.AADHAAR_FRONT = 'Aadhaar Card (Front Side) is required';
        missingFields.push('Aadhaar Front');
      }
    }
  }

  // 4. Aadhaar Back
  if (isFieldEnabled('documents.AADHAAR_BACK', configMap)) {
    if (isFieldRequired('documents.AADHAAR_BACK', configMap, true)) {
      if (!docs.AADHAAR_BACK?.file?.name) {
        errors.AADHAAR_BACK = 'Aadhaar Card (Back Side) is required';
        missingFields.push('Aadhaar Back');
      }
    }
  }

  // 5. PAN
  if (isFieldEnabled('documents.PAN', configMap)) {
    if (isFieldRequired('documents.PAN', configMap, true)) {
      if (!docs.PAN?.file?.name) {
        errors.PAN = 'PAN Card Copy is required';
        missingFields.push('PAN Card Copy');
      }
    }
  }

  // 6. Bank Passbook
  if (isFieldEnabled('documents.BANK_PASSBOOK', configMap)) {
    if (isFieldRequired('documents.BANK_PASSBOOK', configMap, true)) {
      if (!docs.BANK_PASSBOOK?.file?.name) {
        errors.BANK_PASSBOOK = 'Bank Passbook / Cancelled Cheque is required';
        missingFields.push('Bank Passbook / Cheque');
      }
    }
  }

  // 7. Education Certificate (Optional by default)
  if (isFieldEnabled('documents.EDUCATION_CERTIFICATE', configMap)) {
    if (isFieldRequired('documents.EDUCATION_CERTIFICATE', configMap, false)) {
      if (!docs.EDUCATION_CERTIFICATE?.file?.name) {
        errors.EDUCATION_CERTIFICATE = 'Academic Certificates are required';
        missingFields.push('Academic Certificate');
      }
    }
  }

  // 8. Experience Certificate (Optional by default)
  if (isFieldEnabled('documents.EXPERIENCE_CERTIFICATE', configMap)) {
    if (isFieldRequired('documents.EXPERIENCE_CERTIFICATE', configMap, false)) {
      if (!docs.EXPERIENCE_CERTIFICATE?.file?.name) {
        errors.EXPERIENCE_CERTIFICATE = 'Experience Certificate is required';
        missingFields.push('Experience Certificate');
      }
    }
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
  hasSignature: boolean,
  configMap?: Record<string, JoiningFieldConfig>,
  customFields?: Record<string, any>
): StepValidationResult => {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  // Joining Undertaking
  if (isFieldEnabled('declarations.candidateDeclarationAcknowledged', configMap)) {
    if (isFieldRequired('declarations.candidateDeclarationAcknowledged', configMap, true)) {
      if (!decl.candidateDeclarationAcknowledged) {
        errors.candidateDeclarationAcknowledged = 'You must acknowledge the Joining Undertaking';
        missingFields.push('Joining Undertaking');
      }
    }
  }

  // Code of Conduct
  if (isFieldEnabled('declarations.rulesAndConductAccepted', configMap)) {
    if (isFieldRequired('declarations.rulesAndConductAccepted', configMap, true)) {
      if (!decl.rulesAndConductAccepted) {
        errors.rulesAndConductAccepted = 'You must accept the Company Code of Conduct';
        missingFields.push('Code of Conduct Acceptance');
      }
    }
  }

  // Background Verification Consent
  if (isFieldEnabled('declarations.backgroundVerificationConsent', configMap)) {
    if (isFieldRequired('declarations.backgroundVerificationConsent', configMap, true)) {
      if (!decl.backgroundVerificationConsent) {
        errors.backgroundVerificationConsent = 'Consent for Aadhaar/KYC background verification is mandatory';
        missingFields.push('Background Verification Consent');
      }
    }
  }

  // Self Declaration (Dual Employment)
  if (isFieldEnabled('declarations.selfDeclarationAcknowledged', configMap)) {
    if (isFieldRequired('declarations.selfDeclarationAcknowledged', configMap, true)) {
      if (!decl.selfDeclarationAcknowledged) {
        errors.selfDeclarationAcknowledged =
          'You must acknowledge the Self Declaration regarding dual employment & relieving formalities (Page 07)';
        missingFields.push('Self Declaration (Page 07)');
      }
    }
  }

  // Relative Declaration
  if (isFieldEnabled('declarations.relativeDeclarationAcknowledged', configMap)) {
    if (isFieldRequired('declarations.relativeDeclarationAcknowledged', configMap, true)) {
      if (!decl.relativeDeclarationAcknowledged) {
        errors.relativeDeclarationAcknowledged =
          'You must acknowledge the Relative Employment Policy Declaration (Page 08)';
        missingFields.push('Relative Declaration (Page 08)');
      }
    }
  }

  // Conditional relative details
  if (decl.hasRelativeInOrganization && !decl.relativeName?.trim()) {
    errors.relativeName = 'Please enter relative name working in organization';
    missingFields.push('Relative Name');
  }

  // Signatory Name
  if (isFieldEnabled('declarations.signatoryName', configMap)) {
    if (isFieldRequired('declarations.signatoryName', configMap, true)) {
      if (!decl.signatoryName?.trim()) {
        errors.signatoryName = 'Candidate signatory name is required';
        missingFields.push('Signatory Name');
      }
    }
  }

  // Declaration Date
  if (isFieldEnabled('declarations.declarationDate', configMap)) {
    if (isFieldRequired('declarations.declarationDate', configMap, true)) {
      if (!decl.declarationDate) {
        errors.declarationDate = 'Declaration date is required';
        missingFields.push('Declaration Date');
      }
    }
  }

  // Signature check
  if (isFieldRequired('documents.SIGNATURE', configMap, true) && !hasSignature) {
    errors.signature = 'Specimen Signature upload is required in Step 06';
    missingFields.push('Specimen Signature (Step 06)');
  }

  // Custom fields in declarations
  if (configMap && customFields) {
    const customResult = validateCustomFields(customFields, configMap, 'declarations');
    Object.assign(errors, customResult.errors);
    missingFields.push(...customResult.missingFields);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields
  };
};

// Comprehensive Validation Map
export const validateAllSteps = (
  formData: JoiningFormData,
  configMap?: Record<string, JoiningFieldConfig>
): Record<number, StepValidationResult> => {
  const hasSignature = !!formData.documents?.SIGNATURE?.file?.dataUrl;
  const custom = formData.customFields;

  return {
    1: validatePersonal(formData.personal, configMap, custom),
    2: validateAddress(
      formData.permanentAddress,
      formData.currentAddress,
      formData.sameAsPermanentAddress,
      formData.emergencyContacts,
      configMap,
      custom
    ),
    3: validateBank(formData.bank, configMap, custom),
    4: validateEducation(formData.education, configMap, custom),
    5: validateFamily(formData.family, configMap, custom),
    6: validateDocuments(formData.documents, configMap),
    7: validateDeclarations(formData.declarations, hasSignature, configMap, custom),
    8: { isValid: true, errors: {}, missingFields: [] }
  };
};
