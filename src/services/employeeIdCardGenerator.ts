// ==============================================================================
// File: src/services/employeeIdCardGenerator.ts
// Description: Dynamic Two-Sided Employee Identity Card Generator & Persistence
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Standard: ISO/IEC 7810 ID-1 (CR80) — 85.60 mm x 53.98 mm (Standard PVC Card)
// Architecture:
//   1. Fully dynamic vector rendering via jsPDF (Zero blank PDF background overlay)
//   2. Front: Corporate branding, employee photo, employee details, signatures
//        - Renders DOB, Mobile, Email from employee record (resolved from joining_forms/applications)
//   3. Back: Verification terms, helpline, emergency contact, statutory attestation box
//        - QR code removed pending production verification domain (reintroduce when ready)
//   4. Persists to private 'generated-documents' bucket with file_type 'ID_CARD_PDF'
//   5. Audited via activity_logs (EMPLOYEE_ID_CARD_GENERATED)
// ==============================================================================

import { jsPDF } from 'jspdf';
import { persistGeneratedDocument } from './filePersistenceService';
import { logActivity } from './activityService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { formatIndianPhoneNumber } from '../utils/phoneUtils';
import { getActiveCompanySignatureDataUrl } from './companySignatureService';

export interface EmployeeIdCardData {
  employeeId?: string;
  applicationId?: string | null;
  joiningFormId?: string | null;
  employeeName: string;
  employeeCode: string;
  designation?: string | null;
  department?: string | null;
  companyName?: string | null;
  location?: string | null;
  dob?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  issuanceDate?: string | null;
  verificationToken?: string | null;
  verificationUrl?: string | null;
  photoUrlOrData?: string | null;
  signatureUrlOrData?: string | null;
  companySignatureUrlOrData?: string | null;
}

export interface GeneratedIdCardResult {
  blob: Blob;
  pdfBytes: Uint8Array;
  fileName: string;
  fileId?: string;
  storagePath?: string;
}

/**
 * Standard ID Card Dimensions: ISO/IEC 7810 ID-1 (CR80)
 * 85.6 mm width x 54.0 mm height (Landscape orientation)
 */
export const ID_CARD_DIMENSIONS = {
  widthMm: 85.6,
  heightMm: 54.0,
  orientation: 'landscape' as const,
  unit: 'mm' as const
};

/**
 * Normalizes a date into official DD/MM/YYYY display format
 */
function formatDisplayDate(val?: string | null): string {
  if (!val) return '—';
  const trimmed = val.trim();
  if (!trimmed || trimmed === '—') return '—';

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  return trimmed;
}

/**
 * Formats canonical Indian mobile numbers for ID card display
 */
function formatDisplayMobile(val?: string | null): string {
  if (!val) return '—';
  const trimmed = val.trim();
  if (!trimmed || trimmed === '—') return '—';
  const formatted = formatIndianPhoneNumber(trimmed);
  return formatted || trimmed;
}

/**
 * Resolves an image source into an embedded Data URL
 */
