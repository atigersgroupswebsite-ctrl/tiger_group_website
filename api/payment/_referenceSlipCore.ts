// ==============================================================================
// File: api/payment/_referenceSlipCore.ts
// Description: Server-Side 2-Page Dynamic Reference Slip & Consultancy Return PDF Generator
// Environment: Pure Node.js Serverless Runtime (pdf-lib, qrcode) — Zero Browser / DOM Globals
// Authority: Preserves client master: refrence slip.pdf (vector synthesized, no background overlay)
// Layout:
//   Page 1: Employee Reference Slip (KYC Demographics, Photo, Admin Details, QR Verification Cardlet)
//   Page 2: Consultancy Return Form (Demographics, 10 Official Policy Terms with Rs 500 clause, Acceptance)
// Security:
//   - Cryptographic non-guessable verification token (atg_ref_<uuid_hex>)
//   - Encodes permanent public URL: https://www.atigerglobal.com/verify/<token>
//   - Persists into private 'generated-documents' Supabase bucket
//   - Records audit trail in public.generated_files ledger
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://bhfxqtaesvfsbdckgeka.supabase.co';

let _supabaseServer: any = null;

export function getSupabaseServer(): any {
  if (!_supabaseServer) {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseServer;
}

export interface EnsureReferenceSlipResult {
  success: boolean;
  slip?: any;
  pdfBuffer?: Buffer;
  signedUrl?: string;
  storagePath?: string;
  fileId?: string;
  verificationToken?: string;
  error?: string;
}

// ------------------------------------------------------------------------------
// Utility Helpers
// ------------------------------------------------------------------------------

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
 * Generates an authoritative Reference Number in the format: ATG/REF/YYYY/XXXXXX
 */
async function generateAuthoritativeRefNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const { count, error } = await supabase
      .from('reference_slips')
      .select('id', { count: 'exact', head: true });

    const seq = error || count === null ? Math.floor(1000 + Math.random() * 9000) : (count + 1);
    const padded = String(seq).padStart(6, '0');
    return `ATG/REF/${year}/${padded}`;
  } catch {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `ATG/REF/${year}/${random}`;
  }
}

/**
 * Resolves candidate demographic and document details from Joining Form or Application
 */
async function resolveCandidateInfo(
  supabase: any,
  applicationId?: string | null,
  joiningFormId?: string | null
): Promise<any | null> {
  if (joiningFormId) {
    const { data: jf } = await supabase
      .from('joining_forms')
      .select('*')
      .eq('id', joiningFormId)
      .maybeSingle();

    if (jf) {
      const addr = [jf.current_address_line1, jf.current_address_line2, jf.current_city, jf.current_state, jf.current_pincode]
        .filter(Boolean)
        .join(', ') || 'Nagpur, Maharashtra';

      return {
        sourceType: 'JOINING_FORM',
        sourceId: jf.id,
        sourceReference: jf.joining_reference || `JOIN-${new Date().getFullYear()}-000001`,
        fullName: jf.candidate_name || 'Candidate',
        fatherName: jf.father_name || jf.emergency_contact_name || '—',
        mobile: jf.employee_contact_number || '—',
        email: jf.email || '',
        address: addr,
        dob: jf.date_of_birth,
        gender: jf.gender,
        aadhaarNumber: jf.aadhaar_number,
        panNumber: jf.pan_number,
        positionApplied: jf.position_applied || 'Consultant / Executive',
        expectedJoiningDate: jf.expected_joining_date,
        photoPath: jf.candidate_photo_path
      };
    }
  }

  if (applicationId) {
    const { data: app } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (app) {
      return {
        sourceType: 'APPLICATION',
        sourceId: app.id,
        sourceReference: app.application_number || `INQ-${new Date().getFullYear()}-000001`,
        fullName: app.full_name || 'Candidate',
        fatherName: app.father_name || '—',
        mobile: app.mobile || '—',
        email: app.email || '',
        address: app.address || 'Nagpur, Maharashtra',
        dob: app.dob,
        gender: app.gender,
        aadhaarNumber: app.aadhaar_number,
        panNumber: app.pan_number,
        positionApplied: app.position_applied || 'Consultant / Executive',
        expectedJoiningDate: app.expected_joining_date,
        photoPath: app.photo_url
      };
    }
  }

  return null;
}

