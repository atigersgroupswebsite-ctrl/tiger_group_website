export interface PolicyRule {
  number: number;
  title: string;
  description: string;
  category: 'Documentation' | 'Operations' | 'Fee Structure' | 'Compliance' | 'Conduct';
}

export const OFFICIAL_POLICY_TERMS: PolicyRule[] = [
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
