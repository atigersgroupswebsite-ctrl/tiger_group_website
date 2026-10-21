// ==============================================================================
// File: scripts/test_pdf_signature_stamp.ts
// Description: Automated Test for Signature & Company Stamp Rendering on Pages 03 & 09
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import zlib from 'zlib';
import {
  generateCompleteJoiningDocumentPdf,
  resolveCandidateSignatureSource
} from '../src/services/completeJoiningDocumentGenerator';
import type { RegularJoiningFormData } from '../src/services/regularJoiningService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  [PASS] ${msg}`);
}

// 1x1 transparent PNG data URL
const DUMMY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Sample mock data for candidate
const mockCandidateData: RegularJoiningFormData = {
  employeeCode: 'ATG-501-2026',
  fullName: 'Rajesh Sharma',
  fatherName: 'Ramesh Sharma',
  dob: '1995-04-12',
  gender: 'Male',
  maritalStatus: 'Single',
  joiningDate: '2026-10-10',
  department: 'Operations',
  designation: 'Field Supervisor',
  companyName: 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY',
  unitName: 'Nagpur Logistics Hub',
  factorySupervisorName: 'Sanjay Deshmukh',
  salaryCtc: 24000,
  aadhaarNumber: '998877665544',
  permanentAddress: 'Plot 42, Civil Lines, Nagpur, Maharashtra',
  currentAddress: 'Plot 42, Civil Lines, Nagpur, Maharashtra',
  sameAsPermanent: true,
  uanNumber: '101234567890',
  esicNumber: '2012345678',
  ptNumber: 'PT-998811',
  mobile: '9876543210',
  alternateMobile: '9876543211',
  email: 'rajesh.sharma@example.com',
  bankAccountNumber: '12345678901234',
  ifscCode: 'SBIN0001234',
  bankName: 'State Bank of India',
  branchName: 'Civil Lines, Nagpur',
  upiNumber: 'rajesh@sbi',
  photo: null,
  aadhaar: null,
  bankPassbook: null,
  signature: null
};

async function decompressPageStream(pdfDoc: PDFDocument, pageIndex: number): Promise<string> {
  const page = pdfDoc.getPage(pageIndex);
  const contentsStream = page.node.Contents();
  if (!contentsStream) return '';
  const rawBytes = contentsStream.getContents();
  try {
    return zlib.inflateSync(rawBytes).toString('latin1');
  } catch {
    return Buffer.from(rawBytes).toString('latin1');
  }
}