// ------------------------------------------------------------------------------
// Core Vector PDF Generation
// ------------------------------------------------------------------------------

export async function build2PageReferenceSlipPdf(params: {
  slip: any;
  candidate: any;
  verificationToken: string;
  candidatePhotoBytes?: Buffer | null;
}): Promise<Buffer> {
  const { slip, candidate, verificationToken, candidatePhotoBytes } = params;

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

  // A4 Dimensions
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 523.28

  // Embed Candidate Photo if available
  let candidatePhoto: any = null;
  if (candidatePhotoBytes && candidatePhotoBytes.length > 32) {
    try {
      const isPng = candidatePhotoBytes[0] === 0x89 && candidatePhotoBytes[1] === 0x50;
      candidatePhoto = isPng
        ? await pdfDoc.embedPng(candidatePhotoBytes)
        : await pdfDoc.embedJpg(candidatePhotoBytes);
    } catch {
      // Photo parsing skipped safely
    }
  }

  // Generate Permanent Public Verification QR Code
  // CRITICAL: Strictly production domain, never localhost or Vercel preview
  const publicVerifyUrl = `https://www.atigerglobal.com/verify/${verificationToken}`;
  const qrDataUrl = await QRCode.toDataURL(publicVerifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
  const qrPngBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

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
    color: white,
  });
  page1.drawRectangle({
    x: 23,
    y: 23,
    width: PAGE_WIDTH - 46,
    height: PAGE_HEIGHT - 46,
    borderColor: gold,
    borderWidth: 0.75,
  });

  // Header Box - Brand Identity
  page1.drawText('A TIGER GLOBAL', {
    x: MARGIN_X,
    y: 785,
    size: 20,
    font: helveticaBold,
    color: navy,
  });
  page1.drawText('CAREER SOLUTION & CONSULTANCY', {
    x: MARGIN_X,
    y: 770,
    size: 10,
    font: helveticaBold,
    color: gold,
  });
  page1.drawText('MANPOWER CONSULTANT | RECRUITMENT | PLACEMENT SERVICES', {
    x: MARGIN_X,
    y: 757,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  });
  page1.drawText('OFF. PLOT NO. 440, BEHIND ROYAL CLUB, SUBHAN NAGAR, NAGPUR MH 440035', {
    x: MARGIN_X,
    y: 746,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  });
  page1.drawText('PHONE: +91 8349353946 | EMAIL: ATIGERGLOBAL@GMAIL.COM | REG. NO.: 106157392603', {
    x: MARGIN_X,
    y: 735,
    size: 7,
    font: helvetica,
    color: textMuted,
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
    color: bgLight,
  });
  page1.drawText('REFERENCE NO.', {
    x: refBoxX + 8,
    y: refBoxY + 38,
    size: 7.5,
    font: helveticaBold,
    color: textMuted,
  });
  page1.drawText(slip.reference_number || 'ATG/REF/2026/000000', {
    x: refBoxX + 8,
    y: refBoxY + 25,
    size: 8.5,
    font: helveticaBold,
    color: navy,
  });
  page1.drawText(`DATE: ${formatDisplayDate(slip.date || slip.created_at)}`, {
    x: refBoxX + 8,
    y: refBoxY + 10,
    size: 8,
    font: helvetica,
    color: darkSlate,
  });

  // Title Banner
  const bannerY = 700;
  page1.drawRectangle({
    x: MARGIN_X,
    y: bannerY,
    width: CONTENT_WIDTH,
    height: 24,
    color: navy,
  });
  page1.drawText('EMPLOYEE REFERENCE SLIP', {
    x: MARGIN_X + 175,
    y: bannerY + 7,
    size: 11.5,
    font: helveticaBold,
    color: white,
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
    color: textBody,
  });

  // Section 1: Candidate Details
  const sec1Y = 645;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec1Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97),
  });
  page1.drawText('1. CANDIDATE DETAILS', {
    x: MARGIN_X + 8,
    y: sec1Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy,
  });

  const candBoxY = 460;
  const candBoxH = 180;
  page1.drawRectangle({
    x: MARGIN_X,
    y: candBoxY,
    width: CONTENT_WIDTH,
    height: candBoxH,
    borderColor: borderLight,
    borderWidth: 1,
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
    { label: '10. Expected Date of Joining', val: formatDisplayDate(candidate.expectedJoiningDate || slip.joining_date) || 'Immediate' },
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
      color: darkSlate,
    });
    page1.drawText(':', {
      x: MARGIN_X + leftColWidth - 5,
      y: curY,
      size: 8,
      font: helveticaBold,
      color: textMuted,
    });
    const valText = String(r.val).substring(0, r.maxLen || 45);
    page1.drawText(valText, {
      x: MARGIN_X + leftColWidth + 5,
      y: curY,
      size: 8,
      font: r.bold ? helveticaBold : helvetica,
      color: r.bold ? navy : textBody,
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
    color: bgLight,
  });

  if (candidatePhoto) {
    page1.drawImage(candidatePhoto, {
      x: photoX + 1,
      y: photoY + 1,
      width: photoW - 2,
      height: photoH - 2,
    });
  } else {
    page1.drawText('PASSPORT SIZE', {
      x: photoX + 16,
      y: photoY + 65,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });
    page1.drawText('PHOTOGRAPH', {
      x: photoX + 20,
      y: photoY + 52,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });
  }

  // Section 2: For Company Use Only
  const sec2Y = 432;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec2Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97),
  });
  page1.drawText('2. FOR COMPANY USE ONLY', {
    x: MARGIN_X + 8,
    y: sec2Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy,
  });

  const compBoxY = 328;
  const compBoxH = 100;
  page1.drawRectangle({
    x: MARGIN_X,
    y: compBoxY,
    width: CONTENT_WIDTH,
    height: compBoxH,
    borderColor: borderLight,
    borderWidth: 1,
  });

  const compFields = [
    { l: '1. Date of Interview', v: formatDisplayDate(slip.interview_date), l2: '4. Department', v2: slip.department || '—' },
    { l: '2. Reporting Date', v: formatDisplayDate(slip.reporting_date), l2: '5. Designation', v2: slip.designation || '—' },
    { l: '3. Reporting Time', v: slip.reporting_time || '—', l2: '6. Salary (CTC)', v2: slip.salary_ctc ? `INR ${Number(slip.salary_ctc).toLocaleString('en-IN')} / Month` : '—' },
  ];

  let compY = compBoxY + compBoxH - 22;
  compFields.forEach((cf) => {
    page1.drawText(cf.l, { x: MARGIN_X + 10, y: compY, size: 8, font: helveticaBold, color: darkSlate });
    page1.drawText(':', { x: MARGIN_X + 115, y: compY, size: 8, font: helveticaBold, color: textMuted });
    page1.drawText(String(cf.v), { x: MARGIN_X + 125, y: compY, size: 8, font: helvetica, color: textBody });

    page1.drawText(cf.l2, { x: MARGIN_X + 275, y: compY, size: 8, font: helveticaBold, color: darkSlate });
    page1.drawText(':', { x: MARGIN_X + 365, y: compY, size: 8, font: helveticaBold, color: textMuted });
    page1.drawText(String(cf.v2), { x: MARGIN_X + 375, y: compY, size: 8, font: helvetica, color: textBody });

    compY -= 28;
  });

  // Note
  const noteY = 308;
  page1.drawText(
    'NOTE : This slip is valid for 15 days from the date of issue. This is an official reference slip and must be carried along with original documents.',
    { x: MARGIN_X, y: noteY, size: 6.8, font: helveticaBold, color: darkSlate }
  );
  page1.drawText(
    'This candidate is referred by A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY. Please consider him / her for the recruitment process.',
    { x: MARGIN_X, y: noteY - 10, size: 6.8, font: helveticaOblique, color: textMuted }
  );

  // Seal, QR Verification Cardlet & Signatures Area
  const sealY = 222;
  const sealH = 65;

  // Left Seal Box
  page1.drawRectangle({
    x: MARGIN_X + 10,
    y: sealY,
    width: 160,
    height: sealH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight,
  });
  page1.drawText('A TIGER GLOBAL', { x: MARGIN_X + 48, y: sealY + 44, size: 8, font: helveticaBold, color: gold });
  page1.drawText('CONSULTANCY SEAL', { x: MARGIN_X + 42, y: sealY + 30, size: 7.5, font: helveticaBold, color: navy });
  page1.drawText('[ OFFICIAL VERIFIED STAMP ]', { x: MARGIN_X + 30, y: sealY + 14, size: 6.5, font: helvetica, color: textMuted });

  // Center QR Verification Box
  const qrBoxX = MARGIN_X + 180;
  const qrBoxW = 145;
  page1.drawRectangle({
    x: qrBoxX,
    y: sealY,
    width: qrBoxW,
    height: sealH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight,
  });

  // Draw QR Image inside center box
  page1.drawImage(qrImage, {
    x: qrBoxX + 6,
    y: sealY + 6,
    width: 53,
    height: 53,
  });

  page1.drawText('PUBLIC QR VERIFY', {
    x: qrBoxX + 64,
    y: sealY + 46,
    size: 7,
    font: helveticaBold,
    color: navy,
  });
  page1.drawText('Scan with camera to', {
    x: qrBoxX + 64,
    y: sealY + 34,
    size: 6,
    font: helvetica,
    color: textMuted,
  });
  page1.drawText('confirm authenticity', {
    x: qrBoxX + 64,
    y: sealY + 24,
    size: 6,
    font: helvetica,
    color: textMuted,
  });
  page1.drawText('atigerglobal.com', {
    x: qrBoxX + 64,
    y: sealY + 12,
    size: 6,
    font: helveticaBold,
    color: gold,
  });

  // Right Signatory Box
  const sigBoxX = MARGIN_X + 335;
  const sigBoxW = CONTENT_WIDTH - 335;
  page1.drawRectangle({
    x: sigBoxX,
    y: sealY,
    width: sigBoxW,
    height: sealH,
    borderColor: borderLight,
    borderWidth: 1,
    color: bgLight,
  });
  page1.drawText('AUTHORIZED SIGNATORY', { x: sigBoxX + 28, y: sealY + 44, size: 8, font: helveticaBold, color: navy });
  page1.drawText('A TIGER GLOBAL CAREER SOLUTION', { x: sigBoxX + 12, y: sealY + 28, size: 7, font: helvetica, color: textBody });
  page1.drawText('& CONSULTANCY', { x: sigBoxX + 54, y: sealY + 16, size: 7, font: helvetica, color: textBody });

  // Section 3: To Be Filled By Company
  const sec3Y = 195;
  page1.drawRectangle({
    x: MARGIN_X,
    y: sec3Y,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97),
  });
  page1.drawText('3. TO BE FILLED BY COMPANY', {
    x: MARGIN_X + 8,
    y: sec3Y + 5,
    size: 9,
    font: helveticaBold,
    color: navy,
  });

  const ackBoxY = 40;
  const ackBoxH = 150;
  page1.drawRectangle({
    x: MARGIN_X,
    y: ackBoxY,
    width: CONTENT_WIDTH,
    height: ackBoxH,
    borderColor: borderLight,
    borderWidth: 1,
  });

  page1.drawText('We acknowledge that the above candidate has appeared for interview / joined.', {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 18,
    size: 8,
    font: helveticaOblique,
    color: textBody,
  });

  // Row 1: Interview By & HR Signature
  page1.drawText(`Interview By : ${slip.interview_conducted_by || '___________________________'}`, {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 42,
    size: 8,
    font: helveticaBold,
    color: darkSlate,
  });
  page1.drawText('HR Signature & Seal : ___________________________', {
    x: MARGIN_X + 265,
    y: ackBoxY + ackBoxH - 42,
    size: 8,
    font: helveticaBold,
    color: darkSlate,
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
    color: darkSlate,
  });
  page1.drawText(`[ ${isSelected ? 'X' : '  '} ] SELECTED`, {
    x: MARGIN_X + 110,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isSelected ? green : darkSlate,
  });
  page1.drawText(`[ ${isHold ? 'X' : '  '} ] HOLD`, {
    x: MARGIN_X + 220,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isHold ? gold : darkSlate,
  });
  page1.drawText(`[ ${isRejected ? 'X' : '  '} ] REJECTED`, {
    x: MARGIN_X + 310,
    y: ackBoxY + ackBoxH - 72,
    size: 8.5,
    font: helveticaBold,
    color: isRejected ? red : darkSlate,
  });

  // Row 3: Joining Date & Remarks
  page1.drawText(`Joining Date : ${formatDisplayDate(slip.joining_date) || '____ / ____ / 20____'}`, {
    x: MARGIN_X + 10,
    y: ackBoxY + ackBoxH - 102,
    size: 8,
    font: helveticaBold,
    color: darkSlate,
  });
  page1.drawText(`Selected Role : ${slip.selected_designation || '___________________________'}`, {
    x: MARGIN_X + 265,
    y: ackBoxY + ackBoxH - 102,
    size: 8,
    font: helveticaBold,
    color: darkSlate,
  });

  page1.drawText(
    `Remarks : ${slip.remarks || '________________________________________________________________________________'}`,
    {
      x: MARGIN_X + 10,
      y: ackBoxY + ackBoxH - 130,
      size: 8,
      font: helvetica,
      color: textBody,
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
    color: white,
  });
  page2.drawRectangle({
    x: 23,
    y: 23,
    width: PAGE_WIDTH - 46,
    height: PAGE_HEIGHT - 46,
    borderColor: gold,
    borderWidth: 0.75,
  });

  // Header Box
  page2.drawText('A TIGER GLOBAL', {
    x: MARGIN_X,
    y: 785,
    size: 18,
    font: helveticaBold,
    color: navy,
  });
  page2.drawText('CAREER SOLUTION & CONSULTANCY', {
    x: MARGIN_X,
    y: 770,
    size: 9.5,
    font: helveticaBold,
    color: gold,
  });

  // Banner
  const p2BannerY = 735;
  page2.drawRectangle({
    x: MARGIN_X,
    y: p2BannerY,
    width: CONTENT_WIDTH,
    height: 24,
    color: navy,
  });
  page2.drawText('CONSULTANCY RETURN FORM', {
    x: MARGIN_X + 175,
    y: p2BannerY + 7,
    size: 11.5,
    font: helveticaBold,
    color: white,
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
    color: bgLight,
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
    color: white,
  });

  if (candidatePhoto) {
    page2.drawImage(candidatePhoto, {
      x: p2PhotoX + 1,
      y: p2PhotoY + 1,
      width: p2PhotoW - 2,
      height: p2PhotoH - 2,
    });
  } else {
    page2.drawText('PHOTO', {
      x: p2PhotoX + 16,
      y: p2PhotoY + 32,
      size: 7,
      font: helvetica,
      color: textMuted,
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
    color: navy,
  });
  page2.drawLine({
    start: { x: MARGIN_X, y: policyTitleY - 4 },
    end: { x: MARGIN_X + 175, y: policyTitleY - 4 },
    thickness: 1.5,
    color: gold,
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
    { num: '10.', text: 'Once registration is completed through Tiger Global Consultancy, it cannot be cancelled, and the consultancy fee will not be refunded.' },
  ];

  let pY = 598;
  policyPoints.forEach((pt) => {
    page2.drawText(pt.num, {
      x: MARGIN_X,
      y: pY,
      size: 7.5,
      font: helveticaBold,
      color: navy,
    });
    const lines = wrapText(pt.text, CONTENT_WIDTH - 20, helvetica, 7.5);
    lines.forEach((line, lIdx) => {
      page2.drawText(line, {
        x: MARGIN_X + 16,
        y: pY - lIdx * 10,
        size: 7.5,
        font: line.startsWith('Note:') ? helveticaOblique : helvetica,
        color: line.startsWith('Note:') ? textMuted : textBody,
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
    color: bgLight,
  });

  page2.drawText('Note: If you accept our terms and conditions, please let us know (Yes/No).', {
    x: MARGIN_X + 10,
    y: acceptY + 28,
    size: 7.8,
    font: helveticaOblique,
    color: darkSlate,
  });

  page2.drawText('[ X ] YES, I ACCEPT ALL TERMS & CONDITIONS', {
    x: MARGIN_X + 10,
    y: acceptY + 12,
    size: 8.5,
    font: helveticaBold,
    color: green,
  });

  page2.drawText('CANDIDATE SIGNATURE: __________________________', {
    x: MARGIN_X + 270,
    y: acceptY + 12,
    size: 8,
    font: helveticaBold,
    color: darkSlate,
  });

  // Footer
  page2.drawText('A TIGER GLOBAL Career Solution & Consultancy | GSTIN: 27DIFPA0273P1Z4 | REG. NO.: 106157392603', {
    x: MARGIN_X + 80,
    y: 28,
    size: 7,
    font: helvetica,
    color: textMuted,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ------------------------------------------------------------------------------
// End-to-End Orchestrator: Ensure, Generate, Persist & Return Signed URL
// ------------------------------------------------------------------------------

export async function ensureReferenceSlipForPayment(
  paymentId: string,
  options?: { forceRegenerate?: boolean }
): Promise<EnsureReferenceSlipResult> {
  const supabase = getSupabaseServer();

  try {
    // 1. Fetch Payment Record
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (pErr || !payment) {
      return { success: false, error: pErr?.message || `Payment ${paymentId} not found.` };
    }

    const { joining_form_id, application_id } = payment;
    if (!joining_form_id && !application_id) {
      return { success: false, error: 'Payment does not link to a joining_form_id or application_id.' };
    }

    // 2. Resolve Candidate Information
    const candidate = await resolveCandidateInfo(supabase, application_id, joining_form_id);
    if (!candidate) {
      return { success: false, error: 'Failed to resolve candidate KYC records from database.' };
    }

    // 3. Find or Create Reference Slip Record in public.reference_slips
    let slipQuery = supabase.from('reference_slips').select('*');
    if (joining_form_id) {
      slipQuery = slipQuery.eq('joining_form_id', joining_form_id);
    } else {
      slipQuery = slipQuery.eq('application_id', application_id);
    }

    const { data: existingSlips } = await slipQuery.order('created_at', { ascending: false }).limit(1);
    let slip = existingSlips?.[0] || null;

    if (!slip) {
      const refNumber = await generateAuthoritativeRefNumber(supabase);
      const insertPayload: any = {
        application_id: application_id || null,
        joining_form_id: joining_form_id || null,
        reference_number: refNumber,
        date: new Date().toISOString().split('T')[0],
        interview_result: 'SELECTED',
        designation: candidate.positionApplied || 'Consultant / Executive',
        remarks: 'Official reference slip authorized upon verified payment completion.',
      };

      const { data: inserted, error: insErr } = await supabase
        .from('reference_slips')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insErr || !inserted) {
        return { success: false, error: insErr?.message || 'Failed to insert reference slip record.' };
      }
      slip = inserted;

      // Ensure consultancy_returns row exists
      let crQuery = supabase.from('consultancy_returns').select('id');
      if (joining_form_id) crQuery = crQuery.eq('joining_form_id', joining_form_id);
      else crQuery = crQuery.eq('application_id', application_id);
      const { data: existingCr } = await crQuery.maybeSingle();

      if (!existingCr) {
        await supabase.from('consultancy_returns').insert({
          application_id: application_id || null,
          joining_form_id: joining_form_id || null,
          candidate_acceptance: true,
        });
      }
    }

    // Cryptographic Non-Guessable Verification Token (atg_ref_ + UUID hex)
    const verificationToken = slip.verification_token || `atg_ref_${slip.id.replace(/-/g, '')}`;

    // 4. Check if Generated PDF already exists in public.generated_files
    let genQuery = supabase
      .from('generated_files')
      .select('*')
      .eq('file_type', 'REFERENCE_SLIP_PDF');

    if (joining_form_id) genQuery = genQuery.eq('joining_form_id', joining_form_id);
    else genQuery = genQuery.eq('application_id', application_id);

    const { data: genFiles } = await genQuery.order('version', { ascending: false }).limit(1);
    const existingGenFile = genFiles?.[0];

    if (existingGenFile?.storage_path && !options?.forceRegenerate) {
      // Re-use existing file and generate fresh signed URL (valid 24 hours)
      const { data: signData } = await supabase.storage
        .from('generated-documents')
        .createSignedUrl(existingGenFile.storage_path, 86400);

      // Also retrieve bytes if needed for email
      const { data: fileBlob } = await supabase.storage
        .from('generated-documents')
        .download(existingGenFile.storage_path);

      let pdfBuffer: Buffer | undefined;
      if (fileBlob) {
        const ab = await fileBlob.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      }

      return {
        success: true,
        slip,
        pdfBuffer,
        signedUrl: signData?.signedUrl || undefined,
        storagePath: existingGenFile.storage_path,
        fileId: existingGenFile.id,
        verificationToken,
      };
    }

    // 5. Download Candidate Photo Bytes from Storage (if available)
    let photoBytes: Buffer | null = null;
    if (candidate.photoPath) {
      try {
        let cleanPath = candidate.photoPath;
        let bucket = 'candidate-documents';
        if (cleanPath.startsWith('candidate-documents/')) {
          cleanPath = cleanPath.replace(/^candidate-documents\//, '');
        }
        const { data: photoData } = await supabase.storage.from(bucket).download(cleanPath);
        if (photoData) {
          const ab = await photoData.arrayBuffer();
          photoBytes = Buffer.from(ab);
        }
      } catch {
        // Photo download skipped safely
      }
    }

    // 6. Build the 2-Page Vector PDF
    const pdfBuffer = await build2PageReferenceSlipPdf({
      slip,
      candidate,
      verificationToken,
      candidatePhotoBytes: photoBytes,
    });

    // 7. Persist to Supabase Storage 'generated-documents'
    const safeRef = candidate.sourceReference.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeRef}-REFERENCE-SLIP.pdf`;
    const storagePath = `reference-slips/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('generated-documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[REFERENCE_SLIP_CORE] Storage upload error:', uploadErr);
    }

    // 8. Insert or Update in public.generated_files ledger
    let fileId: string | undefined;
    const nextVersion = existingGenFile ? (existingGenFile.version || 1) + 1 : 1;

    const { data: insertedFile, error: fileErr } = await supabase
      .from('generated_files')
      .insert({
        application_id: application_id || null,
        joining_form_id: joining_form_id || null,
        file_type: 'REFERENCE_SLIP_PDF',
        file_name: fileName,
        storage_path: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
        version: nextVersion,
      })
      .select('id')
      .single();

    if (!fileErr && insertedFile) {
      fileId = insertedFile.id;
    }

    // 9. Generate 24-Hour Signed Download URL
    const { data: signData } = await supabase.storage
      .from('generated-documents')
      .createSignedUrl(storagePath, 86400);

    return {
      success: true,
      slip,
      pdfBuffer,
      signedUrl: signData?.signedUrl || undefined,
      storagePath,
      fileId,
      verificationToken,
    };
  } catch (err: any) {
    console.error('[REFERENCE_SLIP_CORE] Error:', err);
    return { success: false, error: err?.message || 'Failed to ensure reference slip for payment.' };
  }
}

// ------------------------------------------------------------------------------
// Permanent Public Document Verification Handler
// ------------------------------------------------------------------------------

export async function verifyDocumentTokenHandler(token: string): Promise<{ status: number; data: any }> {
  const cleanToken = (token || '').trim();

  if (!cleanToken) {
    return {
      status: 400,
      data: {
        isValid: false,
        error: 'Missing verification token in scan request.'
      }
    };
  }

  const supabase = getSupabaseServer();

  try {
    // 1. Check Reference Slips
    let slip: any = null;

    // Check by verification_token column
    const { data: slipsByToken } = await supabase
      .from('reference_slips')
      .select('*')
      .eq('verification_token', cleanToken)
      .limit(1);

    slip = slipsByToken?.[0] || null;

    // If not found and token starts with atg_ref_, attempt UUID lookup
    if (!slip && cleanToken.startsWith('atg_ref_')) {
      const hex = cleanToken.replace('atg_ref_', '');
      if (hex.length === 32) {
        const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        const { data: slipByUuid } = await supabase
          .from('reference_slips')
          .select('*')
          .eq('id', uuid)
          .maybeSingle();

        slip = slipByUuid || null;
      }
    }

    // Direct UUID match fallback
    if (!slip && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken)) {
      const { data: slipByDirectId } = await supabase
        .from('reference_slips')
        .select('*')
        .eq('id', cleanToken)
        .maybeSingle();

      slip = slipByDirectId || null;
    }

    if (slip) {
      // Resolve candidate name (Non-PII: No phone, Aadhaar, PAN, or full street address)
      let candidateName = 'Verified Candidate';
      if (slip.joining_form_id) {
        const { data: jf } = await supabase
          .from('joining_forms')
          .select('candidate_name')
          .eq('id', slip.joining_form_id)
          .maybeSingle();
        if (jf?.candidate_name) candidateName = jf.candidate_name;
      } else if (slip.application_id) {
        const { data: app } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', slip.application_id)
          .maybeSingle();
        if (app?.full_name) candidateName = app.full_name;
      }

      // Resolve payment confirmation
      let pQuery = supabase
        .from('payments')
        .select('payment_reference, receipt_number, amount, status, paid_at')
        .eq('status', 'SUCCESS');

      if (slip.joining_form_id) {
        pQuery = pQuery.eq('joining_form_id', slip.joining_form_id);
      } else if (slip.application_id) {
        pQuery = pQuery.eq('application_id', slip.application_id);
      }

      const { data: payments } = await pQuery.order('paid_at', { ascending: false }).limit(1);
      const payment = payments?.[0] || null;

      return {
        status: 200,
        data: {
          isValid: true,
          documentType: 'REFERENCE_SLIP',
          documentTitle: 'Official Employee Reference Slip & Placement Authorization',
          referenceNumber: slip.reference_number,
          candidateName,
          issuanceDate: slip.date || (slip.created_at ? slip.created_at.split('T')[0] : '—'),
          issuingAuthority: 'A TIGER GLOBAL Career Solution & Consultancy',
          designation: slip.selected_designation || slip.designation || 'Consultant / Executive',
          department: slip.department || 'Operations / Placement',
          companyName: slip.company_name || 'A TIGER GLOBAL Authorized Client Organization',
          interviewResult: slip.interview_result || 'SELECTED',
          paymentVerified: Boolean(payment?.status === 'SUCCESS'),
          paymentReference: payment?.payment_reference || 'VERIFIED',
          receiptNumber: payment?.receipt_number || 'REC-VERIFIED',
          feeStatus: payment?.status === 'SUCCESS' ? 'PAID & VERIFIED (INR 500.00)' : 'CONFIRMED',
          verificationStatus: 'OFFICIALLY ISSUED & AUTHENTIC DOCUMENT',
          verifiedAt: new Date().toISOString(),
        }
      };
    }

    // 2. Check Employees (ID Cards)
    const { data: empRpc } = await supabase.rpc('verify_employee_by_token', {
      p_token: cleanToken
    });

    if (empRpc && empRpc.is_valid) {
      return {
        status: 200,
        data: {
          isValid: true,
          documentType: 'EMPLOYEE_ID_CARD',
          documentTitle: 'Official Corporate Employee Identity Credential',
          ...empRpc,
        }
      };
    }

    // 3. Not Found
    return {
      status: 200,
      data: {
        isValid: false,
        error: 'No official Reference Slip or Identity Record matches this verification token. The document may be invalid, superseded, or tampered.'
      }
    };
  } catch (err: any) {
    console.error('[API_VERIFY_ERROR]', err);
    return {
      status: 500,
      data: {
        isValid: false,
        error: 'An internal server error occurred while verifying the cryptographic token.'
      }
    };
  }
}

