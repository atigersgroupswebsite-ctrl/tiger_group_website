export type FieldOwnership =
  | 'candidateControlled'
  | 'adminControlled'
  | 'companyControlled'
  | 'systemGenerated';

export interface EmploymentInfo {
  companyName: string;
  unit: string;
  address: string;
  employeeCode: string;
  designation: string;
  department: string;
  subDepartment: string;
  location: string;
  dateOfJoining: string;
  grossSalaryCTC: string;
  ownership: Record<string, FieldOwnership>;
}

export interface PersonalInfo {
  employeeName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  fatherName: string;
  motherOrHusbandName: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
  spouseName?: string;
  bloodGroup: string;
  aadhaarNumber: string;
  panNumber: string;
  employeeContactNumber: string;
  otherContactNumber?: string;
  emailId: string;
}

export interface AddressDetails {
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
  flatHouseRoad?: string;
  villageOrCity?: string;
  taluka?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  contactNumber: string;
  relation: string;
  address: string;
}

export interface BankDetails {
  accountHolderName: string;
  bankAccountNumber: string;
  confirmBankAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  uanNumber?: string;
  esicNumber?: string;
  ptNumber?: string;
}

export interface EducationRecord {
  id: string;
  qualification: string;
  boardOrUniversity: string;
  yearOfPassing: string;
  percentageOrGrade: string;
}

export interface FamilyMemberRecord {
  id: string;
  name: string;
  dateOfBirthOrAge: string;
  relation: string;
}

export type DocumentCategory =
  | 'PHOTO'
  | 'SIGNATURE'
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'PAN'
  | 'BANK_PASSBOOK'
  | 'EDUCATION_CERTIFICATE'
  | 'ADDRESS_PROOF'
  | 'EXPERIENCE_CERTIFICATE'
  | 'OTHER';

export interface UploadedDocument {
  category: DocumentCategory;
  title: string;
  type: 'AADHAAR' | 'PAN' | 'PHOTO' | 'SIGNATURE' | 'BANK_PASSBOOK' | 'EDUCATION_CERTIFICATE' | 'ADDRESS_PROOF' | 'EXPERIENCE_CERTIFICATE' | 'OTHER';
  side?: 'FRONT' | 'BACK' | 'SINGLE';
  required: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
    storagePath?: string;
  };
  verificationStatus?: 'UPLOADED' | 'VERIFIED' | 'REJECTED' | 'PENDING';
  rejectionReason?: string;
}

export interface DeclarationsInfo {
  // Baseline Undertakings
  candidateDeclarationAcknowledged: boolean;
  rulesAndConductAccepted: boolean;
  backgroundVerificationConsent: boolean;

  // Page 7: Self Declaration (Relieving & Dual Employment)
  selfDeclarationAcknowledged: boolean;
  previousEmployerName?: string;
  previousEmployerLastWorkingDay?: string;

  // Page 8: Relative Employment Declaration
  relativeDeclarationAcknowledged: boolean;
  hasRelativeInOrganization: boolean;
  relativeName?: string;
  relativeDepartment?: string;
  relativeDesignation?: string;
  relativeRelationship?: string;

  // Page 6: Women Worker Night Shift Consent (Female Candidates Only)
  womenNightShiftConsent: boolean;
  womenNightShiftPlace?: string;

  // Signatory
  signatoryName: string;
  declarationDate: string;
}

export interface JoiningFormData {
  applicationId?: string;
  formId?: string;
  joiningReference?: string;
  userEmail?: string;
  currentStep: number;
  employment: EmploymentInfo;
  personal: PersonalInfo;
  permanentAddress: AddressDetails;
  currentAddress: AddressDetails;
  sameAsPermanentAddress: boolean;
  emergencyContacts: EmergencyContact[];
  bank: BankDetails;
  education: EducationRecord[];
  family: FamilyMemberRecord[];
  documents: Record<DocumentCategory, UploadedDocument>;
  declarations: DeclarationsInfo;
  customFields?: Record<string, any>;
  status: 'DRAFT' | 'SUBMITTED';
  submissionStatus?: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string;
}

export type ConfigurableSection =
  | 'personal'
  | 'address'
  | 'bank'
  | 'education'
  | 'family'
  | 'documents'
  | 'declarations'
  | 'custom';

export type ConfigurableFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'phone'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file';

export interface FieldSelectOption {
  label: string;
  value: string;
}

export interface FieldConditionalRule {
  dependsOn: string;
  value: string | boolean;
}

export interface JoiningFieldConfig {
  id: string;
  field_key: string;
  section: ConfigurableSection | string;
  label: string;
  field_type: ConfigurableFieldType;
  is_required: boolean;
  is_enabled: boolean;
  is_system: boolean;
  display_order: number;
  placeholder?: string | null;
  help_text?: string | null;
  options?: FieldSelectOption[] | null;
  conditional_rule?: FieldConditionalRule | null;
  validation_rules?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}