async function run() {
  console.log('================================================================');
  console.log('TESTING SIGNATURE AND COMPANY STAMP RENDERING ON PAGES 03 & 09');
  console.log('================================================================\n');

  // TEST 1: Source resolution handles multiple candidate signature locations
  console.log('--- TEST 1: Candidate Signature Source Resolution ---');
  assert(
    resolveCandidateSignatureSource({ signature: { dataUrl: 'data:image/png;base64,abc' } }) === 'data:image/png;base64,abc',
    'Extracts dataUrl from signature object'
  );
  assert(
    resolveCandidateSignatureSource({ signature: { storagePath: 'candidate-documents/sig.png' } }) === 'candidate-documents/sig.png',
    'Extracts storagePath from signature object'
  );
  assert(
    resolveCandidateSignatureSource({ candidate_signature_path: 'signatures/cand.png' }) === 'signatures/cand.png',
    'Extracts candidate_signature_path from DB record'
  );
  assert(
    resolveCandidateSignatureSource({ documentsMetadata: { signature: { storagePath: 'cand_sig.jpg' } } }) === 'cand_sig.jpg',
    'Extracts from documentsMetadata'
  );
  assert(
    resolveCandidateSignatureSource({ documents: [{ document_type: 'SIGNATURE', storage_path: 'doc_sig.jpg' }] }) === 'doc_sig.jpg',
    'Extracts from documents array'
  );
  assert(
    resolveCandidateSignatureSource({ photo: { dataUrl: 'avatar.jpg' } }) === null,
    'Strictly does NOT substitute photo/avatar for signature'
  );

  // TEST 2: Dossier with Missing Signature and Missing Stamp (Placeholder Test)
  console.log('\n--- TEST 2: Missing Assets Produce Clean Placeholders (No Dark Navy Fill) ---');
  const docNoAssets = await generateCompleteJoiningDocumentPdf(mockCandidateData, {
    signatureDataUrl: null,
    companySignatureUrl: null,
    companyStampUrl: null
  });

  const pdfNoAssetsBytes = docNoAssets.output('arraybuffer');
  const pdfNoAssets = await PDFDocument.load(pdfNoAssetsBytes);
  assert(pdfNoAssets.getPageCount() === 9, 'Dossier generates exactly 9 pages');

  // Inspect Page 03 (Index 2)
  const streamP3NoAssets = await decompressPageStream(pdfNoAssets, 2);
  assert(
    streamP3NoAssets.includes('Signature not uploaded'),
    'Page 03 displays clean "Signature not uploaded" placeholder when signature is missing'
  );
  assert(
    streamP3NoAssets.includes('Official Stamp Pending'),
    'Page 03 displays clean "Official Stamp Pending" placeholder when stamp is missing'
  );
  assert(
    streamP3NoAssets.includes('Authorized Signatory'),
    'Page 03 displays clean "Authorized Signatory" placeholder when company sig is missing'
  );

  // Verify that right box is filled with PURE WHITE (1 1 1 rg) and NOT DARK NAVY
  // Navy color in jsPDF: 0.059 0.106 0.22 rg
  // The right box rectangle coordinates are x=109 (approx 308.97pt in PDF units)
  const hasNavyBoxP3 = streamP3NoAssets.includes('0.059 0.106 0.22 rg\n308.97') ||
                       streamP3NoAssets.includes('0.059 0.106 0.22 rg 308.97');
  assert(!hasNavyBoxP3, 'Page 03 right box is strictly NOT filled with Dark Navy fill');

  // Inspect Page 09 (Index 8)
  const streamP9NoAssets = await decompressPageStream(pdfNoAssets, 8);
  assert(
    streamP9NoAssets.includes('Signature not uploaded'),
    'Page 09 displays clean "Signature not uploaded" placeholder when signature is missing'
  );
  assert(
    streamP9NoAssets.includes('Official Stamp Pending'),
    'Page 09 displays clean "Official Stamp Pending" placeholder when stamp is missing'
  );
  const hasNavyBoxP9 = streamP9NoAssets.includes('0.059 0.106 0.22 rg\n308.97') ||
                       streamP9NoAssets.includes('0.059 0.106 0.22 rg 308.97');
  assert(!hasNavyBoxP9, 'Page 09 right box is strictly NOT filled with Dark Navy fill');

  // TEST 3: Dossier with Provided Valid Signature and Company Stamp
  console.log('\n--- TEST 3: Provided Assets Render Successfully on White Background ---');
  const docWithAssets = await generateCompleteJoiningDocumentPdf(mockCandidateData, {
    signatureDataUrl: DUMMY_PNG,
    companySignatureUrl: DUMMY_PNG,
    companyStampUrl: DUMMY_PNG
  });

  const pdfWithAssetsBytes = docWithAssets.output('arraybuffer');
  const pdfWithAssets = await PDFDocument.load(pdfWithAssetsBytes);

  // Check Page 03
  const p3 = pdfWithAssets.getPage(2);
  const streamP3WithAssets = await decompressPageStream(pdfWithAssets, 2);
  assert(
    !streamP3WithAssets.includes('Signature not uploaded'),
    'Page 03 does NOT show placeholder when signature is provided'
  );
  assert(
    !streamP3WithAssets.includes('Official Stamp Pending'),
    'Page 03 does NOT show placeholder when stamp is provided'
  );

  // Check Page 09
  const streamP9WithAssets = await decompressPageStream(pdfWithAssets, 8);
  assert(
    !streamP9WithAssets.includes('Signature not uploaded'),
    'Page 09 does NOT show placeholder when signature is provided'
  );
  assert(
    !streamP9WithAssets.includes('Official Stamp Pending'),
    'Page 09 does NOT show placeholder when stamp is provided'
  );

  // TEST 4: Integrity of Legal Undertaking and Declaration Texts
  console.log('\n--- TEST 4: Text Content and Legal Declarations Unchanged ---');
  assert(
    streamP3WithAssets.includes('CANDIDATE REPORTING SIGNATURE'),
    'Page 03 retains "CANDIDATE REPORTING SIGNATURE"'
  );
  assert(
    streamP3WithAssets.includes('COMPANY AUTHORIZATION & REGISTRATION SEAL'),
    'Page 03 retains "COMPANY AUTHORIZATION & REGISTRATION SEAL"'
  );
  assert(
    streamP9WithAssets.includes('CANDIDATE FINAL SIGNATURE'),
    'Page 09 retains "CANDIDATE FINAL SIGNATURE"'
  );
  assert(
    streamP9WithAssets.includes('COMPANY AUTHORIZATION & REGISTRATION SEAL'),
    'Page 09 retains "COMPANY AUTHORIZATION & REGISTRATION SEAL"'
  );
  assert(
    streamP9WithAssets.includes('MASTER ATTESTATION'),
    'Page 09 retains Section G Master Attestation title'
  );

  console.log('\n================================================================');
  console.log('ALL SIGNATURE & COMPANY STAMP RENDERING TESTS PASSED!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
