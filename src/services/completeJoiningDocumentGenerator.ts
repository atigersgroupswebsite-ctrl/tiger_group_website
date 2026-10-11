// ==============================================================================
// File: src/services/completeJoiningDocumentGenerator.ts
// Description: Professional Multi-Page A4 PDF Generator for Complete Joining Documents
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Standard: A4 Portrait (210mm x 297mm)
// Rules:
//   - Section A: Company Header (Branding, Logo, Reference ATG-xxx-2026, Date)
//   - Section B: Joining Details
//   - Section C: Candidate Personal Details (Strictly zero PAN for regular joining)
//   - Section D: Sensitive Banking Coordinates (Confidential internal joining record)
//   - Section E: Required Document & Photo Specimens (Preserved aspect ratios)
//   - Section F: Original Formal Joining Undertaking
//   - Section G: Original Statutory Undertakings & Code of Conduct (6 Points)
//   - Section H: Master Attestation, Date, Place, Candidate Signature & HR Authorization
// ==============================================================================

import { jsPDF } from 'jspdf';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { RegularJoiningFormData } from './regularJoiningService';
import {
  FORMAL_JOINING_UNDERTAKING,
  STATUTORY_UNDERTAKINGS,
  MASTER_ATTESTATION
} from '../constants/joiningDeclarations';
import { persistGeneratedDocument } from './filePersistenceService';

export interface CompleteJoiningDocOptions {
  companyName?: string;
  consultancyName?: string;
  signatureDataUrl?: string | null;
  photoDataUrl?: string | null;
  aadhaarDataUrl?: string | null;
  bankPassbookDataUrl?: string | null;
  companySignatureUrl?: string | null;
  verifierName?: string;
  verifiedAt?: string;
  place?: string;
}

/**
 * Resolves an image source (data URL, storage path, or HTTP URL) to a base64 Data URL.
 */
