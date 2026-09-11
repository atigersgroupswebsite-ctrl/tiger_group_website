// ==============================================================================
// File: src/services/referenceSlipPdfGenerator.ts
// Description: Dedicated Dynamic 2-Page Vector PDF Generator for Reference Slip & Consultancy Return
// Authority: Faithfully preserves client master: refrence slip.pdf (vector synthesized, no background overlay)
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Layout:
//   Page 1: Employee Reference Slip (Candidate KYC, Photo, Admin & Company Result)
//   Page 2: Consultancy Return Form (Demographics, 10 Official Terms, Acceptance, Signature)
// Security & Storage:
//   - Synthesizes clean 2-page vector PDF via pdf-lib without loading master template overlay
//   - Persists into private 'generated-documents' Supabase bucket
//   - Records audit trail in public.generated_files ledger with versioning
//   - Never exposes permanent public URLs (authenticated signed URLs only)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { persistGeneratedDocument, getGeneratedDocumentSignedUrl } from './filePersistenceService';
import { logActivity } from './activityService';
import type { ReferenceSlipDetailData } from './referenceSlipService';

export interface GenerateReferenceSlipPdfResult {
  success: boolean;
  blob?: Blob;
  signedUrl?: string;
  storagePath?: string;
  fileId?: string;
  version?: number;
  pdfBytes?: Uint8Array;
  error?: string;
}

/**
 * Checks if Uint8Array contains a sub-sequence of bytes
 */
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