async function resolveImageDataUrl(imageSource?: string | null): Promise<string | null> {
  if (!imageSource) return null;

  try {
    if (imageSource.startsWith('data:image/')) {
      return imageSource;
    }

    if (
      imageSource.startsWith('http://') ||
      imageSource.startsWith('https://') ||
      imageSource.startsWith('blob:') ||
      imageSource.startsWith('/')
    ) {
      const res = await fetch(imageSource);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      
      let base64 = '';
      if (typeof Buffer !== 'undefined') {
        base64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(binary);
      }
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    console.warn('[resolveImageDataUrl] Unable to process image source:', err);
  }

  return null;
}

/**
 * Retained helper: resolves public verification URL for future reintroduction of QR
 */
export function resolveVerificationUrl(token?: string | null): string {
  if (!token) return 'https://atigergroups.com/verify/employee';

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/verify/employee/${token}`;
  }

  const siteUrl = (typeof process !== 'undefined' && process.env?.VITE_SITE_URL)
    ? process.env.VITE_SITE_URL.replace(/\/+$/, '')
    : 'https://atigergroups.com';

  return `${siteUrl}/verify/employee/${token}`;
}

/**
 * Generates the authentic 2-Sided Employee Identity Card PDF
 * - Page 1: Front side (Designation, Photo, Name, Code, DOB, Mobile, Email, Location, Address, Signatures)
 * - Page 2: Back side (Terms, Return Address, Emergency Contact, Corporate Registry Attestation)
 */
export async function generateEmployeeIdCardPdf(
  data: EmployeeIdCardData
): Promise<{ blob: Blob; pdfBytes: Uint8Array; fileName: string }> {
  // 1. Validate required data
  if (!data.employeeName || !data.employeeName.trim()) {
    throw new Error('Employee name is required to generate an official ID Card.');
  }
  if (!data.employeeCode || !data.employeeCode.trim()) {
    throw new Error('Employee code is required to generate an official ID Card.');
  }

  // 2. Initialize jsPDF with standard CR80 ID Card dimensions
  const doc = new jsPDF({
    orientation: ID_CARD_DIMENSIONS.orientation,
    unit: ID_CARD_DIMENSIONS.unit,
    format: [ID_CARD_DIMENSIONS.widthMm, ID_CARD_DIMENSIONS.heightMm]
  });

  const cardWidth = ID_CARD_DIMENSIONS.widthMm;
  const cardHeight = ID_CARD_DIMENSIONS.heightMm;

  // Resolve assets
  const [photoDataUrl, signatureDataUrl, companySignatureDataUrl] = await Promise.all([
    resolveImageDataUrl(data.photoUrlOrData),
    resolveImageDataUrl(data.signatureUrlOrData),
    resolveImageDataUrl(data.companySignatureUrlOrData)
  ]);

  // ============================================================================
  // SIDE 1: FRONT SIDE
  // ============================================================================
  // Outer Border & Card Background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(15, 27, 56);
  doc.setLineWidth(0.4);
  doc.roundedRect(0.4, 0.4, cardWidth - 0.8, cardHeight - 0.8, 2, 2, 'D');

  // Top Header Banner (Midnight Navy #0F1B38)
  doc.setFillColor(15, 27, 56);
  doc.rect(0.4, 0.4, cardWidth - 0.8, 9.2, 'F');

  // Champagne Gold Accent Strip (#C5A880)
  doc.setFillColor(197, 168, 128);
  doc.rect(0.4, 9.6, cardWidth - 0.8, 0.5, 'F');

  // Header Branding Typography
  doc.setTextColor(197, 168, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('A TIGER GLOBAL', cardWidth / 2, 4.2, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('CAREER SOLUTION & CONSULTANCY', cardWidth / 2, 7.8, { align: 'center' });

  // Photo Frame (Left Column)
  const photoX = 4;
  const photoY = 12.2;
  const photoW = 22;
  const photoH = 26;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 27, 56);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (photoDataUrl) {
    try {
      const format = photoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(photoDataUrl, format, photoX + 0.3, photoY + 0.3, photoW - 0.6, photoH - 0.6);
    } catch {
      // Fallback if image decode fails
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.text('PHOTO ON', photoX + photoW / 2, photoY + photoH / 2 - 1.5, { align: 'center' });
      doc.text('RECORD', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
    }
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('EMPLOYEE', photoX + photoW / 2, photoY + photoH / 2 - 1.5, { align: 'center' });
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
  }

  // Blood Group Pill (Below photo)
  if (data.bloodGroup && data.bloodGroup !== '—') {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.setLineWidth(0.2);
    doc.roundedRect(photoX, photoY + photoH + 1, photoW, 3, 0.5, 0.5, 'FD');
    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.2);
    doc.text(`BLOOD GRP: ${data.bloodGroup}`, photoX + photoW / 2, photoY + photoH + 3.1, { align: 'center' });
  }

  // Employee Information Details (Right Column)
  const infoX = 29;
  doc.setTextColor(15, 27, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(data.employeeName.toUpperCase(), infoX, 14.5);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const desigText = (data.designation || 'Associate').toUpperCase();
  doc.text(desigText, infoX, 17.5);

  if (data.department) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(` | ${data.department}`, infoX + doc.getTextWidth(desigText) + 1, 17.5);
  }

  // Subtle divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(infoX, 19.5, cardWidth - 3.5, 19.5);

  // Field Rows
  // Field Rows
  const drawFieldRow = (label: string, val?: string | null, y?: number) => {
    if (!y) return;
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.text(label, infoX, y);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    const displayVal = val?.trim() || '—';

    // Auto fit font size for long single-line text (e.g. lengthy email) without truncating
    let fontSize = 4.8;
    doc.setFontSize(fontSize);
    const availableWidth = cardWidth - 3.5 - (infoX + 16);
    while (doc.getTextWidth(displayVal) > availableWidth && fontSize > 3.2) {
      fontSize -= 0.2;
      doc.setFontSize(fontSize);
    }

    doc.text(displayVal, infoX + 16, y);
  };

  const formattedDob = formatDisplayDate(data.dob);
  const formattedMobile = formatDisplayMobile(data.mobile);
  const formattedEmail = data.email && data.email.trim() ? data.email.trim() : '—';

  drawFieldRow('EMP CODE:', data.employeeCode, 22.8);
  drawFieldRow('DOB:', formattedDob, 25.8);
  drawFieldRow('MOBILE:', formattedMobile, 28.8);
  drawFieldRow('EMAIL:', formattedEmail, 31.8);
  drawFieldRow('LOCATION:', data.location || 'Nagpur, Maharashtra', 34.8);

  // Multi-line Address Rendering (Full address preserved with word wrapping; zero truncation or ellipsis)
  const renderAddress = (rawAddress?: string | null, startY = 37.8) => {
    const cleanAddr = (rawAddress || 'Nagpur, Maharashtra')
      .replace(/[\r\n]+/g, ', ')
      .replace(/\s+,/g, ',')
      .replace(/,+/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    const displayAddr = cleanAddr || '—';

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.text('ADDRESS:', infoX, startY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    const valX = infoX + 16;
    const maxWidth = cardWidth - 3.5 - valX; // ~37.1 mm

    let addrFontSize = 4.4;
    let lineHeight = 2.4;

    doc.setFontSize(addrFontSize);
    let lines: string[] = doc.splitTextToSize(displayAddr, maxWidth);

    // If more than 2 lines, scale font size so all lines fit gracefully above the signature strip
    if (lines.length > 2) {
      addrFontSize = 3.8;
      lineHeight = 2.0;
      doc.setFontSize(addrFontSize);
      lines = doc.splitTextToSize(displayAddr, maxWidth);
    }

    if (lines.length > 3) {
      addrFontSize = 3.4;
      lineHeight = 1.7;
      doc.setFontSize(addrFontSize);
      lines = doc.splitTextToSize(displayAddr, maxWidth);
    }

    // Render every line without ellipsis or truncation
    let currentY = startY;
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], valX, currentY);
      currentY += lineHeight;
    }
  };

  renderAddress(data.address, 37.8);

  // Bottom Signatures Strip
  doc.setFillColor(248, 250, 252);
  doc.rect(0.4, 43.5, cardWidth - 0.8, 9.7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(0.4, 43.5, cardWidth - 0.4, 43.5);

  // Employee Signature Box (Left)
  if (signatureDataUrl) {
    try {
      const sigFormat = signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureDataUrl, sigFormat, 6, 44, 20, 5.5);
    } catch {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.text(data.employeeName, 16, 48.5, { align: 'center' });
    }
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.2);
    doc.text(data.employeeName, 16, 48.5, { align: 'center' });
  }
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text('EMPLOYEE SIGNATURE', 16, 52, { align: 'center' });

  // Authorized Signatory Box (Right - Founder / CEO Signature Area)
  if (companySignatureDataUrl) {
    try {
      const compSigFormat = companySignatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(companySignatureDataUrl, compSigFormat, 55, 44, 20, 5.5);
    } catch {
      doc.setTextColor(15, 27, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.text('A TIGER GLOBAL Recruitment Cell', 65, 48.5, { align: 'center' });
    }
  } else {
    doc.setTextColor(15, 27, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text('A TIGER GLOBAL Recruitment Cell', 65, 48.5, { align: 'center' });
  }
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.text('Managing Director & CEO', 65, 52, { align: 'center' });

  // ============================================================================
  // SIDE 2: BACK SIDE
  // ============================================================================
  doc.addPage([cardWidth, cardHeight], 'landscape');

  // Outer Border & Card Background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(15, 27, 56);
  doc.setLineWidth(0.4);
  doc.roundedRect(0.4, 0.4, cardWidth - 0.8, cardHeight - 0.8, 2, 2, 'D');

  // Top Header Banner
  doc.setFillColor(15, 27, 56);
  doc.rect(0.4, 0.4, cardWidth - 0.8, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY', cardWidth / 2, 4, { align: 'center' });
  doc.setTextColor(197, 168, 128);
  doc.setFontSize(4);
  doc.text('STATUTORY VERIFICATION & RETURN DIRECTIVE', cardWidth / 2, 6.5, { align: 'center' });

  // Left Column: Terms of Use & Return Instructions
  const leftX = 4;
  doc.setTextColor(15, 27, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text('TERMS & CONDITIONS', leftX, 11);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  const terms = [
    '• This Identity Card is the exclusive property of A TIGER GLOBAL.',
    '• Must be presented upon request by authorized company personnel/security.',
    '• Misuse, duplication, or unauthorized transfer is strictly prohibited.',
    '• Loss must be immediately reported to HR Administration.'
  ];
  let ty = 14;
  terms.forEach((t) => {
    doc.text(t, leftX, ty);
    ty += 3;
  });

  doc.setTextColor(15, 27, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('IF FOUND, PLEASE RETURN TO:', leftX, ty + 1);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.7);
  doc.text('Plot No. 440 Behind Royal Club, Suban Nagar,', leftX, ty + 4);
  doc.text('Nagpur, Maharashtra - 440035', leftX, ty + 6.8);
  doc.text('Helpline: +91 8349353946 | atigerglobal@gmail.com', leftX, ty + 9.6);

  if (data.emergencyContactPhone) {
    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.8);
    const emName = data.emergencyContactName ? `${data.emergencyContactName} - ` : '';
    doc.text(`Emergency Helpline: ${emName}${data.emergencyContactPhone}`, leftX, ty + 12.8);
  }

  // Right Column: Official Corporate Registry Cardlet (Clean Corporate Attestation — No Broken QR)
  const regBoxX = 57;
  const regBoxY = 9.5;
  const regBoxW = 24.5;
  const regBoxH = 36.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(regBoxX, regBoxY, regBoxW, regBoxH, 1.5, 1.5, 'FD');

  // Header banner inside cardlet
  doc.setFillColor(15, 27, 56);
  doc.roundedRect(regBoxX, regBoxY, regBoxW, 5.5, 1.5, 1.5, 'F');
  doc.rect(regBoxX, regBoxY + 3, regBoxW, 2.5, 'F');
  doc.setTextColor(197, 168, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('CORPORATE REGISTRY', regBoxX + regBoxW / 2, regBoxY + 3.8, { align: 'center' });

  // Organization emblem text
  doc.setTextColor(15, 27, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('A TIGER GLOBAL', regBoxX + regBoxW / 2, regBoxY + 9.5, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.text('WORKFORCE DIVISION', regBoxX + regBoxW / 2, regBoxY + 13, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(regBoxX + 2, regBoxY + 15, regBoxX + regBoxW - 2, regBoxY + 15);

  // Card reference & serial
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.6);
  doc.text('CARD SERIAL:', regBoxX + regBoxW / 2, regBoxY + 18.5, { align: 'center' });

  doc.setTextColor(15, 27, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text(`IDC-${data.employeeCode}`, regBoxX + regBoxW / 2, regBoxY + 22.5, { align: 'center' });

  // Issuing office
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.4);
  doc.text('ISSUED AT: NAGPUR, MH', regBoxX + regBoxW / 2, regBoxY + 26.5, { align: 'center' });

  // Status badge pill
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.setLineWidth(0.2);
  doc.roundedRect(regBoxX + 2, regBoxY + 29.5, regBoxW - 4, 4.5, 0.8, 0.8, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.6);
  doc.text('AUTHENTIC PVC CARD', regBoxX + regBoxW / 2, regBoxY + 32.7, { align: 'center' });

  // Bottom Footer Strip
  doc.setFillColor(15, 27, 56);
  doc.rect(0.4, 47.5, cardWidth - 0.8, 5.7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text('A TIGER GROUPS — WORKFORCE ONBOARDING & COMPLIANCE DIVISION', cardWidth / 2, 51.2, { align: 'center' });

  // 3. Produce output
  const pdfBytes = doc.output('arraybuffer');
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const sanitizedCode = (data.employeeCode || 'ATG-EMP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedName = (data.employeeName || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${sanitizedCode}-${sanitizedName}-ID-Card.pdf`;

  return { blob, pdfBytes: new Uint8Array(pdfBytes), fileName };
}

/**
 * Generates the authentic Employee Identity Card and archives it to private storage.
 */
export async function generateAndPersistEmployeeIdCard(
  data: EmployeeIdCardData,
  currentAdminId?: string | null
): Promise<GeneratedIdCardResult> {
  // Automatically resolve active Founder/CEO company signature if omitted
  if (!data.companySignatureUrlOrData && isSupabaseConfigured) {
    data.companySignatureUrlOrData = await getActiveCompanySignatureDataUrl();
  }

  const { blob, pdfBytes, fileName } = await generateEmployeeIdCardPdf(data);

  let fileId: string | undefined;
  let storagePath: string | undefined;

  if (isSupabaseConfigured) {
    // 1. Check existing version count for audit trail
    let version = 1;
    if (data.joiningFormId || data.applicationId) {
      let query = supabase
        .from('generated_files')
        .select('version')
        .eq('file_type', 'ID_CARD_PDF')
        .order('version', { ascending: false })
        .limit(1);

      if (data.joiningFormId) {
        query = query.eq('joining_form_id', data.joiningFormId);
      } else if (data.applicationId) {
        query = query.eq('application_id', data.applicationId);
      }

      const { data: existingFiles } = await query;
      if (existingFiles && existingFiles.length > 0) {
        version = (existingFiles[0].version || 1) + 1;
      }
    }

    // 2. Persist to secure storage archive
    if (data.applicationId || data.joiningFormId) {
      const persistResult = await persistGeneratedDocument({
        applicationId: data.applicationId || undefined,
        joiningFormId: data.joiningFormId || undefined,
        fileType: 'ID_CARD_PDF',
        fileName,
        blob,
        version
      });

      fileId = persistResult?.fileId;
      storagePath = persistResult?.storagePath;
    }

    // 3. Update employee record issued_at timestamp
    if (data.employeeId) {
      await supabase
        .from('employees')
        .update({ id_card_issued_at: new Date().toISOString() })
        .eq('id', data.employeeId);
    }

    // 4. Log governance activity
    const isRegeneration = version > 1;
    await logActivity({
      action: isRegeneration ? 'EMPLOYEE_ID_CARD_REGENERATED' : 'EMPLOYEE_ID_CARD_GENERATED',
      entityType: 'EMPLOYEE',
      entityId: data.employeeId,
      applicationId: data.applicationId,
      description: `Generated authentic 2-sided ID Card for ${data.employeeName} (${data.employeeCode})`,
      metadata: {
        employeeCode: data.employeeCode,
        employeeName: data.employeeName,
        fileName,
        storagePath,
        version,
        generatedBy: currentAdminId || undefined,
        verificationToken: data.verificationToken || undefined
      }
    });
  }

  return {
    blob,
    pdfBytes,
    fileName,
    fileId,
    storagePath
  };
}

/**
 * Triggers direct browser download of the Employee Identity Card PDF
 */
export async function triggerIdCardDownload(data: EmployeeIdCardData): Promise<void> {
  if (!data.companySignatureUrlOrData && isSupabaseConfigured) {
    data.companySignatureUrlOrData = await getActiveCompanySignatureDataUrl();
  }
  const { blob, fileName } = await generateEmployeeIdCardPdf(data);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}