async function resolveImageToDataUrl(source?: string | null): Promise<string | null> {
  if (!source) return null;

  // 1. Already a data URL
  if (source.startsWith('data:image/')) {
    return source;
  }

  try {
    let fetchUrl = source;

    // 2. Supabase Storage Path
    if (!source.startsWith('http://') && !source.startsWith('https://') && isSupabaseConfigured) {
      let bucket = 'candidate-documents';
      let cleanPath = source;
      if (source.startsWith('candidate-documents/')) {
        cleanPath = source.replace(/^candidate-documents\//, '');
      } else if (source.startsWith('company-assets/')) {
        bucket = 'company-assets';
        cleanPath = source.replace(/^company-assets\//, '');
      }

      const { data } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 3600);
      if (data?.signedUrl) {
        fetchUrl = data.signedUrl;
      } else {
        return null;
      }
    }

    // 3. Fetch binary and convert to base64 data URL
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[resolveImageToDataUrl] Failed to load image:', err);
    return null;
  }
}

/**
 * Generates the Complete Joining Document as an A4 jsPDF instance.
 */
export async function generateCompleteJoiningDocumentPdf(
  data: RegularJoiningFormData,
  options: CompleteJoiningDocOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  type RGBColor = [number, number, number];

  // Palette (Typed RGB Tuples for jsPDF)
  const navy: RGBColor = [15, 27, 56]; // #0F1B38
  const gold: RGBColor = [197, 160, 89]; // #C5A059
  const textDark: RGBColor = [30, 41, 59]; // #1E293B
  const textMuted: RGBColor = [100, 116, 139]; // #64748B
  const borderCol: RGBColor = [203, 213, 225]; // #CBD5E1
  const bgLight: RGBColor = [248, 250, 252]; // #F8FAFC

  const employeeCode = data.employeeCode || 'ATG-501-2026';
  const joiningDate = data.joiningDate || new Date().toISOString().split('T')[0];
  const place = options.place || 'Nagpur, Maharashtra';

  // Resolve Images concurrently
  const [photoUrl, aadhaarUrl, passbookUrl, sigUrl] = await Promise.all([
    resolveImageToDataUrl(options.photoDataUrl || data.photo?.dataUrl || data.photo?.storagePath),
    resolveImageToDataUrl(options.aadhaarDataUrl || data.aadhaar?.dataUrl || data.aadhaar?.storagePath),
    resolveImageToDataUrl(options.bankPassbookDataUrl || data.bankPassbook?.dataUrl || data.bankPassbook?.storagePath),
    resolveImageToDataUrl(options.signatureDataUrl || data.signature?.dataUrl || data.signature?.storagePath)
  ]);

  // Helper: Draw Master Running Header
  const drawRunningHeader = (subTitle: string, pageNum: number, totalPages: number) => {
    // Top Accent Stripe
    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(...gold);
    doc.rect(0, 4, 210, 1.2, 'F');

    // Header Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...navy);
    doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text('Corporate Head Office: Nagpur, Maharashtra | Reg. Govt. of Maharashtra', 15, 16);

    // Right Metadata Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navy);
    doc.text(`REF: ${employeeCode}`, 195, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`DATE: ${joiningDate}`, 195, 16, { align: 'right' });

    // Section Bar
    doc.setFillColor(...bgLight);
    doc.rect(15, 19, 180, 6.5, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(15, 19, 180, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...navy);
    doc.text(subTitle.toUpperCase(), 18, 23.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    doc.text(`CONFIDENTIAL ONBOARDING RECORD`, 192, 23.5, { align: 'right' });

    // Running Footer
    doc.setDrawColor(...borderCol);
    doc.line(15, 285, 195, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('A TIGER GLOBAL Career Solution & Consultancy — Internal Employment Onboarding Record', 15, 289);
    doc.text(`Page ${pageNum} of ${totalPages}`, 195, 289, { align: 'right' });
  };

  // Helper: Draw 4-column Table Row
  let currentY = 28;
  const drawRow = (l1: string, v1?: string | null, l2?: string, v2?: string | null, height = 6.2) => {
    doc.setDrawColor(...borderCol);
    doc.rect(15, currentY, 180, height);
    doc.line(60, currentY, 60, currentY + height);
    doc.line(105, currentY, 105, currentY + height);
    doc.line(150, currentY, 150, currentY + height);

    // Left Col
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(l1, 17, currentY + height - 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(String(v1 || '—').slice(0, 32), 62, currentY + height - 2);

    // Right Col
    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(l2, 107, currentY + height - 2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(String(v2 || '—').slice(0, 32), 152, currentY + height - 2);
    }

    currentY += height;
  };

  const drawSectionTitle = (title: string, badge?: string) => {
    currentY += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, 180, 5.5, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(15, currentY, 180, 5.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navy);
    doc.text(title, 18, currentY + 3.8);

    if (badge) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...gold);
      doc.text(badge, 192, currentY + 3.8, { align: 'right' });
    }

    currentY += 5.5;
  };

  // ============================================================================
  // PAGE 1: JOINING DETAILS, PERSONAL DETAILS & BANKING
  // ============================================================================
  drawRunningHeader('PAGE 01 / 03 — EMPLOYEE PARTICULARS & ONBOARDING DETAILS', 1, 3);
  currentY = 28;

  // Banner Document Title
  doc.setFillColor(...navy);
  doc.rect(15, currentY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL EMPLOYEE JOINING DOSSIER & PROFILE', 105, currentY + 5.5, { align: 'center' });
  currentY += 10;

  // SECTION A: JOINING DETAILS
  drawSectionTitle('SECTION A: JOINING DETAILS (1–7)', 'OFFICIAL ONBOARDING');
  drawRow('1. Employee Code:', data.employeeCode, '2. Joining Date:', data.joiningDate);
  drawRow('3. Department:', data.department, '4. Designation:', data.designation);
  drawRow('5. Placement Company:', data.companyName, '6. Unit / Worksite:', data.unitName);
  drawRow(
    '7. Factory / Supervisor:',
    data.factorySupervisorName,
    'Date of Interview:',
    data.interviewDate ? String(data.interviewDate) : '—'
  );
  if (data.salaryCtc) {
    drawRow('Salary (CTC) per Month:', `₹ ${Number(data.salaryCtc).toLocaleString('en-IN')}`, 'Employment Status:', 'ACTIVE / VERIFIED');
  }

  // SECTION B: CANDIDATE PERSONAL DETAILS (NO PAN FIELD)
  drawSectionTitle('SECTION B: CANDIDATE PERSONAL DETAILS (8–21)', 'VERIFIED KYC RECORDS');
  drawRow('8. Full Legal Name:', data.fullName, "9. Father's Name:", data.fatherName);
  drawRow('10. Date of Birth:', data.dob, '11. Gender / Marital Status:', `${data.gender || '—'} / ${data.maritalStatus || '—'}`);
  drawRow('12. Aadhaar Number:', data.aadhaarNumber, '13. Mobile (Aadhaar):', data.mobile);
  drawRow('14. Alternate Mobile:', data.alternateMobile, '15. Official Email:', data.email);
  drawRow('16. UAN (PF Number):', data.uanNumber || 'Not Enrolled / N/A', '17. ESIC Number:', data.esicNumber || 'Not Enrolled / N/A');
  drawRow('18. Professional Tax (PT):', data.ptNumber || 'Not Enrolled / N/A', 'Verification Status:', data.submissionStatus || 'VERIFIED');

  // Address Row
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 180, 7.5);
  doc.line(60, currentY, 60, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('19. Permanent Address:', 17, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(String(data.permanentAddress || '—').slice(0, 75), 62, currentY + 5);
  currentY += 7.5;

  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 180, 7.5);
  doc.line(60, currentY, 60, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('20. Current Address:', 17, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(String(data.currentAddress || data.permanentAddress || '—').slice(0, 75), 62, currentY + 5);
  currentY += 7.5;

  // SECTION C: BANK DETAILS (INTERNAL ONLY)
  drawSectionTitle('SECTION C: BANK DISBURSEMENT PARTICULARS (22–26)', 'RESTRICTED / INTERNAL');
  drawRow('22. Bank Account No.:', data.bankAccountNumber, '23. IFSC Code:', data.ifscCode);
  drawRow('24. Bank Name:', data.bankName, '25. Branch Name:', data.branchName);
  drawRow('26. PhonePe / UPI Number:', data.upiNumber || 'Not Linked', 'Disbursement Channel:', 'Electronic Bank Transfer (NEFT/RTGS)');

  // Bottom Notice
  currentY += 4;
  doc.setFillColor(...bgLight);
  doc.rect(15, currentY, 180, 10, 'F');
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 180, 10, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...navy);
  doc.text('INTERNAL STATUTORY NOTE:', 18, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(
    'Banking and demographic data recorded herein are restricted to authorized Human Resources & Accounts administration. Details are maintained in compliance with statutory employment welfare guidelines.',
    18,
    currentY + 7.5,
    { maxWidth: 174 }
  );

  // ============================================================================
  // PAGE 2: REQUIRED PHOTOGRAPHS & ORIGINAL FORMAL JOINING UNDERTAKING
  // ============================================================================
  doc.addPage('a4', 'portrait');
  drawRunningHeader('PAGE 02 / 03 — REQUIRED PHOTOGRAPHS & FORMAL UNDERTAKING', 2, 3);
  currentY = 28;

  drawSectionTitle('SECTION D: STATUTORY PHOTOGRAPHS & UPLOADED DOCUMENTS (27–30)', 'ATTACHED SPECIMENS');

  // Render 4 document specimen boxes (2x2 grid)
  const boxW = 86;
  const boxH = 50;
  const col1X = 15;
  const col2X = 109;

  // Helper to draw specimen box
  const drawDocBox = (x: number, y: number, label: string, num: string, imgDataUrl: string | null) => {
    doc.setFillColor(...bgLight);
    doc.rect(x, y, boxW, boxH, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(x, y, boxW, boxH, 'S');

    // Title Strip
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, boxW, 6, 'F');
    doc.line(x, y + 6, x + boxW, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(`${num}. ${label}`, x + 3, y + 4.2);

    if (imgDataUrl) {
      try {
        const fmt = imgDataUrl.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(imgDataUrl, fmt, x + 3, y + 8, boxW - 6, boxH - 10, undefined, 'FAST');
      } catch {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...textMuted);
        doc.text('Image Attached On File', x + boxW / 2, y + boxH / 2, { align: 'center' });
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...textMuted);
      doc.text('Specimen Not Uploaded / Pending', x + boxW / 2, y + boxH / 2, { align: 'center' });
    }
  };

  // Row 1: Live Photo & Aadhaar Card Photo
  drawDocBox(col1X, currentY, 'Candidate Live Photo', '27', photoUrl);
  drawDocBox(col2X, currentY, 'Aadhaar Card Photo', '28', aadhaarUrl);
  currentY += boxH + 4;

  // Row 2: Bank Passbook & Signature Photo
  drawDocBox(col1X, currentY, 'Bank Passbook / Cheque', '29', passbookUrl);
  drawDocBox(col2X, currentY, 'Candidate Specimen Signature', '30', sigUrl);
  currentY += boxH + 6;

  // SECTION F: ORIGINAL FORMAL JOINING REPORT UNDERTAKING
  drawSectionTitle('SECTION E: JOINING REPORT (ORIGINAL FORMAL UNDERTAKING)', 'STATUTORY REPORTING');

  doc.setFillColor(254, 249, 195);
  doc.rect(15, currentY, 180, 16, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.rect(15, currentY, 180, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 63, 18);
  doc.text('FORMAL REPORTING PROCLAMATION:', 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(69, 26, 3);
  doc.text(
    FORMAL_JOINING_UNDERTAKING.proclamation(joiningDate),
    18,
    currentY + 8.5,
    { maxWidth: 174 }
  );
  currentY += 19;

  // Undertaking Terms Box
  doc.setFillColor(...bgLight);
  doc.rect(15, currentY, 180, 24, 'F');
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 180, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('UNDERTAKING COVENANTS & OBLIGATIONS:', 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...textDark);
  let termY = currentY + 9;
  FORMAL_JOINING_UNDERTAKING.terms.forEach((term, idx) => {
    doc.text(`${idx + 1}.  ${term}`, 20, termY);
    termY += 4.5;
  });
  currentY += 27;

  // Mid-way Acceptance Block
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 86, 18);
  doc.rect(109, currentY, 86, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...navy);
  doc.text('CANDIDATE INITIAL ACKNOWLEDGEMENT:', 18, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(data.fullName || 'Candidate', 18, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('HR VERIFICATION CELL:', 112, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('A TIGER GLOBAL Career Solution & Consultancy', 112, currentY + 14);

  // ============================================================================
  // PAGE 3: STATUTORY CODE OF CONDUCT & MASTER ATTESTATION
  // ============================================================================
  doc.addPage('a4', 'portrait');
  drawRunningHeader('PAGE 03 / 03 — STATUTORY CODE OF CONDUCT & ATTESTATION', 3, 3);
  currentY = 28;

  drawSectionTitle('SECTION F: STATUTORY UNDERTAKINGS & CODE OF CONDUCT', 'CANONICAL CLAUSES 1–6');

  // Render all 6 authentic undertakings from canonical constants
  STATUTORY_UNDERTAKINGS.forEach((item) => {
    doc.setFillColor(...bgLight);
    doc.rect(15, currentY, 180, 18, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(15, currentY, 180, 18, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(`${item.number}. ${item.title.toUpperCase()}`, 18, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    doc.text(item.content, 18, currentY + 8, { maxWidth: 174 });

    currentY += 20;
  });

  currentY += 1;

  // SECTION H: MASTER ATTESTATION & SIGNATURES
  drawSectionTitle('SECTION G: MASTER ATTESTATION & SIGNATURE', 'LEGALLY BINDING');

  // Statement box
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 180, 14, 'F');
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 180, 14, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  doc.text(MASTER_ATTESTATION.statement, 18, currentY + 4, { maxWidth: 174 });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(MASTER_ATTESTATION.declarationAcknowledgeNote, 18, currentY + 11.5, { maxWidth: 174 });
  currentY += 16;

  // Signatures Row
  doc.setDrawColor(...borderCol);
  doc.rect(15, currentY, 86, 28);
  doc.rect(109, currentY, 86, 28);

  // Left: Candidate Signature Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('CANDIDATE FINAL SIGNATURE:', 18, currentY + 4.5);

  if (sigUrl) {
    try {
      const sFmt = sigUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(sigUrl, sFmt, 18, currentY + 6.5, 45, 12, undefined, 'FAST');
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text(`Name: ${data.fullName}`, 18, currentY + 21);
  doc.text(`Place: ${place} | Date: ${joiningDate}`, 18, currentY + 25);

  // Right: HR Authorization Stamp Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('AUTHORIZED HR MANAGEMENT SIGNATORY:', 112, currentY + 4.5);

  if (options.companySignatureUrl) {
    try {
      doc.addImage(options.companySignatureUrl, 'PNG', 112, currentY + 6.5, 45, 12, undefined, 'FAST');
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text(`Authorized Officer: ${options.verifierName || 'Administrative Cell'}`, 112, currentY + 21);
  doc.text('A TIGER GLOBAL Career Solution & Consultancy', 112, currentY + 25);

  return doc;
}

/**
 * Downloads the complete joining document directly in browser.
 */
export async function downloadCompleteJoiningDocumentPdf(
  data: RegularJoiningFormData,
  options: CompleteJoiningDocOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const doc = await generateCompleteJoiningDocumentPdf(data, options);
    const sanitizedName = (data.fullName || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCode = (data.employeeCode || 'ATG').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedCode}-${sanitizedName}-Complete-Joining-Document.pdf`;

    // Direct browser download
    doc.save(fileName);

    // Persist audit record in generated_files if supported
    try {
      const blob = doc.output('blob');
      await persistGeneratedDocument({
        fileName,
        fileType: 'JOINING_PACKET_PDF',
        joiningFormId: data.id || undefined,
        blob
      });
    } catch (auditErr) {
      console.warn('[downloadCompleteJoiningDocumentPdf] Audit persistence warning:', auditErr);
    }

    return { success: true, fileName };
  } catch (err: any) {
    console.error('[downloadCompleteJoiningDocumentPdf] Error:', err);
    return { success: false, fileName: '', error: err.message || 'Failed to generate Complete Joining Document PDF.' };
  }
}

/**
 * Generates standalone Employee Declaration PDF (Item 3 in the Documents panel).
 */
export async function downloadEmployeeDeclarationPdf(
  data: RegularJoiningFormData,
  options: CompleteJoiningDocOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    type RGBColor = [number, number, number];
    const navy: RGBColor = [15, 27, 56];
    const gold: RGBColor = [197, 160, 89];
    const textDark: RGBColor = [30, 41, 59];
    const textMuted: RGBColor = [100, 116, 139];
    const borderCol: RGBColor = [203, 213, 225];
    const bgLight: RGBColor = [248, 250, 252];

    const employeeCode = data.employeeCode || 'ATG-501-2026';
    const joiningDate = data.joiningDate || new Date().toISOString().split('T')[0];
    const place = options.place || 'Nagpur, Maharashtra';

    // Header Stripe
    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(...gold);
    doc.rect(0, 4, 210, 1.2, 'F');

    // Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text('Corporate Head Office: Nagpur, Maharashtra | Registered Employment Consultancy', 15, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...navy);
    doc.text(`EMPLOYEE CODE: ${employeeCode}`, 195, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`DATE: ${joiningDate}`, 195, 17, { align: 'right' });

    // Title
    doc.setFillColor(...navy);
    doc.rect(15, 21, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('EMPLOYEE STATUTORY DECLARATION & CODE OF CONDUCT', 105, 26.5, { align: 'center' });

    let y = 33;

    // Candidate identification box
    doc.setFillColor(...bgLight);
    doc.rect(15, y, 180, 10, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(15, y, 180, 10, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text('Candidate Name:', 18, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(data.fullName || '—', 48, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text("Father's Name:", 110, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(data.fatherName || '—', 140, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('Designation:', 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(data.designation || 'Associate', 48, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('Work Unit:', 110, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(data.unitName || data.companyName || 'Nagpur Unit', 140, y + 8);

    y += 14;

    // Proclamation
    doc.setFillColor(254, 249, 195);
    doc.rect(15, y, 180, 12, 'F');
    doc.setDrawColor(253, 230, 138);
    doc.rect(15, y, 180, 12, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 26, 3);
    doc.text(
      `I, ${data.fullName || 'the undersigned employee'}, hereby certify and solemnize the following statutory declarations governing my employment with A TIGER GLOBAL Career Solution & Consultancy:`,
      18,
      y + 4.5,
      { maxWidth: 174 }
    );
    y += 15;

    // Render Declarations
    STATUTORY_UNDERTAKINGS.forEach((item) => {
      doc.setFillColor(...bgLight);
      doc.rect(15, y, 180, 19, 'F');
      doc.setDrawColor(...borderCol);
      doc.rect(15, y, 180, 19, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...navy);
      doc.text(`${item.number}. ${item.title.toUpperCase()}`, 18, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...textDark);
      doc.text(item.content, 18, y + 8, { maxWidth: 174 });

      y += 21;
    });

    y += 2;

    // Attestation & Signatures
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 8, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(15, y, 180, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...navy);
    doc.text(
      'ATTESTATION: I confirm that all information stated is legally binding and discrepancies may lead to service termination.',
      18,
      y + 5
    );
    y += 10;

    // Signatures
    doc.setDrawColor(...borderCol);
    doc.rect(15, y, 86, 26);
    doc.rect(109, y, 86, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text('CANDIDATE SIGNATURE:', 18, y + 5);

    const sigUrl = await resolveImageToDataUrl(options.signatureDataUrl || data.signature?.dataUrl || data.signature?.storagePath);
    if (sigUrl) {
      try {
        const sFmt = sigUrl.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(sigUrl, sFmt, 18, y + 7, 45, 11, undefined, 'FAST');
      } catch {
        // ignore
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textDark);
    doc.text(`Employee: ${data.fullName}`, 18, y + 20);
    doc.text(`Place: ${place} | Date: ${joiningDate}`, 18, y + 23.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text('HR MANAGEMENT VERIFICATION:', 112, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textDark);
    doc.text('A TIGER GLOBAL Career Solution & Consultancy', 112, y + 20);
    doc.text(`Status: VERIFIED & CONFIRMED ON RECORD`, 112, y + 23.5);

    // Footer
    doc.setDrawColor(...borderCol);
    doc.line(15, 285, 195, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('A TIGER GLOBAL — Statutory Employee Declaration Record (A4 Vector Format)', 15, 289);
    doc.text('Page 1 of 1', 195, 289, { align: 'right' });

    const sanitizedName = (data.fullName || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCode = (data.employeeCode || 'ATG').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedCode}-${sanitizedName}-Employee-Declaration.pdf`;

    doc.save(fileName);

    return { success: true, fileName };
  } catch (err: any) {
    console.error('[downloadEmployeeDeclarationPdf] Error:', err);
    return { success: false, fileName: '', error: err.message || 'Failed to generate Employee Declaration PDF.' };
  }
}
