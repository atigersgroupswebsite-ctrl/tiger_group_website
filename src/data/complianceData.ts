import type { RegistrationItem } from '../types/compliance';

export const REGISTRATION_ITEMS: RegistrationItem[] = [
  {
    id: 'establishment',
    cardNumber: 1,
    title: 'Establishment Registration',
    authority: 'Maharashtra Labour Department',
    entityLabel: 'Establishment Name',
    entityName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
    referenceLabel: 'Registration Number',
    registrationReference: '106157392603',
    businessActivity: 'Recruitment Consultancy & Labour Contractor',
    description: 'Registered establishment under the applicable Maharashtra establishments framework.',
    documentType: 'Establishment Registration Certificate',
    jurisdiction: 'Nagpur, Maharashtra',
    legalScope: 'Identifies the consultancy and labour contractor nature of the establishment.',
    issueDate: 'On Record',
    validityStatus: 'Active',
    pages: [
      '/assets/certificates/establishment-page-1.webp',
      '/assets/certificates/establishment-page-2.webp',
      '/assets/certificates/establishment-page-3.webp'
    ]
  },
  {
    id: 'gst',
    cardNumber: 2,
    title: 'GST Registration',
    authority: 'Government of India / GST',
    entityLabel: 'Registered Trade Name',
    entityName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
    referenceLabel: 'Statutory Status',
    registrationReference: 'Registration on Record (Verified)',
    businessActivity: 'Career Solutions, Recruitment & Placement Services',
    description: 'GST registration certificate on record for A Tiger Global Career Solution & Consultancy.',
    documentType: 'Goods and Services Tax (GST) Registration',
    jurisdiction: 'Maharashtra, India',
    legalScope: 'Identifies the registered trade name and principal place of business.',
    issueDate: 'On Record',
    validityStatus: 'Active & Registered',
    pages: [
      '/assets/certificates/gst-page-1.webp',
      '/assets/certificates/gst-page-2.webp',
      '/assets/certificates/gst-page-3.webp'
    ]
  },
  {
    id: 'epfo',
    cardNumber: 3,
    title: 'EPFO Registration',
    authority: "Employees' Provident Fund Organisation",
    entityLabel: 'Establishment',
    entityName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
    referenceLabel: 'EPFO Establishment Code',
    registrationReference: 'NGNAG4054681000',
    businessActivity: 'Statutory Employee Provident Fund Administration',
    description: 'Provident Fund establishment registration for statutory employee social security coordination.',
    documentType: 'EPFO Establishment Registration',
    jurisdiction: 'Ministry of Labour & Employment, Govt. of India',
    legalScope: 'Provides the PF establishment code for statutory employee provident fund coordination.',
    issueDate: 'On Record',
    validityStatus: 'Active',
    pages: [
      '/assets/certificates/epfo-page-1.webp',
      '/assets/certificates/epfo-page-2.webp'
    ]
  },
  {
    id: 'esic',
    cardNumber: 4,
    title: 'ESIC Registration',
    authority: "Employees' State Insurance Corporation",
    entityLabel: 'Establishment',
    entityName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
    referenceLabel: 'ESIC Code',
    registrationReference: '23000481530000999',
    businessActivity: 'Employee Healthcare & Social Security',
    description: 'ESIC establishment registration providing statutory health insurance and social security coverage.',
    documentType: 'ESIC Employer Registration',
    jurisdiction: 'Ministry of Labour & Employment, Govt. of India',
    legalScope: 'Provides the ESIC code for statutory employee social security and healthcare coverage.',
    issueDate: 'On Record',
    validityStatus: 'Active',
    pages: [
      '/assets/certificates/esic-page-1.webp',
      '/assets/certificates/esic-page-2.webp'
    ]
  },
  {
    id: 'udyam',
    cardNumber: 5,
    title: 'Udyam Registration',
    authority: 'Ministry of Micro, Small & Medium Enterprises',
    entityLabel: 'Enterprise',
    entityName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
    referenceLabel: 'Udyam Registration Number',
    registrationReference: 'UDYAM-MH-20-0354166',
    businessActivity: 'Micro Enterprise — Employment Placement & Manpower Supply',
    description: 'Udyam registration identifying the enterprise as a Micro enterprise in employment services.',
    documentType: 'Udyam Registration Certificate',
    jurisdiction: 'Government of India',
    legalScope: 'Identifies the enterprise as Micro and lists employment-related activities.',
    issueDate: 'On Record',
    validityStatus: 'Active',
    pages: [
      '/assets/certificates/udyam-page-1.webp',
      '/assets/certificates/udyam-page-2.webp'
    ]
  },
  {
    id: 'profession-tax',
    cardNumber: 6,
    title: 'Profession Tax Registration',
    authority: 'Maharashtra State Tax Department',
    entityLabel: 'Employer',
    entityName: 'GHANSHYAM AHARWAR',
    referenceLabel: 'Profession Tax Registration Certificate Number',
    registrationReference: '27203196559P',
    businessActivity: 'Manpower Providers / Labour Contractors',
    description: 'Registration relating to the employer/business activity recorded as manpower providers / labour contractors.',
    documentType: 'Profession Tax Certificate (PTRC)',
    jurisdiction: 'Government of Maharashtra',
    legalScope: 'Records manpower providers / labour contractors as the registered business activity.',
    issueDate: 'On Record',
    validityStatus: 'Active',
    pages: [
      '/assets/certificates/profession-tax-page-1.webp'
    ]
  }
];
