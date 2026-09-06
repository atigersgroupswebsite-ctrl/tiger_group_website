// ============================================================================
// Core Domain Models & Business Verticals
// A TIGER GROUPS — Multi-Industry Enterprise Ecosystem
// ============================================================================

export interface BusinessVertical {
  id: string;
  verticalNumber: string;
  name: string;
  associatedWith?: string;
  categoryTag: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  image: string;
}

export const BUSINESS_VERTICALS: BusinessVertical[] = [
  {
    id: 'career-solutions',
    verticalNumber: 'VERTICAL 01',
    name: 'A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY',
    categoryTag: 'Placement & Recruitment',
    description: 'Job placement consultancy and career-related recruitment services connecting candidates with established regional employers.',
    ctaText: 'EXPLORE CAREER SOLUTIONS',
    ctaLink: '/careers',
    image: '/assets/service_consultancy.jpg'
  },
  {
    id: 'manpower-security',
    verticalNumber: 'VERTICAL 02',
    name: 'A TIGER MANPOWER SUPPLY AND SECURITY SERVICES',
    associatedWith: 'Labour Contractor',
    categoryTag: 'Industrial Contracting',
    description: 'Manpower supply, labour contracting, and security staffing solutions for manufacturing plants, warehouses, and commercial facilities.',
    ctaText: 'EXPLORE MANPOWER SERVICES',
    ctaLink: '/enquiry/employer',
    image: '/assets/service_manpower.jpg'
  },
  {
    id: 'infrabuild-properties',
    verticalNumber: 'VERTICAL 03',
    name: 'A TIGER INFRABUILD PROPERTIES',
    categoryTag: 'Real Estate & Properties',
    description: 'Property-related services and real-estate brokerage across prime residential, industrial, and commercial development corridors.',
    ctaText: 'EXPLORE PROPERTIES',
    ctaLink: '/businesses#properties',
    image: '/assets/vertical_properties.jpg'
  },
  {
    id: 'footwear-store',
    verticalNumber: 'VERTICAL 04',
    name: 'A TIGER FOOTWEAR STORE',
    categoryTag: 'Retail & Footwear',
    description: 'Quality footwear collection for men, women, and children spanning formal leather, athletic, casual, and durable daily wear.',
    ctaText: 'VISIT FOOTWEAR STORE',
    ctaLink: '/businesses#footwear',
    image: '/assets/vertical_footwear.jpg'
  },
  {
    id: 'fashion-hub',
    verticalNumber: 'VERTICAL 05',
    name: 'A TIGER FASHION HUB',
    categoryTag: 'Apparel & Lifestyle',
    description: 'Contemporary men’s and women’s fashion and apparel featuring curated everyday styles, formal attire, and seasonal collections.',
    ctaText: 'EXPLORE FASHION',
    ctaLink: '/businesses#fashion',
    image: '/assets/vertical_fashion.jpg'
  }
];

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
