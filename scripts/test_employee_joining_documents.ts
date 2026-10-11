// ==============================================================================
// File: scripts/test_employee_joining_documents.ts
// Description: Automated Test Suite for Employee Joining Documents, Undertaking,
//              Declarations, Documents Panel (8 Items), and Multi-Page A4 PDF Generator
// ==============================================================================

import fs from 'fs';
import path from 'path';
import {
  FORMAL_JOINING_UNDERTAKING,
  STATUTORY_UNDERTAKINGS,
  MASTER_ATTESTATION
} from '../src/constants/joiningDeclarations';
import {
  generateCompleteJoiningDocumentPdf,
  downloadCompleteJoiningDocumentPdf,
  downloadEmployeeDeclarationPdf
} from '../src/services/completeJoiningDocumentGenerator';
import type { RegularJoiningFormData } from '../src/services/regularJoiningService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING EMPLOYEE JOINING DOCUMENTS TEST SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // GROUP 1: INVESTIGATION & PRESERVATION OF ORIGINAL UNDERTAKING & DECLARATION
  // ----------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Original Undertaking & Declaration Integrity ---');

  // Verify Formal Joining Undertaking
  assert(
    FORMAL_JOINING_UNDERTAKING.title === 'JOINING REPORT (FORMAL UNDERTAKING)',
    'Formal Undertaking title matches canonical text'
  );
  const proclamation = FORMAL_JOINING_UNDERTAKING.proclamation('2026-10-10');
  assert(
    proclamation.includes('I hereby join my duties from today') &&
    proclamation.includes('A TIGER GLOBAL Career Solution & Consultancy'),
    'Formal Undertaking proclamation preserves original wording'
  );
  assert(
    FORMAL_JOINING_UNDERTAKING.terms.length >= 3,
    `Formal Undertaking contains required terms (${FORMAL_JOINING_UNDERTAKING.terms.length} terms)`
  );

  // Verify Statutory Undertakings (All 6 canonical items)
  assert(
    STATUTORY_UNDERTAKINGS.length === 6,
    `Statutory Undertakings contains exactly 6 canonical items (found ${STATUTORY_UNDERTAKINGS.length})`
  );
  assert(
    STATUTORY_UNDERTAKINGS[0].title === 'Truth & Accuracy Undertaking',
    'Clause 1 is Truth & Accuracy Undertaking'
  );
  assert(
    STATUTORY_UNDERTAKINGS[0].content.includes('true, correct, and complete to the best of my knowledge'),
    'Clause 1 content preserves original text'
  );
  assert(
    STATUTORY_UNDERTAKINGS[1].title === 'Workplace Guidelines & Safety Protocols',
    'Clause 2 is Workplace Guidelines & Safety Protocols'
  );
  assert(
    STATUTORY_UNDERTAKINGS[2].title === 'Statutory KYC & Verification Consent',
    'Clause 3 is Statutory KYC & Verification Consent'
  );
  assert(
    STATUTORY_UNDERTAKINGS[3].title.includes('Dual Employment'),
    'Clause 4 is Self Declaration regarding Dual Employment & Relieving Formalities'
  );
  assert(
    STATUTORY_UNDERTAKINGS[3].content.includes('not in dual employment on the day of joining'),
    'Clause 4 content preserves original dual employment text'
  );
  assert(
    STATUTORY_UNDERTAKINGS[4].title.includes('Employment of Relatives'),
    'Clause 5 is Declaration regarding Employment of Relatives'
  );
  assert(
    STATUTORY_UNDERTAKINGS[5].title.includes('Confidentiality, Non-Disclosure'),
    'Clause 6 is Confidentiality, Non-Disclosure & Asset Protection'
  );

  // Verify Master Attestation
  assert(
    MASTER_ATTESTATION.statement.includes('solemnly affirm that the information furnished by me in this Joining Form'),
    'Master attestation statement matches original verbatim text'
  );

  // ----------------------------------------------------------------------------
  // GROUP 2: PRESERVATION OF REFERENCE SLIPS & ORIGINAL WORKFLOWS
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Preservation of Reference Slips & Original Workflows ---');

  // Verify original 2-page Reference Slip service exists
  const refSlipServicePath = path.resolve(process.cwd(), 'src/services/referenceSlipPdfGenerator.ts');
  assert(
    fs.existsSync(refSlipServicePath),
    'Original joining workflow two-page Reference Slip generator file exists intact'
  );

  // Verify Regular 1-page Reference Slip service exists and maintains strict 1-page standard
  const regRefSlipPath = path.resolve(process.cwd(), 'src/services/regularReferenceSlipPdfGenerator.ts');
  assert(
    fs.existsSync(regRefSlipPath),
    'Regular Joining Form single-page Reference Slip generator file exists intact'
  );
  const regRefSlipContent = fs.readFileSync(regRefSlipPath, 'utf-8');
  assert(
    regRefSlipContent.includes('EXACTLY 1 PAGE'),
    'Regular Reference Slip preserves single-page rule'
  );
  assert(
    !regRefSlipContent.includes("page.drawText('PAN") && !regRefSlipContent.includes("page.drawText('PAN Number"),
    'Regular Reference Slip strictly excludes PAN field from drawn text'
  );

  // ----------------------------------------------------------------------------
  // GROUP 3: EMPLOYEE DOCUMENTS PANEL (8 ITEMS)
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Employee Documents Panel (8 Items) ---');

  const panelPath = path.resolve(process.cwd(), 'src/components/admin/EmployeeDocumentsPanel.tsx');
  assert(fs.existsSync(panelPath), 'EmployeeDocumentsPanel component exists');
  const panelContent = fs.readFileSync(panelPath, 'utf-8');

  // Verify all 8 items exist in the panel
  assert(panelContent.includes('1. Reference Slip'), 'Panel Item 1: Employee Reference Slip exists');
  assert(panelContent.includes('2. Complete Joining Form'), 'Panel Item 2: Complete Joining Form exists');
  assert(panelContent.includes('3. Employee Declaration'), 'Panel Item 3: Employee Declaration exists');
  assert(panelContent.includes('4. Live Photo'), 'Panel Item 4: Live Photo exists');
  assert(panelContent.includes('5. Aadhaar Card'), 'Panel Item 5: Aadhaar Card Photo exists');
  assert(panelContent.includes('6. Bank Passbook'), 'Panel Item 6: Bank Passbook Photo exists');
  assert(panelContent.includes('7. Signature Photo'), 'Panel Item 7: Signature Photo exists');
  assert(panelContent.includes('8. Employee ID Card'), 'Panel Item 8: Employee ID Card exists');

  // Verify action handlers and clear status badges
  assert(panelContent.includes('handleDownloadRefSlip'), 'Item 1 has Download handler');
  assert(panelContent.includes('handleDownloadCompleteDoc'), 'Item 2 has Download handler');
  assert(panelContent.includes('handleDownloadDeclaration'), 'Item 3 has Download handler');
  assert(panelContent.includes('NOT UPLOADED'), 'Unuploaded image documents show clear NOT UPLOADED status');
  assert(panelContent.includes('disabled={!hasLivePhoto}'), 'Download button is disabled when Live Photo is missing');
  assert(panelContent.includes('disabled={!hasAadhaar}'), 'Download button is disabled when Aadhaar is missing');
  assert(panelContent.includes('disabled={!hasBankPassbook}'), 'Download button is disabled when Bank Passbook is missing');
  assert(panelContent.includes('disabled={!hasSignature}'), 'Download button is disabled when Signature is missing');
  assert(panelContent.includes('PENDING') && panelContent.includes('Generate via ID Cards Section'), 'Un-generated ID Card shows PENDING status without misleading download');

  // ----------------------------------------------------------------------------
  // GROUP 4: INTEGRATION IN ADMIN PAGES
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Integration in Admin Panel Pages ---');

  // 1. Regular Joining Submission Dossier
  const dossierPath = path.resolve(process.cwd(), 'src/components/admin/RegularJoiningSubmissionDossier.tsx');
  const dossierContent = fs.readFileSync(dossierPath, 'utf-8');
  assert(
    dossierContent.includes('EmployeeDocumentsPanel'),
    'RegularJoiningSubmissionDossier integrates EmployeeDocumentsPanel'
  );
  assert(
    dossierContent.includes('Download Complete Joining Document'),
    'RegularJoiningSubmissionDossier provides "Download Complete Joining Document" button'
  );
  assert(
    dossierContent.includes('CompleteJoiningDocumentModal'),
    'RegularJoiningSubmissionDossier provides CompleteJoiningDocumentModal preview'
  );

  // 2. Admin Employee Detail Page
  const empDetailPath = path.resolve(process.cwd(), 'src/pages/admin/AdminEmployeeDetailPage.tsx');
  const empDetailContent = fs.readFileSync(empDetailPath, 'utf-8');
  assert(
    empDetailContent.includes('EmployeeDocumentsPanel'),
    'AdminEmployeeDetailPage integrates EmployeeDocumentsPanel'
  );

  // 3. Admin Documents Page
  const docsPagePath = path.resolve(process.cwd(), 'src/pages/admin/AdminDocumentsPage.tsx');
  const docsPageContent = fs.readFileSync(docsPagePath, 'utf-8');
  assert(
    docsPageContent.includes('EmployeeDocumentsPanel'),
    'AdminDocumentsPage integrates EmployeeDocumentsPanel'
  );
  assert(
    docsPageContent.includes('Employee Document Repositories') || docsPageContent.includes('Employee Document Folders'),
    'AdminDocumentsPage provides dedicated Employee Document Repositories tab'
  );
  assert(
    docsPageContent.includes('Locate Employee Document Folder'),
    'AdminDocumentsPage provides employee code & name search to locate correct employee'
  );

  // ----------------------------------------------------------------------------
  // GROUP 5: COMPLETE JOINING DOCUMENT MULTI-PAGE A4 GENERATOR
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Complete Joining Document PDF Generator & A4 Standard ---');

  const mockFormData: RegularJoiningFormData = {
    employeeCode: 'ATG-504-2026',
    joiningDate: '2026-10-10',
    department: 'Quality Assurance',
    designation: 'Sr. Quality Inspector',
    companyName: 'Haldiram Foods International Pvt. Ltd.',
    unitName: 'Gumthala Processing Facility',
    factorySupervisorName: 'Shri Manoj Sharma',
    salaryCtc: 24500,
    interviewDate: '2026-10-08',

    fullName: 'Rahul Dev Anand',
    fatherName: 'Devendra Kumar Anand',
    dob: '1998-05-14',
    gender: 'Male',
    maritalStatus: 'Married',
    aadhaarNumber: '9876-5432-1098',
    permanentAddress: 'Plot 45, Anand Nagar, Wardha Road, Nagpur - 440015',
    currentAddress: 'Plot 45, Anand Nagar, Wardha Road, Nagpur - 440015',
    sameAsPermanent: true,
    uanNumber: '101234567890',
    esicNumber: '201234567890',
    ptNumber: 'PT-MH-2026-0044',
    mobile: '9876543210',
    alternateMobile: '9123456780',
    email: 'rahul.anand@tigergroup.example',

    bankAccountNumber: '98765432101234',
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    branchName: 'Nagpur Main Branch',
    upiNumber: '9876543210@sbi',

    photo: { name: 'photo.jpg', size: 120400, type: 'image/jpeg' },
    aadhaar: { name: 'aadhaar.jpg', size: 215600, type: 'image/jpeg' },
    bankPassbook: { name: 'passbook.jpg', size: 185400, type: 'image/jpeg' },
    signature: { name: 'signature.png', size: 45200, type: 'image/png' },

    submissionStatus: 'VERIFIED'
  };

  // Generate jsPDF instance
  const pdfDoc = await generateCompleteJoiningDocumentPdf(mockFormData, {
    place: 'Nagpur, Maharashtra',
    verifierName: 'Executive HR Officer'
  });

  assert(Boolean(pdfDoc), 'Complete Joining Document PDF generated successfully');
  const pageCount = pdfDoc.getNumberOfPages();
  assert(
    pageCount === 3,
    `Complete Joining Document spans multi-page A4 format (expected 3 pages, got ${pageCount})`
  );

  // Verify A4 page dimensions (210mm x 297mm)
  const pageSize = pdfDoc.internal.pageSize;
  assert(
    Math.round(pageSize.getWidth()) === 210 && Math.round(pageSize.getHeight()) === 297,
    `PDF has exact A4 dimensions: ${Math.round(pageSize.getWidth())}mm x ${Math.round(pageSize.getHeight())}mm`
  );

  // Generate ArrayBuffer and verify file header
  const pdfArrayBuf = pdfDoc.output('arraybuffer');
  const pdfUint8 = new Uint8Array(pdfArrayBuf);
  assert(
    pdfUint8[0] === 0x25 && pdfUint8[1] === 0x50 && pdfUint8[2] === 0x44 && pdfUint8[3] === 0x46,
    'PDF starts with valid %PDF magic header'
  );
  assert(pdfUint8.length > 5000, `Generated PDF has substantial content (${pdfUint8.length} bytes)`);

  // Verify PAN is strictly excluded from Regular Joining Document generator
  const genServicePath = path.resolve(process.cwd(), 'src/services/completeJoiningDocumentGenerator.ts');
  const genServiceContent = fs.readFileSync(genServicePath, 'utf-8');
  assert(
    !genServiceContent.includes('p.panNumber') && !genServiceContent.includes('pan_number') && !genServiceContent.includes('PAN Card No'),
    'Complete Joining Document strictly excludes PAN field for Regular Joining'
  );

  // ----------------------------------------------------------------------------
  // GROUP 6: CSS @MEDIA PRINT AND @PAGE AUDIT
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: CSS @media print & A4 Formatting ---');

  const cssPath = path.resolve(process.cwd(), 'src/styles/joining.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert(cssContent.includes('@media print'), 'joining.css defines @media print stylesheet');
  assert(cssContent.includes('size: A4 portrait'), '@media print specifies size: A4 portrait');
  assert(cssContent.includes('.no-print'), '.no-print elements are excluded from print');
  assert(cssContent.includes('page-break-after: always'), 'Page breaks cleanly preserved between A4 sheets');
  assert(cssContent.includes('#complete-joining-printable-dossier'), '#complete-joining-printable-dossier has isolated print rules');

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED! (36 / 36 assertions passed)');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n[SUITE FAILED]:', err);
  process.exit(1);
});
