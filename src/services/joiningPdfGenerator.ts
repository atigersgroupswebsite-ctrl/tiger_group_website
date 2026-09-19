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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { JoiningFormData } from '../types/joining';
import type { DocumentRow } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getCandidateDocuments } from './adminDocumentService';
import { persistGeneratedDocument } from './filePersistenceService';

/**
 * Locates rendered official form sheets from JoiningFormPrintPreview in the active DOM.
 * Excludes candidate-uploaded annexures (.pdf-annexure-sheet) so that html2canvas only
 * captures the 14 core official paperwork sheets at high DPI. Annexures are appended
 * with native vector fidelity via pdf-lib.
 */
function findPrintPreviewSheets(): HTMLElement[] {
  if (typeof document === 'undefined') return [];

  // Preferred: sheets inside .joining-form-print-preview container
  const container = document.querySelector('.joining-form-print-preview');
  if (container) {
    const sheets = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page-sheet:not(.pdf-annexure-sheet)'));
    if (sheets.length > 0) return sheets;
  }

  // Fallback: any .pdf-page-sheet in the document
  return Array.from(document.querySelectorAll<HTMLElement>('.pdf-page-sheet:not(.pdf-annexure-sheet)'));
}

/**
 * Renders official form sheets into high-DPI canvas pages and compiles a multi-page A4 PDF.
 * Uses isolated cloned-document geometry (794px width / A4 aspect ratio) to guarantee
 * deterministic output independent of client viewport width.
 */
