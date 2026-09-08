// ==============================================================================
// File: src/services/referenceSlipPdfGenerator.ts
// Description: Dedicated 2-Page PDF Generator for Reference Slip & Consultancy Return
// Authority: Faithfully preserves client master: refrence slip.pdf
// Brand: A TIGER GLOBAL Career Solution & Consultancy / A Tiger Group's
// Layout:
//   Page 1: Employee Reference Slip (Candidate KYC, Photo, Admin & Company Result)
//   Page 2: Consultancy Return Form (Demographics, 10 Official Terms, Acceptance, Signature)
// Security & Storage:
//   - Uses pdf-lib with master background template
//   - Persists into private 'generated-documents' Supabase bucket
//   - Records audit trail in public.generated_files ledger with versioning
//   - Never exposes permanent public URLs (authenticated signed URLs only)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
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
  error?: string;
}

/**
 * Converts image source (DataUrl, Storage Path, or HTTP URL) into Uint8Array bytes
 */
async function resolveImageBytes(source?: string | null): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!source) return null;

  try {
    // 1. Data URL
    if (source.startsWith('data:')) {
      const isPng = source.includes('image/png');
      const base64 = source.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { bytes, isPng };
    }

    // 2. Supabase Storage Path (e.g., candidate-documents/photo.jpg or generated-documents/...)
    if (isSupabaseConfigured && !source.startsWith('http://') && !source.startsWith('https://')) {
      // Determine bucket from prefix or default to candidate-documents / generated-documents
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
        const isPng = (data.type || '').includes('png') || filePath.toLowerCase().endsWith('.png');
        return { bytes: new Uint8Array(arrayBuf), isPng };
      }
    }

    // 3. HTTP / HTTPS URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const resp = await fetch(source);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const contentType = resp.headers.get('content-type') || '';
        const isPng = contentType.includes('png') || source.toLowerCase().endsWith('.png');
        return { bytes: new Uint8Array(arrayBuf), isPng };
      }
    }

    return null;
  } catch (err) {
    console.warn('[resolveImageBytes] Failed to resolve image:', err);
    return null;
  }
}

/**
 * Draws a clean vector checkmark on the PDF page without font-encoding limitations
 */
