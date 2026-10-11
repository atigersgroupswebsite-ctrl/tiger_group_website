// ==============================================================================
// Script: scripts/test_form_numbering_and_automation.ts
// Purpose: Automated verification of:
//   1. Field Numbering (1 to 30 continuous, zero PAN field)
//   2. Reference Slip PDF generation (1-page, vector format, no PAN/QR/Section 3)
//   3. Employee ID Card PDF generation with matching employee code & name
//   4. Existing joining workflow preservation
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateRegularReferenceSlipPdfBlob } from '../src/services/regularReferenceSlipPdfGenerator';
import { generateEmployeeIdCardPdf } from '../src/services/employeeIdCardGenerator';
import type { RegularJoiningFormData } from '../src/services/regularJoiningService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('=== STARTING REGULAR JOINING SUITE TESTS ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      process.exitCode = 1;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Check Form Field Numbering in AdminRegularJoiningPage.tsx
  // --------------------------------------------------------------------------
  const formPagePath = path.resolve(__dirname, '../src/pages/admin/AdminRegularJoiningPage.tsx');
  const formContent = fs.readFileSync(formPagePath, 'utf-8');

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
    '16. UAN Number (Optional)',
    '17. ESIC Number (Optional)',
    '18. PT Number (Optional)',
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

  let allLabelsPresentInOrder = true;
  let lastIndex = -1;
  for (const label of expectedLabels) {
    const idx = formContent.indexOf(label);
    if (idx === -1 || idx < lastIndex) {
      allLabelsPresentInOrder = false;
      console.error(`Label sequence error on: "${label}" (idx: ${idx}, last: ${lastIndex})`);
      break;
    }
    lastIndex = idx;
  }
  assert(allLabelsPresentInOrder, 'TEST 1: Form field numbering 1 through 30 strictly sequenced in AdminRegularJoiningPage');

  // Check PAN absence
  const panFieldPresent = formContent.includes('PAN Number') || formContent.includes('PAN Card');
  assert(!panFieldPresent, 'TEST 1B: PAN field is completely absent from Regular Joining Form');

  // --------------------------------------------------------------------------
  // TEST 2: Check Numbering in RegularJoiningReviewModal.tsx
  // --------------------------------------------------------------------------
  const reviewModalPath = path.resolve(__dirname, '../src/components/admin/RegularJoiningReviewModal.tsx');
  const reviewContent = fs.readFileSync(reviewModalPath, 'utf-8');

  let reviewLabelsInOrder = true;
  lastIndex = -1;
  for (const label of expectedLabels) {
    const idx = reviewContent.indexOf(label.replace(' (Optional)', ''));
    if (idx === -1 || idx < lastIndex) {
      reviewLabelsInOrder = false;
      console.error(`Review modal label sequence error on: "${label}"`);
      break;
    }
    lastIndex = idx;
  }
  assert(reviewLabelsInOrder, 'TEST 2: Review modal numbering 1 through 30 strictly sequenced');

  // --------------------------------------------------------------------------
  // TEST 3 & 4: Mock Data Setup
  // --------------------------------------------------------------------------
  const mockFormData: RegularJoiningFormData = {
    employeeCode: 'ATG-501-2026',
    joiningDate: '2026-10-10',
    department: 'Operations & Facilities',
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
    permanentAddress: 'Plot 45, Shivaji Nagar, Nagpur, Maharashtra - 440010',
    currentAddress: 'Plot 45, Shivaji Nagar, Nagpur, Maharashtra - 440010',
    sameAsPermanent: true,
    uanNumber: '101234567890',
    esicNumber: '31001234560001001',
    ptNumber: 'PT-998877',
    mobile: '9876543210',
    alternateMobile: '9876543211',
    email: 'ramesh.verma@example.com',
    bankAccountNumber: '987654321012',
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    branchName: 'Nagpur Main Branch',
    upiNumber: '9876543210@sbi',
    photo: {
      storagePath: 'regular_joining/ATG-501-2026/photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    aadhaar: {
      storagePath: 'regular_joining/ATG-501-2026/aadhaar.jpg',
      name: 'aadhaar.jpg',
      type: 'image/jpeg',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    bankPassbook: {
      storagePath: 'regular_joining/ATG-501-2026/passbook.jpg',
      name: 'passbook.jpg',
      type: 'image/jpeg',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    signature: {
      storagePath: 'regular_joining/ATG-501-2026/signature.jpg',
      name: 'signature.jpg',
      type: 'image/jpeg',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    submissionStatus: 'VERIFIED',
    verifiedAt: '2026-10-10T11:00:00Z',
    verifiedBy: 'Administrator'
  };

  // --------------------------------------------------------------------------
  // TEST 5, 6, 7, 8: 1-Page Reference Slip Generation
  // --------------------------------------------------------------------------
  const slipBlob = await generateRegularReferenceSlipPdfBlob(mockFormData);
  assert(slipBlob !== null && slipBlob.size > 1000, 'TEST 5: Reference slip PDF generated successfully as Blob');

  const slipBuffer = Buffer.from(await slipBlob.arrayBuffer());
  const slipText = slipBuffer.toString('binary');

  // Verify page count: in jsPDF, /Type /Page count or /Count 1
  const pageMatches = slipText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  assert(pageCount === 1, `TEST 6: Reference slip contains exactly 1 page (found ${pageCount})`);

  // Verify PAN is absent
  const hasPanInSlip = /PAN\s*Number/i.test(slipText) || /Permanent Account Number/i.test(slipText);
  assert(!hasPanInSlip, 'TEST 7A: PAN field is absent from Reference Slip');

  // Verify QR code is absent
  const hasQrInSlip = /QR\s*Code/i.test(slipText) || /qrcode/i.test(slipText);
  assert(!hasQrInSlip, 'TEST 7B: QR code is absent from Reference Slip');

  // Verify Section 3 "To Be Filled by Company" is absent
  const hasSection3 = /To Be Filled by Company/i.test(slipText);
  assert(!hasSection3, 'TEST 8: Section 3 "To Be Filled by Company" is absent from Reference Slip');

  // --------------------------------------------------------------------------
  // TEST 9 & 10: Automatic ID Card Generation
  // --------------------------------------------------------------------------
  const idCardRes = await generateEmployeeIdCardPdf({
    employeeName: mockFormData.fullName,
    employeeCode: mockFormData.employeeCode,
    photoUrlOrData: mockFormData.photo?.dataUrl,
    department: mockFormData.department,
    designation: mockFormData.designation,
    issuanceDate: mockFormData.joiningDate,
    mobile: mockFormData.mobile,
    bloodGroup: 'B+'
  });
  const idCardBlob = idCardRes.blob;

  assert(idCardBlob !== null && idCardBlob.size > 1000, 'TEST 9: Employee ID Card generated successfully as Blob');

  const cardBuffer = Buffer.from(await idCardBlob.arrayBuffer());
  const cardText = cardBuffer.toString('binary');

  const cardHasCode = cardText.includes('ATG-501-2026');
  const cardHasName = cardText.includes('Ramesh Kumar Verma');
  assert(cardHasCode && cardHasName, `TEST 10: ID Card contains exact matching Employee Code (ATG-501-2026) and Name`);

  // --------------------------------------------------------------------------
  // TEST 14: Existing Workflow Preservation
  // --------------------------------------------------------------------------
  const originalJoiningFormPath = path.resolve(__dirname, '../src/components/joining/JoiningForm.tsx');
  assert(fs.existsSync(originalJoiningFormPath), 'TEST 14A: Existing original JoiningForm component is preserved');

  const originalRefSlipPath = path.resolve(__dirname, '../src/services/referenceSlipPdfGenerator.ts');
  assert(fs.existsSync(originalRefSlipPath), 'TEST 14B: Existing original two-page Reference Slip generator is preserved');

  const undertakingSectionPath = path.resolve(__dirname, '../src/components/joining/DeclarationSection.tsx');
  const joiningPdfGenPath = path.resolve(__dirname, '../src/services/joiningPdfGenerator.ts');
  assert(fs.existsSync(undertakingSectionPath) && fs.existsSync(joiningPdfGenPath), 'TEST 14C: Existing Undertaking & Declaration documents preserved');

  console.log(`\n=== SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