async function captureSheetsToPdfBlob(sheets: HTMLElement[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Standard A4 metrics at 96 DPI: 210mm x 297mm -> 793.7px x 1122.5px
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;
  const A4_RATIO = 297 / 210; // ~1.4142857

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
      scale: 2, // 2x gives crisp, executive-grade print quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1200, // Forces desktop layout evaluation in the cloned document
      ignoreElements: (el) => el.classList?.contains('no-print'),
      onclone: (clonedDoc) => {
        // 1. Reset body and outer containers to prevent responsive width clamping
        if (clonedDoc.body) {
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.background = '#FFFFFF';
        }

        const containers = clonedDoc.querySelectorAll<HTMLElement>(
          '.joining-page-container, .joining-layout, .joining-main-content, .joining-form-card, .print-review-wrapper, .joining-form-print-preview'
        );
        containers.forEach((c) => {
          c.style.width = `${A4_WIDTH_PX}px`;
          c.style.maxWidth = `${A4_WIDTH_PX}px`;
          c.style.minWidth = `${A4_WIDTH_PX}px`;
          c.style.margin = '0';
          c.style.padding = '0';
          c.style.boxShadow = 'none';
          c.style.border = 'none';
          c.style.background = 'transparent';
        });

        // 2. Enforce deterministic A4 sheet geometry on cloned sheets
        const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.pdf-page-sheet');
        clonedSheets.forEach((s) => {
          s.style.width = `${A4_WIDTH_PX}px`;
          s.style.minWidth = `${A4_WIDTH_PX}px`;
          s.style.maxWidth = `${A4_WIDTH_PX}px`;
          s.style.minHeight = `${A4_HEIGHT_PX}px`;
          s.style.boxSizing = 'border-box';
          s.style.boxShadow = 'none';
          s.style.margin = '0';
          s.style.borderRadius = '0';
          s.style.background = '#FFFFFF';
        });

        // 3. Hide screen-only chrome in cloned document
        const noPrints = clonedDoc.querySelectorAll<HTMLElement>('.no-print');
        noPrints.forEach((np) => (np.style.display = 'none'));
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Standard A4 dimensions in PDF: 210mm x 297mm
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const sheetRatio = canvasHeight / canvasWidth;

    let imgWidth = 210;
    let imgHeight = 297;
    let offsetX = 0;
    let offsetY = 0;

    if (Math.abs(sheetRatio - A4_RATIO) < 0.02) {
      // Direct A4 fit
      imgWidth = 210;
      imgHeight = 297;
    } else if (sheetRatio > A4_RATIO) {
      // Content is taller than standard A4: scale down proportionally to fit within 297mm height without cropping
      imgHeight = 297;
      imgWidth = (canvasWidth * 297) / canvasHeight;
      offsetX = (210 - imgWidth) / 2; // Center horizontally on A4 sheet
    } else {
      // Content is shorter than standard A4: keep 210mm width and proportional height
      imgWidth = 210;
      imgHeight = (canvasHeight * 210) / canvasWidth;
    }

    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, imgWidth, imgHeight, undefined, 'FAST');
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
  const drawRow = (l1: string, v1: any, l2?: string, v2?: any) => {
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 7);
    doc.line(55, y, 55, y + 7);
    if (l2) {
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
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...navy);
      doc.text(l1, 17, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.text(String(v1 || '—'), 57, y + 4.8);
    }
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
  drawRow('Branch Name:', bank.branchName);
  drawRow(
    'UAN (PF Number):',
    bank.uanNumber || 'Not Enrolled / N/A',
    'ESIC IP Number:',
    bank.esicNumber || 'Not Enrolled / N/A'
  );
  drawRow(
    'Professional Tax (PT):',
    bank.ptNumber || 'Not Enrolled / N/A',
    'Disbursement Mode:',
    'NEFT / RTGS / Bank Transfer'
  );

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
  // PAGE 5: SHIFT SCHEDULE & WORKER WELFARE / FORM 'L'
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  if (hasWomenConsent) {
    addHeader("FORM - 'L' (RULE 13) - CONSENT OF WOMEN WORKER TO WORK IN NIGHT SHIFT");
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...navy);
    y = 45;
    doc.text(
      `I, ${p.employeeName || 'Candidate'}, residing at ${perm.villageOrCity || perm.city || 'Nagpur'}, working as ${emp.designation || 'Associate'} in M/s A TIGER GLOBAL Career Solution & Consultancy, state that I am working as ${emp.designation || 'Associate'}.`,
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
  } else {
    addHeader('PAGE 05 / 14 - STATUTORY SHIFT & WORKER WELFARE DECLARATION');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...navy);
    y = 45;
    doc.text(
      `I, ${p.employeeName || 'Candidate'}, hereby agree to comply with all designated working shifts, operational schedules, and workplace safety rules established by A TIGER GLOBAL Career Solution and Consultancy.`,
      15,
      y,
      { maxWidth: 180 }
    );
    y += 18;
    doc.text('I confirm and acknowledge that:', 15, y);
    y += 8;
    doc.text('1. Operational shift allocations (General, First, Second, or Third Shift) are governed by operational requirements.', 18, y, { maxWidth: 175 });
    y += 8;
    doc.text('2. Adequate rest intervals, safe drinking water, hygienic workplace conditions, and personal safety gear are provided.', 18, y, { maxWidth: 175 });
    y += 8;
    doc.text('3. For female staff, statutory Night Shift Consent Form L is executed separately wherever applicable under Rule 13.', 18, y, { maxWidth: 175 });
    y += 14;
    drawRow('Signatory Name:', p.employeeName, 'Date:', decl.declarationDate);
  }

  // ----------------------------------------------------
  // PAGE 6: SELF DECLARATION (RELIEVING / DUAL EMPLOYMENT)
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 06 / 14 - SELF DECLARATION (RELIEVING & DUAL EMPLOYMENT)');
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
  addHeader('PAGE 07 / 14 - DECLARATION REGARDING EMPLOYMENT OF RELATIVES');
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
  addHeader('PAGE 08 / 14 - TERMS & CONDITIONS OF EMPLOYMENT, SHIFTS & OVERTIME');
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

  // ----------------------------------------------------
  // PAGE 9: CODE OF CONDUCT & WORKPLACE DISCIPLINE
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 09 / 14 - CODE OF CONDUCT & WORKPLACE DISCIPLINE');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Professional Integrity: Employees shall conduct all business operations with transparency and utmost honesty.', 15, y);
  y += 8;
  doc.text('2. Punctuality: Strict adherence to scheduled duty shifts and biometric / register attendance is mandatory.', 15, y);
  y += 8;
  doc.text('3. Respect in Workplace: Harassment, insubordination, or abusive behavior will result in immediate termination.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 10: OCCUPATIONAL HEALTH & INDUSTRIAL SAFETY
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 10 / 14 - OCCUPATIONAL HEALTH, INDUSTRIAL SAFETY & SUBSTANCE POLICY');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Safety Protocol: Mandatory wearing of personal protective equipment (PPE), uniforms, and ID badges.', 15, y);
  y += 8;
  doc.text('2. Zero Substance Tolerance: Possession or consumption of alcohol, narcotics, tobacco, or bidi is strictly barred.', 15, y);
  y += 8;
  doc.text('3. Accident Reporting: Any injury or hazard must be reported to the safety coordinator immediately.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 11: STATUTORY STANDING ORDERS & WAGE RULES
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 11 / 14 - STATUTORY STANDING ORDERS & WAGE ADMINISTRATION');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Wage Cycle: Monthly statutory disbursements are processed via electronic bank transfer between the 10th and 15th.', 15, y);
  y += 8;
  doc.text('2. Deductions: Statutory deductions under EPF, ESIC, and Professional Tax (PT) will be applied as prescribed.', 15, y);
  y += 8;
  doc.text('3. Overtime: Authorized overtime is compensated in strict compliance with statutory notifications.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 12: CONFIDENTIALITY & INTEGRITY UNDERTAKING
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 12 / 14 - CONFIDENTIALITY, NON-DISCLOSURE & INTEGRITY UNDERTAKING');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Non-Disclosure: Confidential enterprise data, trade secrets, and client records must not be disclosed.', 15, y);
  y += 8;
  doc.text('2. Return of Assets: All equipment, documents, ID cards, and access passes remain company property.', 15, y);
  y += 8;
  doc.text('3. Continuing Obligation: Confidentiality obligations survive any cessation of employment.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 13: STATUTORY SOCIAL SECURITY & WELFARE ENROLMENT
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 13 / 14 - STATUTORY SOCIAL SECURITY & WELFARE ENROLMENT');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('1. Employees Provident Fund (EPFO): Enrolment under Form 11 / Form 2 with Universal Account Number (UAN).', 15, y);
  y += 8;
  doc.text('2. Employees State Insurance (ESIC): Medical and cash benefits under Form 1 with Insurance Number (IP).', 15, y);
  y += 8;
  doc.text('3. Professional Tax (PT): Enrolled under State Professional Tax schedules.', 15, y);
  y += 14;
  drawRow('Employee Name:', p.employeeName, 'Date:', decl.declarationDate);

  // ----------------------------------------------------
  // PAGE 14: MASTER ATTESTATION & HR AUTHORIZATION
  // ----------------------------------------------------
  doc.addPage('a4', 'portrait');
  addHeader('PAGE 14 / 14 - MASTER ATTESTATION & HR AUTHORIZATION');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  y = 44;
  doc.text('I, the undersigned candidate, hereby declare that all information furnished in this Joining Form is true, correct, and complete to the best of my knowledge and belief.', 15, y, { maxWidth: 180 });
  y += 16;
  drawRow('Candidate Name:', p.employeeName, 'Submission Date:', decl.declarationDate);
  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 85, 24);
  doc.rect(110, y, 85, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Candidate Final Signature:', 18, y + 5);
  doc.text('Authorized HR Signatory & Seal:', 113, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(p.employeeName || 'Candidate', 18, y + 20);
  doc.text('A TIGER GLOBAL Career Solution & Consultancy', 113, y + 20);

  return doc;
}

/**
 * Normalizes document type and side into an executive-grade annexure title.
 */
function formatAnnexureLabel(doc: { document_type?: string | null; document_side?: string | null }): string {
  const type = doc.document_type || 'DOCUMENT';
  const side = doc.document_side;
  let label = type.replace(/_/g, ' ');
  if (type === 'AADHAAR') {
    label = 'AADHAAR CARD';
    if (side === 'FRONT') label += ' — FRONT';
    else if (side === 'BACK') label += ' — BACK';
  } else if (type === 'PAN') {
    label = 'PAN CARD';
  } else if (type === 'BANK_PASSBOOK') {
    label = 'BANK PASSBOOK / CANCELLED CHEQUE';
  } else if (type === 'EDUCATION_CERTIFICATE') {
    label = 'HIGHEST EDUCATION CERTIFICATE';
  }
  return label;
}

/**
 * Sanitizes strings for standard PDF Helvetica font WinAnsi character encoding.
 */
function sanitizeForPdf(str?: string | null): string {
  if (!str) return '';
  return str.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Securely retrieves the binary content of a candidate-uploaded document.
 * Checks dataUrl, authenticated Supabase Storage download, or temporary signed URL.
 */
async function fetchDocumentBytes(doc: {
  storage_path?: string | null;
  dataUrl?: string | null;
}): Promise<Uint8Array | null> {
  // 1. In-memory dataUrl (draft uploads or preview)
  if (doc.dataUrl && doc.dataUrl.startsWith('data:')) {
    try {
      const base64 = doc.dataUrl.split(',')[1];
      if (base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }
    } catch (e) {
      console.warn('[fetchDocumentBytes] Could not parse dataUrl:', e);
    }
  }

  // 2. Storage path in private Supabase candidate-documents bucket
  if (doc.storage_path) {
    let bucket = 'candidate-documents';
    let path = doc.storage_path;
    if (path.startsWith('candidate-documents/')) {
      path = path.replace(/^candidate-documents\//, '');
    } else if (path.startsWith('generated-documents/')) {
      bucket = 'generated-documents';
      path = path.replace(/^generated-documents\//, '');
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (!error && data) {
          const buf = await data.arrayBuffer();
          return new Uint8Array(buf);
        }
      } catch (dlErr) {
        console.warn('[fetchDocumentBytes] Direct download failed, attempting signed URL fallback:', dlErr);
      }

      try {
        const { data: signData, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
        if (!signErr && signData?.signedUrl) {
          const resp = await fetch(signData.signedUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            return new Uint8Array(buf);
          }
        }
      } catch (signFetchErr) {
        console.warn('[fetchDocumentBytes] Signed URL fetch error:', signFetchErr);
      }
    }
  }

  return null;
}

/**
 * Safely converts non-PNG/non-JPG image bytes (e.g. WEBP) to PNG bytes using browser canvas.
 */
async function convertImageBytesToPng(bytes: Uint8Array, mimeType?: string): Promise<Uint8Array> {
  if (typeof document === 'undefined') return bytes;
  return new Promise((resolve) => {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType || 'image/webp' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(bytes);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) return resolve(bytes);
            pngBlob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(() => resolve(bytes));
          }, 'image/png');
        } catch {
          resolve(bytes);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(bytes);
      };
      img.src = url;
    } catch {
      resolve(bytes);
    }
  });
}

