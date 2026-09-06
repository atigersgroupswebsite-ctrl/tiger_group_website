/**
 * Data structures for A TIGER GLOBAL enquiry and consultation flows.
 * Structured for seamless backend/API integration in Phase 2.
 */

export interface JobSeekerEnquiry {
  fullName: string;
  fatherName: string;
  mobileNumber: string;
  email: string;
  address: string;
  desiredCompany: string;
  designation: string;
  description?: string;
  acknowledgedAccurate: boolean;
  acknowledgedTerms: boolean;
}

export interface EmployerEnquiry {
  companyName: string;
  email: string;
  phoneNumber: string;
  address: string;
  district: string;
  state: string;
  employeesRequired: number | '';
  jobRole: string;
  description?: string;
  acknowledgedAccurate: boolean;
}

export const KNOWN_EMPLOYERS = [
  "Haldiram's",
  "Signet Group",
  "Geeta Glass",
  "Other / Not Listed"
] as const;

export const OPERATING_STATES = [
  "Maharashtra",
  "Madhya Pradesh",
  "Chhattisgarh",
  "Other"
] as const;
