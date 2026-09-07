// ==============================================================================
// File: src/data/policyData.ts
// Description: Official Legal & Policy Content Models for A TIGER GROUPS
//
// Separated Data Models:
// 1. CONSULTANCY_POLICY_CONTENT (The 10 official client operating rules)
// 2. TERMS_AND_CONDITIONS_CONTENT (General website & placement engagement terms)
// 3. PRIVACY_POLICY_CONTENT (Data privacy, document storage & protection terms)
// ==============================================================================

export interface PolicyRule {
  number: number;
  title: string;
  description: string;
  category: 'Documentation' | 'Operations' | 'Fee Structure' | 'Compliance' | 'Conduct';
}

export interface LegalDocumentSection {
  number: string;
  title: string;
  summary: string;
  clauses: string[];
}

/**
 * 1. CONSULTANCY POLICY (Client Source of Truth - 10 Operating Rules)
 * Preserves exact client terminology and wording.
 */
export const CONSULTANCY_POLICY_CONTENT: PolicyRule[] = [
  {
    number: 1,
    title: 'Registration & Original Documents',
    description: 'Please bring the registration form and all original documents for recruitment at the company.',
    category: 'Documentation'
  },
  {
    number: 2,
    title: 'Designated Office Hours',
    description: 'Office hours will be from 11:00 AM to 4:00 PM.',
    category: 'Operations'
  },
  {
    number: 3,
    title: 'Prohibition of Forged Documents',
    description: 'If any worker is found working after submitting forged documents, disciplinary action will be taken, and the worker will be held personally responsible.',
    category: 'Compliance'
  },
  {
    number: 4,
    title: 'Zero Tolerance on Child Labour',
    description: 'Child labour is strictly prohibited in compliance with statutory labour laws.',
    category: 'Compliance'
  },
  {
    number: 5,
    title: 'Three-Company Choice Procedure',
    description: 'During your interview, we will offer you a choice of three companies; you will have to select one of them and work for that company.',
    category: 'Operations'
  },
  {
    number: 6,
    title: 'Consultancy Fee Structure (₹1,000 Total)',
    description: 'A consultancy fee of ₹1,000 will be charged for securing a job through A Tiger Global Consultancy. Of this amount, ₹500 is to be paid at the time of registration. After you have worked for one month, we will coordinate with the company to deduct the remaining ₹500 from your salary.',
    category: 'Fee Structure'
  },
  {
    number: 7,
    title: 'Purpose of Registration Fee',
    description: 'The registration fee is being charged to cover the joining process—including legal, civil, and police verifications, PF and ESIC registration, and digital banking verification—as well as to provide guidance and secure an excellent job for your otherwise uncertain career.',
    category: 'Fee Structure'
  },
  {
    number: 8,
    title: 'Joining at Referred Company is Free of Charge',
    description: 'The registration and consultation fees you pay are for our consultancy services and are not remitted to the company we refer you to; joining that company is free of charge, and no money will be collected there. If anyone asks you for a fee, please inform us. Note: You are responsible for arranging your own accommodation and meals. However, if you wish to avail of food and lodging facilities provided by the company, a charge will apply, and you will be required to pay it.',
    category: 'Fee Structure'
  },
  {
    number: 9,
    title: 'Direct Complaint Process',
    description: 'No fees of any kind are charged by the company you are placed with through A Tiger Global Career Solution & Consultancy. If anyone within that company asks you for any kind of fee, you may immediately lodge a complaint with A Tiger Global Career Solution & Consultancy and the concerned company\'s HOD.',
    category: 'Conduct'
  },
  {
    number: 10,
    title: 'Non-Refundable Policy',
    description: 'Once registration is completed through Tiger Global Consultancy, it cannot be cancelled, and the consultancy fee will not be refunded.',
    category: 'Fee Structure'
  }
];

/**
 * Backward compatibility alias
 */
export const OFFICIAL_POLICY_TERMS = CONSULTANCY_POLICY_CONTENT;

/**
 * 2. TERMS & CONDITIONS (Distinct from Consultancy Policy)
 */
