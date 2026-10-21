// ==============================================================================
// File: src/services/completeJoiningDocumentGenerator.ts
// Description: Multi-Page A4 PDF Generator for Complete Joining Documents &
//              Five Official Employee Joining Documents (Reproduced from Reference PDF)
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Reference: JOIN-2026-000051-gaggan.pdf (Source Pages 5, 6, 7, 8, 9)
// Standard: A4 Portrait (210mm x 297mm)
// ==============================================================================

import { jsPDF } from 'jspdf';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { RegularJoiningFormData } from './regularJoiningService';
import {
  FORMAL_JOINING_UNDERTAKING,
  MASTER_ATTESTATION
} from '../constants/joiningDeclarations';
import { persistGeneratedDocument } from './filePersistenceService';
import {
  getActiveCompanySignatureSignedUrl,
  getActiveCompanyStampSignedUrl
} from './companySignatureService';

export interface CompleteJoiningDocOptions {
  companyName?: string;
  consultancyName?: string;
  signatureDataUrl?: string | null;
  photoDataUrl?: string | null;
  aadhaarDataUrl?: string | null;
  bankPassbookDataUrl?: string | null;
  companySignatureUrl?: string | null;
  companyStampUrl?: string | null;
  verifierName?: string;
  verifiedAt?: string;
  place?: string;
}

/**
/**
 * Resolves an image source (data URL, storage path, or HTTP URL) to a base64 Data URL.
 * Strictly verifies image validity and handles storage buckets reliably.
 */
async function resolveImageToDataUrl(source?: string | null): Promise<string | null> {
  if (!source || typeof source !== 'string') return null;
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    let fetchUrl = trimmed;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && isSupabaseConfigured) {
      let bucket = 'candidate-documents';
      let cleanPath = trimmed;
      if (trimmed.startsWith('candidate-documents/')) {
        cleanPath = trimmed.replace(/^candidate-documents\//, '');
      } else if (
        trimmed.startsWith('company-assets/') ||
        trimmed.startsWith('signatures/') ||
        trimmed.startsWith('stamps/')
      ) {
        bucket = 'company-assets';
        cleanPath = trimmed.replace(/^company-assets\//, '');
      }

      const { data } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 3600);
      if (data?.signedUrl) {
        fetchUrl = data.signedUrl;
      } else {
        return null;
      }
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) {
      console.warn('[resolveImageToDataUrl] Non-image MIME type received:', contentType);
      return null;
    }
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.startsWith('data:image/')) {
          resolve(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[resolveImageToDataUrl] Failed to load image:', err);
    return null;
  }
}

type RGBColor = [number, number, number];

const PALETTE = {
  navy: [15, 27, 56] as RGBColor,        // #0F1B38
  gold: [197, 160, 89] as RGBColor,      // #C5A059
  textDark: [30, 41, 59] as RGBColor,    // #1E293B
  textMuted: [100, 116, 139] as RGBColor,// #64748B
  borderCol: [203, 213, 225] as RGBColor,// #CBD5E1
  bgLight: [248, 250, 252] as RGBColor,  // #F8FAFC
  amberBg: [254, 249, 195] as RGBColor,  // #FEF9C3
  amberBorder: [253, 230, 138] as RGBColor,
  amberText: [113, 63, 18] as RGBColor
};

/**
 * Helper to draw image fitted inside bounding box while preserving natural aspect ratio.
 */
function addFittedImage(
  doc: jsPDF,
  imgData: string | null,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  preferredFormat: 'PNG' | 'JPEG' = 'PNG'
): boolean {
  if (!imgData || !imgData.startsWith('data:image/')) return false;
  try {
    let drawW = maxW;
    let drawH = maxH;
    let drawX = x;
    let drawY = y;
    try {
      const props = doc.getImageProperties(imgData);
      if (props.width > 0 && props.height > 0) {
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        drawW = props.width * ratio;
        drawH = props.height * ratio;
        drawX = x + (maxW - drawW) / 2;
        drawY = y + (maxH - drawH) / 2;
      }
    } catch {
      // fallback
    }
    const fmt = imgData.includes('jpeg') || imgData.includes('jpg') ? 'JPEG' : preferredFormat;
    doc.addImage(imgData, fmt, drawX, drawY, drawW, drawH, undefined, 'FAST');
    return true;
  } catch (err) {
    console.warn('[addFittedImage] Failed to embed image in PDF:', err);
    return false;
  }
}

/**
 * Exhaustively resolves candidate signature source from any form or employee representation.
 * Strictly prevents substituting unrelated files, wallpapers, avatars, or company logos.
 */
export function resolveCandidateSignatureSource(
  data: RegularJoiningFormData | any,
  options: CompleteJoiningDocOptions = {}
): string | null {
  if (options.signatureDataUrl && typeof options.signatureDataUrl === 'string' && options.signatureDataUrl.trim()) {
    return options.signatureDataUrl.trim();
  }
  if (!data) return null;

  // 1. Direct signature field (object or string)
  if (data.signature) {
    if (typeof data.signature === 'string' && data.signature.trim()) {
      return data.signature.trim();
    }
    if (typeof data.signature === 'object') {
      if (typeof data.signature.dataUrl === 'string' && data.signature.dataUrl.trim()) {
        return data.signature.dataUrl.trim();
      }
      if (typeof data.signature.storagePath === 'string' && data.signature.storagePath.trim()) {
        return data.signature.storagePath.trim();
      }
    }
  }

  // 2. candidate_signature_path on employee / joining form record
  if (typeof data.candidate_signature_path === 'string' && data.candidate_signature_path.trim()) {
    return data.candidate_signature_path.trim();
  }

  // 3. Alternative direct properties
  if (typeof data.signatureUrl === 'string' && data.signatureUrl.trim()) return data.signatureUrl.trim();
  if (typeof data.signature_path === 'string' && data.signature_path.trim()) return data.signature_path.trim();
  if (typeof data.signature_url === 'string' && data.signature_url.trim()) return data.signature_url.trim();

  // 4. Documents metadata
  if (data.documentsMetadata?.signature?.storagePath) {
    return data.documentsMetadata.signature.storagePath;
  }
  if (data.custom_fields?.documentsMetadata?.signature?.storagePath) {
    return data.custom_fields.documentsMetadata.signature.storagePath;
  }

  // 5. Nested documents collection
  if (data.documents) {
    if (Array.isArray(data.documents)) {
      const sigDoc = data.documents.find(
        (d: any) => (d.document_type === 'SIGNATURE' || d.type === 'SIGNATURE') && !d.is_deleted
      );
      if (sigDoc?.storage_path) return sigDoc.storage_path;
      if (sigDoc?.dataUrl) return sigDoc.dataUrl;
      if (sigDoc?.file?.dataUrl) return sigDoc.file.dataUrl;
      if (sigDoc?.file?.storagePath) return sigDoc.file.storagePath;
    } else if (typeof data.documents === 'object') {
      const sigDoc = data.documents.SIGNATURE;
      if (sigDoc) {
        if (sigDoc.file?.dataUrl) return sigDoc.file.dataUrl;
        if (sigDoc.file?.storagePath) return sigDoc.file.storagePath;
        if (sigDoc.storagePath) return sigDoc.storagePath;
        if (sigDoc.dataUrl) return sigDoc.dataUrl;
      }
    }
  }

  // 6. Sub-objects
  if (data.declarations?.signatureUrl) return data.declarations.signatureUrl;
  if (data.personal?.signatureUrl) return data.personal.signatureUrl;

  return null;
}

