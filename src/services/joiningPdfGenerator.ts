// ==============================================================================
// File: src/services/joiningPdfGenerator.ts
// Description: Official Joining Form PDF Generator & Downloader
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   1. Reuses the exact official form representation established by JoiningFormPrintPreview
//   2. Generates candidate-specific PDF containing submitted application data
//   3. Completely disconnects any static reference/master templates
//   4. Captures official sheets (.pdf-page-sheet) at high-DPI resolution
//   5. Excludes Employee ID Card (managed independently in Employee Admin)
//   6. Excludes all admin navigation, sidebars, badges, and web-app wrappers
//   7. Records audit record in public.generated_files ledger via persistGeneratedDocument
//   8. Produces candidate-specific filename: [Reference]-[Candidate-Name].pdf
// ==============================================================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { JoiningFormData } from '../types/joining';
import { persistGeneratedDocument } from './filePersistenceService';

/**
 * Locates rendered official form sheets from JoiningFormPrintPreview in the active DOM.
 */
function findPrintPreviewSheets(): HTMLElement[] {
  if (typeof document === 'undefined') return [];

  // Preferred: sheets inside .joining-form-print-preview container
  const container = document.querySelector('.joining-form-print-preview');
  if (container) {
    const sheets = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page-sheet'));
    if (sheets.length > 0) return sheets;
  }

  // Fallback: any .pdf-page-sheet in the document
  return Array.from(document.querySelectorAll<HTMLElement>('.pdf-page-sheet'));
}

/**
 * Renders official form sheets into high-DPI canvas pages and compiles a multi-page A4 PDF.
 */
