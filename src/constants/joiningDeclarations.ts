// ==============================================================================
// File: src/constants/joiningDeclarations.ts
// Description: Authentic Canonical Text for Employee Joining Undertakings & Declarations
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Source:
//   - src/components/joining/DeclarationSection.tsx
//   - src/components/joining/JoiningFormPrintPreview.tsx
//   - src/services/joiningPdfGenerator.ts
// Rules:
//   - Preserves original verbatim wording without synthetic replacements
// ==============================================================================

export interface StatutoryUndertakingItem {
  id: string;
  number: number;
  title: string;
  content: string;
}

/**
 * Formal Joining Report Undertaking
 * Source: JoiningFormPrintPreview.tsx (Page 4) & joiningPdfGenerator.ts (Page 4)
 */
export const FORMAL_JOINING_UNDERTAKING = {
  title: 'JOINING REPORT (FORMAL UNDERTAKING)',
  proclamation: (joiningDate: string) =>
    `I hereby join my duties from today, dated ${joiningDate || 'the date of record'}, under A TIGER GLOBAL Career Solution & Consultancy. I undertake to abide by all the rules, regulations, statutory policies, standing orders and guidelines of A TIGER GLOBAL and the designated client establishment.`,
  terms: [
    'I report for duty in accordance with the Offer Letter / Reference Slip issued to me.',
    'I shall maintain highest standards of workplace discipline, industrial safety, punctuality, and professionalism.',
    'I agree to execute all tasks and operational shifts assigned to me by the authorized unit supervisor.'
  ]
};

/**
 * Statutory Undertakings & Code of Conduct (6 Items)
 * Source: DeclarationSection.tsx & joiningPdfGenerator.ts
 */
export const STATUTORY_UNDERTAKINGS: StatutoryUndertakingItem[] = [
  {
    id: 'truth-and-accuracy',
    number: 1,
    title: 'Truth & Accuracy Undertaking',
    content:
      'I hereby declare that all particulars stated in this digital joining dossier, including demographic details, permanent address, bank accounts, academic qualifications, and family dependents, are true, correct, and complete to the best of my knowledge and belief.'
  },
  {
    id: 'workplace-safety-and-conduct',
    number: 2,
    title: 'Workplace Guidelines & Safety Protocols',
    content:
      'I agree to abide by the workplace regulations, shift timings, industrial safety measures, hygiene requirements, and disciplinary codes enforced by the placement enterprise and A TIGER GLOBAL.'
  },
  {
    id: 'statutory-kyc-consent',
    number: 3,
    title: 'Statutory KYC & Verification Consent',
    content:
      'I authorize A TIGER GLOBAL Career Solution & Consultancy and my employer to verify my identity documents, address credentials, civil background records, and police verifications as required under statutory employment law.'
  },
  {
    id: 'self-declaration-dual-employment',
    number: 4,
    title: 'Self Declaration Regarding Dual Employment & Relieving Formalities',
    content:
      'This is to certify that prior to joining, I have completed all necessary relieving formalities with any previous employers. To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities (legal, financial, professional, or personal) which I have with any previous employer, if any. I agree to submit formal relieving records if requested by the HR department. I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action by the company, including termination of service.'
  },
  {
    id: 'relative-employment-declaration',
    number: 5,
    title: 'Declaration Regarding Employment of Relatives',
    content:
      "As per Internal Policy, the Organization does not encourage employment of 'relatives' to prevent favoritism, conflicts of interest, and scheduling issues. The term 'relatives' includes mother, father, husband, wife, son, daughter, sister, brother, in-laws, stepchildren, aunt, uncle, nephew, niece, or cousin. I confirm that I am not directly or distantly related to any employee in the Organization, except as formally disclosed in writing."
  },
  {
    id: 'confidentiality-and-integrity',
    number: 6,
    title: 'Confidentiality, Non-Disclosure & Asset Protection Undertaking',
    content:
      '1. Non-Disclosure: Confidential enterprise data, trade secrets, and client records must not be disclosed. 2. Return of Assets: All equipment, documents, ID cards, and access passes remain company property. 3. Continuing Obligation: Confidentiality obligations survive any cessation of employment.'
  }
];

/**
 * Master Attestation Statement
 * Source: DeclarationSection.tsx (Lines 450-485) & joiningPdfGenerator.ts (Page 14)
 */
export const MASTER_ATTESTATION = {
  title: 'MASTER SUBMISSION ATTESTATION & SIGNATURE',
  statement:
    'I, the undersigned joining employee, solemnly affirm that the information furnished by me in this Joining Form and accompanying annexures is true, correct, and legally binding. I accept that any willful misrepresentation, concealment, or falsification shall render me liable to disciplinary and statutory termination of service without notice.',
  declarationAcknowledgeNote:
    'I have read, understood, and accept all the terms, statutory undertakings, code of conduct, and policies of A TIGER GLOBAL Career Solution & Consultancy.'
};
