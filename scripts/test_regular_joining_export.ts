// ==============================================================================
// File: scripts/test_regular_joining_export.ts
// Description: Automated Test Suite for Regular Joining Excel Export (Section 16)
// ==============================================================================

import * as XLSX from 'xlsx';
import {
  REGULAR_JOINING_DETAILS_COLUMNS,
  DOCUMENT_CHECKLIST_COLUMNS,
  fetchAndEnrichRegularRecords,
  sanitizeFilename
} from '../src/services/regularJoiningExportService';
import type { RegularJoiningFormData } from '../src/services/regularJoiningService';

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING SECTION 16: REGULAR JOINING EXCEL EXPORT TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Mock Regular Joining Form Datasets
  const mockRecord1: RegularJoiningFormData = {
    id: 'test-uuid-1',
    employeeCode: 'ATG-501-2026',
    joiningDate: '2026-10-10',
    department: 'Quality Assurance',
    designation: 'Senior QA Inspector',
    companyName: 'A TIGER GLOBAL',
    unitName: 'Unit Alpha',
    factorySupervisorName: 'Rajesh Sharma',
    salaryCtc: 450000,
    interviewDate: '2026-10-05',
    fullName: 'Aarav Sharma',
    fatherName: 'Vikram Sharma',
    dob: '1995-04-12',
    gender: 'MALE',
    maritalStatus: 'MARRIED',
    aadhaarNumber: '123456789012',
    permanentAddress: '123 Tiger Nagar, Sector 4, Noida, UP',
    currentAddress: '123 Tiger Nagar, Sector 4, Noida, UP',
    sameAsPermanent: true,
    uanNumber: '100987654321',
    esicNumber: '31000987654321000',
    ptNumber: 'PT-NOIDA-0987',
    mobile: '9876543210',
    alternateMobile: '9876543211',
    email: 'aarav.sharma@example.com',
    bankAccountNumber: '50100234567890',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank',
    branchName: 'Noida Sector 18',
    upiNumber: 'aarav@okaxis',
    photo: { name: 'live_photo.jpg', size: 1024, type: 'image/jpeg', storagePath: 'regular_joining/ATG-501-2026/photo.jpg' },
    aadhaar: { name: 'aadhaar_card.jpg', size: 2048, type: 'image/jpeg', storagePath: 'regular_joining/ATG-501-2026/aadhaar.jpg' },
    bankPassbook: { name: 'bank_passbook.jpg', size: 3072, type: 'image/jpeg', storagePath: 'regular_joining/ATG-501-2026/passbook.jpg' },
    signature: { name: 'candidate_signature.png', size: 512, type: 'image/png', storagePath: 'regular_joining/ATG-501-2026/signature.png' },
    submissionStatus: 'VERIFIED',
    verifiedAt: '2026-10-10T10:00:00Z',
    verifiedBy: 'System Administrator',
    createdAt: '2026-10-10T09:30:00Z'
  };

  const mockRecord2: RegularJoiningFormData = {
    id: 'test-uuid-2',
    employeeCode: 'ATG-502-2026',
    joiningDate: '2026-10-11',
    department: 'Manufacturing',
    designation: 'Machine Operator',
    companyName: 'A TIGER GLOBAL',
    unitName: 'Unit Beta',
    factorySupervisorName: 'Sunil Verma',
    salaryCtc: 320000,
    interviewDate: '2026-10-06',
    fullName: 'Priya Patel',
    fatherName: 'Dinesh Patel',
    dob: '1998-08-20',
    gender: 'FEMALE',
    maritalStatus: 'SINGLE',
    aadhaarNumber: '987654321098',
    permanentAddress: '456 Industrial Area, Ahmedabad, Gujarat',
    currentAddress: '456 Industrial Area, Ahmedabad, Gujarat',
    sameAsPermanent: true,
    uanNumber: '100123456789',
    esicNumber: '31000123456789000',
    ptNumber: 'PT-AHM-1234',
    mobile: '9123456780',
    alternateMobile: '',
    email: 'priya.patel@example.com',
    bankAccountNumber: '30200987654321',
    ifscCode: 'SBIN0004321',
    bankName: 'State Bank of India',
    branchName: 'GIDC Branch',
    upiNumber: 'priya@oksbi',
    photo: { name: 'photo.jpg', size: 1024, type: 'image/jpeg', storagePath: 'regular_joining/ATG-502-2026/photo.jpg' },
    aadhaar: null, // missing document
    bankPassbook: { name: 'passbook.jpg', size: 2048, type: 'image/jpeg', storagePath: 'regular_joining/ATG-502-2026/passbook.jpg' },
    signature: { name: 'sig.png', size: 512, type: 'image/png', storagePath: 'regular_joining/ATG-502-2026/signature.png' },
    submissionStatus: 'DRAFT',
    verifiedAt: null,
    verifiedBy: null,
    createdAt: '2026-10-10T11:00:00Z'
  };

  const mockRecord3: RegularJoiningFormData = {
    id: 'test-uuid-3',
    employeeCode: 'ATG-503-2026',
    joiningDate: '2026-10-15',
    department: 'Quality Assurance',
    designation: 'QA Associate',
    companyName: 'A TIGER GLOBAL',
    unitName: 'Unit Alpha',
    factorySupervisorName: 'Rajesh Sharma',
    salaryCtc: 380000,
    interviewDate: null,
    fullName: 'Rohan Mehra',
    fatherName: 'Suresh Mehra',
    dob: '1997-01-15',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    aadhaarNumber: '556677889900',
    permanentAddress: '789 Link Road, Delhi',
    currentAddress: '789 Link Road, Delhi',
    sameAsPermanent: true,
    uanNumber: '',
    esicNumber: '',
    ptNumber: '',
    mobile: '9988776655',
    alternateMobile: '',
    email: 'rohan.mehra@example.com',
    bankAccountNumber: '918273645019',
    ifscCode: 'ICIC0000555',
    bankName: 'ICICI Bank',
    branchName: 'Connaught Place',
    upiNumber: 'rohan@upi',
    photo: { name: 'photo.jpg', size: 1024, type: 'image/jpeg', storagePath: 'regular_joining/ATG-503-2026/photo.jpg' },
    aadhaar: { name: 'aadhaar.jpg', size: 2048, type: 'image/jpeg', storagePath: 'regular_joining/ATG-503-2026/aadhaar.jpg' },
    bankPassbook: { name: 'passbook.jpg', size: 2048, type: 'image/jpeg', storagePath: 'regular_joining/ATG-503-2026/passbook.jpg' },
    signature: { name: 'sig.png', size: 512, type: 'image/png', storagePath: 'regular_joining/ATG-503-2026/signature.png' },
    submissionStatus: 'VERIFIED',
    verifiedAt: '2026-10-15T10:00:00Z',
    verifiedBy: 'HR Lead',
    createdAt: '2026-10-10T12:00:00Z'
  };

  const mockList = [mockRecord1, mockRecord2, mockRecord3];

  // ---------------------------------------------------------------------------
  // TEST 1: Check Sheet 1 Column Specification (34 Columns, NO PAN)
  // ---------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Sheet 1 Column Headers & PAN Exclusion ---');
  assert(REGULAR_JOINING_DETAILS_COLUMNS.length === 34, `Sheet 1 must have exactly 34 columns (got ${REGULAR_JOINING_DETAILS_COLUMNS.length})`);
  assert(!REGULAR_JOINING_DETAILS_COLUMNS.some((col) => /\bPAN\b/i.test(col)), 'Strict requirement: Sheet 1 must NOT contain any PAN Number column');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[0] === 'Serial Number', 'Column 1 must be "Serial Number"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[1] === 'Joining Reference Number / Employee Code', 'Column 2 must be "Joining Reference Number / Employee Code"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[2] === 'Joining Date', 'Column 3 must be "Joining Date"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[3] === 'Candidate Full Name', 'Column 4 must be "Candidate Full Name"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[28] === 'Salary (CTC)', 'Column 29 must be "Salary (CTC)"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[29] === 'Verification Status', 'Column 30 must be "Verification Status"');
  assert(REGULAR_JOINING_DETAILS_COLUMNS[33] === 'Record Creation Date', 'Column 34 must be "Record Creation Date"');

  // ---------------------------------------------------------------------------
  // TEST 2: Check Sheet 2 Column Specification (10 Columns)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Sheet 2 Document Checklist ---');
  assert(DOCUMENT_CHECKLIST_COLUMNS.length === 10, `Sheet 2 must have exactly 10 columns (got ${DOCUMENT_CHECKLIST_COLUMNS.length})`);
  assert(DOCUMENT_CHECKLIST_COLUMNS[0] === 'Employee Code', 'Sheet 2 Col 1 must be "Employee Code"');
  assert(DOCUMENT_CHECKLIST_COLUMNS[3] === 'Live Photo Uploaded', 'Sheet 2 Col 4 must be "Live Photo Uploaded"');
  assert(DOCUMENT_CHECKLIST_COLUMNS[4] === 'Aadhaar Card Photo Uploaded', 'Sheet 2 Col 5 must be "Aadhaar Card Photo Uploaded"');
  assert(DOCUMENT_CHECKLIST_COLUMNS[5] === 'Bank Passbook Photo Uploaded', 'Sheet 2 Col 6 must be "Bank Passbook Photo Uploaded"');
  assert(DOCUMENT_CHECKLIST_COLUMNS[6] === 'Signature Photo Uploaded', 'Sheet 2 Col 7 must be "Signature Photo Uploaded"');
  assert(DOCUMENT_CHECKLIST_COLUMNS[7] === 'All Required Documents Uploaded', 'Sheet 2 Col 8 must be "All Required Documents Uploaded"');

  // ---------------------------------------------------------------------------
  // TEST 3: Enrich Records and Verify Data Mapping
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Data Enrichment & Document Presence Mapping ---');
  const enriched = await fetchAndEnrichRegularRecords(undefined, mockList);
  assert(enriched.length === 3, 'Must enrich all 3 mock records');

  // Record 1 has all 4 docs
  assert(enriched[0].hasPhoto === true, 'Record 1 has photo uploaded');
  assert(enriched[0].hasAadhaar === true, 'Record 1 has aadhaar uploaded');
  assert(enriched[0].hasPassbook === true, 'Record 1 has passbook uploaded');
  assert(enriched[0].hasSignature === true, 'Record 1 has signature uploaded');
  assert(enriched[0].allDocsUploaded === true, 'Record 1 allDocsUploaded must be true');
  assert(enriched[0].referenceSlipStatus === 'Generated / Available', 'Record 1 slip status is Generated / Available');

  // Record 2 is missing aadhaar
  assert(enriched[1].hasPhoto === true, 'Record 2 has photo uploaded');
  assert(enriched[1].hasAadhaar === false, 'Record 2 is missing aadhaar');
  assert(enriched[1].allDocsUploaded === false, 'Record 2 allDocsUploaded must be false');
  assert(enriched[1].form.submissionStatus === 'DRAFT', 'Record 2 status is DRAFT');

  // ---------------------------------------------------------------------------
  // TEST 4: Build Workbook and Verify Sheets
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Multi-Sheet Excel Workbook Assembly ---');
  const wb = XLSX.utils.book_new();

  // Build Sheet 1
  const sheet1Data = enriched.map((r, idx) => [
    idx + 1,
    r.form.employeeCode,
    r.form.joiningDate,
    r.form.fullName,
    r.form.fatherName,
    r.form.dob,
    r.form.gender,
    r.form.maritalStatus,
    r.form.department,
    r.form.designation,
    r.form.companyName,
    r.form.unitName,
    r.form.factorySupervisorName,
    r.form.permanentAddress,
    r.form.currentAddress,
    r.form.mobile,
    r.form.alternateMobile,
    r.form.email,
    r.form.aadhaarNumber,
    r.form.uanNumber,
    r.form.esicNumber,
    r.form.ptNumber,
    r.form.bankAccountNumber,
    r.form.ifscCode,
    r.form.bankName,
    r.form.branchName,
    r.form.upiNumber,
    r.form.interviewDate || '—',
    r.form.salaryCtc || 0,
    r.form.submissionStatus,
    r.form.verifiedAt || 'Pending',
    r.referenceSlipStatus,
    r.idCardStatus,
    r.creationDate
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([REGULAR_JOINING_DETAILS_COLUMNS, ...sheet1Data]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Employee Joining Details');

  // Build Sheet 2
  const sheet2Data = enriched.map((r) => [
    r.form.employeeCode,
    r.form.fullName,
    r.form.joiningDate,
    r.hasPhoto ? 'Uploaded' : 'Missing',
    r.hasAadhaar ? 'Uploaded' : 'Missing',
    r.hasPassbook ? 'Uploaded' : 'Missing',
    r.hasSignature ? 'Uploaded' : 'Missing',
    r.allDocsUploaded ? 'Yes' : 'No',
    r.form.submissionStatus || 'DRAFT',
    r.form.verifiedAt || 'Pending'
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([DOCUMENT_CHECKLIST_COLUMNS, ...sheet2Data]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Document Checklist');

  // Build Sheet 3
  const totalRecords = enriched.length;
  const verifiedCount = enriched.filter((r) => r.form.submissionStatus === 'VERIFIED').length;
  const draftCount = enriched.filter((r) => r.form.submissionStatus === 'DRAFT').length;
  const missingDocsCount = enriched.filter((r) => !r.allDocsUploaded).length;

  const sheet3Data = [
    ['A TIGER GLOBAL — REGULAR JOINING SUMMARY REPORT'],
    [],
    ['EXECUTIVE SUMMARY METRICS', 'COUNT', 'SHARE OF TOTAL'],
    ['Total Regular Joining Records', totalRecords, '100%'],
    ['Verified Records', verifiedCount, `${Math.round((verifiedCount / totalRecords) * 100)}%`],
    ['Draft Records', draftCount, `${Math.round((draftCount / totalRecords) * 100)}%`],
    ['Records With Missing Documents', missingDocsCount, `${Math.round((missingDocsCount / totalRecords) * 100)}%`]
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  XLSX.utils.book_append_sheet(wb, ws3, 'Joining Summary');

  assert(wb.SheetNames.length === 3, 'Workbook must contain exactly 3 sheets');
  assert(wb.SheetNames[0] === 'Employee Joining Details', 'Sheet 1 name matches "Employee Joining Details"');
  assert(wb.SheetNames[1] === 'Document Checklist', 'Sheet 2 name matches "Document Checklist"');
  assert(wb.SheetNames[2] === 'Joining Summary', 'Sheet 3 name matches "Joining Summary"');

  // Write and read back to test binary validity
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  assert(buf.length > 0, `XLSX binary generated successfully (${buf.length} bytes)`);

  const readBackWb = XLSX.read(buf, { type: 'buffer' });
  assert(readBackWb.SheetNames.length === 3, 'Read-back workbook has 3 valid sheets');

  // ---------------------------------------------------------------------------
  // TEST 5: Verify Calculations in Summary
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Summary Metric Calculations ---');
  assert(verifiedCount === 2, `Verified count is 2 (got ${verifiedCount})`);
  assert(draftCount === 1, `Draft count is 1 (got ${draftCount})`);
  assert(missingDocsCount === 1, `Missing docs count is 1 (got ${missingDocsCount})`);

  // ---------------------------------------------------------------------------
  // TEST 6: Individual Employee Export Filename Sanitization
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Individual Filename Sanitization ---');
  const sanitized1 = sanitizeFilename('ATG-501-2026');
  assert(sanitized1 === 'ATG-501-2026', `Sanitized code is "ATG-501-2026" (got "${sanitized1}")`);
  const filename1 = `ATG_Employee_${sanitized1}.xlsx`;
  assert(filename1 === 'ATG_Employee_ATG-501-2026.xlsx', `Filename is "ATG_Employee_ATG-501-2026.xlsx"`);

  const badCode = 'ATG/501:2026*?';
  const sanitizedBad = sanitizeFilename(badCode);
  assert(!sanitizedBad.includes('/') && !sanitizedBad.includes(':'), 'Sanitization removes illegal path characters');

  // ---------------------------------------------------------------------------
  // TEST 7: Filtering and Selective Export Logic
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Selective & Filtered Export Logic ---');
  const deptFiltered = mockList.filter((m) => m.department === 'Quality Assurance');
  assert(deptFiltered.length === 2, 'Department filter returns 2 QA employees');

  const selectedExport = mockList.filter((m) => m.employeeCode === 'ATG-502-2026');
  assert(selectedExport.length === 1, 'Selected export returns 1 record');
  assert(selectedExport[0].fullName === 'Priya Patel', 'Selected record is Priya Patel');

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED! (${passedTests} / ${totalTests} assertions passed)`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