async function captureSheetsToPdfBlob(sheets: HTMLElement[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];

    // Ensure all images (e.g. signatures, photos) in the sheet have completed loading
    const images = Array.from(sheet.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 1500); // 1.5s timeout safeguard
          })
      )
    );

    const canvas = await html2canvas(sheet, {
      scale: 2, // 2x gives 150-200 DPI crisp, executive-grade print quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList?.contains('no-print'),
      onclone: (clonedDoc) => {
        const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.pdf-page-sheet');
        clonedSheets.forEach((s) => {
          s.style.boxShadow = 'none';
          s.style.margin = '0';
          s.style.borderRadius = '0';
        });
        const noPrints = clonedDoc.querySelectorAll<HTMLElement>('.no-print');
        noPrints.forEach((np) => (np.style.display = 'none'));
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Standard A4 dimensions: 210mm x 297mm
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = 210;
    const imgHeight = Math.min(297, (canvasHeight * 210) / canvasWidth);

    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  }

  return pdf.output('blob');
}

/**
 * Programmatic vector builder for Node test environments or headless operations.
 * Produces candidate-specific official paperwork without loading any reference PDF.
 */
function buildProgrammaticJoiningPdf(formData: JoiningFormData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const p = formData.personal || {};
  const emp = formData.employment || {};
  const perm = formData.permanentAddress || {};
  const curr = formData.currentAddress || {};
  const bank = formData.bank || {};
  const decl = formData.declarations || {};
  const isFemale = p.gender?.toLowerCase() === 'female';
  const hasWomenConsent = isFemale && Boolean(decl.womenNightShiftConsent);

  const navy = [15, 27, 56] as const;
  const slate = [71, 85, 105] as const;

  // Header Helper
  const addHeader = (badgeText: string, title = 'A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY') => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...navy);
    doc.text(title, 105, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate);
    doc.text('PLOT NO. 440 BEHIND ROYAL CLUB, SUBHAN NAGAR, [HB TOWN], NAGPUR MH - 440035', 105, 21, { align: 'center' });
    doc.text('MOBILE: +91 8349353946 | EMAIL: ATIGERGLOBAL@GMAIL.COM | REG. NO.: 106157392603', 105, 25, { align: 'center' });

    doc.setFillColor(...navy);
    doc.rect(50, 27, 110, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(badgeText, 105, 31.2, { align: 'center' });

    doc.setDrawColor(...navy);
    doc.setLineWidth(0.5);
    doc.line(15, 35, 195, 35);
  };

  // Section Title Helper
  const addSectionTitle = (title: string, yPos: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPos, 180, 6, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(15, yPos, 180, 6, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navy);
    doc.text(title, 18, yPos + 4.2);
  };

  // Table Row Helper
  let y = 45;
  const drawRow = (l1: string, v1: any, l2: string, v2: any) => {
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 7);
    doc.line(55, y, 55, y + 7);
    doc.line(105, y, 105, y + 7);
    doc.line(145, y, 145, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(l1, 17, y + 4.8);
    doc.text(l2, 107, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.text(String(v1 || '—'), 57, y + 4.8);
    doc.text(String(v2 || '—'), 147, y + 4.8);
    y += 7;
  };

  // ----------------------------------------------------
  // PAGE 1: REGISTRATION & CHECKLIST
  // ----------------------------------------------------
  addHeader('REGISTRATION / JOINING FORM - 5');
  addSectionTitle('EMPLOYEE APPOINTMENT DETAILS', 39);
  y = 45;
  drawRow('Employee Name:', p.employeeName, 'Employee Code:', emp.employeeCode || 'ASSIGNED ON JOINING');
  drawRow('Date of Joining:', emp.dateOfJoining || decl.declarationDate, 'Department:', emp.department || 'Operations');
  drawRow('Designation:', emp.designation || 'Associate', 'Location / Unit:', `${emp.location || 'Nagpur'} / ${emp.unit || 'A TIGER GLOBAL'}`);

  y += 4;
  addSectionTitle('DOCUMENT CHECKLIST (STATUTORY SUBMISSIONS)', y);
  y += 6;

  const checklist = [
    { no: 1, item: 'Document Check List & Registration Form', status: 'COMPLETED' },
    { no: 2, item: 'Resume / Bio-Data', status: 'ON RECORD' },
    { no: 3, item: 'Employee Personal Information (Page 02)', status: 'COMPLETED' },
    { no: 4, item: 'Joining Report (Page 05)', status: 'ATTESTED' },
    { no: 5, item: 'Declaration Form (Page 08)', status: 'DECLARED' },
    { no: 6, item: 'Appointment / Joining Letter Terms', status: 'ACCEPTED' },
    { no: 7, item: 'EPFO Statutory Enrolment (Form 2 / Form 11)', status: 'APPLICABLE' },
    { no: 8, item: 'ESIC Registration (Form 1)', status: 'APPLICABLE' },
    {
      no: 9,
      item: "Consent Form of Women Worker (Form 'L' Rule 13)",
      status: isFemale ? (hasWomenConsent ? 'CONSENT GIVEN' : 'OPTIONAL - DECLINED') : 'NOT APPLICABLE (MALE)'
    },
    {
      no: 10,
      item: 'Academic Qualification Marksheets / Certificates',
      status: (formData.education?.length || 0) > 0 ? 'PROVIDED' : 'OPTIONAL - NOT PROVIDED'
    },
    {
      no: 11,
      item: 'Experience / Relieving Certificates (if applicable)',
      status: formData.documents?.EXPERIENCE_CERTIFICATE?.file ? 'ATTACHED' : 'OPTIONAL'
    },
    { no: 12, item: 'Identity Proof (Aadhaar / Voter ID / Passport)', status: p.aadhaarNumber ? 'ATTACHED' : '—' },
    { no: 13, item: 'Bank Account Proof (Cancelled Cheque / Passbook)', status: bank.bankAccountNumber ? 'ATTACHED' : '—' },
    { no: 14, item: 'Recent Passport Size Photographs (3 Copies)', status: formData.documents?.PHOTO?.file ? 'UPLOADED' : '—' }
  ];

  checklist.forEach((chk) => {
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 6);
    doc.line(27, y, 27, y + 6);
    doc.line(145, y, 145, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(String(chk.no), 21, y + 4.2, { align: 'center' });
    doc.text(chk.item, 30, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(chk.status, 148, y + 4.2);
    y += 6;
  });

  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 85, 22);
  doc.rect(110, y, 85, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Employee Signature:', 18, y + 5);
  doc.text('HR / Interviewer Verification:', 113, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(p.employeeName || 'Candidate', 18, y + 19);
  doc.text('A TIGER GLOBAL Recruitment Cell', 113, y + 19);

  // ----------------------------------------------------
  // PAGE 2: PERSONAL INFORMATION & ADDRESSES
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 02 / 14 - PERSONAL INFORMATION & RESIDENCE DOSSIER');
  addSectionTitle('1. DEMOGRAPHIC & IDENTITY RECORDS', 39);
  y = 45;
  drawRow('Full Legal Name:', p.employeeName, 'Date of Birth:', p.dateOfBirth);
  drawRow('Gender:', p.gender, 'Marital Status:', p.maritalStatus);
  drawRow("Father's Name:", p.fatherName, 'Mother / Husband Name:', p.motherOrHusbandName);
  drawRow('Spouse Name:', p.spouseName || 'N/A', 'Blood Group:', p.bloodGroup || '—');
  drawRow('Aadhaar Card No.:', p.aadhaarNumber, 'PAN Card No.:', p.panNumber);
  drawRow('Primary Mobile:', p.employeeContactNumber, 'Alternate Mobile:', p.otherContactNumber || '—');
  drawRow('Email Address:', p.emailId, 'Submission Status:', formData.submissionStatus || 'SUBMITTED');

  y += 4;
  addSectionTitle('2. PERMANENT & CURRENT RESIDENTIAL ADDRESSES', y);
  y += 6;
  drawRow('Perm House/Road:', perm.flatHouseRoad || perm.address, 'Curr House/Road:', curr.flatHouseRoad || curr.address);
  drawRow('Perm City/Village:', perm.villageOrCity || perm.city, 'Curr City/Village:', curr.villageOrCity || curr.city);
  drawRow('Perm District:', perm.district, 'Curr District:', curr.district);
  drawRow('Perm State / PIN:', `${perm.state || ''} - ${perm.pinCode || ''}`, 'Curr State / PIN:', `${curr.state || ''} - ${curr.pinCode || ''}`);

  y += 4;
  addSectionTitle('3. EMERGENCY FAMILY CONTACT DETAILS', y);
  y += 6;
  const ecList = formData.emergencyContacts || [];
  if (ecList.length > 0) {
    ecList.slice(0, 2).forEach((c) => {
      drawRow('Contact Name:', c.name, 'Relationship:', c.relation);
      drawRow('Mobile Number:', c.contactNumber, 'Address:', c.address);
    });
  } else {
    drawRow('Emergency Contact:', 'Recorded on file', 'Status:', 'VERIFIED');
  }

  // ----------------------------------------------------
  // PAGE 3: BANK DETAILS, EDUCATION & FAMILY
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 03 / 14 - BANK, EDUCATION & FAMILY RECORDS');
  addSectionTitle('1. STATUTORY BANK DISBURSEMENT PARTICULARS', 39);
  y = 45;
  drawRow('Account Holder:', bank.accountHolderName, 'Bank Name:', bank.bankName);
  drawRow('Account Number:', bank.bankAccountNumber, 'IFSC Code:', bank.ifscCode);
  drawRow('Branch Name:', bank.branchName, 'Disbursement Mode:', 'NEFT / RTGS / Bank Transfer');

  y += 4;
  addSectionTitle('2. ACADEMIC & TECHNICAL QUALIFICATIONS (OPTIONAL)', y);
  y += 6;
  const eduList = formData.education || [];
  if (eduList.length > 0) {
    eduList.slice(0, 3).forEach((e) => {
      drawRow('Qualification:', e.qualification, 'Board / University:', e.boardOrUniversity);
      drawRow('Year of Passing:', e.yearOfPassing, 'Grade / Percentage:', e.percentageOrGrade);
    });
  } else {
    drawRow('Academic Records:', 'Optional - Not provided by candidate', 'Status:', 'VALID ONBOARDING');
  }

  y += 4;
  addSectionTitle('3. FAMILY MEMBERS & DEPENDENT DETAILS', y);
  y += 6;
  const famList = formData.family || [];
  if (famList.length > 0) {
    famList.slice(0, 3).forEach((f) => {
      drawRow('Family Member:', f.name, 'Relationship:', f.relation);
      drawRow('Date of Birth / Age:', f.dateOfBirthOrAge, 'Status:', 'DEPENDENT');
    });
  } else {
    drawRow('Family Dependents:', 'None recorded on file', 'Status:', 'ON FILE');
  }

  // ----------------------------------------------------
  // PAGE 4: JOINING REPORT
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('JOINING REPORT (FORMAL UNDERTAKING)');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text(`I hereby join my duties from today, dated ${decl.declarationDate || 'TODAY'}, under A TIGER GLOBAL Career Solution & Consultancy.`, 15, 41);

  y = 46;
  drawRow('1. Location:', emp.location || 'Nagpur, MH', '2. Name:', p.employeeName);
  drawRow("3. Father's Name:", p.fatherName, '4. Date of Birth:', p.dateOfBirth);
  drawRow('5. Department:', emp.department || 'Operations', '6. Designation:', emp.designation || 'Associate');
  drawRow('7. PAN Number:', p.panNumber, '8. Aadhaar Card No.:', p.aadhaarNumber);
  drawRow('9. Blood Group:', p.bloodGroup || '—', '10. Mobile Number:', p.employeeContactNumber);
  drawRow('11. Name of Bank:', bank.bankName, '12. Branch:', bank.branchName);
  drawRow('13. IFSC Code:', bank.ifscCode, '14. Account Number:', bank.bankAccountNumber);
  drawRow('15. Contact Address:', `${perm.villageOrCity || perm.city || ''}, ${perm.district || ''}`, 'PIN:', perm.pinCode);

  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 85, 22);
  doc.rect(110, y, 85, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Signature of Joining Employee:', 18, y + 5);
  doc.text('HR Department Approval:', 113, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(p.employeeName || 'Candidate', 18, y + 19);
  doc.text('A TIGER GLOBAL Career Solution & Consultancy', 113, y + 19);

  // ----------------------------------------------------
  // PAGE 5 (CONDITIONAL): WOMEN NIGHT SHIFT CONSENT
  // ----------------------------------------------------
  if (hasWomenConsent) {
    doc.addPage('a4', 'portrait');
    addHeader("FORM - 'L' (RULE 13) - CONSENT OF WOMEN WORKER TO WORK IN NIGHT SHIFT");
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...navy);
    y = 45;
    doc.text(
      `I, ${p.employeeName}, residing at ${perm.villageOrCity || perm.city || 'Nagpur'}, working as ${emp.designation || 'Associate'} in M/s A TIGER GLOBAL Career Solution & Consultancy, state that I am working as ${emp.designation || 'Associate'}.`,
      15,
      y,
      { maxWidth: 180 }
    );
    y += 18;
    doc.text('I am aware that:', 15, y);
    y += 6;
    doc.text('- The employer will provide separate, safe and secure transport facility from doorstep of residence to workplace;', 18, y, { maxWidth: 175 });
    y += 8;
    doc.text('- There will be at least three women workers working in the nightshift;', 18, y, { maxWidth: 175 });
    y += 8;
    doc.text('- There is an Internal Committee to prevent sexual harassment at workplace.', 18, y, { maxWidth: 175 });
    y += 12;
    doc.text('I am therefore willing to work at nightshift during the applicable employment tenure.', 15, y);
    y += 16;
    drawRow('Place:', decl.womenNightShiftPlace || 'Nagpur', 'Date:', decl.declarationDate);
  }

  // ----------------------------------------------------
  // PAGE 6: SELF DECLARATION (RELIEVING / DUAL EMPLOYMENT)
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('SELF DECLARATION (PAGE 07 - RELIEVING & DUAL EMPLOYMENT)');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('TO: The Management & HR Department\nA TIGER GLOBAL Career Solution & Consultancy', 15, y);
  y += 12;
  doc.text(
    `This is to certify that prior to joining A TIGER GLOBAL, I was working with ${decl.previousEmployerName || 'None (Fresher / Open Onboarding)'} and have completed all relieving formalities. My last working day was ${decl.previousEmployerLastWorkingDay || 'N/A'}.`,
    15,
    y,
    { maxWidth: 180 }
  );
  y += 14;
  doc.text(
    'To that extent, I am not in dual employment on the day of joining and the company is not responsible for any unfinished formalities with my previous employer.',
    15,
    y,
    { maxWidth: 180 }
  );
  y += 12;
  doc.text('I confirm that the information given in this declaration is correct and any discrepancy can lead to strict disciplinary action.', 15, y, { maxWidth: 180 });
  y += 16;
  drawRow('Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 7: DECLARATION (RELATIVE EMPLOYMENT POLICY)
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('DECLARATION REGARDING EMPLOYMENT OF RELATIVES (PAGE 08)');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  const relText = decl.hasRelativeInOrganization
    ? `(I-b) I am related to ${decl.relativeName || 'Relative'} working in ${decl.relativeDepartment || 'Dept'} as ${decl.relativeRelationship || 'Relative'}.`
    : `(I-a) I am NOT directly or distantly related to any employee working in the Organization.`;
  doc.text(relText, 15, y, { maxWidth: 180 });
  y += 20;
  drawRow('Signatory Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 8: TERMS & CONDITIONS (CONDUCT & DISCIPLINE)
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Working Hours & Shifts: Shifts will be scheduled according to client operational requirements.', 15, y);
  y += 8;
  doc.text('2. Discipline & Conduct: Standard service rules and workplace conduct standards apply strictly.', 15, y);
  y += 8;
  doc.text('3. Attendance & Leaves: All leaves must be pre-approved by designated management supervisor.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Acceptance Date:', decl.declarationDate);

  return doc;
}

/**
 * Generates the official candidate joining packet PDF as a binary Blob.
 * In browser: captures rendered official form sheets from JoiningFormPrintPreview directly.
 * In Node / fallback: builds the official form pages programmatically.
 */
export async function generateJoiningPacketPdf(formData: JoiningFormData): Promise<Blob> {
  // 1. Browser runtime: Capture actual rendered official form sheets
  if (typeof document !== 'undefined') {
    const sheets = findPrintPreviewSheets();
    if (sheets.length > 0) {
      try {
        return await captureSheetsToPdfBlob(sheets);
      } catch (domCaptureErr) {
        console.warn('[generateJoiningPacketPdf] DOM capture warning, using programmatic builder:', domCaptureErr);
      }
    }
  }

  // 2. Programmatic vector builder (Node or fallback)
  const doc = buildProgrammaticJoiningPdf(formData);
  return doc.output('blob');
}

/**
 * Downloads candidate-specific official joining packet PDF.
 * File format: [Reference]-[Candidate-Name].pdf (e.g. JOIN-2026-000123-John-Doe.pdf)
 */
export async function downloadJoiningPacketPdf(formData: JoiningFormData): Promise<void> {
  try {
    const blob = await generateJoiningPacketPdf(formData);
    const rawName = formData.personal?.employeeName || 'Candidate';
    const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Candidate';
    const cleanRef = (formData.joiningReference || 'JOIN-DOSSIER').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanRef}-${cleanName}.pdf`;

    // 1. Trigger client download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 1500);

    // 2. Persist audit record in background if IDs exist
    if (formData.formId || formData.applicationId) {
      persistGeneratedDocument({
        applicationId: formData.applicationId,
        joiningFormId: formData.formId,
        fileType: 'JOINING_PACKET_PDF',
        fileName,
        blob
      }).catch((err) => console.warn('[downloadJoiningPacketPdf] Persistence audit warning:', err));
    }
  } catch (err: any) {
    console.error('[downloadJoiningPacketPdf] Generation or download failed:', err);
    throw new Error(err?.message || 'Failed to generate official joining PDF packet.');
  }
}