/**
 * Appends a clearly labeled Attachment Processing Notice page if an uploaded file
 * cannot be parsed, is password-protected/encrypted, or is corrupted.
 */
function appendAttachmentNoticePage(
  finalPdf: PDFDocument,
  fontBold: any,
  fontRegular: any,
  doc: {
    original_file_name?: string | null;
    document_type?: string | null;
    document_side?: string | null;
    verification_status?: string | null;
  },
  reason: string
) {
  const page = finalPdf.addPage([595.28, 841.89]);
  const docLabel = formatAnnexureLabel(doc);
  const fileName = sanitizeForPdf(doc.original_file_name || 'Document');

  // Header
  page.drawText('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', {
    x: 36,
    y: 805,
    size: 9,
    font: fontBold,
    color: rgb(0.06, 0.11, 0.22)
  });
  page.drawText(`ANNEXURE: ${sanitizeForPdf(docLabel.toUpperCase())}`, {
    x: 36,
    y: 788,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.11, 0.22)
  });
  page.drawLine({
    start: { x: 36, y: 775 },
    end: { x: 559.28, y: 775 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92)
  });

  // Notice Box
  page.drawRectangle({
    x: 36,
    y: 590,
    width: 523.28,
    height: 165,
    borderColor: rgb(0.85, 0.6, 0.2),
    borderWidth: 1.5,
    color: rgb(0.99, 0.98, 0.95)
  });

  page.drawText('ATTACHMENT PROCESSING NOTICE', {
    x: 56,
    y: 725,
    size: 11,
    font: fontBold,
    color: rgb(0.65, 0.35, 0.05)
  });

  page.drawText(`Document Type: ${sanitizeForPdf(docLabel)}`, {
    x: 56,
    y: 700,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  page.drawText(`Original Filename: ${fileName}`, {
    x: 56,
    y: 682,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35)
  });

  if (doc.verification_status) {
    page.drawText(`Verification Status: ${sanitizeForPdf(doc.verification_status)}`, {
      x: 56,
      y: 664,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35)
    });
  }

  page.drawText(`Notice: ${sanitizeForPdf(reason)}`, {
    x: 56,
    y: 642,
    size: 9,
    font: fontRegular,
    color: rgb(0.7, 0.2, 0.2)
  });

  page.drawText('The original candidate document remains safely preserved in the official document repository.', {
    x: 56,
    y: 615,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.55)
  });
}