/**
 * Validates and converts image source (DataUrl, Storage Path, or HTTP URL) into verified Uint8Array bytes.
 * Guarded against truncated or corrupt PNG/JPEG mock data to prevent parser CPU loops.
 */
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
    // 2. Supabase Storage Path (e.g., candidate-documents/photo.jpg or generated-documents/...)
    else if (isSupabaseConfigured && !source.startsWith('http://') && !source.startsWith('https://')) {
      let bucket = 'candidate-documents';
      let filePath = source;
      if (source.startsWith('candidate-documents/')) {
        bucket = 'candidate-documents';
        filePath = source.replace(/^candidate-documents\//, '');
      } else if (source.startsWith('generated-documents/')) {
        bucket = 'generated-documents';
        filePath = source.replace(/^generated-documents\//, '');
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

    // Strict integrity verification to avoid UPNG parser infinite loops on truncated files
    const isPng =
      rawBytes[0] === 0x89 &&
      rawBytes[1] === 0x50 &&
      rawBytes[2] === 0x4e &&
      rawBytes[3] === 0x47 &&
      containsSubsequence(rawBytes, [0x49, 0x45, 0x4e, 0x44]); // 'IEND'

    const isJpg =
      rawBytes[0] === 0xff &&
      rawBytes[1] === 0xd8 &&
      containsSubsequence(rawBytes, [0xff, 0xd9]); // EOI

    if (isPng) {
      return { bytes: rawBytes, isPng: true };
    }
    if (isJpg) {
      return { bytes: rawBytes, isPng: false };
    }

    // Invalid or corrupt image format
    console.warn('[resolveImageBytes] Image skipped: missing valid PNG IEND or JPEG EOI markers.');
    return null;
  } catch (err) {
    console.warn('[resolveImageBytes] Failed to resolve image:', err);
    return null;
  }
}

/**
 * Formats ISO date (YYYY-MM-DD) to printable Indian format: DD / MM / YYYY
 */
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
 * Splits text into lines fitting within maxWidth based on pdf-lib font metrics
 */
function wrapText(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  paragraphs.forEach((para) => {
    const words = para.split(' ');
    let currentLine = '';
    words.forEach((w) => {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
  });
  return lines;
}

/**
 * Generates the official 2-page dynamic Reference Slip & Consultancy Return PDF.
 * Pure vector generation: Does NOT overlay onto a master PDF.
 */
export async function buildDynamicReferenceSlipPdf(
  detail: ReferenceSlipDetailData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Typography
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Official Palette
  const navy = rgb(0.06, 0.11, 0.22); // #0F1B38
  const gold = rgb(0.77, 0.63, 0.35); // #C5A059
  const darkSlate = rgb(0.12, 0.16, 0.23); // #1E293B
  const textMuted = rgb(0.39, 0.45, 0.55); // #64748B
  const textBody = rgb(0.2, 0.25, 0.33); // #334155
  const bgLight = rgb(0.96, 0.97, 0.98); // #F8FAFC
  const borderLight = rgb(0.82, 0.86, 0.9); // #CBD5E1
  const white = rgb(1, 1, 1);
  const green = rgb(0.08, 0.5, 0.24);
  const red = rgb(0.8, 0.1, 0.1);

  // Standard A4 Dimensions
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 523.28

  const { slip, candidate } = detail;

  // Resolve candidate photo if available
  let candidatePhoto: any = null;
  if (candidate.photoUrl) {
    try {
      const resolved = await resolveImageBytes(candidate.photoUrl);
      if (resolved) {
        candidatePhoto = resolved.isPng
          ? await pdfDoc.embedPng(resolved.bytes)
          : await pdfDoc.embedJpg(resolved.bytes);
      }
    } catch (photoErr) {
      console.warn('[buildDynamicReferenceSlipPdf] Could not embed candidate photo:', photoErr);
    }
  }

  // ===========================================================================
  // PAGE 1: EMPLOYEE REFERENCE SLIP
  // ===========================================================================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer Decorative Borders
  page1.drawRectangle({
    x: 20,
    y: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderColor: navy,
    borderWidth: 1.5,
    color: white
  });
  page1.drawRectangle({
    x: 23,
    y: 23,
    width: PAGE_WIDTH - 46,
    height: PAGE_HEIGHT - 46,
    borderColor: gold,
    borderWidth: 0.75
  });

  // Header Box - Brand Identity
  page1.drawText('A TIGER GLOBAL', {
    x: MARGIN_X,
    y: 785,
    size: 20,
    font: helveticaBold,
    color: navy
  });
  page1.drawText('CAREER SOLUTION & CONSULTANCY', {
    x: MARGIN_X,
    y: 770,
    size: 10,
    font: helveticaBold,
    color: gold
  });
  page1.drawText('MANPOWER CONSULTANT | RECRUITMENT | PLACEMENT SERVICES', {
    x: MARGIN_X,
    y: 757,
    size: 7.5,
    font: helvetica,
    color: textMuted
  });
  page1.drawText('OFF. PLOT NO. 440, BEHIND ROYAL CLUB, SUBHAN NAGAR, NAGPUR MH 440035', {
    x: MARGIN_X,
    y: 746,
    size: 7.5,
    font: helvetica,
    color: textMuted
  });
  page1.drawText('PHONE: +91 8349353946 | EMAIL: ATIGERGLOBAL@GMAIL.COM | REG. NO.: 106157392603', {
    x: MARGIN_X,
    y: 735,
    size: 7,
    font: helvetica,
    color: textMuted
  });

  // Right Reference Number & Date Box
  const refBoxX = 390;
  const refBoxY = 740;
  const refBoxW = 168;
  const refBoxH = 55;
  page1.drawRectangle({
    x: refBoxX,
    y: refBoxY,
    width: refBoxW,
    height: refBoxH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });
  page1.drawText('REFERENCE NO.', {
    x: refBoxX + 8,
    y: refBoxY + 38,
    size: 7.5,
    font: helveticaBold,
    color: textMuted
  });
  page1.drawText(slip.reference_number || 'ATG/REF/2026/000000', {
    x: refBoxX + 8,
    y: refBoxY + 25,
    size: 8.5,
    font: helveticaBold,
    color: navy
  });
  page1.drawText(`DATE: ${formatDisplayDate(slip.date || slip.created_at)}`, {
    x: refBoxX + 8,
    y: refBoxY + 10,
    size: 8,
    font: helvetica,
    color: darkSlate
  });

  // Title Banner
  const bannerY = 700;
  page1.drawRectangle({
    x: MARGIN_X,
    y: bannerY,
    width: CONTENT_WIDTH,
    height: 24,
    color: navy
  });
  page1.drawText('EMPLOYEE REFERENCE SLIP', {
    x: MARGIN_X + 175,
    y: bannerY + 7,
    size: 11.5,
    font: helveticaBold,
    color: white
  });

  // Certification Paragraph
  const introY = 678;
  page1.drawText(
    'This is to certify that the candidate mentioned below has been referred by A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY',
    { x: MARGIN_X, y: introY, size: 8, font: helveticaOblique, color: textBody }
  );
  page1.drawText('for employment in your esteemed organization.', {
    x: MARGIN_X,
    y: introY - 11,
    size: 8,
    font: helveticaOblique,
    color: textBody
  });

  // Section 1: Candidate Details
  const sec1Y = 645;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec1Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97)
  });
  page1.drawText('1. CANDIDATE DETAILS', {
    x: MARGIN_X + 8,
    y: sec1Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy
  });

  const candBoxY = 460;
  const candBoxH = 180;
  page1.drawRectangle({
    x: MARGIN_X,
    y: candBoxY,
    width: CONTENT_WIDTH,
    height: candBoxH,
    borderColor: borderLight,
    borderWidth: 1
  });

  const cRows = [
    { label: '1. Candidate Name', val: candidate.fullName || '—', bold: true },
    { label: "2. Father's Name", val: candidate.fatherName || '—' },
    { label: '3. Date of Birth', val: `${formatDisplayDate(candidate.dob)}        Gender: ${candidate.gender || '—'}` },
    { label: '4. Mobile No.', val: candidate.mobile || '—' },
    { label: '5. Email Address', val: candidate.email || '—' },
    { label: '6. Address', val: candidate.address || '—', maxLen: 50 },
    { label: '7. Aadhaar No.', val: candidate.aadhaarNumber || '—' },
    { label: '8. PAN', val: candidate.panNumber || '—' },
    { label: '9. Position Applied', val: candidate.positionApplied || slip.designation || 'Consultant / Executive', bold: true },
    { label: '10. Expected Date of Joining', val: formatDisplayDate(candidate.expectedJoiningDate || slip.joining_date) || 'Immediate' }
  ];

  let curY = candBoxY + candBoxH - 16;
  const leftColWidth = 140;
  const photoW = 95;
  const photoH = 120;
  const photoX = MARGIN_X + CONTENT_WIDTH - photoW - 12;
  const photoY = candBoxY + (candBoxH - photoH) / 2;

  cRows.forEach((r) => {
    page1.drawText(r.label, {
      x: MARGIN_X + 10,
      y: curY,
      size: 8,
      font: helveticaBold,
      color: darkSlate
    });
    page1.drawText(':', {
      x: MARGIN_X + leftColWidth - 5,
      y: curY,
      size: 8,
      font: helveticaBold,
      color: textMuted
    });
    const valText = String(r.val).substring(0, r.maxLen || 45);
    page1.drawText(valText, {
      x: MARGIN_X + leftColWidth + 5,
      y: curY,
      size: 8,
      font: r.bold ? helveticaBold : helvetica,
      color: r.bold ? navy : textBody
    });
    curY -= 17.5;
  });

  // Photo Box on Right
  page1.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });

  if (candidatePhoto) {
    page1.drawImage(candidatePhoto, {
      x: photoX + 1,
      y: photoY + 1,
      width: photoW - 2,
      height: photoH - 2
    });
  } else {
    page1.drawText('PASSPORT SIZE', {
      x: photoX + 16,
      y: photoY + 65,
      size: 7.5,
      font: helvetica,
      color: textMuted
    });
    page1.drawText('PHOTOGRAPH', {
      x: photoX + 20,
      y: photoY + 52,
      size: 7.5,
      font: helvetica,
      color: textMuted
    });
  }

  // Section 2: For Company Use Only
  const sec2Y = 432;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec2Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97)
  });
  page1.drawText('2. FOR COMPANY USE ONLY', {
    x: MARGIN_X + 8,
    y: sec2Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy
  });

  const compBoxY = 328;
  const compBoxH = 100;
  page1.drawRectangle({
    x: MARGIN_X,
    y: compBoxY,
    width: CONTENT_WIDTH,
    height: compBoxH,
    borderColor: borderLight,
    borderWidth: 1
  });

  const compFields = [
    { l: '1. Date of Interview', v: formatDisplayDate(slip.interview_date), l2: '4. Department', v2: slip.department || '—' },
    { l: '2. Reporting Date', v: formatDisplayDate(slip.reporting_date), l2: '5. Designation', v2: slip.designation || '—' },
    { l: '3. Reporting Time', v: slip.reporting_time || '—', l2: '6. Salary (CTC)', v2: slip.salary_ctc ? `INR ${slip.salary_ctc.toLocaleString('en-IN')} / Month` : '—' }
  ];

  let compY = compBoxY + compBoxH - 22;
  compFields.forEach((cf) => {
    // Col 1
    page1.drawText(cf.l, { x: MARGIN_X + 10, y: compY, size: 8, font: helveticaBold, color: darkSlate });
    page1.drawText(':', { x: MARGIN_X + 115, y: compY, size: 8, font: helveticaBold, color: textMuted });
    page1.drawText(String(cf.v), { x: MARGIN_X + 125, y: compY, size: 8, font: helvetica, color: textBody });

    // Col 2
    page1.drawText(cf.l2, { x: MARGIN_X + 275, y: compY, size: 8, font: helveticaBold, color: darkSlate });
    page1.drawText(':', { x: MARGIN_X + 365, y: compY, size: 8, font: helveticaBold, color: textMuted });
    page1.drawText(String(cf.v2), { x: MARGIN_X + 375, y: compY, size: 8, font: helvetica, color: textBody });

    compY -= 28;
  });

  // Note & Signatures Area
  const noteY = 308;
  page1.drawText(
    'NOTE : This slip is valid for 15 days from the date of issue. This is an official reference slip and must be carried along with original documents.',
    { x: MARGIN_X, y: noteY, size: 6.8, font: helveticaBold, color: darkSlate }
  );
  page1.drawText(
    'This candidate is referred by A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY. Please consider him / her for the recruitment process.',
    { x: MARGIN_X, y: noteY - 10, size: 6.8, font: helveticaOblique, color: textMuted }
  );

  // Seal & Signature Blocks
  const sealY = 222;
  const sealH = 65;
  // Left Seal Box
  page1.drawRectangle({
    x: MARGIN_X + 20,
    y: sealY,
    width: 170,
    height: sealH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });
  page1.drawText('A TIGER GLOBAL', { x: MARGIN_X + 62, y: sealY + 44, size: 8, font: helveticaBold, color: gold });
  page1.drawText('CONSULTANCY SEAL', { x: MARGIN_X + 54, y: sealY + 30, size: 7.5, font: helveticaBold, color: navy });
  page1.drawText('[ OFFICIAL VERIFIED STAMP ]', { x: MARGIN_X + 44, y: sealY + 14, size: 6.5, font: helvetica, color: textMuted });

  // Right Signatory Box
  page1.drawRectangle({
    x: MARGIN_X + CONTENT_WIDTH - 210,
    y: sealY,
    width: 190,
    height: sealH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });
  page1.drawText('AUTHORIZED SIGNATORY', { x: MARGIN_X + CONTENT_WIDTH - 175, y: sealY + 44, size: 8, font: helveticaBold, color: navy });
  page1.drawText('A TIGER GLOBAL CAREER SOLUTION', { x: MARGIN_X + CONTENT_WIDTH - 195, y: sealY + 28, size: 7, font: helvetica, color: textBody });
  page1.drawText('& CONSULTANCY', { x: MARGIN_X + CONTENT_WIDTH - 150, y: sealY + 16, size: 7, font: helvetica, color: textBody });

  // Section 3: To Be Filled By Company
  const sec3Y = 195;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec3Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97)
  });
  page1.drawText('3. TO BE FILLED BY COMPANY', {
    x: MARGIN_X + 8,
    y: sec3Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy
  });

  const ackBoxY = 40;
  const ackBoxH = 150;
  page1.drawRectangle({
    x: MARGIN_X,
    y: ackBoxY,
    width: CONTENT_WIDTH,
    height: ackBoxH,
    borderColor: borderLight,
    borderWidth: 1
  });

  page1.drawText('We acknowledge that the above candidate has appeared for interview / joined.', {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 18,
    size: 8,
    font: helveticaOblique,
    color: textBody
  });

  // Row 1: Interview By & HR Signature
  page1.drawText(`Interview By : ${slip.interview_conducted_by || '___________________________'}`, {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 42,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });
  page1.drawText('HR Signature & Seal : ___________________________', {
    x: MARGIN_X + 265,
    y: ackBoxY + ackBoxH - 42,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });

  // Row 2: Result Checkboxes
  const resUpper = (slip.interview_result || '').toUpperCase();
  const isSelected = resUpper === 'SELECTED';
  const isHold = resUpper === 'HOLD';
  const isRejected = resUpper === 'REJECTED';

  page1.drawText('Interview Result :', {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 72,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });
  page1.drawText(`[ ${isSelected ? 'X' : '  '} ] SELECTED`, {
    x: MARGIN_X + 110,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isSelected ? green : darkSlate
  });
  page1.drawText(`[ ${isHold ? 'X' : '  '} ] HOLD`, {
    x: MARGIN_X + 220,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isHold ? gold : darkSlate
  });
  page1.drawText(`[ ${isRejected ? 'X' : '  '} ] REJECTED`, {
    x: MARGIN_X + 310,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isRejected ? red : darkSlate
  });

  // Row 3: Joining Date & Remarks
  page1.drawText(`Joining Date : ${formatDisplayDate(slip.joining_date) || '____ / ____ / 20____'}`, {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 102,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });
  page1.drawText(`Selected Role : ${slip.selected_designation || '___________________________'}`, {
    x: MARGIN_X + 265,
    y: ackBoxY + ackBoxH - 102,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });

  page1.drawText(
    `Remarks : ${slip.remarks || '________________________________________________________________________________'}`,
    {
      x: MARGIN_X + 10,
      y: ackBoxY + ackBoxH - 130,
      size: 8,
      font: helvetica,
      color: textBody
    }
  );

  // ===========================================================================
  // PAGE 2: CONSULTANCY RETURN FORM
  // ===========================================================================
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer Decorative Borders
  page2.drawRectangle({
    x: 20,
    y: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderColor: navy,
    borderWidth: 1.5,
    color: white
  });
  page2.drawRectangle({
    x: 23,
    y: 23,
    width: PAGE_WIDTH - 46,
    height: PAGE_HEIGHT - 46,
    borderColor: gold,
    borderWidth: 0.75
  });

  // Header Box
  page2.drawText('A TIGER GLOBAL', {
    x: MARGIN_X,
    y: 785,
    size: 18,
    font: helveticaBold,
    color: navy
  });
  page2.drawText('CAREER SOLUTION & CONSULTANCY', {
    x: MARGIN_X,
    y: 770,
    size: 9.5,
    font: helveticaBold,
    color: gold
  });

  // Banner
  const p2BannerY = 735;
  page2.drawRectangle({
    x: MARGIN_X,
    y: p2BannerY,
    width: CONTENT_WIDTH,
    height: 24,
    color: navy
  });
  page2.drawText('CONSULTANCY RETURN FORM', {
    x: MARGIN_X + 175,
    y: p2BannerY + 7,
    size: 11.5,
    font: helveticaBold,
    color: white
  });

  // Candidate Summary Box (Left) & Photo Box (Right)
  const p2SummaryY = 645;
  const p2SummaryH = 80;
  page2.drawRectangle({
    x: MARGIN_X,
    y: p2SummaryY,
    width: CONTENT_WIDTH,
    height: p2SummaryH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });

  const p2PhotoW = 60;
  const p2PhotoH = 70;
  const p2PhotoX = MARGIN_X + CONTENT_WIDTH - p2PhotoW - 8;
  const p2PhotoY = p2SummaryY + 5;

  page2.drawRectangle({
    x: p2PhotoX,
    y: p2PhotoY,
    width: p2PhotoW,
    height: p2PhotoH,
    borderColor: borderLight,
    borderWidth: 1,
    color: white
  });

  if (candidatePhoto) {
    page2.drawImage(candidatePhoto, {
      x: p2PhotoX + 1,
      y: p2PhotoY + 1,
      width: p2PhotoW - 2,
      height: p2PhotoH - 2
    });
  } else {
    page2.drawText('PHOTO', {
      x: p2PhotoX + 16,
      y: p2PhotoY + 32,
      size: 7,
      font: helvetica,
      color: textMuted
    });
  }

  // Candidate Fields
  page2.drawText('CANDIDATE NAME :', { x: MARGIN_X + 12, y: p2SummaryY + 62, size: 8, font: helveticaBold, color: darkSlate });
  page2.drawText(candidate.fullName || '—', { x: MARGIN_X + 115, y: p2SummaryY + 62, size: 8.5, font: helveticaBold, color: navy });

  page2.drawText('FATHER NAME      :', { x: MARGIN_X + 12, y: p2SummaryY + 45, size: 8, font: helveticaBold, color: darkSlate });
  page2.drawText(candidate.fatherName || '—', { x: MARGIN_X + 115, y: p2SummaryY + 45, size: 8, font: helvetica, color: textBody });

  page2.drawText('MOBILE NO.          :', { x: MARGIN_X + 12, y: p2SummaryY + 28, size: 8, font: helveticaBold, color: darkSlate });
  page2.drawText(candidate.mobile || '—', { x: MARGIN_X + 115, y: p2SummaryY + 28, size: 8, font: helvetica, color: textBody });

  page2.drawText('ADDRESS              :', { x: MARGIN_X + 12, y: p2SummaryY + 11, size: 8, font: helveticaBold, color: darkSlate });
  page2.drawText(String(candidate.address || '—').substring(0, 65), { x: MARGIN_X + 115, y: p2SummaryY + 11, size: 7.5, font: helvetica, color: textBody });

  // Policy Header
  const policyTitleY = 620;
  page2.drawText('POLICY - TERMS & CONDITIONS', {
    x: MARGIN_X,
    y: policyTitleY,
    size: 10,
    font: helveticaBold,
    color: navy
  });
  page2.drawLine({
    start: { x: MARGIN_X, y: policyTitleY - 4 },
    end: { x: MARGIN_X + 175, y: policyTitleY - 4 },
    thickness: 1.5,
    color: gold
  });

  // The 10 Official Policy Points Preserved Verbatim from Master Format
  const policyPoints = [
    { num: '1.', text: 'Please bring the registration form and all original documents for recruitment at the company.' },
    { num: '2.', text: 'Office hours will be from 11:00 AM to 4:00 PM.' },
    { num: '3.', text: 'If any worker is found working after submitting forged documents, disciplinary action will be taken, and the worker will be held personally responsible.' },
    { num: '4.', text: 'Child labour is prohibited.' },
    { num: '5.', text: 'During your interview, we will offer you a choice of three companies; you will have to select one of them and work for that company.' },
    { num: '6.', text: 'A consultancy fee of Rs. 1,000 will be charged for securing a job through A Tiger Global Consultancy. Of this amount, Rs. 500 is to be paid at the time of registration. After you have worked for one month, we will coordinate with the company to deduct the remaining Rs. 500 from your salary.' },
    { num: '7.', text: 'The registration fee is being charged to cover the joining process—including legal, civil, and police verifications, PF and ESIC registration, and digital banking verification—as well as to provide guidance and secure an excellent job for your otherwise uncertain career.' },
    { num: '8.', text: 'The registration and consultation fees you pay are for our consultancy services and are not remitted to the company we refer you to; joining that company is free of charge, and no money will be collected there. If anyone asks you for a fee, please inform us.\nNote: You are responsible for arranging your own accommodation and meals. However, if you wish to avail of food and lodging facilities provided by the company, a charge will apply, and you will be required to pay it.' },
    { num: '9.', text: "No fees of any kind are charged by the company you are placed with through A Tiger Global Career Solution & Consultancy. If anyone within that company asks you for any kind of fee, you may immediately lodge a complaint with A Tiger Global Career Solution & Consultancy and the concerned company's HOD." },
    { num: '10.', text: 'Once registration is completed through Tiger Global Consultancy, it cannot be cancelled, and the consultancy fee will not be refunded.' }
  ];

  let pY = 598;
  policyPoints.forEach((pt) => {
    page2.drawText(pt.num, {
      x: MARGIN_X,
      y: pY,
      size: 7.5,
      font: helveticaBold,
      color: navy
    });
    const lines = wrapText(pt.text, CONTENT_WIDTH - 20, helvetica, 7.5);
    lines.forEach((line, lIdx) => {
      page2.drawText(line, {
        x: MARGIN_X + 16,
        y: pY - lIdx * 10,
        size: 7.5,
        font: line.startsWith('Note:') ? helveticaOblique : helvetica,
        color: line.startsWith('Note:') ? textMuted : textBody
      });
    });
    pY -= lines.length * 10 + 7;
  });

  // Bottom Acceptance & Sign Section
  const acceptY = 70;
  const acceptH = 45;
  page2.drawRectangle({
    x: MARGIN_X,
    y: acceptY,
    width: CONTENT_WIDTH,
    height: acceptH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight
  });

  page2.drawText('Note: If you accept our terms and conditions, please let us know (Yes/No).', {
    x: MARGIN_X + 10,
    y: acceptY + 28,
    size: 7.8,
    font: helveticaOblique,
    color: darkSlate
  });

  page2.drawText('[ X ] YES, I ACCEPT ALL TERMS & CONDITIONS', {
    x: MARGIN_X + 10,
    y: acceptY + 12,
    size: 8.5,
    font: helveticaBold,
    color: green
  });

  page2.drawText('CANDIDATE SIGNATURE: __________________________', {
    x: MARGIN_X + 270,
    y: acceptY + 12,
    size: 8,
    font: helveticaBold,
    color: darkSlate
  });

  // Footer
  page2.drawText('A TIGER GLOBAL Career Solution & Consultancy | GSTIN: 27DIFPA0273P1Z4 | REG. NO.: 106157392603', {
    x: MARGIN_X + 80,
    y: 28,
    size: 7,
    font: helvetica,
    color: textMuted
  });

  return await pdfDoc.save();
}

