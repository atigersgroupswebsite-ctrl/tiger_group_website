// ==============================================================================
// File: src/services/regularReferenceSlipPdfGenerator.ts
// Description: Dedicated Dynamic 1-Page Vector PDF Generator for Regular Employee Reference Slip
// Brand: A TIGER GLOBAL Career Solution & Consultancy
// Standard: Single-Page A4 Portrait (210mm x 297mm)
// Rules:
//   - EXACTLY 1 PAGE. Never spills into a second page.
//   - Section 1: Candidate Details (No PAN, Candidate Live Photo on right)
//   - Section 2: For Company Use Only (Exactly 4 fields: Date of Interview, Department, Designation, Salary CTC)
//   - Section 3: Removed completely.
//   - No QR Code or QR-based public verification block.
//   - Preserves authorized company signature & consultancy seal placeholders.
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { RegularJoiningFormData } from './regularJoiningService';
import { persistGeneratedDocument } from './filePersistenceService';

export interface GenerateRegularReferenceSlipResult {
  success: boolean;
  blob?: Blob;
  pdfBytes?: Uint8Array;
  fileName?: string;
  storagePath?: string;
  error?: string;
}

function containsSubsequence(source: Uint8Array, target: number[]): boolean {
  if (source.length < target.length) return false;
  for (let i = 0; i <= source.length - target.length; i++) {
    let match = true;
    for (let j = 0; j < target.length; j++) {
      if (source[i + j] !== target[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

async function resolveImageBytes(
  source?: string | null
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!source) return null;

  try {
    let rawBytes: Uint8Array | null = null;

    // 1. Data URL
    if (source.startsWith('data:')) {
      const base64 = source.split(',')[1];
      if (!base64) return null;
      const binary = atob(base64);
      rawBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        rawBytes[i] = binary.charCodeAt(i);
      }
    }
    // 2. Supabase Storage Path
    else if (isSupabaseConfigured && !source.startsWith('http://') && !source.startsWith('https://')) {
      let bucket = 'candidate-documents';
      let filePath = source;
      if (source.startsWith('candidate-documents/')) {
        bucket = 'candidate-documents';
        filePath = source.replace(/^candidate-documents\//, '');
      } else if (source.startsWith('company-assets/')) {
        bucket = 'company-assets';
        filePath = source.replace(/^company-assets\//, '');
      }

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (!error && data) {
        const arrayBuf = await data.arrayBuffer();
        rawBytes = new Uint8Array(arrayBuf);
      }
    }
    // 3. HTTP / HTTPS URL
    else if (source.startsWith('http://') || source.startsWith('https://')) {
      const resp = await fetch(source);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        rawBytes = new Uint8Array(arrayBuf);
      }
    }

    if (!rawBytes || rawBytes.length < 16) return null;

    const isPng =
      rawBytes[0] === 0x89 &&
      rawBytes[1] === 0x50 &&
      rawBytes[2] === 0x4e &&
      rawBytes[3] === 0x47 &&
      containsSubsequence(rawBytes, [0x49, 0x45, 0x4e, 0x44]);

    const isJpg =
      rawBytes[0] === 0xff &&
      rawBytes[1] === 0xd8 &&
      containsSubsequence(rawBytes, [0xff, 0xd9]);

    if (isPng) return { bytes: rawBytes, isPng: true };
    if (isJpg) return { bytes: rawBytes, isPng: false };

    return null;
  } catch (err) {
    console.warn('[resolveImageBytes] Failed to resolve image:', err);
    return null;
  }
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd} / ${mm} / ${yyyy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Builds the official 1-page vector PDF for the Regular Joining Form Reference Slip.
 */
export async function buildRegularReferenceSlipPdf(
  formData: RegularJoiningFormData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Typography
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Official Brand Palette
  const navy = rgb(0.06, 0.11, 0.22); // #0F1B38
  const gold = rgb(0.77, 0.63, 0.35); // #C5A059
  const darkSlate = rgb(0.12, 0.16, 0.23); // #1E293B
  const textMuted = rgb(0.39, 0.45, 0.55); // #64748B
  const textBody = rgb(0.2, 0.25, 0.33); // #334155
  const bgLight = rgb(0.96, 0.97, 0.98); // #F8FAFC
  const borderLight = rgb(0.82, 0.86, 0.9); // #CBD5E1
  const white = rgb(1, 1, 1);

  // Standard A4 Dimensions
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 523.28
  const BORDER_INSET = 26;

  // Resolve candidate photo
  let candidatePhoto: any = null;
  const photoSource = formData.photo?.dataUrl || formData.photo?.storagePath;
  if (photoSource) {
    try {
      const resolved = await resolveImageBytes(photoSource);
      if (resolved) {
        candidatePhoto = resolved.isPng
          ? await pdfDoc.embedPng(resolved.bytes)
          : await pdfDoc.embedJpg(resolved.bytes);
      }
    } catch (photoErr) {
      console.warn('[buildRegularReferenceSlipPdf] Could not embed candidate photo:', photoErr);
    }
  }

  // ===========================================================================
  // EXACTLY ONE PAGE: EMPLOYEE REFERENCE SLIP
  // ===========================================================================
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer Decorative Borders
  page.drawRectangle({
    x: BORDER_INSET,
    y: BORDER_INSET,
    width: PAGE_WIDTH - BORDER_INSET * 2,
    height: PAGE_HEIGHT - BORDER_INSET * 2,
    borderColor: navy,
    borderWidth: 1.5,
    color: white
  });
  page.drawRectangle({
    x: BORDER_INSET + 3,
    y: BORDER_INSET + 3,
    width: PAGE_WIDTH - (BORDER_INSET + 3) * 2,
    height: PAGE_HEIGHT - (BORDER_INSET + 3) * 2,
    borderColor: gold,
    borderWidth: 0.75
  });

  // Header Box - Brand Identity
  page.drawText('A TIGER GLOBAL', {
    x: MARGIN_X,
    y: 790,
    size: 20,
    font: helveticaBold,
    color: navy
  });
  page.drawText('CAREER SOLUTION & CONSULTANCY', {
    x: MARGIN_X,
    y: 775,
    size: 10,
    font: helveticaBold,
    color: gold
  });
  page.drawText('MANPOWER CONSULTANT | RECRUITMENT | PLACEMENT SERVICES', {
    x: MARGIN_X,
    y: 762,
    size: 7.5,
    font: helvetica,
    color: textMuted
  });
  page.drawText('OFF. PLOT NO. 440, BEHIND ROYAL CLUB, SUBHAN NAGAR, NAGPUR MH 440035', {
    x: MARGIN_X,
    y: 751,
    size: 7.5,
    font: helvetica,
    color: textMuted
  });
  page.drawText('PHONE: +91 8349353946 | EMAIL: ATIGERGLOBAL@GMAIL.COM | REG. NO.: 106157392603', {
    x: MARGIN_X,
    y: 740,
    size: 7,
    font: helvetica,
    color: textMuted
  });

  // Right Reference Number & Date Box
  const refBoxX = 390;
  const refBoxY = 736;
  const refBoxW = 168;
  const refBoxH = 56;
  page.drawRectangle({
    x: refBoxX,
    y: refBoxY,
    width: refBoxW,
    height: refBoxH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });
  page.drawText('REFERENCE NO.', {
    x: refBoxX + 8,
    y: refBoxY + 42,
    size: 7.5,
    font: helveticaBold,
    color: textMuted
  });
  page.drawText(formData.employeeCode || 'ATG-501-2026', {
    x: refBoxX + 8,
    y: refBoxY + 28,
    size: 10,
    font: helveticaBold,
    color: navy
  });

  const formattedDate = formatDisplayDate(formData.joiningDate || new Date().toISOString());
  page.drawText(`DATE: ${formattedDate}`, {
    x: refBoxX + 8,
    y: refBoxY + 12,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });

  // Title Banner
  const bannerY = 702;
  page.drawRectangle({
    x: MARGIN_X,
    y: bannerY,
    width: CONTENT_WIDTH,
    height: 24,
    color: navy
  });
  page.drawText('EMPLOYEE REFERENCE SLIP', {
    x: MARGIN_X + 175,
    y: bannerY + 7,
    size: 11.5,
    font: helveticaBold,
    color: white
  });

  // Certification Paragraph
  const introY = 678;
  page.drawText(
    'This is to certify that the candidate mentioned below has been referred by A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY',
    { x: MARGIN_X, y: introY, size: 8, font: helveticaOblique, color: textBody }
  );
  page.drawText('for employment in your esteemed organization.', {
    x: MARGIN_X,
    y: introY - 11,
    size: 8,
    font: helveticaOblique,
    color: textBody
  });

  // ===========================================================================
  // SECTION 1: CANDIDATE DETAILS
  // ===========================================================================
  const sec1Y = 645;
  page.drawRectangle({
    x: MARGIN_X,
    y: sec1Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97)
  });
  page.drawText('1. CANDIDATE DETAILS', {
    x: MARGIN_X + 8,
    y: sec1Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy
  });

  const candBoxY = 445;
  const candBoxH = 195;
  page.drawRectangle({
    x: MARGIN_X,
    y: candBoxY,
    width: CONTENT_WIDTH,
    height: candBoxH,
    borderColor: borderLight,
    borderWidth: 1
  });

  const displayAddress = formData.currentAddress || formData.permanentAddress || '—';

  // 10 Candidate Rows (NO PAN Number as strictly requested)
  const cRows = [
    { label: '1. Candidate Name', val: formData.fullName || '—', bold: true },
    { label: "2. Father's Name", val: formData.fatherName || '—' },
    { label: '3. Date of Birth', val: `${formatDisplayDate(formData.dob)}        Gender: ${formData.gender || '—'}` },
    { label: '4. Mobile No.', val: formData.mobile || '—' },
    { label: '5. Email Address', val: formData.email || '—' },
    { label: '6. Address', val: displayAddress, maxLen: 46 },
    { label: '7. Aadhaar No.', val: formData.aadhaarNumber ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}` : '—' },
    { label: '8. Designation Applied / Designation', val: formData.designation || '—', bold: true },
    { label: '9. Expected Date of Joining', val: formatDisplayDate(formData.joiningDate) || 'Immediate' },
    { label: '10. Department', val: formData.department || '—' }
  ];

  let curY = candBoxY + candBoxH - 18;
  const leftColWidth = 145;
  const photoW = 100;
  const photoH = 130;
  const photoX = MARGIN_X + CONTENT_WIDTH - photoW - 12;
  const photoY = candBoxY + (candBoxH - photoH) / 2;

  cRows.forEach((r) => {
    page.drawText(r.label, {
      x: MARGIN_X + 10,
      y: curY,
      size: 8,
      font: helveticaBold,
      color: darkSlate
    });
    page.drawText(':', {
      x: MARGIN_X + leftColWidth - 5,
      y: curY,
      size: 8,
      font: helveticaBold,
      color: textMuted
    });
    const valText = String(r.val).substring(0, r.maxLen || 42);
    page.drawText(valText, {
      x: MARGIN_X + leftColWidth + 5,
      y: curY,
      size: 8,
      font: r.bold ? helveticaBold : helvetica,
      color: r.bold ? navy : textBody
    });
    curY -= 18;
  });

  // Candidate Live Photo Box on Right
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });

  if (candidatePhoto) {
    page.drawImage(candidatePhoto, {
      x: photoX + 1,
      y: photoY + 1,
      width: photoW - 2,
      height: photoH - 2
    });
  } else {
    page.drawText('CANDIDATE', {
      x: photoX + 24,
      y: photoY + 70,
      size: 8,
      font: helveticaBold,
      color: textMuted
    });
    page.drawText('LIVE PHOTO', {
      x: photoX + 22,
      y: photoY + 56,
      size: 8,
      font: helveticaBold,
      color: textMuted
    });
  }

  // ===========================================================================
  // SECTION 2: FOR COMPANY USE ONLY
  // MUST CONTAIN ONLY 4 FIELDS:
  // 1. Date of Interview
  // 2. Department
  // 3. Designation
  // 4. Salary (CTC)
  // ===========================================================================
  const sec2Y = 412;
  page.drawRectangle({
    x: MARGIN_X,
    y: sec2Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97)
  });
  page.drawText('2. FOR COMPANY USE ONLY', {
    x: MARGIN_X + 8,
    y: sec2Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy
  });

  const compBoxY = 278;
  const compBoxH = 128;
  page.drawRectangle({
    x: MARGIN_X,
    y: compBoxY,
    width: CONTENT_WIDTH,
    height: compBoxH,
    borderColor: borderLight,
    borderWidth: 1
  });

  const salaryDisplay = formData.salaryCtc
    ? `INR ${Number(formData.salaryCtc).toLocaleString('en-IN')} / Month`
    : '—';

  const compFields = [
    {
      l1: '1. Date of Interview',
      v1: formatDisplayDate(formData.interviewDate) || '_____________________',
      l2: '2. Department',
      v2: formData.department || '_____________________'
    },
    {
      l1: '3. Designation',
      v1: formData.designation || '_____________________',
      l2: '4. Salary (CTC)',
      v2: salaryDisplay
    }
  ];

  let compY = compBoxY + compBoxH - 34;
  compFields.forEach((cf) => {
    // Column 1
    page.drawText(cf.l1, {
      x: MARGIN_X + 16,
      y: compY,
      size: 9,
      font: helveticaBold,
      color: darkSlate
    });
    page.drawText(':', {
      x: MARGIN_X + 130,
      y: compY,
      size: 9,
      font: helveticaBold,
      color: textMuted
    });
    page.drawText(String(cf.v1), {
      x: MARGIN_X + 142,
      y: compY,
      size: 9,
      font: helvetica,
      color: textBody
    });

    // Column 2
    page.drawText(cf.l2, {
      x: MARGIN_X + 285,
      y: compY,
      size: 9,
      font: helveticaBold,
      color: darkSlate
    });
    page.drawText(':', {
      x: MARGIN_X + 380,
      y: compY,
      size: 9,
      font: helveticaBold,
      color: textMuted
    });
    page.drawText(String(cf.v2), {
      x: MARGIN_X + 392,
      y: compY,
      size: 9,
      font: helvetica,
      color: textBody
    });

    compY -= 50;
  });

  // Note Paragraph
  const noteY = 252;
  page.drawText(
    'NOTE : This slip is valid for 15 days from the date of issue. This is an official reference slip and must be carried along with original documents.',
    { x: MARGIN_X, y: noteY, size: 7.2, font: helveticaBold, color: darkSlate }
  );
  page.drawText(
    'This candidate is referred by A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY. Please consider him / her for the recruitment process.',
    { x: MARGIN_X, y: noteY - 11, size: 7.2, font: helveticaOblique, color: textMuted }
  );

  // ===========================================================================
  // BOTTOM SECTION:
  // Authorized Company Signature and Consultancy Seal
  // NO QR Code (Section 3 is completely removed!)
  // ===========================================================================
  const bottomY = 70;
  const bottomH = 155;

  page.drawRectangle({
    x: MARGIN_X,
    y: bottomY,
    width: CONTENT_WIDTH,
    height: bottomH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });

  // Left Seal Box
  const sealBoxX = MARGIN_X + 30;
  const sealBoxY = bottomY + 20;
  const sealBoxW = 200;
  const sealBoxH = 115;

  page.drawRectangle({
    x: sealBoxX,
    y: sealBoxY,
    width: sealBoxW,
    height: sealBoxH,
    borderColor: borderLight,
    borderWidth: 1,
    color: white
  });

  page.drawText('A TIGER GLOBAL', {
    x: sealBoxX + 54,
    y: sealBoxY + 84,
    size: 10,
    font: helveticaBold,
    color: gold
  });
  page.drawText('CONSULTANCY SEAL', {
    x: sealBoxX + 46,
    y: sealBoxY + 68,
    size: 9,
    font: helveticaBold,
    color: navy
  });
  page.drawText('[ OFFICIAL VERIFIED STAMP ]', {
    x: sealBoxX + 36,
    y: sealBoxY + 44,
    size: 8,
    font: helvetica,
    color: textMuted
  });
  page.drawText('NAGPUR, MAHARASHTRA', {
    x: sealBoxX + 44,
    y: sealBoxY + 28,
    size: 7.5,
    font: helvetica,
    color: textMuted
  });

  // Right Signatory Box
  const sigBoxX = MARGIN_X + CONTENT_WIDTH - 230;
  const sigBoxY = bottomY + 20;
  const sigBoxW = 200;
  const sigBoxH = 115;

  page.drawRectangle({
    x: sigBoxX,
    y: sigBoxY,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: borderLight,
    borderWidth: 1,
    color: white
  });

  page.drawText('AUTHORIZED SIGNATORY', {
    x: sigBoxX + 38,
    y: sigBoxY + 84,
    size: 9.5,
    font: helveticaBold,
    color: navy
  });
  page.drawText('A TIGER GLOBAL CAREER SOLUTION', {
    x: sigBoxX + 16,
    y: sigBoxY + 54,
    size: 8,
    font: helvetica,
    color: textBody
  });
  page.drawText('& CONSULTANCY', {
    x: sigBoxX + 60,
    y: sigBoxY + 40,
    size: 8,
    font: helvetica,
    color: textBody
  });
  page.drawText('(Corporate Onboarding Authority)', {
    x: sigBoxX + 32,
    y: sigBoxY + 22,
    size: 7.5,
    font: helveticaOblique,
    color: textMuted
  });

  return await pdfDoc.save();
}

/**
 * Generates the official 1-page Regular Employee Reference Slip as a PDF Blob.
 */
export async function generateRegularReferenceSlipPdfBlob(
  formData: RegularJoiningFormData
): Promise<Blob> {
  const pdfBytes = await buildRegularReferenceSlipPdf(formData);
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Triggers browser download of the official 1-page Regular Employee Reference Slip.
 */
export async function downloadRegularReferenceSlipPdf(
  formData: RegularJoiningFormData
): Promise<GenerateRegularReferenceSlipResult> {
  try {
    const pdfBytes = await buildRegularReferenceSlipPdf(formData);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const cleanRef = (formData.employeeCode || 'REGULAR-REFERENCE-SLIP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanRef}-REFERENCE-SLIP.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      blob,
      pdfBytes,
      fileName
    };
  } catch (err: any) {
    console.error('[downloadRegularReferenceSlipPdf] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to generate reference slip PDF.'
    };
  }
}

/**
 * Automatically generates and persists the official 1-page Regular Employee Reference Slip
 * against the joining record without triggering an intrusive browser download modal.
 */
export async function generateAndPersistRegularReferenceSlip(
  formData: RegularJoiningFormData,
  joiningFormId?: string | null,
  currentAdminId?: string | null
): Promise<GenerateRegularReferenceSlipResult> {
  try {
    const pdfBytes = await buildRegularReferenceSlipPdf(formData);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const cleanRef = (formData.employeeCode || 'REGULAR-REFERENCE-SLIP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanRef}-REFERENCE-SLIP.pdf`;

    let storagePath: string | undefined;

    // Persist to secure storage archive if configured
    if (isSupabaseConfigured && joiningFormId) {
      try {
        const persistRes = await persistGeneratedDocument({
          joiningFormId,
          fileType: 'REFERENCE_SLIP_PDF',
          fileName,
          blob,
          generatedBy: currentAdminId || undefined
        });
        if (persistRes.success) {
          storagePath = persistRes.storagePath;
        }
      } catch (persistErr) {
        console.warn('[generateAndPersistRegularReferenceSlip] Storage persistence notice:', persistErr);
      }
    }

    return {
      success: true,
      blob,
      pdfBytes,
      fileName,
      storagePath
    };
  } catch (err: any) {
    console.error('[generateAndPersistRegularReferenceSlip] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to generate 1-page reference slip PDF.'
    };
  }
}
