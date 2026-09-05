// ============================================================================
// Core Domain Models & Future Phase 2 Contracts
// A TIGER GLOBAL Career Solution & Consultancy
// ============================================================================

export type RegionState = 'Maharashtra' | 'Madhya Pradesh' | 'Chhattisgarh';

export type EmploymentType = 'Full Time' | 'Contract' | 'Temporary' | 'Rotational Shift';

export type ServiceCategory = 'Job Placement' | 'Labour Supply' | 'Security Services';

export interface Job {
  id: string;
  slug: string;
  title: string;
  department: string;
  serviceCategory: ServiceCategory;
  location: string;
  state: RegionState;
  employmentType: EmploymentType;
  experienceLevel: string;
  openings: number;
  salaryRange?: string; // Optional demo range
  overview: string;
  responsibilities: string[];
  requirements: string[];
  facilitiesProvided?: string[];
  isFeatured?: boolean;
  postedDate: string;
}

export interface Candidate {
  id?: string;
  fullName: string;
  fatherName: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  mobileNumber: string;
  alternateNumber?: string;
  email?: string;
  currentAddress: string;
  permanentAddress?: string;
  city: string;
  state: RegionState;
  preferredRole?: string;
  preferredState?: RegionState;
  qualification: string;
  experienceYears: string;
  previousCompany?: string;
  documentsDeclared: boolean;
  termsAccepted: boolean;
  createdAt?: string;
}

export interface Employer {
  id?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  district: string;
  state: RegionState;
  serviceRequired: ServiceCategory;
  workerQuantity: number;
  workDescription: string;
  shiftTiming?: string;
  accommodationProvided: boolean;
  foodProvided: boolean;
  createdAt?: string;
}

export interface Application {
  id?: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  appliedDate: string;
  status: 'Received' | 'Screening' | 'Interview Scheduled' | 'Selected' | 'Joining In-Progress';
  consultancyFeeStatus: 'Pending' | 'Partially Paid' | 'Paid';
}

export interface Payment {
  transactionId?: string;
  candidateId?: string;
  amount: number;
  paymentType: 'Registration Fee' | 'Consultancy Balance';
  status: 'Pending' | 'Success' | 'Failed';
  paymentDate?: string;
  gateway?: 'Razorpay' | 'Direct Cash/UPI';
}

export interface Document {
  id?: string;
  candidateId: string;
  documentType: 'Aadhaar Card' | 'PAN Card' | 'Bank Passbook / Cheque' | 'Education Certificate' | 'Experience Letter' | 'Passport Photo';
  fileName: string;
  fileUrl?: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  verifiedAt?: string;
}

export interface JoiningRecord {
  id?: string;
  candidateId: string;
  candidateName: string;
  assignedCompany: 'Haldiram\'s' | 'Signet Group' | 'Geeta Glass' | string;
  unitLocation: string;
  designation: string;
  dateOfJoining: string;
  uanNumber?: string;
  esicNumber?: string;
  pfNumber?: string;
  status: 'Form-5 Submitted' | 'Company Confirmed' | 'Deployed';
}

export interface EnquiryFormState {
  // Step 1: Personal Info
  fullName: string;
  fatherName: string;
  dob: string;
  gender: string;
  
  // Step 2: Job Preference
  serviceCategory: string;
  preferredJobRole: string;
  preferredState: string;
  availability: string;

  // Step 3: Education & Experience
  qualification: string;
  experienceYears: string;
  previousCompany: string;
  skills: string;

  // Step 4: Contact & Identity
  mobileNumber: string;
  alternateNumber: string;
  email: string;
  currentAddress: string;
  city: string;
  state: string;
  hasOriginalDocuments: boolean;

  // Step 5: Review & Consent
  acceptedPolicy: boolean;
}