/**
 * Concurrently resolves company authorized signature and company stamp assets.
 */
export async function resolveCompanyAssets(
  options: CompleteJoiningDocOptions = {}
): Promise<{ companySigDataUrl: string | null; companyStampDataUrl: string | null }> {
  const [activeCompanySigUrl, activeCompanyStampUrl] = await Promise.all([
    options.companySignatureUrl
      ? Promise.resolve(options.companySignatureUrl)
      : getActiveCompanySignatureSignedUrl().catch(() => null),
    options.companyStampUrl
      ? Promise.resolve(options.companyStampUrl)
      : getActiveCompanyStampSignedUrl().catch(() => null)
  ]);

  const [companySigDataUrl, companyStampDataUrl] = await Promise.all([
    resolveImageToDataUrl(activeCompanySigUrl),
    resolveImageToDataUrl(activeCompanyStampUrl)
  ]);

  return { companySigDataUrl, companyStampDataUrl };
}

/**
 * Shared Dual Execution Block renderer for Page 03 and Page 09 of the Joining Dossier.
 * Guarantees:
 *  - 100% Pure White `#FFFFFF` card backgrounds (completely prevents dark navy bleed)
 *  - High contrast for company stamp, authorized signature, and candidate signature
 *  - Preserved aspect ratios without distortion or clipping
 *  - Clean missing-asset placeholders when signatures or stamps are unconfigured
 */
