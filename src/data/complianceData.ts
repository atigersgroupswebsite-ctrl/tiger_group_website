import type { RegistrationItem } from '../types/compliance';

export const REGISTRATION_ITEMS: RegistrationItem[] = [
  {
    id: 'establishment',
    cardNumber: 1,
    title: 'Establishment Registration',
    authority: 'Maharashtra Labour Department',
    description: 'Registered establishment under the applicable Maharashtra establishments framework.',
    documentType: 'Establishment Registration Certificate',
    registrationReference: 'Registration on Record (Verified)',
    jurisdiction: 'Nagpur, Maharashtra',
    legalScope: 'Identifies the consultancy and labour contractor nature of the establishment.',
    issueDate: 'On Record',
    validityStatus: 'Active'
  },
  {
    id: 'gst',
    cardNumber: 2,
    title: 'GST Registration',
    authority: 'Government of India / GST',
    description: 'GST registration certificate for A Tiger Global Career Solution & Consultancy.',
    documentType: 'Goods and Services Tax (GST) Registration Certificate',
    registrationReference: 'GSTIN: 27••••••••••• (Masked for Privacy)',
    jurisdiction: 'Maharashtra, India',
    legalScope: 'Identifies the proprietorship and principal place of business.',
    issueDate: 'On Record',
    validityStatus: 'Active & Registered'
  },
  {
    id: 'epfo',
    cardNumber: 3,
    title: 'EPFO Registration',
    authority: "Employees' Provident Fund Organisation",
    description: 'Provident Fund establishment registration.',
    documentType: 'EPFO Establishment Registration',
    registrationReference: 'PF Establishment Code on Record',
    jurisdiction: 'Ministry of Labour & Employment, Govt. of India',
    legalScope: 'Provides the PF establishment code for statutory employee provident fund coordination.',
    issueDate: 'On Record',
    validityStatus: 'Active'
  },
  {
    id: 'esic',
    cardNumber: 4,
    title: 'ESIC Registration',
    authority: "Employees' State Insurance Corporation",
    description: 'ESIC establishment registration.',
    documentType: 'ESIC Employer Registration',
    registrationReference: 'ESIC Code on Record',
    jurisdiction: 'Ministry of Labour & Employment, Govt. of India',
    legalScope: 'Provides the ESIC code for statutory employee social security and healthcare coverage.',
    issueDate: 'On Record',
    validityStatus: 'Active'
  },
  {
    id: 'udyam',
    cardNumber: 5,
    title: 'Udyam Registration',
    authority: 'Ministry of Micro, Small & Medium Enterprises',
    description: 'Udyam registration identifying the enterprise as a Micro enterprise.',
    documentType: 'Udyam Registration Certificate',
    registrationReference: 'UDYAM-MH-••••••• (Masked for Privacy)',
    jurisdiction: 'Government of India',
    legalScope: 'Identifies the enterprise as Micro and lists employment-related activities.',
    issueDate: 'On Record',
    validityStatus: 'Active'
  },
  {
    id: 'profession-tax',
    cardNumber: 6,
    title: 'Profession Tax Registration',
    authority: 'Maharashtra State Tax Department',
    description: 'Registration relating to the employer/business activity recorded as manpower providers / labour contractors.',
    documentType: 'Profession Tax Certificate (PTEC / PTRC)',
    registrationReference: 'Enrolment Reference on Record',
    jurisdiction: 'Government of Maharashtra',
    legalScope: 'Records manpower providers / labour contractors as the registered business activity.',
    issueDate: 'On Record',
    validityStatus: 'Active'
  }
];
