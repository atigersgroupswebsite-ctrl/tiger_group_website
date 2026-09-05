import type { Job } from '../types';

export const SAMPLE_JOBS: Job[] = [
  {
    id: 'job-sec-01',
    slug: 'security-guard-nagpur',
    title: 'Facility Security Guard',
    department: 'Security & Surveillance',
    serviceCategory: 'Security Services',
    location: 'Nagpur (Butibori / Hingna)',
    state: 'Maharashtra',
    employmentType: 'Full Time',
    experienceLevel: '0 - 2 Years (Freshers Welcome)',
    openings: 25,
    salaryRange: '₹14,000 - ₹18,000 / month (Sample Demo Data)',
    overview: 'Looking for alert, disciplined security guards for industrial manufacturing plants and commercial premises in Nagpur. Free uniform and on-site duty orientation provided.',
    responsibilities: [
      'Maintain visitor logbook and monitor perimeter access points',
      'Conduct regular internal foot patrols during assigned shifts',
      'Inspect incoming materials and goods vehicle gate passes',
      'Coordinate with facility manager and report safety irregularities'
    ],
    requirements: [
      'Minimum 10th standard pass or equivalent',
      'Height: 5ft 6in minimum with sound physical fitness',
      'Valid Aadhaar card and clean police background record',
      'Discipline, punctuality, and basic regional language proficiency'
    ],
    facilitiesProvided: [
      'Subsidized Canteen Facility',
      'ESIC & PF Benefits',
      'Overtime Allowance'
    ],
    isFeatured: true,
    postedDate: 'Recently Posted'
  },
  {
    id: 'job-lab-02',
    slug: 'factory-production-helper-nagpur',
    title: 'Industrial Production Helper',
    department: 'Manufacturing & Processing',
    serviceCategory: 'Labour Supply',
    location: 'Nagpur Industrial Area',
    state: 'Maharashtra',
    employmentType: 'Full Time',
    experienceLevel: 'Fresher / Experienced',
    openings: 40,
    salaryRange: '₹13,500 - ₹16,500 / month (Sample Demo Data)',
    overview: 'Urgent requirement for dependable production helpers to support packing, material handling, and line operations in leading food & consumer goods units.',
    responsibilities: [
      'Assist machine operators with raw material feeding',
      'Pack, sort, and stack finished goods safely onto pallets',
      'Maintain cleanliness and strict hygiene standards across workstations',
      'Follow plant safety protocols and use PPE gear consistently'
    ],
    requirements: [
      '8th or 10th pass candidates eligible',
      'Willingness to work in rotational day/night shifts',
      'Reliable work ethic and teamwork capability',
      'Original KYC documents required for verification'
    ],
    facilitiesProvided: [
      'Factory Bus Transportation',
      'PF / ESIC Social Security',
      'Shift Allowance'
    ],
    isFeatured: true,
    postedDate: 'Recently Posted'
  },
  {
    id: 'job-lab-03',
    slug: 'warehouse-loading-labour-bhopal',
    title: 'Warehouse Logistics Associate',
    department: 'Logistics & Supply Chain',
    serviceCategory: 'Labour Supply',
    location: 'Bhopal / Mandideep',
    state: 'Madhya Pradesh',
    employmentType: 'Full Time',
    experienceLevel: '0 - 1 Year',
    openings: 18,
    salaryRange: '₹13,000 - ₹16,000 / month (Sample Demo Data)',
    overview: 'Dependable logistics personnel required for fast-paced distribution hubs in Mandideep industrial zone. Loading, unloading, and barcode sorting.',
    responsibilities: [
      'Unload inbound cargo trucks and verify consignment tallies',
      'Organize storage cartons into designated rack locations',
      'Assist dispatch team in scanning and staging outbound orders'
    ],
    requirements: [
      'Physical stamina for warehouse cargo handling',
      'Age between 18 and 38 years',
      'Aadhaar and Bank account documents in order'
    ],
    facilitiesProvided: [
      'PF / ESIC Registration',
      'Company Tea & Lunch Space',
      'Performance Incentives'
    ],
    isFeatured: false,
    postedDate: '3 days ago'
  },
  {
    id: 'job-sec-04',
    slug: 'security-supervisor-raipur',
    title: 'Industrial Security Supervisor',
    department: 'Security & Surveillance',
    serviceCategory: 'Security Services',
    location: 'Raipur (Urla / Siltara)',
    state: 'Chhattisgarh',
    employmentType: 'Full Time',
    experienceLevel: '2 - 4 Years',
    openings: 8,
    salaryRange: '₹18,000 - ₹23,000 / month (Sample Demo Data)',
    overview: 'Supervisory role overseeing security guard shifts, incident logs, visitor frisking protocols, and gate automation at major industrial facilities in Raipur.',
    responsibilities: [
      'Brief and deploy security guards at perimeter posts each shift',
      'Handle register audits, CCTV monitor checks, and visitor passes',
      'Conduct emergency fire drill preparedness reviews'
    ],
    requirements: [
      '12th pass or Graduate with security supervisory experience',
      'Ex-Servicemen or prior security agency background preferred',
      'Basic smartphone and report-writing skills'
    ],
    facilitiesProvided: [
      'Free Company Accommodation Support',
      'PF / ESIC Coverage',
      'Quarterly Excellence Bonus'
    ],
    isFeatured: true,
    postedDate: '5 days ago'
  },
  {
    id: 'job-plc-05',
    slug: 'quality-inspection-technician-indore',
    title: 'Quality Checking Inspector',
    department: 'Quality Assurance',
    serviceCategory: 'Job Placement',
    location: 'Indore (Pithampur)',
    state: 'Madhya Pradesh',
    employmentType: 'Full Time',
    experienceLevel: '1 - 3 Years',
    openings: 12,
    salaryRange: '₹16,000 - ₹22,000 / month (Sample Demo Data)',
    overview: 'Career placement for precision component manufacturing units. Requires dimension checking, visual quality inspection, and rejection documentation.',
    responsibilities: [
      'Inspect processed parts using vernier calipers, micrometers, and gauges',
      'Segregate non-conforming batch items and record rejection logs',
      'Coordinate with production supervisors for QA compliance'
    ],
    requirements: [
      'ITI Mechanical / Diploma or minimum 1 year machine shop experience',
      'Eye for detail and measurement tool familiarity',
      'Complete educational and address certificates'
    ],
    facilitiesProvided: [
      'Subsidized Bus Route',
      'PF, Medical Insurance & Gratuity',
      'Structured Career Growth'
    ],
    isFeatured: false,
    postedDate: '1 week ago'
  },
  {
    id: 'job-lab-06',
    slug: 'glass-processing-line-worker-bilaspur',
    title: 'Glass Fabrication Line Helper',
    department: 'Glass & Architectural Works',
    serviceCategory: 'Labour Supply',
    location: 'Bilaspur',
    state: 'Chhattisgarh',
    employmentType: 'Full Time',
    experienceLevel: 'Fresher / Experienced',
    openings: 15,
    salaryRange: '₹14,500 - ₹17,500 / month (Sample Demo Data)',
    overview: 'Handling tempered glass processing lines, edge-polishing assistance, safety packing, and factory floor logistics under expert supervision.',
    responsibilities: [
      'Handle glass sheets using specialized vacuum suction lifters and gloves',
      'Assist cutting and tempering furnace operators',
      'Wrap and cushion glass panels securely for transport crates'
    ],
    requirements: [
      'Careful and safety-conscious attitude',
      'Age 18+ with valid identity proof',
      'Willingness to learn specialized manufacturing trade'
    ],
    facilitiesProvided: [
      'Full Protective Gear & Uniform',
      'PF / ESIC Benefits',
      'Food Allowance'
    ],
    isFeatured: false,
    postedDate: '1 week ago'
  }
];
