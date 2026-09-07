// ==============================================================================
// File: src/constants/joiningPdfCoordinates.ts
// Description: Centralized PDF Coordinate & Field Mapping Specification
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Master Document: joining_form.pdf (14 Pages, A4 595 x 842 points)
// Coordinate System: Origin (0,0) is bottom-left of the page
// ==============================================================================

export interface PdfFieldCoordinate {
  pageIndex: number; // 0-indexed page in the master PDF
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
}

export interface PdfImageBoxCoordinate {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const JOINING_PDF_CONFIG = {
  pageSize: { width: 595.28, height: 841.89 }, // Standard A4 points
  defaultFontSize: 9,
  fontColor: { r: 0.05, g: 0.05, b: 0.05 }
};

export const JOINING_PDF_MAPPINGS = {
  // ---------------------------------------------------------------------------
  // PAGE 1 (Index 0): REGISTRATION / JOINING FORM & CHECKLIST
  // ---------------------------------------------------------------------------
  page1: {
    employeeName: { pageIndex: 0, x: 130, y: 728, size: 9 },
    employeeCode: { pageIndex: 0, x: 380, y: 728, size: 9 },
    dateOfJoining: { pageIndex: 0, x: 130, y: 712, size: 9 },
    department: { pageIndex: 0, x: 280, y: 712, size: 9 },
    designation: { pageIndex: 0, x: 390, y: 712, size: 9 },
    locationUnit: { pageIndex: 0, x: 130, y: 696, size: 9 },
    // Checklist Statuses
    chk_resume: { pageIndex: 0, x: 490, y: 642, size: 9 },
    chk_personal: { pageIndex: 0, x: 490, y: 627, size: 9 },
    chk_joiningReport: { pageIndex: 0, x: 490, y: 612, size: 9 },
    chk_declaration: { pageIndex: 0, x: 490, y: 597, size: 9 },
    chk_idCard: { pageIndex: 0, x: 490, y: 582, size: 9 },
    chk_appointment: { pageIndex: 0, x: 490, y: 567, size: 9 },
    chk_epfo: { pageIndex: 0, x: 490, y: 552, size: 9 },
    chk_esic: { pageIndex: 0, x: 490, y: 537, size: 9 },
    chk_womenConsent: { pageIndex: 0, x: 490, y: 522, size: 9 },
    chk_education: { pageIndex: 0, x: 490, y: 507, size: 9 },
    chk_experience: { pageIndex: 0, x: 490, y: 492, size: 9 },
    chk_idProof: { pageIndex: 0, x: 490, y: 477, size: 9 },
    chk_bankProof: { pageIndex: 0, x: 490, y: 462, size: 9 },
    chk_photos: { pageIndex: 0, x: 490, y: 447, size: 9 },
    // Candidate signature box on page 1
    signatureBox: { pageIndex: 0, x: 420, y: 220, width: 110, height: 40 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 2 (Index 1): EMPLOYEE PERSONAL INFORMATION & ADDRESSES
  // ---------------------------------------------------------------------------
  page2: {
    fullName: { pageIndex: 1, x: 140, y: 650, size: 9 },
    dateOfBirth: { pageIndex: 1, x: 380, y: 650, size: 9 },
    gender: { pageIndex: 1, x: 490, y: 650, size: 9 },
    fatherName: { pageIndex: 1, x: 140, y: 632, size: 9 },
    motherName: { pageIndex: 1, x: 140, y: 614, size: 9 },
    maritalStatus: { pageIndex: 1, x: 380, y: 614, size: 9 },
    spouseName: { pageIndex: 1, x: 140, y: 596, size: 9 },
    bloodGroup: { pageIndex: 1, x: 380, y: 596, size: 9 },
    aadhaarNumber: { pageIndex: 1, x: 140, y: 578, size: 9 },
    panNumber: { pageIndex: 1, x: 380, y: 578, size: 9 },
    contactNumber: { pageIndex: 1, x: 140, y: 560, size: 9 },
    altContactNumber: { pageIndex: 1, x: 380, y: 560, size: 9 },
    emailId: { pageIndex: 1, x: 140, y: 542, size: 9 },

    // Permanent Address
    permAddress: { pageIndex: 1, x: 140, y: 470, size: 8, maxWidth: 300 },
    permCity: { pageIndex: 1, x: 140, y: 442, size: 8 },
    permDistrict: { pageIndex: 1, x: 260, y: 442, size: 8 },
    permState: { pageIndex: 1, x: 380, y: 442, size: 8 },
    permPin: { pageIndex: 1, x: 480, y: 442, size: 8 },

    // Current Address
    currAddress: { pageIndex: 1, x: 140, y: 395, size: 8, maxWidth: 300 },
    currCity: { pageIndex: 1, x: 140, y: 368, size: 8 },
    currDistrict: { pageIndex: 1, x: 260, y: 368, size: 8 },
    currState: { pageIndex: 1, x: 380, y: 368, size: 8 },
    currPin: { pageIndex: 1, x: 480, y: 368, size: 8 },

    // Emergency Contact
    emerName: { pageIndex: 1, x: 80, y: 280, size: 8 },
    emerRelation: { pageIndex: 1, x: 210, y: 280, size: 8 },
    emerPhone: { pageIndex: 1, x: 320, y: 280, size: 8 },
    emerAddress: { pageIndex: 1, x: 420, y: 280, size: 7, maxWidth: 140 }
  },

  // ---------------------------------------------------------------------------
  // PAGE 3 (Index 2): BANK DETAILS, EDUCATION & FAMILY
  // ---------------------------------------------------------------------------
  page3: {
    accountHolderName: { pageIndex: 2, x: 140, y: 648, size: 9 },
    bankName: { pageIndex: 2, x: 380, y: 648, size: 9 },
    accountNumber: { pageIndex: 2, x: 140, y: 630, size: 9 },
    ifscCode: { pageIndex: 2, x: 380, y: 630, size: 9 },
    branchName: { pageIndex: 2, x: 140, y: 612, size: 9 },

    // Education Table Rows (up to 3 mapped onto page 3)
    eduRowY: [530, 510, 490],
    eduCols: {
      qualification: 70,
      board: 180,
      year: 340,
      grade: 430
    },

    // Family Table Rows (up to 3 mapped onto page 3)
    famRowY: [380, 360, 340],
    famCols: {
      name: 70,
      relation: 240,
      ageOrDob: 410
    }
  },

  // ---------------------------------------------------------------------------
  // PAGE 4 (Index 3): IDENTITY CARD
  // ---------------------------------------------------------------------------
  page4: {
    employeeName: { pageIndex: 3, x: 180, y: 630, size: 10 },
    employeeCode: { pageIndex: 3, x: 180, y: 608, size: 9 },
    designation: { pageIndex: 3, x: 180, y: 586, size: 9 },
    department: { pageIndex: 3, x: 180, y: 564, size: 9 },
    location: { pageIndex: 3, x: 180, y: 542, size: 9 },
    emerName: { pageIndex: 3, x: 180, y: 505, size: 8 },
    emerPhone: { pageIndex: 3, x: 180, y: 485, size: 8 },
    emerRelation: { pageIndex: 3, x: 380, y: 485, size: 8 },
    bloodGroup: { pageIndex: 3, x: 180, y: 450, size: 9 },
    date: { pageIndex: 3, x: 380, y: 450, size: 9 },

    // Photo Box & Signature Box on ID Card
    photoBox: { pageIndex: 3, x: 425, y: 540, width: 95, height: 120 } as PdfImageBoxCoordinate,
    signatureBox: { pageIndex: 3, x: 110, y: 375, width: 120, height: 40 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 5 (Index 4): JOINING REPORT
  // ---------------------------------------------------------------------------
  page5: {
    reportDate: { pageIndex: 4, x: 320, y: 685, size: 9 },
    location: { pageIndex: 4, x: 180, y: 652, size: 9 },
    fullName: { pageIndex: 4, x: 180, y: 630, size: 9 },
    fatherName: { pageIndex: 4, x: 380, y: 630, size: 9 },
    dob: { pageIndex: 4, x: 180, y: 608, size: 9 },
    department: { pageIndex: 4, x: 380, y: 608, size: 9 },
    designation: { pageIndex: 4, x: 180, y: 586, size: 9 },
    panNumber: { pageIndex: 4, x: 180, y: 542, size: 9 },
    aadhaarNumber: { pageIndex: 4, x: 380, y: 542, size: 9 },
    bloodGroup: { pageIndex: 4, x: 180, y: 520, size: 9 },
    bankName: { pageIndex: 4, x: 180, y: 498, size: 9 },
    branchName: { pageIndex: 4, x: 380, y: 498, size: 9 },
    ifscCode: { pageIndex: 4, x: 180, y: 476, size: 9 },
    accountNumber: { pageIndex: 4, x: 380, y: 476, size: 9 },
    address: { pageIndex: 4, x: 180, y: 454, size: 8, maxWidth: 360 },
    mobile: { pageIndex: 4, x: 180, y: 432, size: 9 },
    signatureBox: { pageIndex: 4, x: 380, y: 320, width: 130, height: 45 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 6 (Index 5): WOMEN WORKER NIGHT SHIFT CONSENT (CONDITIONAL)
  // ---------------------------------------------------------------------------
  page6: {
    candidateName: { pageIndex: 5, x: 140, y: 672, size: 9 },
    address: { pageIndex: 5, x: 300, y: 672, size: 8, maxWidth: 220 },
    companyName: { pageIndex: 5, x: 140, y: 654, size: 8 },
    designation: { pageIndex: 5, x: 380, y: 654, size: 8 },
    place: { pageIndex: 5, x: 90, y: 442, size: 9 },
    date: { pageIndex: 5, x: 90, y: 424, size: 9 },
    signatureBox: { pageIndex: 5, x: 380, y: 420, width: 130, height: 45 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 7 (Index 6): SELF DECLARATION (RELIEVING / DUAL EMPLOYMENT)
  // ---------------------------------------------------------------------------
  page7: {
    previousEmployer: { pageIndex: 6, x: 260, y: 670, size: 8 },
    lastWorkingDate: { pageIndex: 6, x: 240, y: 635, size: 8 },
    candidateName: { pageIndex: 6, x: 120, y: 460, size: 9 },
    declarationDate: { pageIndex: 6, x: 120, y: 425, size: 9 },
    signatureBox: { pageIndex: 6, x: 120, y: 440, width: 120, height: 40 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 8 (Index 7): DECLARATION (EMPLOYMENT OF RELATIVES)
  // ---------------------------------------------------------------------------
  page8: {
    candidateName: { pageIndex: 7, x: 120, y: 550, size: 9 },
    designation: { pageIndex: 7, x: 340, y: 550, size: 9 },
    relativeOptionText: { pageIndex: 7, x: 80, y: 505, size: 8, maxWidth: 430 },
    signatoryName: { pageIndex: 7, x: 100, y: 395, size: 9 },
    declarationDate: { pageIndex: 7, x: 100, y: 360, size: 9 },
    signatureBox: { pageIndex: 7, x: 360, y: 370, width: 120, height: 40 } as PdfImageBoxCoordinate
  },

  // ---------------------------------------------------------------------------
  // PAGE 12 (Index 11): CONDUCT & DISCIPLINE ACCEPTANCE
  // ---------------------------------------------------------------------------
  page12: {
    employeeName: { pageIndex: 11, x: 120, y: 320, size: 9 },
    date: { pageIndex: 11, x: 280, y: 320, size: 9 },
    signatureBox: { pageIndex: 11, x: 400, y: 305, width: 120, height: 40 } as PdfImageBoxCoordinate
  }
};