export const TERMS_AND_CONDITIONS_CONTENT: LegalDocumentSection[] = [
  {
    number: '01',
    title: 'Acceptance of Terms & Engagement Scope',
    summary: 'These Terms and Conditions govern candidate registration, employer enquiries, and use of digital portals provided by A Tiger Global Career Solution and Consultancy.',
    clauses: [
      'By accessing our portal, submitting an enquiry, or registering for placement assistance, you agree to comply with and be bound by these Terms & Conditions.',
      'A Tiger Global operates as a licensed recruitment consultancy and manpower solutions provider based in Nagpur, Maharashtra.',
      'Placement facilitation is conducted strictly within statutory labour and commercial frameworks of the State of Maharashtra and Government of India.'
    ]
  },
  {
    number: '02',
    title: 'Candidate Eligibility & Profile Integrity',
    summary: 'Rules governing candidate information accuracy and mandatory verification.',
    clauses: [
      'Candidates must be at least 18 years of age at the time of submission. Proof of age and identity is mandatory.',
      'All information provided in job applications, registration forms, and CVs must be true, accurate, and complete.',
      'Submission of false qualifications, fabricated experience, or forged identity records will result in immediate disqualification and reporting to statutory authorities.'
    ]
  },
  {
    number: '03',
    title: 'Consultancy Service Facilitation & Employment Relationship',
    summary: 'Clarification of the relationship between candidate, consultancy, and end-employer.',
    clauses: [
      'A Tiger Global acts as a career facilitation partner. While we provide curated interview opportunities with verified employer partners, final hiring decisions rest exclusively with the respective hiring company.',
      'Once placed, terms of employment, compensation schedules, working shifts, and workplace safety are governed by the respective employer company policies.',
      'Joining at the referred employer is completely free of any payment or deposit to that company.'
    ]
  },
  {
    number: '04',
    title: 'Consultancy Fee Transparency & Payment Terms',
    summary: 'Clear stipulations on consultancy fees and refund rules.',
    clauses: [
      'Total consultancy service fee for placement assistance is ₹1,000.',
      'An initial registration and verification fee of ₹500 is collected upon joining registration to cover verification, documentation, PF/ESIC coordination, and career guidance.',
      'The balance ₹500 is coordinated after completing one full month of active placement with the employer partner.',
      'In accordance with our published policy, registration and consultancy fees are strictly non-refundable once administrative processing and verification have commenced.'
    ]
  },
  {
    number: '05',
    title: 'Prohibited Activities & Conduct',
    summary: 'Standards of professionalism and behavioral expectations.',
    clauses: [
      'Candidates must maintain punctuality, professional decorum, and honesty during interviews and on-site deployments.',
      'No candidate or partner may solicit unapproved cash commissions or facilitate unauthorized monetary exchanges.',
      'Zero tolerance applies to any violation of child labour prohibitions or harassment statutes.'
    ]
  },
  {
    number: '06',
    title: 'Limitation of Liability & Indemnity',
    summary: 'Statutory limits on liability arising from third-party actions.',
    clauses: [
      'A Tiger Global is not liable for indirect, incidental, or consequential damages resulting from employer actions, workplace disputes, or unauthorized third-party claims.',
      'Candidates agree to indemnify and hold harmless A Tiger Global from claims arising from fraudulent credentials or willful misconduct by the candidate.'
    ]
  },
  {
    number: '07',
    title: 'Governing Law & Jurisdiction',
    summary: 'Applicable legal jurisdiction for disputes.',
    clauses: [
      'These Terms & Conditions are governed by and construed in accordance with the laws of India.',
      'Any legal action, claim, or dispute arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Nagpur, Maharashtra.'
    ]
  }
];

/**
 * 3. PRIVACY POLICY (Dedicated Privacy & Data Protection Content)
 */
export const PRIVACY_POLICY_CONTENT: LegalDocumentSection[] = [
  {
    number: '01',
    title: 'Information We Collect',
    summary: 'Categories of candidate and employer partner information processed by our portal.',
    clauses: [
      'Personal Identifiers: Full name, date of birth, gender, permanent address, contact telephone number, and email address.',
      'Professional Information: Educational credentials, work history, skill categories, and resume/CV attachments.',
      'Statutory & Verification Data: Identity proof numbers, verification documents, and photograph records submitted strictly for candidate joining and compliance.',
      'Technical Data: Session timestamps, device information, and interaction logs captured for security monitoring.'
    ]
  },
  {
    number: '02',
    title: 'Purpose & Use of Collected Data',
    summary: 'How collected information is utilized in recruitment operations.',
    clauses: [
      'Evaluating job seeker eligibility and matching qualifications against relevant client vacancies.',
      'Facilitating mandatory background, civil, and identity checks required prior to corporate placement.',
      'Coordinating statutory filings including ESIC healthcare enrollment and EPFO provident fund account setup.',
      'Communicating interview interview schedules, joining updates, and verified placement records.'
    ]
  },
  {
    number: '03',
    title: 'Document Security & Restricted Storage',
    summary: 'Technical and administrative safeguards protecting sensitive files.',
    clauses: [
      'Candidate documents (Aadhaar, PAN, educational certificates) are stored in secure private cloud storage buckets with strict Row-Level Security (RLS).',
      'Original physical records are never retained by the consultancy; candidates present original credentials solely for in-person visual verification.',
      'Public document views are restricted to statutory establishment metadata; sensitive personal identifiers are strictly redacted from public display.'
    ]
  },
  {
    number: '04',
    title: 'Information Sharing & Third-Party Disclosure',
    summary: 'Stipulations governing data disclosure.',
    clauses: [
      'Prospective Employers: Profile summaries and qualification records are shared with prospective employers solely for interview and placement evaluation.',
      'Statutory Authorities: Records may be disclosed when required by applicable law, court order, or statutory labour audits.',
      'Zero Data Sale: A Tiger Global does NOT sell, lease, or monetize personal candidate or client information to third-party advertisers.'
    ]
  },
  {
    number: '05',
    title: 'Candidate Rights & Retention Policy',
    summary: 'User rights regarding personal data access and retention periods.',
    clauses: [
      'Candidates may request review or correction of their contact and profile data on record by contacting our registered Nagpur office.',
      'Application and joining records are retained for statutory audit compliance periods as prescribed by Indian employment regulations.',
      'Candidates may request archival or deletion of dormant applications once statutory retention obligations expire.'
    ]
  },
  {
    number: '06',
    title: 'Grievance Redressal & Official Contact',
    summary: 'Contact channel for privacy questions or compliance concerns.',
    clauses: [
      'For data privacy inquiries or compliance notices, please contact: Compliance Officer, A Tiger Global Career Solution and Consultancy.',
      'Registered Address: Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur, Maharashtra — 440035.',
      'Official Email: atigerglobal@gmail.com | Phone: +91 8349353946'
    ]
  }
];