export function drawDossierExecutionBlock(
  doc: jsPDF,
  startY: number,
  candidateTitle: string,
  emp: { employeeName: string },
  place: string,
  joiningDate: string,
  sigUrl: string | null,
  companyStampDataUrl: string | null,
  companySigDataUrl: string | null,
  verifierName: string
): void {
  const sigBoxW = 86;
  const sigBoxH = 36;
  const leftX = 15;
  const rightX = 109;

  // -------------------------------------------------------------------------
  // LEFT BOX: CANDIDATE SIGNATURE
  // -------------------------------------------------------------------------
  doc.setFillColor(255, 255, 255);
  doc.rect(leftX, startY, sigBoxW, sigBoxH, 'F');
  doc.setDrawColor(...PALETTE.borderCol);
  doc.setLineWidth(0.3);
  doc.rect(leftX, startY, sigBoxW, sigBoxH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text(candidateTitle, leftX + 4, startY + 5);

  const sigAreaX = leftX + 4;
  const sigAreaY = startY + 6.5;
  const sigAreaW = 78;
  const sigAreaH = 18;

  let candidateSigRendered = false;
  if (sigUrl) {
    candidateSigRendered = addFittedImage(doc, sigUrl, sigAreaX, sigAreaY, sigAreaW, sigAreaH);
  }

  if (!candidateSigRendered) {
    doc.setFillColor(248, 250, 252);
    doc.rect(sigAreaX, sigAreaY, sigAreaW, sigAreaH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(sigAreaX, sigAreaY, sigAreaW, sigAreaH, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('Signature not uploaded', sigAreaX + sigAreaW / 2, sigAreaY + 10.5, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text(emp.employeeName, leftX + 4, startY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(`Place: ${place} | Date: ${joiningDate}`, leftX + 4, startY + 32.5);

  // -------------------------------------------------------------------------
  // RIGHT BOX: COMPANY AUTHORIZATION & REGISTRATION SEAL
  // -------------------------------------------------------------------------
  // CRITICAL: Explicitly set fill color to pure white so it never inherits dark navy
  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, startY, sigBoxW, sigBoxH, 'F');
  doc.setDrawColor(...PALETTE.borderCol);
  doc.setLineWidth(0.3);
  doc.rect(rightX, startY, sigBoxW, sigBoxH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text('COMPANY AUTHORIZATION & REGISTRATION SEAL:', rightX + 4, startY + 5);

  // Slot 1: Official Company Seal (Stamp)
  const stampX = rightX + 4;
  const stampY = startY + 6.5;
  const stampW = 36;
  const stampH = 18;

  let stampRendered = false;
  if (companyStampDataUrl) {
    stampRendered = addFittedImage(doc, companyStampDataUrl, stampX, stampY, stampW, stampH);
  }

  if (!stampRendered) {
    doc.setFillColor(248, 250, 252);
    doc.rect(stampX, stampY, stampW, stampH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(stampX, stampY, stampW, stampH, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('Official Stamp Pending', stampX + stampW / 2, stampY + 10.5, { align: 'center' });
  }

  // Slot 2: Company Authorized Signatory
  const compSigX = rightX + 42;
  const compSigY = startY + 6.5;
  const compSigW = 40;
  const compSigH = 18;

  let compSigRendered = false;
  if (companySigDataUrl) {
    compSigRendered = addFittedImage(doc, companySigDataUrl, compSigX, compSigY, compSigW, compSigH);
  }

  if (!compSigRendered) {
    doc.setFillColor(248, 250, 252);
    doc.rect(compSigX, compSigY, compSigW, compSigH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(compSigX, compSigY, compSigW, compSigH, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('Authorized Signatory', compSigX + compSigW / 2, compSigY + 10.5, { align: 'center' });
  }

  // Officer name & Company name (Full contrast on pure white background)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text(`Authorized Officer: ${verifierName}`, rightX + 4, startY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...PALETTE.textDark);
  doc.text('A TIGER GLOBAL Career Solution & Consultancy', rightX + 4, startY + 32.5);
}

/**
 * Normalizes employee data from various form data shapes into consistent fields.
 */
export function extractDynamicEmployeeData(data: RegularJoiningFormData | any) {
  const employeeName = data.fullName || data.personal?.employeeName || data.employeeName || 'Candidate';
  const fatherName = data.fatherName || data.personal?.fatherName || data.father_name || '—';
  const employeeCode = data.employeeCode || data.emp?.employeeCode || data.joiningReference || 'ATG-501-2026';
  const designation = data.designation || data.emp?.designation || 'Associate';
  const department = data.department || data.emp?.department || 'Operations';
  const joiningDate = data.joiningDate || data.emp?.dateOfJoining || data.declarations?.declarationDate || data.declarationDate || new Date().toISOString().split('T')[0];
  const contactNumber = data.mobile || data.personal?.employeeContactNumber || data.contactNumber || '—';
  const permanentAddress = data.permanentAddress || data.personal?.permanentAddress || data.address || 'Nagpur, Maharashtra';
  const salary = data.salaryCtc ? `₹${Number(data.salaryCtc).toLocaleString('en-IN')}/- per month` : '₹15,000/- per month';
  const previousEmployer = data.declarations?.previousEmployerName || data.previousEmployerName || 'None (Fresher / Open Onboarding)';
  const lastWorkingDay = data.declarations?.previousEmployerLastWorkingDay || data.previousEmployerLastWorkingDay || 'N/A';
  const hasRelative = Boolean(data.declarations?.hasRelativeInOrganization || data.hasRelativeInOrganization);
  const relativeName = data.declarations?.relativeName || data.relativeName || '';
  const relativeDept = data.declarations?.relativeDepartment || data.relativeDepartment || 'Dept';
  const relativeRel = data.declarations?.relativeRelationship || data.relativeRelationship || 'Relative';
  const enterpriseUnit = data.unitName || data.companyName || 'Haldiram International / Client Enterprise Partners';
  const worksiteAddress = 'Nagpur, Maharashtra';

  return {
    employeeName,
    fatherName,
    employeeCode,
    designation,
    department,
    joiningDate,
    contactNumber,
    permanentAddress,
    salary,
    previousEmployer,
    lastWorkingDay,
    hasRelative,
    relativeName,
    relativeDept,
    relativeRel,
    enterpriseUnit,
    worksiteAddress
  };
}

// ==============================================================================
// 1. DRAW PAGE 5: SELF DECLARATION
// Source: JOIN-2026-000051-gaggan.pdf Page 5
// ==============================================================================
function drawSelfDeclarationPage(
  doc: jsPDF,
  emp: ReturnType<typeof extractDynamicEmployeeData>,
  sigUrl: string | null
) {
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.navy);
  doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...PALETTE.textDark);
  doc.text('SELF DECLARATION (PAGE 07)', 15, 25);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(15, 28, 195, 28);

  // Addressee & Salutation
  let y = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.textDark);
  doc.text('TO: The Management & HR Department', 15, y);
  y += 10;
  doc.text('Dear Sir/Madam,', 15, y);
  y += 12;

  // Paragraph 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);
  const p1 = `This is to certify that prior to joining A TIGER GLOBAL Career Solution & Consultancy, I was working with ${emp.previousEmployer} and have completed all relieving formalities with my previous employer. My last working day was ${emp.lastWorkingDay}.`;
  doc.text(p1, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 19;

  // Paragraph 2
  const p2 = 'To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities viz., legal, financial, professional, or personal which I have with my previous employer, if any.';
  doc.text(p2, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 18;

  // Paragraph 3
  const p3 = 'I agree to submit formal relieving letter to HR department once I receive the same from my previous employer.';
  doc.text(p3, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 14;

  // Paragraph 4
  const p4 = 'I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action by the company, including termination of service.';
  doc.text(p4, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });

  // Attestation Row
  const attestationY = 195;

  // Left: Name & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Name: ${emp.employeeName}`, 15, attestationY + 12);
  doc.text(`Date: ${emp.joiningDate}`, 15, attestationY + 22);

  // Right: Signature Box
  const sigBoxX = 135;
  const sigBoxW = 60;
  const sigBoxH = 26;

  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setDrawColor(180, 190, 205);
  doc.roundedRect(sigBoxX, attestationY, sigBoxW, sigBoxH, 2, 2, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text('Signature:', sigBoxX + 3, attestationY + 5);

  if (sigUrl) {
    addFittedImage(doc, sigUrl, sigBoxX + 4, attestationY + 6, sigBoxW - 8, sigBoxH - 8);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);
  doc.text(emp.employeeName, sigBoxX + sigBoxW / 2, attestationY + sigBoxH + 6, { align: 'center' });
}

// ==============================================================================
// 2. DRAW PAGE 6: DECLARATION REGARDING EMPLOYMENT OF RELATIVES
// Source: JOIN-2026-000051-gaggan.pdf Page 6
// ==============================================================================
function drawRelativeDeclarationPage(
  doc: jsPDF,
  emp: ReturnType<typeof extractDynamicEmployeeData>,
  sigUrl: string | null
) {
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.navy);
  doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...PALETTE.textDark);
  doc.text('DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PAGE 08)', 15, 25);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(15, 28, 195, 28);

  let y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);

  // Paragraph 1
  const p1 = "As per Internal Policy, the Organization does not encourage employment of 'relatives' as it can cause various problems, including charges of favoritism, conflicts of interest, family discord, and scheduling conflicts that work to the disadvantage of both the Organization and the employees.";
  doc.text(p1, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 20;

  // Paragraph 2
  const p2 = "For the above purpose, the term 'relatives' includes the following relationships, whether established by blood, marriage, or other legal action: mother, father, husband, wife, son, daughter, sister, brother, mother-in-law, father-in-law, sister-in-law, brother-in-law, son-in-law, daughter-in-law, stepchild, aunt, uncle, nephew, niece or cousin.";
  doc.text(p2, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 20;

  // Paragraph 3
  const p3 = `I, ${emp.employeeName}, joined on ${emp.joiningDate} as ${emp.designation}, do hereby declare that:`;
  doc.text(p3, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });
  y += 10;

  // Relative Option Box
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);
  if (emp.hasRelative) {
    doc.text(`(I-b) I AM related to ${emp.relativeName} working in ${emp.relativeDept} as ${emp.relativeRel}.`, 20, y + 8.5);
  } else {
    doc.text('(I-a) I am NOT directly or distantly related to any of the employees working in the Organization.', 20, y + 8.5);
  }
  y += 20;

  // Paragraph 4
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const p4 = 'I understand that if the declaration given above is found false, the Organization can take disciplinary action to the extent of termination of service.';
  doc.text(p4, 15, y, { maxWidth: 180, lineHeightFactor: 1.5 });

  // Attestation Row
  const attestationY = 195;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Name: ${emp.employeeName}`, 15, attestationY + 12);
  doc.text(`Date: ${emp.joiningDate}`, 15, attestationY + 22);

  const sigBoxX = 135;
  const sigBoxW = 60;
  const sigBoxH = 26;

  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setDrawColor(180, 190, 205);
  doc.roundedRect(sigBoxX, attestationY, sigBoxW, sigBoxH, 2, 2, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text('Signature:', sigBoxX + 3, attestationY + 5);

  if (sigUrl) {
    addFittedImage(doc, sigUrl, sigBoxX + 4, attestationY + 6, sigBoxW - 8, sigBoxH - 8);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);
  doc.text(emp.employeeName, sigBoxX + sigBoxW / 2, attestationY + sigBoxH + 6, { align: 'center' });
}

// ==============================================================================
// 3. DRAW PAGE 7: TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME
// Source: JOIN-2026-000051-gaggan.pdf Page 7
// ==============================================================================
function drawTermsAndConditionsPage(
  doc: jsPDF,
  emp: ReturnType<typeof extractDynamicEmployeeData>,
  sigUrl: string | null
) {
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.navy);
  doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...PALETTE.textDark);
  doc.text('TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME', 15, 25);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(15, 28, 195, 28);

  let y = 40;

  // Enterprise Unit & Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Enterprise Unit:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(emp.enterpriseUnit, 45, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Address:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(emp.worksiteAddress, 35, y);
  y += 14;

  // Term 1: Operational Shifts
  doc.setFont('helvetica', 'bold');
  doc.text('1. Operational Shifts: ', 15, y);
  doc.setFont('helvetica', 'normal');
  const t1 = 'Shift A (08:30 AM to 05:00 PM), Shift B (03:00 PM to 11:30 PM), Shift C (11:30 PM to 08:00 AM).';
  doc.text(t1, 48, y, { maxWidth: 147, lineHeightFactor: 1.4 });
  y += 14;

  // Term 2: Discipline & Industrial Safety
  doc.setFont('helvetica', 'bold');
  doc.text('2. Discipline & Industrial Safety: ', 15, y);
  doc.setFont('helvetica', 'normal');
  const t2 = 'Wearing safety shoes, uniforms, and identity badges is strictly mandatory. Tobacco, bidi, alcohol, and intoxicating substances are completely prohibited.';
  doc.text(t2, 63, y, { maxWidth: 132, lineHeightFactor: 1.4 });
  y += 16;

  // Term 3: Statutory Wages
  doc.setFont('helvetica', 'bold');
  doc.text('3. Statutory Wages: ', 15, y);
  doc.setFont('helvetica', 'normal');
  const t3 = 'Minimum wages paid strictly in accordance with applicable notification schedules between the 10th and 15th of every month.';
  doc.text(t3, 46, y, { maxWidth: 149, lineHeightFactor: 1.4 });

  // Attestation Row
  const attestationY = 195;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Employee Name: ${emp.employeeName}`, 15, attestationY + 12);
  doc.text(`Attestation Date: ${emp.joiningDate}`, 15, attestationY + 22);

  const sigBoxX = 135;
  const sigBoxW = 60;
  const sigBoxH = 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text('Employee Acceptance Signature:', sigBoxX, attestationY - 2);

  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setDrawColor(180, 190, 205);
  doc.roundedRect(sigBoxX, attestationY, sigBoxW, sigBoxH, 2, 2, 'S');
  doc.setLineDashPattern([], 0);

  if (sigUrl) {
    addFittedImage(doc, sigUrl, sigBoxX + 4, attestationY + 4, sigBoxW - 8, sigBoxH - 8);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textDark);
  doc.text(emp.employeeName, sigBoxX + sigBoxW / 2, attestationY + sigBoxH + 6, { align: 'center' });
}

// ==============================================================================
// 4. DRAW PAGE 8: CONTRACT APPOINTMENT LETTER
// Source: JOIN-2026-000051-gaggan.pdf Page 8
// ==============================================================================
function drawContractAppointmentLetterPage(
  doc: jsPDF,
  emp: ReturnType<typeof extractDynamicEmployeeData>,
  sigUrl: string | null,
  companySigUrl: string | null,
  companyStampUrl: string | null
) {
  // Page Border Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, 190, 277);

  // Centered Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 105, 20, { align: 'center' });

  doc.setFontSize(13.5);
  doc.text('CONTRACT APPOINTMENT LETTER', 105, 27, { align: 'center' });
  const titleWidth = doc.getTextWidth('CONTRACT APPOINTMENT LETTER');
  doc.setLineWidth(0.4);
  doc.line(105 - titleWidth / 2, 28, 105 + titleWidth / 2, 28);

  // Employee Particulars Table
  const tableX = 14;
  const tableY = 32;
  const tableW = 182;
  const rowH = 8.5;
  const c1W = 40;
  const c2W = 51;
  const c3W = 40;
  const c4W = 51;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  const drawTableCell = (x: number, y: number, w: number, h: number, isLabel: boolean, text: string) => {
    if (isLabel) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, y, w, h, 'F');
      doc.rect(x, y, w, h, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...PALETTE.navy);
      doc.text(text, x + 2.5, y + h - 2.8);
    } else {
      doc.rect(x, y, w, h, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...PALETTE.textDark);
      doc.text(String(text || '—').slice(0, 32), x + 2.5, y + h - 2.8);
    }
  };

  // Row 1
  drawTableCell(tableX, tableY, c1W, rowH, true, 'Employee Name:');
  drawTableCell(tableX + c1W, tableY, c2W, rowH, false, emp.employeeName);
  drawTableCell(tableX + c1W + c2W, tableY, c3W, rowH, true, "Father's Name:");
  drawTableCell(tableX + c1W + c2W + c3W, tableY, c4W, rowH, false, emp.fatherName);

  // Row 2
  drawTableCell(tableX, tableY + rowH, c1W, rowH, true, 'Employee / Joining ID:');
  drawTableCell(tableX + c1W, tableY + rowH, c2W, rowH, false, emp.employeeCode);
  drawTableCell(tableX + c1W + c2W, tableY + rowH, c3W, rowH, true, 'Designation:');
  drawTableCell(tableX + c1W + c2W + c3W, tableY + rowH, c4W, rowH, false, emp.designation);

  // Row 3
  drawTableCell(tableX, tableY + rowH * 2, c1W, rowH, true, 'Department:');
  drawTableCell(tableX + c1W, tableY + rowH * 2, c2W, rowH, false, emp.department);
  drawTableCell(tableX + c1W + c2W, tableY + rowH * 2, c3W, rowH, true, 'Date of Joining:');
  drawTableCell(tableX + c1W + c2W + c3W, tableY + rowH * 2, c4W, rowH, false, emp.joiningDate);

  // Row 4
  drawTableCell(tableX, tableY + rowH * 3, c1W, rowH, true, 'Contact Number:');
  drawTableCell(tableX + c1W, tableY + rowH * 3, c2W, rowH, false, emp.contactNumber);
  drawTableCell(tableX + c1W + c2W, tableY + rowH * 3, c3W, rowH, true, 'Permanent Address:');
  drawTableCell(tableX + c1W + c2W + c3W, tableY + rowH * 3, c4W, rowH, false, String(emp.permanentAddress).slice(0, 34));

  // Subject & Salutation
  let y = tableY + rowH * 4 + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Subject: Appointment on Contract Basis', tableX, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Dear ${emp.employeeName},`, tableX, y);
  y += 6;

  // Opening Paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const openText = 'We are pleased to appoint you in A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY on a contractual basis for operational deployment with the organization/client unit under the terms and conditions outlined below:';
  const contentMaxW = 174; // Safe printable width respecting left margin (tableX=14mm) and right margin inside 200mm border box
  doc.text(openText, tableX, y, { maxWidth: contentMaxW, lineHeightFactor: 1.45 });
  const openLines = doc.splitTextToSize(openText, contentMaxW);
  y += openLines.length * 4.2 + 3.0;

  // Terms 1 to 7
  const terms = [
    { num: '1. Nature of Contract Engagement:', body: 'This appointment is on a contractual basis for operational deployment with the organization/client unit.' },
    { num: '2. Remuneration:', body: `You shall receive a fixed consolidated salary of ${emp.salary}, subject to applicable statutory deductions.` },
    { num: '3. Statutory Benefits:', body: "You shall be eligible for statutory benefits, including Employees' Provident Fund (EPF) and Employee State Insurance (ESIC) where applicable, in accordance with applicable statutory provisions." },
    { num: '4. Working Hours & Overtime:', body: 'You shall observe the standard working hours and operational shift requirements assigned at your deployment facility. Any overtime work performed shall be compensated strictly according to applicable company rules and operational policies.' },
    { num: '5. Work Location / Duties:', body: 'You shall diligently perform your assigned duties at the designated work location or client site, maintaining workplace discipline, safety standards, and adherence to applicable operational rules.' },
    { num: '6. Leave:', body: 'Leave entitlements shall be governed by applicable company rules and require prior authorization from your designated supervisor or management.' },
    { num: '7. Transfer / Site Allocation:', body: 'The employee may be transferred or reassigned to another site or location according to work requirements.' }
  ];

  const drawClause = (num: string, bodyText: string): void => {
    // Sanitize currency symbol to standard ASCII Rs. to avoid jsPDF UTF-16 stream corruption and line overflow
    const cleanBody = bodyText.trim().replace(/₹/g, 'Rs. ').replace(/\u20B9/g, 'Rs. ');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const cleanNum = num.trim() + ' ';
    const headingW = doc.getTextWidth(cleanNum);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Split body into words
    const words = cleanBody.split(/\s+/);
    let line1Text = '';
    let wordIdx = 0;

    // Build first line (shares line with heading)
    while (wordIdx < words.length) {
      const word = words[wordIdx];
      const test = line1Text ? line1Text + ' ' + word : word;
      if (headingW + doc.getTextWidth(test) <= contentMaxW) {
        line1Text = test;
        wordIdx++;
      } else {
        break;
      }
    }

    // Build subsequent lines (start at tableX, full contentMaxW)
    const subsequentLines: string[] = [];
    let curSubLine = '';
    while (wordIdx < words.length) {
      const word = words[wordIdx];
      const test = curSubLine ? curSubLine + ' ' + word : word;
      if (doc.getTextWidth(test) <= contentMaxW) {
        curSubLine = test;
        wordIdx++;
      } else {
        if (curSubLine) {
          subsequentLines.push(curSubLine);
          curSubLine = word;
          wordIdx++;
        } else {
          subsequentLines.push(word);
          wordIdx++;
        }
      }
    }
    if (curSubLine) {
      subsequentLines.push(curSubLine);
    }

    // Render Line 1: Heading in bold, followed by body in normal
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(cleanNum, tableX, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    if (line1Text) {
      doc.text(line1Text, tableX + headingW, y);
    }

    // Render Subsequent Lines
    const lineStep = 4.2;
    subsequentLines.forEach((sLine) => {
      y += lineStep;
      doc.text(sLine, tableX, y);
    });

    // Dynamic spacing before the next clause
    y += lineStep + 2.0;
  };

  terms.forEach((term) => {
    drawClause(term.num, term.body);
  });

  // Authorization & Acceptance Section (dynamically positioned below clauses)
  const bottomSectionY = Math.max(236, y + 4);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(tableX, bottomSectionY, tableX + tableW, bottomSectionY);

  const colW = tableW / 2 - 4;

  // Left: Company Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('For A TIGER GLOBAL CAREER SOLUTION AND', tableX, bottomSectionY + 6);
  doc.text('CONSULTANCY', tableX, bottomSectionY + 10.5);

  // Company Stamp & Signature
  if (companyStampUrl) {
    addFittedImage(doc, companyStampUrl, tableX, bottomSectionY + 12, 28, 16);
  }
  if (companySigUrl) {
    addFittedImage(doc, companySigUrl, tableX + 30, bottomSectionY + 12, 36, 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Authorized Management Signatory', tableX, bottomSectionY + 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text('HR & Operations Department', tableX, bottomSectionY + 38.5);

  // Right: Employee Acceptance
  const rightX = tableX + tableW / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Employee Acceptance Acknowledgment:', rightX, bottomSectionY + 6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text('"I have read, understood, and accept the above terms and', rightX, bottomSectionY + 11);
  doc.text('conditions of my appointment."', rightX, bottomSectionY + 15);

  // Signing Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(rightX, bottomSectionY + 32, rightX + colW, bottomSectionY + 32);

  if (sigUrl) {
    addFittedImage(doc, sigUrl, rightX + 6, bottomSectionY + 17, 50, 14);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Employee Signature', rightX, bottomSectionY + 36.5);
  doc.text(emp.employeeName, rightX + colW, bottomSectionY + 36.5, { align: 'right' });
}

// ==============================================================================
// 5. DRAW PAGE 9: EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING
// Source: JOIN-2026-000051-gaggan.pdf Page 9
// ==============================================================================
function drawResignationDeclarationPage(
  doc: jsPDF,
  emp: ReturnType<typeof extractDynamicEmployeeData>,
  sigUrl: string | null
) {
  // Page Border Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, 190, 277);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING', 105, 24, { align: 'center' });
  const headingW = doc.getTextWidth('EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING');
  doc.setLineWidth(0.4);
  doc.line(105 - headingW / 2, 25.5, 105 + headingW / 2, 25.5);

  let y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('To,', 16, y);
  y += 6;
  doc.text('The Management (HR Department)', 16, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 16, y);
  y += 12;

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Subject: Employee Resignation Declaration & Exit Undertaking', 16, y);
  y += 10;

  // Salutation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Dear Sir / Madam,', 16, y);
  y += 10;

  // Paragraph 1
  const p1 = `I, the undersigned, am engaged with A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY in the capacity of ${emp.designation || '___________________________________'}.`;
  doc.text(p1, 16, y, { maxWidth: 178, lineHeightFactor: 1.65 });
  y += 16;

  // Paragraph 2
  const p2 = "I hereby declare that, upon my decision to discontinue or separate from my employment/service with the organization, this declaration may be relied upon as my voluntary resignation declaration and may be used for completing the applicable exit formalities and Full & Final Settlement, subject to the company's applicable rules and statutory requirements.";
  doc.text(p2, 16, y, { maxWidth: 178, lineHeightFactor: 1.65 });
  y += 24;

  // Paragraph 3
  const p3 = "I express my sincere appreciation to A TIGER GROUP'S for the opportunity, cooperation, professional guidance, and experience provided to me during my association with the organization.";
  doc.text(p3, 16, y, { maxWidth: 178, lineHeightFactor: 1.65 });
  y += 20;

  // Sign-off
  doc.text('Thanking you,', 16, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Yours faithfully,', 16, y);
  y += 18;

  // Employee Particulars Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Employee Particulars', 16, y);
  y += 10;

  const drawUnderlinedRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(label, 16, y);

    const valX = 64;
    const lineW = 95;
    doc.setFont('helvetica', 'normal');
    doc.text(value, valX, y);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(valX, y + 1.5, valX + lineW, y + 1.5);
    y += 10;
  };

  drawUnderlinedRow('Employee Name:', emp.employeeName);
  drawUnderlinedRow('Employee / Joining ID:', emp.employeeCode);
  drawUnderlinedRow('Designation:', emp.designation);
  drawUnderlinedRow('Contact Number:', emp.contactNumber);

  // Employee Signature Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Employee Signature:', 16, y + 4);

  const valX = 64;
  const lineW = 95;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(valX, y + 8, valX + lineW, y + 8);

  if (sigUrl) {
    addFittedImage(doc, sigUrl, valX + 4, y - 5, 45, 12);
  }
}

// ==============================================================================
// PUBLIC EXPORT: GENERATE THE FIVE OFFICIAL EMPLOYEE JOINING DOCUMENTS
// Exactly 5 Pages corresponding to Source PDF Pages 5, 6, 7, 8, 9
// ==============================================================================
export async function generateFiveOfficialJoiningDocumentsPdf(
  data: RegularJoiningFormData | any,
  options: CompleteJoiningDocOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const emp = extractDynamicEmployeeData(data);

  // Resolve assets concurrently
  const [sigUrl, { companySigDataUrl, companyStampDataUrl }] = await Promise.all([
    resolveImageToDataUrl(resolveCandidateSignatureSource(data, options)),
    resolveCompanyAssets(options)
  ]);

  // PAGE 1: SELF DECLARATION (PDF Page 5)
  drawSelfDeclarationPage(doc, emp, sigUrl);

  // PAGE 2: DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PDF Page 6)
  doc.addPage('a4', 'portrait');
  drawRelativeDeclarationPage(doc, emp, sigUrl);

  // PAGE 3: TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME (PDF Page 7)
  doc.addPage('a4', 'portrait');
  drawTermsAndConditionsPage(doc, emp, sigUrl);

  // PAGE 4: CONTRACT APPOINTMENT LETTER (PDF Page 8)
  doc.addPage('a4', 'portrait');
  drawContractAppointmentLetterPage(doc, emp, sigUrl, companySigDataUrl, companyStampDataUrl);

  // PAGE 5: EMPLOYEE RESIGNATION DECLARATION & UNDERTAKING (PDF Page 9)
  doc.addPage('a4', 'portrait');
  drawResignationDeclarationPage(doc, emp, sigUrl);

  return doc;
}

/**
 * Downloads the five official employee joining documents PDF directly in browser.
 */
export async function downloadFiveOfficialJoiningDocumentsPdf(
  data: RegularJoiningFormData | any,
  options: CompleteJoiningDocOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const doc = await generateFiveOfficialJoiningDocumentsPdf(data, options);
    const emp = extractDynamicEmployeeData(data);
    const sanitizedName = emp.employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCode = emp.employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedCode}-${sanitizedName}-Official-Joining-Documents.pdf`;

    doc.save(fileName);

    return { success: true, fileName };
  } catch (err: any) {
    console.error('[downloadFiveOfficialJoiningDocumentsPdf] Error:', err);
    return { success: false, fileName: '', error: err.message || 'Failed to generate Official Joining Documents PDF.' };
  }
}

/**
 * Standalone Employee Declaration PDF generator (Item 3 in Documents Panel).
 * Directly outputs the 5 Official Documents.
 */
export async function generateEmployeeDeclarationPdf(
  data: RegularJoiningFormData | any,
  options: CompleteJoiningDocOptions = {}
): Promise<jsPDF> {
  return generateFiveOfficialJoiningDocumentsPdf(data, options);
}

export async function downloadEmployeeDeclarationPdf(
  data: RegularJoiningFormData | any,
  options: CompleteJoiningDocOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const doc = await generateEmployeeDeclarationPdf(data, options);
    const emp = extractDynamicEmployeeData(data);
    const sanitizedName = emp.employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCode = emp.employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedCode}-${sanitizedName}-Employee-Declaration.pdf`;

    doc.save(fileName);

    return { success: true, fileName };
  } catch (err: any) {
    console.error('[downloadEmployeeDeclarationPdf] Error:', err);
    return { success: false, fileName: '', error: err.message || 'Failed to generate Employee Declaration PDF.' };
  }
}

/**
 * Generates the Complete Joining Document Dossier (9 Pages).
 * Pages 1-3: Particulars, Specimens, Joining Report
 * Pages 4-8: The 5 Official Documents (Self Declaration, Relatives, Terms, Contract Letter, Resignation)
 * Page 9: Master Submission Attestation & Registration Seal
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

  const emp = extractDynamicEmployeeData(data);
  const employeeCode = emp.employeeCode;
  const joiningDate = emp.joiningDate;
  const place = options.place || 'Nagpur, Maharashtra';
  const verifierName = options.verifierName || 'Administrative Cell';

  const [{ companySigDataUrl, companyStampDataUrl }, photoUrl, aadhaarUrl, passbookUrl, sigUrl] = await Promise.all([
    resolveCompanyAssets(options),
    resolveImageToDataUrl(options.photoDataUrl || (data as any).photo?.dataUrl || (data as any).photo?.storagePath || (data as any).photo_path),
    resolveImageToDataUrl(options.aadhaarDataUrl || (data as any).aadhaar?.dataUrl || (data as any).aadhaar?.storagePath || (data as any).aadhaar_path),
    resolveImageToDataUrl(options.bankPassbookDataUrl || (data as any).bankPassbook?.dataUrl || (data as any).bankPassbook?.storagePath || (data as any).passbook_path),
    resolveImageToDataUrl(resolveCandidateSignatureSource(data, options))
  ]);

  const TOTAL_PAGES = 9;

  // Running Header Helper for Dossier Sheets
  const drawRunningHeader = (subTitle: string, pageNum: number) => {
    doc.setFillColor(...PALETTE.navy);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(...PALETTE.gold);
    doc.rect(0, 4, 210, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PALETTE.navy);
    doc.text('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', 15, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('Corporate Head Office: Nagpur, Maharashtra | Registered Employment Consultancy', 15, 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.navy);
    doc.text(`REF: ${employeeCode}`, 195, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(`DATE: ${joiningDate}`, 195, 16, { align: 'right' });

    doc.setFillColor(...PALETTE.bgLight);
    doc.rect(15, 19, 180, 6.5, 'F');
    doc.setDrawColor(...PALETTE.borderCol);
    doc.rect(15, 19, 180, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...PALETTE.navy);
    doc.text(subTitle.toUpperCase(), 18, 23.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.gold);
    doc.text('CONFIDENTIAL ONBOARDING RECORD', 192, 23.5, { align: 'right' });

    doc.setDrawColor(...PALETTE.borderCol);
    doc.line(15, 285, 195, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('A TIGER GLOBAL Career Solution & Consultancy — Internal Employment Onboarding Record', 15, 289);
    doc.text(`Page ${pageNum} of ${TOTAL_PAGES}`, 195, 289, { align: 'right' });
  };

  // PAGE 1: PARTICULARS & ONBOARDING DETAILS
  drawRunningHeader('PAGE 01 / 09 — EMPLOYEE PARTICULARS & ONBOARDING DETAILS', 1);
  let currentY = 28;

  doc.setFillColor(...PALETTE.navy);
  doc.rect(15, currentY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL EMPLOYEE JOINING DOSSIER & PROFILE', 105, currentY + 5.5, { align: 'center' });
  currentY += 10;

  const drawRow = (l1: string, v1?: string | null, l2?: string, v2?: string | null, height = 6.2) => {
    doc.setDrawColor(...PALETTE.borderCol);
    doc.rect(15, currentY, 180, height);
    doc.line(60, currentY, 60, currentY + height);
    doc.line(105, currentY, 105, currentY + height);
    doc.line(150, currentY, 150, currentY + height);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.navy);
    doc.text(l1, 17, currentY + height - 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PALETTE.textDark);
    doc.text(String(v1 || '—').slice(0, 32), 62, currentY + height - 2);

    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PALETTE.navy);
      doc.text(l2, 107, currentY + height - 2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PALETTE.textDark);
      doc.text(String(v2 || '—').slice(0, 32), 152, currentY + height - 2);
    }
    currentY += height;
  };

  const drawSectionTitle = (title: string, badge?: string) => {
    currentY += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, 180, 5.5, 'F');
    doc.setDrawColor(...PALETTE.borderCol);
    doc.rect(15, currentY, 180, 5.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.navy);
    doc.text(title, 18, currentY + 3.8);

    if (badge) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...PALETTE.gold);
      doc.text(badge, 192, currentY + 3.8, { align: 'right' });
    }
    currentY += 5.5;
  };

  drawSectionTitle('SECTION A: JOINING DETAILS (1–7)', 'OFFICIAL ONBOARDING');
  drawRow('1. Employee Code:', data.employeeCode, '2. Joining Date:', data.joiningDate);
  drawRow('3. Department:', data.department, '4. Designation:', data.designation);
  drawRow('5. Placement Company:', data.companyName, '6. Unit / Worksite:', data.unitName);
  drawRow('7. Factory / Supervisor:', data.factorySupervisorName, 'Date of Interview:', data.interviewDate ? String(data.interviewDate) : '—');
  if (data.salaryCtc) {
    drawRow('Salary (CTC) per Month:', `₹ ${Number(data.salaryCtc).toLocaleString('en-IN')}`, 'Employment Status:', 'ACTIVE / VERIFIED');
  }

  drawSectionTitle('SECTION B: CANDIDATE PERSONAL DETAILS (8–21)', 'VERIFIED KYC RECORDS');
  drawRow('8. Full Legal Name:', data.fullName, "9. Father's Name:", data.fatherName);
  drawRow('10. Date of Birth:', data.dob, '11. Gender / Marital Status:', `${data.gender || '—'} / ${data.maritalStatus || '—'}`);
  drawRow('12. Aadhaar Number:', data.aadhaarNumber, '13. Mobile (Aadhaar):', data.mobile);
  drawRow('14. Alternate Mobile:', data.alternateMobile, '15. Official Email:', data.email);
  drawRow('16. UAN (PF Number):', data.uanNumber || 'Not Enrolled / N/A', '17. ESIC Number:', data.esicNumber || 'Not Enrolled / N/A');
  drawRow('18. Professional Tax (PT):', data.ptNumber || 'Not Enrolled / N/A', 'Verification Status:', data.submissionStatus || 'VERIFIED');

  doc.setDrawColor(...PALETTE.borderCol);
  doc.rect(15, currentY, 180, 7.5);
  doc.line(60, currentY, 60, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text('19. Permanent Address:', 17, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.textDark);
  doc.text(String(data.permanentAddress || '—').slice(0, 75), 62, currentY + 5);
  currentY += 7.5;

  doc.setDrawColor(...PALETTE.borderCol);
  doc.rect(15, currentY, 180, 7.5);
  doc.line(60, currentY, 60, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text('20. Current Address:', 17, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.textDark);
  doc.text(String(data.currentAddress || data.permanentAddress || '—').slice(0, 75), 62, currentY + 5);
  currentY += 7.5;

  drawSectionTitle('SECTION C: BANK DISBURSEMENT PARTICULARS (22–26)', 'RESTRICTED / INTERNAL');
  drawRow('22. Bank Account No.:', data.bankAccountNumber, '23. IFSC Code:', data.ifscCode);
  drawRow('24. Bank Name:', data.bankName, '25. Branch Name:', data.branchName);
  drawRow('26. PhonePe / UPI Number:', data.upiNumber || 'Not Linked', 'Disbursement Channel:', 'Electronic Bank Transfer (NEFT/RTGS)');

  // PAGE 2: PHOTOGRAPHS SPECIMENS (27–30)
  doc.addPage('a4', 'portrait');
  drawRunningHeader('PAGE 02 / 09 — REQUIRED PHOTOGRAPHS & UPLOADED SPECIMENS', 2);
  currentY = 28;

  drawSectionTitle('SECTION D: STATUTORY PHOTOGRAPHS & UPLOADED DOCUMENTS (27–30)', 'ATTACHED SPECIMENS');
  const boxW = 86;
  const boxH = 92;
  const col1X = 15;
  const col2X = 109;

  const drawDocBox = (x: number, y: number, label: string, num: string, imgDataUrl: string | null) => {
    doc.setFillColor(...PALETTE.bgLight);
    doc.rect(x, y, boxW, boxH, 'F');
    doc.setDrawColor(...PALETTE.borderCol);
    doc.rect(x, y, boxW, boxH, 'S');

    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, boxW, 7, 'F');
    doc.line(x, y + 7, x + boxW, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.navy);
    doc.text(`${num}. ${label}`, x + 4, y + 5);

    let rendered = false;
    if (imgDataUrl) {
      rendered = addFittedImage(doc, imgDataUrl, x + 4, y + 10, boxW - 8, boxH - 14);
    }
    if (!rendered) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text('Specimen Not Uploaded / Pending', x + boxW / 2, y + boxH / 2, { align: 'center' });
    }
  };

  drawDocBox(col1X, currentY + 3, 'Candidate Live Photo', '27', photoUrl);
  drawDocBox(col2X, currentY + 3, 'Aadhaar Card Photo', '28', aadhaarUrl);
  currentY += boxH + 8;
  drawDocBox(col1X, currentY, 'Bank Passbook / Cheque', '29', passbookUrl);
  drawDocBox(col2X, currentY, 'Candidate Specimen Signature', '30', sigUrl);

  // PAGE 3: FORMAL JOINING REPORT UNDERTAKING
  doc.addPage('a4', 'portrait');
  drawRunningHeader('PAGE 03 / 09 — FORMAL JOINING REPORT & DUTY UNDERTAKING', 3);
  currentY = 28;

  drawSectionTitle('SECTION E: JOINING REPORT (FORMAL UNDERTAKING)', 'STATUTORY REPORTING');

  doc.setFillColor(...PALETTE.amberBg);
  doc.rect(15, currentY, 180, 24, 'F');
  doc.setDrawColor(...PALETTE.amberBorder);
  doc.rect(15, currentY, 180, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.amberText);
  doc.text('FORMAL REPORTING PROCLAMATION:', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(69, 26, 3);
  doc.text(FORMAL_JOINING_UNDERTAKING.proclamation(joiningDate), 18, currentY + 11.5, { maxWidth: 174, lineHeightFactor: 1.4 });
  currentY += 28;

  doc.setFillColor(...PALETTE.bgLight);
  doc.rect(15, currentY, 180, 48, 'F');
  doc.setDrawColor(...PALETTE.borderCol);
  doc.rect(15, currentY, 180, 48, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.navy);
  doc.text('UNDERTAKING COVENANTS & WORKPLACE OBLIGATIONS:', 18, currentY + 6.5);

  let termY = currentY + 14;
  FORMAL_JOINING_UNDERTAKING.terms.forEach((term, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.navy);
    doc.text(`${idx + 1}.`, 20, termY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.textDark);
    doc.text(term, 26, termY, { maxWidth: 164, lineHeightFactor: 1.35 });
    termY += 10;
  });
  currentY += 54;

  // Page 03 Execution Block
  drawDossierExecutionBlock(
    doc,
    currentY,
    'CANDIDATE REPORTING SIGNATURE:',
    emp,
    place,
    joiningDate,
    sigUrl,
    companyStampDataUrl,
    companySigDataUrl,
    verifierName
  );

  // PAGES 4 TO 8: THE FIVE OFFICIAL DOCUMENTS (SOURCE PDF PAGES 5 TO 9)
  // Page 4: Self Declaration
  doc.addPage('a4', 'portrait');
  drawSelfDeclarationPage(doc, emp, sigUrl);

  // Page 5: Declaration Regarding Employment of Relatives
  doc.addPage('a4', 'portrait');
  drawRelativeDeclarationPage(doc, emp, sigUrl);

  // Page 6: Terms & Conditions of Employment, Shifts & Overtime
  doc.addPage('a4', 'portrait');
  drawTermsAndConditionsPage(doc, emp, sigUrl);

  // Page 7: Contract Appointment Letter
  doc.addPage('a4', 'portrait');
  drawContractAppointmentLetterPage(doc, emp, sigUrl, companySigDataUrl, companyStampDataUrl);

  // Page 8: Employee Resignation Declaration & Undertaking
  doc.addPage('a4', 'portrait');
  drawResignationDeclarationPage(doc, emp, sigUrl);

  // PAGE 9: MASTER ATTESTATION & CORPORATE AUTHORIZATION SEAL
  doc.addPage('a4', 'portrait');
  drawRunningHeader('PAGE 09 / 09 — MASTER ATTESTATION & CORPORATE AUTHORIZATION', 9);
  currentY = 28;

  drawSectionTitle('SECTION G: MASTER ATTESTATION & SIGNATURE', 'LEGALLY BINDING');

  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 180, 36, 'F');
  doc.setDrawColor(...PALETTE.borderCol);
  doc.rect(15, currentY, 180, 36, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.navy);
  doc.text(MASTER_ATTESTATION.title, 18, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...PALETTE.textDark);
  doc.text(MASTER_ATTESTATION.statement, 18, currentY + 13, { maxWidth: 174, lineHeightFactor: 1.45 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...PALETTE.navy);
  doc.text(MASTER_ATTESTATION.declarationAcknowledgeNote, 18, currentY + 30, { maxWidth: 174 });
  currentY += 44;

  doc.setFillColor(...PALETTE.bgLight);
  doc.rect(15, currentY, 180, 20, 'F');
  doc.setDrawColor(...PALETTE.borderCol);
  doc.rect(15, currentY, 180, 20, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...PALETTE.navy);
  doc.text('CORPORATE GOVERNANCE & AUTHENTICATION PROTOCOL:', 18, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    'This onboarding document constitutes an official corporate record. The digital signatures and seals inscribed below authenticate the formal induction of the candidate under the rules, guidelines, and statutory service codes of A TIGER GLOBAL Career Solution & Consultancy.',
    18,
    currentY + 10.5,
    { maxWidth: 174, lineHeightFactor: 1.35 }
  );
  currentY += 28;

  // Final Master Execution Block
  // Page 09 Execution Block
  drawDossierExecutionBlock(
    doc,
    currentY,
    'CANDIDATE FINAL SIGNATURE:',
    emp,
    place,
    joiningDate,
    sigUrl,
    companyStampDataUrl,
    companySigDataUrl,
    verifierName
  );

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
    const emp = extractDynamicEmployeeData(data);
    const sanitizedName = emp.employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCode = emp.employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedCode}-${sanitizedName}-Complete-Joining-Document.pdf`;

    doc.save(fileName);

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