/**
 * Appends an image document as an executive A4 annexure page with proportional scaling.
 */
async function appendImageAnnexurePage(
  finalPdf: PDFDocument,
  fontBold: any,
  fontRegular: any,
  doc: {
    original_file_name?: string | null;
    document_type?: string | null;
    document_side?: string | null;
    verification_status?: string | null;
  },
  bytes: Uint8Array
): Promise<boolean> {
  const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;

  let embeddedImage;
  try {
    if (isPng) {
      embeddedImage = await finalPdf.embedPng(bytes);
    } else if (isJpg) {
      embeddedImage = await finalPdf.embedJpg(bytes);
    } else {
      const pngBytes = await convertImageBytesToPng(bytes);
      embeddedImage = await finalPdf.embedPng(pngBytes);
    }
  } catch (embedErr) {
    console.warn('[appendImageAnnexurePage] Image embed error:', embedErr);
    return false;
  }

  if (!embeddedImage) return false;

  const page = finalPdf.addPage([595.28, 841.89]);
  const docLabel = formatAnnexureLabel(doc);
  const cleanFileName = sanitizeForPdf(doc.original_file_name || 'Document');
  const cleanStatus = sanitizeForPdf(doc.verification_status || 'ON RECORD');

  // Top header
  page.drawText('A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY', {
    x: 36,
    y: 805,
    size: 9,
    font: fontBold,
    color: rgb(0.06, 0.11, 0.22)
  });
  page.drawText(`ANNEXURE: ${sanitizeForPdf(docLabel.toUpperCase())}`, {
    x: 36,
    y: 788,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.11, 0.22)
  });
  page.drawText(`Original File: ${cleanFileName}  |  Verification Status: ${cleanStatus}`, {
    x: 36,
    y: 772,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });
  page.drawLine({
    start: { x: 36, y: 762 },
    end: { x: 559.28, y: 762 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92)
  });

  const availableWidth = 523.28;
  const availableHeight = 710;
  const imgDims = embeddedImage.scale(1);

  const scaleFactor = Math.min(
    availableWidth / imgDims.width,
    availableHeight / imgDims.height,
    1
  );

  const scaledWidth = imgDims.width * scaleFactor;
  const scaledHeight = imgDims.height * scaleFactor;

  const x = 36 + (availableWidth - scaledWidth) / 2;
  const y = 36 + (availableHeight - scaledHeight) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight
  });

  return true;
}

