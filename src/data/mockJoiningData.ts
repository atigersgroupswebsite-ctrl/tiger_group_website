import type { JoiningFormData } from '../types/joining';

export const INITIAL_JOINING_FORM_DATA: JoiningFormData = {
  applicationId: 'ATG-APP-2026-8491',
  currentStep: 1,
  employment: {
    companyName: 'Haldiram Snacks Manufacturing Pvt. Ltd.',
    unit: 'Unit IV — Plant Operations',
    address: 'Plot No. C-12, MIDC Industrial Area, Hingna, Nagpur, Maharashtra — 440028',
    employeeCode: 'ATG-EMP-5082',
    designation: 'Production Line Operator',
    department: 'Packaging & Production',
    subDepartment: 'Primary Packaging Shift A',
    location: 'Nagpur (Hingna MIDC)',
    dateOfJoining: '2026-09-15',
    grossSalaryCTC: '₹19,500 / Month (Plus Statutory PF & ESIC Benefits)',
    ownership: {
      companyName: 'adminControlled',
      unit: 'adminControlled',
      address: 'adminControlled',
      employeeCode: 'adminControlled',
      designation: 'companyControlled',
      department: 'companyControlled',
      subDepartment: 'companyControlled',
      location: 'adminControlled',
      dateOfJoining: 'adminControlled',
      grossSalaryCTC: 'companyControlled'
    }
  },
  personal: {
    employeeName: '',
    dateOfBirth: '',
    gender: '',
    fatherName: '',
    motherOrHusbandName: '',
    maritalStatus: '',
    spouseName: '',
    bloodGroup: '',
    aadhaarNumber: '',
    panNumber: '',
    employeeContactNumber: '',
    otherContactNumber: '',
    emailId: ''
  },
  permanentAddress: {
    address: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    country: 'India',
    pinCode: ''
  },
  currentAddress: {
    address: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    country: 'India',
    pinCode: ''
  },
  sameAsPermanentAddress: false,
  emergencyContacts: [
    {
      id: 'ec-1',
      name: '',
      contactNumber: '',
      relation: '',
      address: ''
    }
  ],
  bank: {
    accountHolderName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    uanNumber: '',
    esicNumber: '',
    ptNumber: ''
  },
  education: [
    {
      id: 'edu-1',
      qualification: '10th / SSC',
      boardOrUniversity: '',
      yearOfPassing: '',
      percentageOrGrade: ''
    },
    {
      id: 'edu-2',
      qualification: '12th / HSC',
      boardOrUniversity: '',
      yearOfPassing: '',
      percentageOrGrade: ''
    }
  ],
  family: [
    {
      id: 'fam-1',
      name: '',
      dateOfBirthOrAge: '',
      relation: 'Father'
    },
    {
      id: 'fam-2',
      name: '',
      dateOfBirthOrAge: '',
      relation: 'Mother'
    }
  ],
  documents: {
    PHOTO: {
      category: 'PHOTO',
      title: 'Passport Size Photograph',
      type: 'PHOTO',
      side: 'SINGLE',
      required: true
    },
    SIGNATURE: {
      category: 'SIGNATURE',
      title: 'Specimen Signature',
      type: 'SIGNATURE',
      side: 'SINGLE',
      required: true
    },
    AADHAAR_FRONT: {
      category: 'AADHAAR_FRONT',
      title: 'Aadhaar Card (Front Side)',
      type: 'AADHAAR',
      side: 'FRONT',
      required: true
    },
    AADHAAR_BACK: {
      category: 'AADHAAR_BACK',
      title: 'Aadhaar Card (Back Side)',
      type: 'AADHAAR',
      side: 'BACK',
      required: true
    },
    PAN: {
      category: 'PAN',
      title: 'PAN Card Copy',
      type: 'PAN',
      side: 'SINGLE',
      required: true
    },
    BANK_PASSBOOK: {
      category: 'BANK_PASSBOOK',
      title: 'Bank Passbook / Cancelled Cheque',
      type: 'BANK_PASSBOOK',
      side: 'SINGLE',
      required: true
    },
    EDUCATION_CERTIFICATE: {
      category: 'EDUCATION_CERTIFICATE',
      title: 'Highest Qualification Marksheet / Certificate',
      type: 'EDUCATION_CERTIFICATE',
      side: 'SINGLE',
      required: true
    },
    ADDRESS_PROOF: {
      category: 'ADDRESS_PROOF',
      title: 'Current Residence Proof (Electricity Bill / Rent Agreement)',
      type: 'ADDRESS_PROOF',
      side: 'SINGLE',
      required: false
    },
    EXPERIENCE_CERTIFICATE: {
      category: 'EXPERIENCE_CERTIFICATE',
      title: 'Previous Relieving / Experience Letter',
      type: 'EXPERIENCE_CERTIFICATE',
      side: 'SINGLE',
      required: false
    },
    OTHER: {
      category: 'OTHER',
      title: 'Additional Statutory Document',
      type: 'OTHER',
      side: 'SINGLE',
      required: false
    }
  },
  declarations: {
    candidateDeclarationAcknowledged: false,
    rulesAndConductAccepted: false,
    backgroundVerificationConsent: false,
    signatoryName: '',
    declarationDate: new Date().toISOString().split('T')[0]
  },
  status: 'DRAFT'
};

export const JOINING_STEPS = [
  { step: 1, id: 'employment', label: 'Employment', shortLabel: '01 Employment' },
  { step: 2, id: 'personal', label: 'Personal Information', shortLabel: '02 Personal' },
  { step: 3, id: 'address', label: 'Address & Emergency', shortLabel: '03 Address & Emergency' },
  { step: 4, id: 'bank', label: 'Bank Details', shortLabel: '04 Bank' },
  { step: 5, id: 'education', label: 'Education Details', shortLabel: '05 Education' },
  { step: 6, id: 'family', label: 'Family Details', shortLabel: '06 Family' },
  { step: 7, id: 'documents', label: 'Documents & Photos', shortLabel: '07 Documents' },
  { step: 8, id: 'declarations', label: 'Declarations & Consent', shortLabel: '08 Declarations' },
  { step: 9, id: 'review', label: 'Review & Submit', shortLabel: '09 Review' }
];
