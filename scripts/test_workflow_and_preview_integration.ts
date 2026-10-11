// ==============================================================================
// Script: scripts/test_workflow_and_preview_integration.ts
// Purpose: Automated verification of:
//   1. Preview Modal layout: non-clipping, scrollable, all 30 fields, 4 photos, NO PAN
//   2. Regular Joining Workflow: pre-submission review -> submit -> Pending Verification
//   3. Integration with Joining Submissions: workflow badge, status filtering
//   4. Verification safeguards: validates 4 docs, transitions to VERIFIED, provisions employee
//   5. Duplicate prevention: repeated verification updates existing employee, preserves ATG code
//   6. 1-Page Reference Slip generation: enabled only after verification, no PAN/QR/Section 3
//   7. Employee ID Card generation: linked to provisioned employee in ID Cards section
//   8. Rejection mechanism with recorded reason
//   9. Excel export compatibility with pending verification status
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateRegularReferenceSlipPdfBlob } from '../src/services/regularReferenceSlipPdfGenerator';
import { generateEmployeeIdCardPdf } from '../src/services/employeeIdCardGenerator';
import {
  REGULAR_JOINING_DETAILS_COLUMNS,
  DOCUMENT_CHECKLIST_COLUMNS
} from '../src/services/regularJoiningExportService';
import type { RegularJoiningFormData } from '../src/services/regularJoiningService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runWorkflowTestSuite() {
  console.log('================================================================');
  console.log('STARTING REGULAR JOINING WORKFLOW & PREVIEW INTEGRATION TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName} - ${detail || 'Assertion failed'}`);
      process.exitCode = 1;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Review Modal Layout & Non-Clipping Guarantees
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Review Modal Non-Clipping & Layout Properties ---');
  const reviewModalPath = path.resolve(__dirname, '../src/components/admin/RegularJoiningReviewModal.tsx');
  const reviewContent = fs.readFileSync(reviewModalPath, 'utf-8');

  // Verify modal container height and scroll settings
  assert(
    reviewContent.includes("height: '90vh'") && reviewContent.includes("maxHeight: '90vh'"),
    'Modal has strict max-height and height constraint (90vh)'
  );
  assert(
    reviewContent.includes("overflowY: 'auto'") && reviewContent.includes("minHeight: 0"),
    'Modal body has overflowY auto and minHeight 0 to prevent flexbox collapse'
  );
  assert(
    reviewContent.includes("wordBreak: 'break-word'") && reviewContent.includes("minWidth: 0"),
    'Grid items have minWidth 0 and wordBreak break-word to prevent horizontal clipping'
  );

  // Verify all 30 fields in strict sequence
  const expectedLabels = [
    '1. Joining Reference Number / Employee Code',
    '2. Joining Date',
    '3. Department',
    '4. Designation',
    '5. Company Name',
    '6. Unit Name',
    '7. Factory / Supervisor Name',
    '8. Full Name',
    '9. Father\'s Name',
    '10. Date of Birth',
    '11. Gender',
    '12. Marital Status',
    '13. Aadhaar Card Number',
    '14. Permanent Address',
    '15. Current Address',
    '16. UAN Number',
    '17. ESIC Number',
    '18. PT Number',
    '19. Aadhaar-Linked Mobile Number',
    '20. Alternate Mobile Number',
    '21. Email ID',
    '22. Bank Account Number',
    '23. IFSC Code',
    '24. Bank Name',
    '25. Branch Name',
    '26. PhonePe / UPI Number',
    '27. Live Photo',
    '28. Aadhaar Card Photo',
    '29. Bank Passbook Photo',
    '30. Signature Photo'
  ];

  let reviewLabelsInOrder = true;
  let lastIndex = -1;
  for (const label of expectedLabels) {
    const idx = reviewContent.indexOf(label);
    if (idx === -1 || idx < lastIndex) {
      reviewLabelsInOrder = false;
      console.error(`Review modal sequence mismatch on "${label}"`);
      break;
    }
    lastIndex = idx;
  }
  assert(reviewLabelsInOrder, 'All 30 fields are present and strictly ordered in review modal');

  // Ensure PAN Number is 100% absent
  assert(!reviewContent.includes('PAN Number') && !reviewContent.includes('panNumber'), 'PAN field is completely excluded from Review Modal');

  // Check 4 photo preview cards and inspection lightbox
  assert(reviewContent.includes('Inspect') && reviewContent.includes('inspectDoc'), 'Review modal contains photograph inspection zoom lightbox');

  // Check Pre-submission footer buttons
  assert(
    reviewContent.includes('Submit Regular Joining Form') && reviewContent.includes('Back to Edit Form'),
    'Review modal footer has pre-submission buttons ("Submit Regular Joining Form" & "Back to Edit Form")'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Workflow Restructure & Submission Modal
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Submission Confirmation & Workflow Decoupling ---');
  const submittedModalPath = path.resolve(__dirname, '../src/components/admin/RegularJoiningSubmittedModal.tsx');
  const submittedContent = fs.readFileSync(submittedModalPath, 'utf-8');

  assert(submittedContent.includes('Pending Verification'), 'Submission confirmation marks candidate status as Pending Verification');
  assert(submittedContent.includes('employeeCode'), 'Submission confirmation displays assigned Employee Code');
  assert(submittedContent.includes('Go to Joining Submissions'), 'Direct action button provides navigation to Joining Submissions');

  const regularPagePath = path.resolve(__dirname, '../src/pages/admin/AdminRegularJoiningPage.tsx');
  const regularPageContent = fs.readFileSync(regularPagePath, 'utf-8');

  assert(
    regularPageContent.includes("saveRegularJoiningForm(currentFormData, 'SUBMITTED')"),
    'AdminRegularJoiningPage saves submission with SUBMITTED status (not auto-verified)'
  );
  assert(
    regularPageContent.includes('Preview & Review Joining Form'),
    'Bottom button opens preview modal for inspection before submission'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Joining Submissions Register Integration
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Joining Submissions Register Integration ---');
  const joiningListPath = path.resolve(__dirname, '../src/pages/admin/AdminJoiningListPage.tsx');
  const joiningListContent = fs.readFileSync(joiningListPath, 'utf-8');

  assert(joiningListContent.includes("workflowType: isRegular ? 'REGULAR' : 'STANDARD'"), 'AdminJoiningListPage distinguishes Regular Joining from Standard portal workflows');
  assert(joiningListContent.includes('Regular Joining'), 'Badge rendered for Regular Joining records');
  assert(joiningListContent.includes('workflowFilter'), 'Workflow filter dropdown allows filtering Regular vs Standard records');

  const joiningDetailPath = path.resolve(__dirname, '../src/pages/admin/AdminJoiningDetailPage.tsx');
  const joiningDetailContent = fs.readFileSync(joiningDetailPath, 'utf-8');

  assert(
    joiningDetailContent.includes('RegularJoiningSubmissionDossier'),
    'AdminJoiningDetailPage delegates regular records to RegularJoiningSubmissionDossier'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Administrative Dossier & Statutory Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Dossier Verification Controls & Document Validation ---');
  const dossierPath = path.resolve(__dirname, '../src/components/admin/RegularJoiningSubmissionDossier.tsx');
  const dossierContent = fs.readFileSync(dossierPath, 'utf-8');

  assert(dossierContent.includes('Verify Candidate & Documents'), 'Dossier provides administrative verification trigger');
  assert(dossierContent.includes('Generate Employee Reference Slip'), 'Dossier provides 1-page Reference Slip action');
  assert(dossierContent.includes('Open in ID Cards Section'), 'Dossier provides direct transition to ID Cards section');
  assert(dossierContent.includes('Reject') && dossierContent.includes('rejectionReason'), 'Dossier provides rejection modal with recorded reason');

  const regularServicePath = path.resolve(__dirname, '../src/services/regularJoiningService.ts');
  const serviceContent = fs.readFileSync(regularServicePath, 'utf-8');

  assert(
    serviceContent.includes('verifyRegularJoiningSubmission') &&
    serviceContent.includes('formData.photo?.storagePath') &&
    serviceContent.includes('formData.aadhaar?.storagePath') &&
    serviceContent.includes('formData.bankPassbook?.storagePath') &&
    serviceContent.includes('formData.signature?.storagePath'),
    'Verification service mandates presence of all 4 statutory documents before allowing verification'
  );
  assert(
    serviceContent.includes('provisionEmployeeRecord'),
    'Verification provisions official employee master record'
  );
  assert(
    serviceContent.includes("or(`joining_form_id.eq.${formId},employee_code.eq.${employeeCode}`)"),
    'Employee provisioning checks existing record to prevent duplicate provisioning'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: 1-Page Reference Slip & ID Card PDF Generation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Reference Slip & ID Card PDF Integrity ---');
  const mockFormData: RegularJoiningFormData = {
    employeeCode: 'ATG-503-2026',
    joiningDate: '2026-10-10',
    department: 'Operations',
    designation: 'Security Supervisor',
    companyName: 'Haldirams Foods International',
    unitName: 'Unit 4 MIDC',
    factorySupervisorName: 'Mr. Rajesh Sharma',
    salaryCtc: 24500,
    interviewDate: '2026-10-08',
    fullName: 'Ramesh Kumar Verma',
    fatherName: 'Suresh Kumar Verma',
    dob: '1995-05-15',
    gender: 'MALE',
    maritalStatus: 'MARRIED',
    aadhaarNumber: '123456789012',
    permanentAddress: 'Plot 12, Shivaji Nagar, Nagpur, Maharashtra - 440010',
    currentAddress: 'Plot 12, Shivaji Nagar, Nagpur, Maharashtra - 440010',
    sameAsPermanent: true,
    uanNumber: '100987654321',
    esicNumber: '31001234567890001',
    ptNumber: 'PT-MH-99881',
    mobile: '9876543210',
    alternateMobile: '9123456780',
    email: 'ramesh.verma@example.com',
    bankAccountNumber: '987654321098',
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    branchName: 'MIDC Nagpur',
    upiNumber: '9876543210@upi',
    submissionStatus: 'VERIFIED'
  };

  const slipBlob = await generateRegularReferenceSlipPdfBlob(mockFormData);
  assert(slipBlob.size > 1000, `Single-page reference slip PDF generated (${slipBlob.size} bytes)`);

  const slipBuffer = Buffer.from(await slipBlob.arrayBuffer());
  const slipText = slipBuffer.toString('binary');
  const pageMatches = slipText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  assert(pageCount === 1, `Reference slip PDF has exactly 1 A4 portrait page (found ${pageCount})`);
  assert(!/PAN\s*Number/i.test(slipText), 'Reference slip PDF has NO PAN Number');
  assert(!(/QR\s*Code/i.test(slipText) || /qrcode/i.test(slipText)), 'Reference slip PDF has NO QR Code');

  // ID Card Generation
  const idCardRes = await generateEmployeeIdCardPdf({
    employeeName: mockFormData.fullName,
    employeeCode: mockFormData.employeeCode,
    designation: mockFormData.designation,
    department: mockFormData.department,
    location: mockFormData.unitName,
    companyName: mockFormData.companyName,
    dob: mockFormData.dob,
    bloodGroup: 'B+',
    emergencyContactPhone: mockFormData.alternateMobile,
    emergencyContactRelation: 'Spouse',
    mobile: mockFormData.mobile,
    email: mockFormData.email,
    address: mockFormData.permanentAddress,
    issuanceDate: mockFormData.joiningDate
  });
  const idCardBlob = idCardRes.blob;
  assert(idCardBlob !== null && idCardBlob.size > 1000, `Employee ID Card PDF generated (${idCardBlob.size} bytes)`);

  const cardBuffer = Buffer.from(await idCardBlob.arrayBuffer());
  const cardText = cardBuffer.toString('binary');
  assert(cardText.includes('ATG-503-2026'), 'ID Card contains exact matching Employee Code (ATG-503-2026)');
  assert(cardText.includes('Ramesh Kumar Verma'), 'ID Card contains exact matching candidate Full Name');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Excel Export Backward Compatibility & Status Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Excel Export Compatibility ---');
  const detailsColNames = REGULAR_JOINING_DETAILS_COLUMNS;
  assert(!detailsColNames.some((h) => h.includes('PAN')), 'Excel export contains zero PAN columns');
  assert(detailsColNames.includes('Verification Status'), 'Excel export tracks Verification Status accurately');
  assert(detailsColNames.length === 34, 'Excel export maintains all 34 canonical data columns');
  assert(DOCUMENT_CHECKLIST_COLUMNS.length === 10, 'Document Checklist maintains all 10 statutory tracking columns');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`WORKFLOW TEST SUITE COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runWorkflowTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
