// ==============================================================================
// File: src/services/employeeIdCardGenerator.ts
// Description: Dedicated Employee Identity Card PDF Generator & Persistence Service
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   1. Clones authoritative Page 4 (index 3) of client joining_form_master.pdf
//   2. Creates an authentic standalone 1-Page Employee Identity Card document
//   3. Overlays authoritative employee fields, photo, and signature
//   4. Persists to private 'generated-documents' bucket with file_type 'ID_CARD_PDF'
//   5. Emits auditable activity log (EMPLOYEE_ID_CARD_GENERATED)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { JOINING_PDF_MAPPINGS } from '../constants/joiningPdfCoordinates';
import { persistGeneratedDocument } from './filePersistenceService';
import { logActivity } from './activityService';

export interface EmployeeIdCardData {
  employeeId?: string;
  applicationId?: string | null;
  joiningFormId?: string | null;
  employeeName: string;
  employeeCode: string;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  issuanceDate?: string | null;
  photoUrlOrData?: string | null;
  signatureUrlOrData?: string | null;
}

export interface GeneratedIdCardResult {
  blob: Blob;
  pdfBytes: Uint8Array;
  fileName: string;
  fileId?: string;
  storagePath?: string;
}

/**
 * Converts a base64 Data URL or fetched image URL into raw Uint8Array bytes
 */
async function resolveImageBytes(
  imageSource?: string | null
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!imageSource) return null;

  try {
    // 1. Data URL format
    if (imageSource.startsWith('data:')) {
      const isPng = imageSource.includes('image/png');
      const base64 = imageSource.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { bytes, isPng };
    }

    // 2. HTTP / HTTPS / Blob / relative URL format
    if (
      imageSource.startsWith('http://') ||
      imageSource.startsWith('https://') ||
      imageSource.startsWith('blob:') ||
      imageSource.startsWith('/')
    ) {
      const res = await fetch(imageSource);
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || '';
      const isPng =
        contentType.includes('image/png') ||
        imageSource.toLowerCase().includes('.png');
      return { bytes: new Uint8Array(buffer), isPng };
    }
  } catch (err) {
    console.warn('[resolveImageBytes] Unable to process image source:', err);
  }

  return null;
}

/**
 * Loads the master PDF template containing the client-designed Identity Card layout
 */
async function loadTemplateBuffer(): Promise<ArrayBuffer> {
  const res = await fetch('/assets/pdf/joining_form_master.pdf');
  if (!res.ok) {
    throw new Error(`Failed to load master PDF template: ${res.statusText}`);
  }
  return await res.arrayBuffer();
}

/**
 * Generates the standalone Employee Identity Card PDF using the authentic
 * client layout (Page 4 of master document).
 */