function drawVectorCheckmark(
  page: PDFPage,
  x: number,
  y: number,
  size: number = 10,
  color = rgb(0.1, 0.45, 0.2)
) {
  // Checkmark short leg
  page.drawLine({
    start: { x: x, y: y + size * 0.4 },
    end: { x: x + size * 0.35, y: y },
    thickness: 1.8,
    color
  });
  // Checkmark long leg
  page.drawLine({
    start: { x: x + size * 0.35, y: y },
    end: { x: x + size, y: y + size * 0.85 },
    thickness: 1.8,
    color
  });
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
 * Generates the official 2-page Reference Slip & Consultancy Return PDF and persists it
 */
export async function generateAndPersistReferenceSlipPdf(
  detail: ReferenceSlipDetailData,
  adminUserId?: string | null
): Promise<GenerateReferenceSlipPdfResult> {
  try {
    // 1. Fetch master template PDF (public/assets/pdf/reference_slip_master.pdf)
    const response = await fetch('/assets/pdf/reference_slip_master.pdf');
    if (!response.ok) {
      throw new Error('Authoritative Reference Slip PDF template could not be loaded.');
    }
    const templateBytes = await response.arrayBuffer();

    // 2. Load PDFDocument
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    if (pages.length < 2) {
      throw new Error(`Master template contains ${pages.length} page(s); expected exactly 2 pages.`);
    }

    const page1 = pages[0];
    const page2 = pages[1];

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const darkColor = rgb(0.1, 0.1, 0.15);
    const greenColor = rgb(0.08, 0.48, 0.22);
    const redColor = rgb(0.75, 0.15, 0.15);

    const { slip, candidate, consultancyReturn } = detail;

    // Helper: Draw Text with optional wrapping
    const drawText = (
      page: PDFPage,
      text: string | undefined | null,
      x: number,
      y: number,
      size: number = 8.5,
      bold: boolean = false,
      color = darkColor,
      maxWidth?: number
    ) => {
      if (!text) return;
      page.drawText(String(text).trim(), {
        x,
        y,
        size,
        font: bold ? helveticaBold : helvetica,
        color,
        maxWidth
      });
    };

    // Helper: Embed Image
    const embedAndDrawImage = async (
      page: PDFPage,
      imageSource: string | null | undefined,
      box: { x: number; y: number; width: number; height: number }
    ) => {
      if (!imageSource) return;
      const res = await resolveImageBytes(imageSource);
      if (!res) return;

      try {
        const embeddedImg = res.isPng
          ? await pdfDoc.embedPng(res.bytes)
          : await pdfDoc.embedJpg(res.bytes);

        page.drawImage(embeddedImg, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        });
      } catch (err) {
        console.warn('Could not embed image into Reference Slip:', err);
      }
    };

    // =========================================================================
    // PAGE 1: EMPLOYEE REFERENCE SLIP
    // =========================================================================

    // Top Right Header: Reference Number & Slip Date
    drawText(page1, slip.reference_number, 395, 778, 9, true);
    drawText(page1, formatDisplayDate(slip.date || slip.created_at), 480, 742, 8.5, false);

    // Candidate Details
    drawText(page1, candidate.fullName, 185, 647, 9, true);
    drawText(page1, candidate.fatherName, 185, 628, 8.5);
    drawText(page1, formatDisplayDate(candidate.dob), 185, 610, 8.5);
    drawText(page1, candidate.gender || '—', 350, 610, 8.5);
    drawText(page1, candidate.mobile, 185, 591, 8.5);
    drawText(page1, candidate.email, 185, 572, 8.5);
    drawText(page1, candidate.address, 185, 553, 7.5, false, darkColor, 240);
    drawText(page1, candidate.aadhaarNumber || '—', 185, 524, 8.5);
    drawText(page1, candidate.panNumber || '—', 185, 505, 8.5);
    drawText(page1, candidate.positionApplied || slip.designation || '—', 185, 486, 8.5, true);
    drawText(page1, formatDisplayDate(candidate.expectedJoiningDate || slip.joining_date), 185, 467, 8.5);

    // Embed Candidate Photo if available (Box on Page 1: x: 442, y: 520, w: 100, h: 120)
    if (candidate.photoUrl) {
      await embedAndDrawImage(page1, candidate.photoUrl, { x: 442, y: 520, width: 100, height: 120 });
    }

    // FOR COMPANY USE ONLY
    drawText(page1, formatDisplayDate(slip.interview_date), 185, 418, 8.5);
    drawText(page1, formatDisplayDate(slip.reporting_date), 185, 398, 8.5);
    drawText(page1, slip.reporting_time || '—', 185, 379, 8.5);
    drawText(page1, slip.department || '—', 185, 359, 8.5);
    drawText(page1, slip.designation || '—', 185, 340, 8.5);
    drawText(
      page1,
      slip.salary_ctc ? `INR ${slip.salary_ctc.toLocaleString('en-IN')} / Month` : '—',
      185,
      320,
      8.5,
      true
    );

    // TO BE FILLED BY COMPANY
    drawText(page1, slip.interview_conducted_by || 'HR Authority', 175, 155, 8.5);

    // Interview Result Checkmarks:
    const resultUpper = (slip.interview_result || '').toUpperCase();
    if (resultUpper === 'SELECTED') {
      drawVectorCheckmark(page1, 338, 134, 10, greenColor);
      drawText(page1, 'SELECTED', 352, 134, 7.5, true, greenColor);
    } else if (resultUpper === 'HOLD') {
      drawVectorCheckmark(page1, 398, 134, 10, darkColor);
      drawText(page1, 'ON HOLD', 412, 134, 7.5, true, darkColor);
    } else if (resultUpper === 'REJECTED') {
      drawVectorCheckmark(page1, 455, 134, 10, redColor);
      drawText(page1, 'REJECTED', 469, 134, 7.5, true, redColor);
    }

    drawText(page1, slip.selected_designation || slip.designation || '—', 175, 115, 8.5);
    drawText(page1, formatDisplayDate(slip.joining_date), 440, 115, 8.5);

    // =========================================================================
    // PAGE 2: CONSULTANCY RETURN FORM
    // =========================================================================
    // Master PDF already contains official header and the exact 10 policy clauses.
    // Overlay dynamic candidate identification:
    drawText(page2, candidate.fullName, 170, 735, 9, true);
    drawText(page2, candidate.fatherName, 170, 715, 8.5);
    drawText(page2, candidate.mobile, 170, 695, 8.5);
    drawText(page2, candidate.address, 170, 675, 7.5, false, darkColor, 360);

    // Candidate Acceptance note (Yes/No):
    const isAccepted = Boolean(consultancyReturn?.candidate_acceptance);
    if (isAccepted) {
      drawText(page2, 'YES', 465, 115, 9.5, true, greenColor);
      if (consultancyReturn?.accepted_at) {
        drawText(
          page2,
          `Accepted: ${formatDisplayDate(consultancyReturn.accepted_at)}`,
          410,
          102,
          7,
          false,
          rgb(0.3, 0.3, 0.4)
        );
      }
    } else {
      drawText(page2, 'PENDING', 460, 115, 8.5, true, rgb(0.6, 0.4, 0.1));
    }

    // Embed Candidate Signature if available on Page 2
    const signatureSource = consultancyReturn?.candidate_signature_path || candidate.signatureUrl;
    if (signatureSource) {
      await embedAndDrawImage(page2, signatureSource, { x: 385, y: 65, width: 125, height: 42 });
    }

    // 3. Save finalized 2-page PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    // 4. Calculate Versioning
    const existingVersions = (detail.generatedFiles || []).filter(
      (f) => f.file_type === 'REFERENCE_SLIP_PDF'
    );
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((f) => f.version)) + 1 : 1;

    // 5. Persist into private generated-documents storage
    const sanitizedRef = slip.reference_number.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Reference_Slip_${sanitizedRef}_v${nextVersion}.pdf`;

    const persistResult = await persistGeneratedDocument({
      applicationId: slip.application_id,
      joiningFormId: slip.joining_form_id,
      fileType: 'REFERENCE_SLIP_PDF',
      fileName,
      blob: pdfBlob,
      version: nextVersion,
      generatedBy: adminUserId || null
    });

    if (!persistResult.success || !persistResult.storagePath) {
      return {
        success: false,
        error: persistResult.error || 'Failed to persist generated PDF to private document ledger.'
      };
    }

    // 6. Generate authenticated Signed URL for viewing / printing
    const { url: signedUrl } = await getGeneratedDocumentSignedUrl(persistResult.storagePath, 3600);

    // 7. Log Activity
    await logActivity({
      applicationId: slip.application_id || undefined,
      entityType: 'REFERENCE_SLIP',
      entityId: slip.id,
      action: nextVersion > 1 ? 'REFERENCE_SLIP_REGENERATED' : 'REFERENCE_SLIP_GENERATED',
      metadata: {
        referenceNumber: slip.reference_number,
        version: nextVersion,
        fileName,
        storagePath: persistResult.storagePath,
        pages: 2
      }
    });

    return {
      success: true,
      blob: pdfBlob,
      signedUrl,
      storagePath: persistResult.storagePath,
      fileId: persistResult.fileId,
      version: nextVersion
    };
  } catch (err: any) {
    console.error('[generateAndPersistReferenceSlipPdf] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate Reference Slip & Consultancy Return PDF.'
    };
  }
}