/**
 * Appends qualifying candidate-uploaded documents to the 14-page official Joining Form PDF.
 * Strictly adheres to:
 * - is_current !== false
 * - document_type !== 'PHOTO' && document_type !== 'SIGNATURE'
 * - Preserves all pages of multi-page PDFs
 * - Creates safe A4 sheets with proportional scaling for images
 */
async function appendCandidateAnnexuresToPdfBlob(
  baseBlob: Blob,
  formData: JoiningFormData,
  documents?: DocumentRow[]
): Promise<Blob> {
  let docsToExamine: Array<{
    id?: string;
    document_type?: string | null;
    document_side?: string | null;
    storage_path?: string | null;
    original_file_name?: string | null;
    mime_type?: string | null;
    is_current?: boolean | null;
    verification_status?: string | null;
    uploaded_at?: string | null;
    dataUrl?: string | null;
  }> = [];

  if (documents && documents.length > 0) {
    docsToExamine = documents;
  } else if (formData.formId || formData.applicationId) {
    const res = await getCandidateDocuments({
      joiningFormId: formData.formId,
      applicationId: formData.applicationId
    });
    if (res.success && res.data && res.data.length > 0) {
      docsToExamine = res.data;
    }
  }

  if (docsToExamine.length === 0 && formData.documents) {
    docsToExamine = Object.values(formData.documents)
      .filter((d) => d && Boolean(d.file?.dataUrl || d.file?.storagePath))
      .map((d, index) => ({
        id: `form-doc-${index}-${d.category}`,
        document_type: d.category,
        document_side: (d.side as any) || null,
        storage_path: d.file?.storagePath || null,
        original_file_name: d.file?.name || d.title,
        mime_type: d.file?.type || null,
        is_current: true,
        verification_status: d.verificationStatus || 'UPLOADED',
        uploaded_at: null,
        dataUrl: d.file?.dataUrl || null
      }));
  }

  // Strict qualifying document rules:
  // 1. is_current !== false (exclude superseded/rejected prior uploads)
  // 2. document_type !== 'PHOTO' && document_type !== 'SIGNATURE'
  // 3. has storage_path or dataUrl
  const qualifyingDocs = docsToExamine.filter((d) => {
    const isCurrent = d.is_current !== false;
    const notPhotoOrSig = d.document_type !== 'PHOTO' && d.document_type !== 'SIGNATURE';
    const hasLocation = Boolean(d.storage_path || d.dataUrl);
    return isCurrent && notPhotoOrSig && hasLocation;
  });

  if (qualifyingDocs.length === 0) {
    return baseBlob;
  }

  try {
    const baseArrayBuffer = await baseBlob.arrayBuffer();
    const finalPdf = await PDFDocument.load(baseArrayBuffer);
    const fontBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await finalPdf.embedFont(StandardFonts.Helvetica);

    for (const doc of qualifyingDocs) {
      const bytes = await fetchDocumentBytes(doc);
      if (!bytes || bytes.length === 0) {
        appendAttachmentNoticePage(
          finalPdf,
          fontBold,
          fontRegular,
          doc,
          'Document attachment could not be retrieved from private cloud storage.'
        );
        continue;
      }

      // Check if PDF by magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
      const isPdf = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

      if (isPdf) {
        try {
          const attachedPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pageIndices = attachedPdf.getPageIndices();
          if (pageIndices.length === 0) {
            appendAttachmentNoticePage(finalPdf, fontBold, fontRegular, doc, 'Uploaded PDF contains zero pages.');
          } else {
            const copiedPages = await finalPdf.copyPages(attachedPdf, pageIndices);
            for (const copiedPage of copiedPages) {
              finalPdf.addPage(copiedPage);
            }
          }
        } catch (pdfLoadErr: any) {
          console.warn('[generateJoiningPacketPdf] Error parsing candidate PDF attachment:', pdfLoadErr);
          appendAttachmentNoticePage(
            finalPdf,
            fontBold,
            fontRegular,
            doc,
            'Uploaded PDF document could not be incorporated (the file may be encrypted, password-protected, or corrupted).'
          );
        }
      } else {
        const success = await appendImageAnnexurePage(finalPdf, fontBold, fontRegular, doc, bytes);
        if (!success) {
          appendAttachmentNoticePage(
            finalPdf,
            fontBold,
            fontRegular,
            doc,
            'Uploaded image document could not be decoded or embedded.'
          );
        }
      }
    }

    const mergedPdfBytes = await finalPdf.save();
    return new Blob([mergedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  } catch (mergeErr) {
    console.error('[generateJoiningPacketPdf] Failed to append annexures to master PDF:', mergeErr);
    return baseBlob;
  }
}

/**
 * Generates the official candidate joining packet PDF as a binary Blob.
 * In browser: captures rendered official form sheets from JoiningFormPrintPreview directly.
 * In Node / fallback: builds the official form pages programmatically.
 * Then appends qualifying candidate-uploaded documents as annexures via pdf-lib.
 */
export async function generateJoiningPacketPdf(
  formData: JoiningFormData,
  documents?: DocumentRow[]
): Promise<Blob> {
  let baseBlob: Blob | null = null;

  // 1. Browser runtime: Capture actual rendered official form sheets
  if (typeof document !== 'undefined') {
    const sheets = findPrintPreviewSheets();
    if (sheets.length > 0) {
      try {
        baseBlob = await captureSheetsToPdfBlob(sheets);
      } catch (domCaptureErr) {
        console.warn('[generateJoiningPacketPdf] DOM capture warning, using programmatic builder:', domCaptureErr);
      }
    }
  }

  // 2. Programmatic vector builder (Node or fallback)
  if (!baseBlob) {
    const doc = buildProgrammaticJoiningPdf(formData);
    baseBlob = doc.output('blob');
  }

  // 3. Append candidate-uploaded document annexures
  return await appendCandidateAnnexuresToPdfBlob(baseBlob, formData, documents);
}

/**
 * Downloads candidate-specific official joining packet PDF.
 * File format: [Reference]-[Candidate-Name].pdf (e.g. JOIN-2026-000123-John-Doe.pdf)
 */
export async function downloadJoiningPacketPdf(
  formData: JoiningFormData,
  documents?: DocumentRow[]
): Promise<void> {
  try {
    const blob = await generateJoiningPacketPdf(formData, documents);
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