export async function generateEmployeeIdCardPdf(
  data: EmployeeIdCardData
): Promise<{ blob: Blob; pdfBytes: Uint8Array; fileName: string }> {
  const templateBuffer = await loadTemplateBuffer();

  // 1. Load the master document and isolate page index 3 (Page 4: IDENTITY CARD)
  const masterDoc = await PDFDocument.load(templateBuffer);
  const singleDoc = await PDFDocument.create();

  // Copy page index 3 (0-based) which is IDENTITY CARD FORMAT (PAGE 04)
  const [idCardTemplatePage] = await singleDoc.copyPages(masterDoc, [3]);
  const page = singleDoc.addPage(idCardTemplatePage);

  // 2. Embed standard fonts
  const helvetica = await singleDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await singleDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.08, 0.08, 0.12);

  // 3. Draw text using authentic coordinates from JOINING_PDF_MAPPINGS.page4
  const m4 = JOINING_PDF_MAPPINGS.page4;

  const drawField = (
    text: string | undefined | null,
    coord: { x: number; y: number; size?: number; maxWidth?: number },
    bold = false
  ) => {
    if (!text) return;
    page.drawText(String(text).trim(), {
      x: coord.x,
      y: coord.y,
      size: coord.size || 9,
      font: bold ? helveticaBold : helvetica,
      color: textColor,
      maxWidth: coord.maxWidth
    });
  };

  drawField(data.employeeName, m4.employeeName, true);
  drawField(data.employeeCode, m4.employeeCode, true);
  drawField(data.designation || 'Associate', m4.designation);
  drawField(data.department || 'Operations', m4.department);
  drawField(data.location || 'Nagpur, Maharashtra', m4.location);

  if (data.emergencyContactName) {
    drawField(data.emergencyContactName, m4.emerName);
    const contactInfo = data.emergencyContactRelation
      ? `${data.emergencyContactPhone || ''} (${data.emergencyContactRelation})`
      : data.emergencyContactPhone || '';
    drawField(contactInfo, m4.emerPhone);
  }

  drawField(data.bloodGroup || '—', m4.bloodGroup);
  drawField(
    data.issuanceDate || new Date().toLocaleDateString('en-GB'),
    m4.date
  );

  // 4. Embed Passport Photo
  if (data.photoUrlOrData) {
    const photo = await resolveImageBytes(data.photoUrlOrData);
    if (photo) {
      try {
        const embeddedPhoto = photo.isPng
          ? await singleDoc.embedPng(photo.bytes)
          : await singleDoc.embedJpg(photo.bytes);

        page.drawImage(embeddedPhoto, {
          x: m4.photoBox.x,
          y: m4.photoBox.y,
          width: m4.photoBox.width,
          height: m4.photoBox.height
        });
      } catch (err) {
        console.warn('Failed to embed employee photo on ID card:', err);
      }
    }
  }

  // 5. Embed Employee Signature
  if (data.signatureUrlOrData) {
    const sig = await resolveImageBytes(data.signatureUrlOrData);
    if (sig) {
      try {
        const embeddedSig = sig.isPng
          ? await singleDoc.embedPng(sig.bytes)
          : await singleDoc.embedJpg(sig.bytes);

        page.drawImage(embeddedSig, {
          x: m4.signatureBox.x,
          y: m4.signatureBox.y,
          width: m4.signatureBox.width,
          height: m4.signatureBox.height
        });
      } catch (err) {
        console.warn('Failed to embed employee signature on ID card:', err);
      }
    }
  }

  // 6. Save and compile binary output
  const pdfBytes = await singleDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const sanitizedCode = (data.employeeCode || 'EMP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `ID_Card_${sanitizedCode}.pdf`;

  return { blob, pdfBytes, fileName };
}

/**
 * Generates and permanently saves the Employee ID Card to private Supabase storage
 * and public.generated_files ledger, then audits via activity_logs.
 */
export async function generateAndPersistEmployeeIdCard(
  data: EmployeeIdCardData,
  currentAdminId?: string | null
): Promise<GeneratedIdCardResult> {
  const { blob, pdfBytes, fileName } = await generateEmployeeIdCardPdf(data);

  // Persist using existing file persistence architecture
  const persistResult = await persistGeneratedDocument({
    applicationId: data.applicationId || null,
    joiningFormId: data.joiningFormId || null,
    fileType: 'ID_CARD_PDF',
    fileName,
    blob,
    generatedBy: currentAdminId || null
  });

  // Audit in activity_logs (entity_type = EMPLOYEE)
  if (data.employeeId) {
    await logActivity({
      entityType: 'EMPLOYEE',
      entityId: data.employeeId,
      applicationId: data.applicationId || null,
      action: 'EMPLOYEE_ID_CARD_GENERATED',
      description: `Generated official Employee Identity Card for ${data.employeeCode} (${data.employeeName})`,
      metadata: {
        employeeId: data.employeeId,
        employeeCode: data.employeeCode,
        fileId: persistResult.fileId || null,
        storagePath: persistResult.storagePath || null,
        timestamp: new Date().toISOString()
      }
    });
  }

  return {
    blob,
    pdfBytes,
    fileName,
    fileId: persistResult.fileId,
    storagePath: persistResult.storagePath
  };
}

/**
 * Browser-only helper: downloads the Employee ID Card directly to the client's device
 */
export async function triggerIdCardDownload(data: EmployeeIdCardData): Promise<void> {
  const { blob, fileName } = await generateEmployeeIdCardPdf(data);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