/**
 * Generates the official 2-page Reference Slip & Consultancy Return PDF and persists it in Supabase storage
 */
export async function generateAndPersistReferenceSlipPdf(
  detail: ReferenceSlipDetailData,
  adminUserId?: string | null
): Promise<GenerateReferenceSlipPdfResult> {
  try {
    const { slip, candidate } = detail;

    // 1. Build the dynamic vector PDF (no master overlay)
    const pdfBytes = await buildDynamicReferenceSlipPdf(detail);

    // Create Blob
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

    // Format safe candidate filename e.g. JOIN-2026-000123-REFERENCE-SLIP.pdf
    const sourceRef = candidate.sourceReference
      ? candidate.sourceReference.replace(/[^a-zA-Z0-9_-]/g, '_')
      : `REF-${slip.reference_number.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const fileName = `${sourceRef}-REFERENCE-SLIP.pdf`;

    // 2. Persist in Supabase private bucket 'generated-documents'
    const persistRes = await persistGeneratedDocument({
      applicationId: slip.application_id || undefined,
      joiningFormId: slip.joining_form_id || undefined,
      fileType: 'REFERENCE_SLIP_PDF',
      blob,
      fileName,
      generatedBy: adminUserId || null
    });

    if (!persistRes.success || !persistRes.storagePath) {
      throw new Error(persistRes.error || 'Failed to persist generated Reference Slip PDF in private storage.');
    }

    // 3. Generate signed URL for authorized preview
    const { url: signedUrl } = await getGeneratedDocumentSignedUrl(persistRes.storagePath, 3600);

    // 4. Log audit trail in activity_logs
    await logActivity({
      entityType: 'REFERENCE_SLIP',
      entityId: slip.id,
      applicationId: slip.application_id || undefined,
      action: 'GENERATED_PDF',
      metadata: {
        referenceNumber: slip.reference_number,
        fileId: persistRes.fileId,
        storagePath: persistRes.storagePath,
        fileSize: pdfBytes.length
      }
    });

    return {
      success: true,
      blob,
      signedUrl: signedUrl || undefined,
      storagePath: persistRes.storagePath,
      fileId: persistRes.fileId,
      pdfBytes
    };
  } catch (err: any) {
    console.error('[generateAndPersistReferenceSlipPdf] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to generate and persist Reference Slip PDF.'
    };
  }
}
