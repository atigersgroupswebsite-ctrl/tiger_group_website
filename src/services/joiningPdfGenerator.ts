// ==============================================================================
// File: src/services/joiningPdfGenerator.ts
// Description: Client-side Master 14-Page Joining Packet PDF Generator using pdf-lib
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   1. Loads master joining_form_master.pdf template
//   2. Dynamically overlays candidate demographic, address, bank, and declaration data
//   3. Embeds candidate Photo and Signature images
//   4. Conditionally manages Page 6 (Women Worker Night Shift Consent for females only)
//   5. Downloads final legally compliant joining dossier
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { JoiningFormData } from '../types/joining';
import { JOINING_PDF_MAPPINGS } from '../constants/joiningPdfCoordinates';

async function convertDataUrlToBytes(dataUrl?: string): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  try {
    const isPng = dataUrl.includes('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, isPng };
  } catch (err) {
    console.warn('Failed to convert DataUrl to bytes:', err);
    return null;
  }
}

export async function generateJoiningPacketPdf(formData: JoiningFormData): Promise<Blob> {
  // 1. Fetch master template PDF
  const response = await fetch('/assets/pdf/joining_form_master.pdf');
  if (!response.ok) {
    throw new Error('Master Joining Form PDF template could not be loaded.');
  }
  const templateBytes = await response.arrayBuffer();

  // 2. Load PDFDocument
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.08, 0.08, 0.12);

  // Helper: Draw Text
  const drawText = (
    pageIdx: number,
    text: string | undefined | null,
    coord: { x: number; y: number; size?: number; maxWidth?: number },
    bold: boolean = false
  ) => {
    if (!text || pageIdx >= pages.length) return;
    const page = pages[pageIdx];
    page.drawText(String(text).trim(), {
      x: coord.x,
      y: coord.y,
      size: coord.size || 9,
      font: bold ? helveticaBold : helvetica,
      color: textColor,
      maxWidth: coord.maxWidth
    });
  };

  // Helper: Embed & Draw Image
  const drawImage = async (
    pageIdx: number,
    imageDataUrl: string | undefined,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    if (!imageDataUrl || pageIdx >= pages.length) return;
    const converted = await convertDataUrlToBytes(imageDataUrl);
    if (!converted) return;

    try {
      const embeddedImg = converted.isPng
        ? await pdfDoc.embedPng(converted.bytes)
        : await pdfDoc.embedJpg(converted.bytes);

      const page = pages[pageIdx];
      page.drawImage(embeddedImg, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      });
    } catch (err) {
      console.warn('Could not embed image into PDF:', err);
    }
  };

  const p = formData.personal;
  const emp = formData.employment;
  const perm = formData.permanentAddress;
  const curr = formData.currentAddress;
  const bank = formData.bank;
  const decl = formData.declarations;
  const ec = formData.emergencyContacts[0];
  const photoUrl = formData.documents.PHOTO?.file?.dataUrl;
  const signatureUrl = formData.documents.SIGNATURE?.file?.dataUrl;

  const isFemale = p.gender?.toLowerCase() === 'female';
  const hasWomenConsent = isFemale && Boolean(decl.womenNightShiftConsent);

  // ---------------------------------------------------------------------------
  // PAGE 1: CHECKLIST & EMPLOYEE INFO
  // ---------------------------------------------------------------------------
  const m1 = JOINING_PDF_MAPPINGS.page1;
  drawText(0, p.employeeName, m1.employeeName, true);
  drawText(0, emp.employeeCode || '—', m1.employeeCode);
  drawText(0, emp.dateOfJoining || decl.declarationDate, m1.dateOfJoining);
  drawText(0, emp.department, m1.department);
  drawText(0, emp.designation, m1.designation);
  drawText(0, `${emp.location || 'Nagpur'} / ${emp.unit || 'A TIGER GLOBAL'}`, m1.locationUnit);

  // Checklist Checkmarks
  drawText(0, '✓ ON FILE', m1.chk_personal, true);
  drawText(0, '✓ READY', m1.chk_joiningReport, true);
  drawText(0, '✓ ACKNOWLEDGED', m1.chk_declaration, true);
  drawText(0, '✓ GENERATED', m1.chk_idCard, true);
  drawText(0, '✓ ATTESTED', m1.chk_epfo, true);
  drawText(0, '✓ ATTESTED', m1.chk_esic, true);
  drawText(0, isFemale ? (hasWomenConsent ? '✓ ACCEPTED' : 'NOT APPLICABLE') : 'N/A (MALE)', m1.chk_womenConsent);
  drawText(0, formData.education?.length > 0 ? '✓ ATTACHED' : 'OPTIONAL (NOT PROVIDED)', m1.chk_education);
  drawText(0, p.aadhaarNumber ? '✓ ATTACHED' : '—', m1.chk_idProof, true);
  drawText(0, bank.bankAccountNumber ? '✓ ATTACHED' : '—', m1.chk_bankProof, true);
  drawText(0, photoUrl ? '✓ UPLOADED' : '—', m1.chk_photos);

  if (signatureUrl) {
    await drawImage(0, signatureUrl, m1.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // PAGE 2: EMPLOYEE PERSONAL & EMERGENCY CONTACT
  // ---------------------------------------------------------------------------
  const m2 = JOINING_PDF_MAPPINGS.page2;
  drawText(1, p.employeeName, m2.fullName, true);
  drawText(1, p.dateOfBirth, m2.dateOfBirth);
  drawText(1, p.gender, m2.gender);
  drawText(1, p.fatherName, m2.fatherName);
  drawText(1, p.motherOrHusbandName, m2.motherName);
  drawText(1, p.maritalStatus, m2.maritalStatus);
  drawText(1, p.spouseName || '—', m2.spouseName);
  drawText(1, p.bloodGroup || '—', m2.bloodGroup);
  drawText(1, p.aadhaarNumber, m2.aadhaarNumber, true);
  drawText(1, p.panNumber, m2.panNumber, true);
  drawText(1, p.employeeContactNumber, m2.contactNumber);
  drawText(1, p.otherContactNumber || '—', m2.altContactNumber);
  drawText(1, p.emailId, m2.emailId);

  // Addresses
  drawText(1, perm.flatHouseRoad || perm.address, m2.permAddress);
  drawText(1, perm.villageOrCity || perm.city, m2.permCity);
  drawText(1, perm.district, m2.permDistrict);
  drawText(1, perm.state, m2.permState);
  drawText(1, perm.pinCode, m2.permPin);

  drawText(1, curr.flatHouseRoad || curr.address, m2.currAddress);
  drawText(1, curr.villageOrCity || curr.city, m2.currCity);
  drawText(1, curr.district, m2.currDistrict);
  drawText(1, curr.state, m2.currState);
  drawText(1, curr.pinCode, m2.currPin);

  // Emergency contact
  if (ec) {
    drawText(1, ec.name, m2.emerName);
    drawText(1, ec.relation, m2.emerRelation);
    drawText(1, ec.contactNumber, m2.emerPhone);
    drawText(1, ec.address, m2.emerAddress);
  }

  // ---------------------------------------------------------------------------
  // PAGE 3: BANK DETAILS, EDUCATION & FAMILY
  // ---------------------------------------------------------------------------
  const m3 = JOINING_PDF_MAPPINGS.page3;
  drawText(2, bank.accountHolderName, m3.accountHolderName, true);
  drawText(2, bank.bankName, m3.bankName);
  drawText(2, bank.bankAccountNumber, m3.accountNumber, true);
  drawText(2, bank.ifscCode, m3.ifscCode, true);
  drawText(2, bank.branchName, m3.branchName);

  // Education rows (optional)
  if (formData.education && formData.education.length > 0) {
    formData.education.slice(0, 3).forEach((edu, idx) => {
      const y = m3.eduRowY[idx] || 500;
      drawText(2, edu.qualification, { x: m3.eduCols.qualification, y, size: 8 });
      drawText(2, edu.boardOrUniversity, { x: m3.eduCols.board, y, size: 8 });
      drawText(2, edu.yearOfPassing, { x: m3.eduCols.year, y, size: 8 });
      drawText(2, edu.percentageOrGrade, { x: m3.eduCols.grade, y, size: 8 });
    });
  } else {
    drawText(2, 'Optional — Not provided by candidate', { x: m3.eduCols.qualification, y: 525, size: 8 });
  }

  // Family rows
  if (formData.family && formData.family.length > 0) {
    formData.family.slice(0, 3).forEach((fam, idx) => {
      const y = m3.famRowY[idx] || 360;
      drawText(2, fam.name, { x: m3.famCols.name, y, size: 8 });
      drawText(2, fam.relation, { x: m3.famCols.relation, y, size: 8 });
      drawText(2, fam.dateOfBirthOrAge, { x: m3.famCols.ageOrDob, y, size: 8 });
    });
  }

  // ---------------------------------------------------------------------------
  // PAGE 4: IDENTITY CARD
  // ---------------------------------------------------------------------------
  const m4 = JOINING_PDF_MAPPINGS.page4;
  drawText(3, p.employeeName, m4.employeeName, true);
  drawText(3, emp.employeeCode || '—', m4.employeeCode);
  drawText(3, emp.designation, m4.designation);
  drawText(3, emp.department, m4.department);
  drawText(3, emp.location || 'Nagpur, MH', m4.location);
  if (ec) {
    drawText(3, ec.name, m4.emerName);
    drawText(3, `${ec.contactNumber} (${ec.relation})`, m4.emerPhone);
  }
  drawText(3, p.bloodGroup || '—', m4.bloodGroup);
  drawText(3, decl.declarationDate, m4.date);

  // Embed Photo and Signature on ID Card
  if (photoUrl) {
    await drawImage(3, photoUrl, m4.photoBox);
  }
  if (signatureUrl) {
    await drawImage(3, signatureUrl, m4.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // PAGE 5: JOINING REPORT
  // ---------------------------------------------------------------------------
  const m5 = JOINING_PDF_MAPPINGS.page5;
  drawText(4, decl.declarationDate, m5.reportDate);
  drawText(4, emp.location || 'Nagpur, MH', m5.location);
  drawText(4, p.employeeName, m5.fullName, true);
  drawText(4, p.fatherName, m5.fatherName);
  drawText(4, p.dateOfBirth, m5.dob);
  drawText(4, emp.department, m5.department);
  drawText(4, emp.designation, m5.designation);
  drawText(4, p.panNumber, m5.panNumber);
  drawText(4, p.aadhaarNumber, m5.aadhaarNumber);
  drawText(4, p.bloodGroup || '—', m5.bloodGroup);
  drawText(4, bank.bankName, m5.bankName);
  drawText(4, bank.branchName, m5.branchName);
  drawText(4, bank.ifscCode, m5.ifscCode);
  drawText(4, bank.bankAccountNumber, m5.accountNumber);
  drawText(
    4,
    `${perm.flatHouseRoad || perm.address || ''}, ${perm.villageOrCity || perm.city || ''}, ${perm.district} - ${perm.pinCode}`,
    m5.address
  );
  drawText(4, p.employeeContactNumber, m5.mobile);

  if (signatureUrl) {
    await drawImage(4, signatureUrl, m5.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // PAGE 6: WOMEN WORKER NIGHT SHIFT CONSENT (CONDITIONAL)
  // ---------------------------------------------------------------------------
  const m6 = JOINING_PDF_MAPPINGS.page6;
  if (hasWomenConsent) {
    drawText(5, p.employeeName, m6.candidateName, true);
    drawText(
      5,
      `${perm.villageOrCity || perm.city || 'Nagpur'}, ${perm.district}`,
      m6.address
    );
    drawText(5, 'A TIGER GLOBAL Career Solution & Consultancy', m6.companyName);
    drawText(5, emp.designation || 'Associate', m6.designation);
    drawText(5, decl.womenNightShiftPlace || 'Nagpur', m6.place);
    drawText(5, decl.declarationDate, m6.date);

    if (signatureUrl) {
      await drawImage(5, signatureUrl, m6.signatureBox);
    }
  }

  // ---------------------------------------------------------------------------
  // PAGE 7: SELF DECLARATION (RELIEVING / DUAL EMPLOYMENT)
  // ---------------------------------------------------------------------------
  const m7 = JOINING_PDF_MAPPINGS.page7;
  drawText(6, decl.previousEmployerName || 'Fresher / None', m7.previousEmployer);
  drawText(6, decl.previousEmployerLastWorkingDay || 'N/A', m7.lastWorkingDate);
  drawText(6, p.employeeName, m7.candidateName, true);
  drawText(6, decl.declarationDate, m7.declarationDate);

  if (signatureUrl) {
    await drawImage(6, signatureUrl, m7.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // PAGE 8: DECLARATION (RELATIVE EMPLOYMENT POLICY)
  // ---------------------------------------------------------------------------
  const m8 = JOINING_PDF_MAPPINGS.page8;
  drawText(7, p.employeeName, m8.candidateName, true);
  drawText(7, emp.designation, m8.designation);

  const relativeText = decl.hasRelativeInOrganization
    ? `(I-b) I am related to ${decl.relativeName || 'Relative'} working in ${decl.relativeDepartment || 'Dept'} as ${decl.relativeRelationship || 'Relative'}`
    : `(I-a) I am NOT directly or distantly related to any employee working in the Organization.`;
  drawText(7, relativeText, m8.relativeOptionText, true);

  drawText(7, p.employeeName, m8.signatoryName, true);
  drawText(7, decl.declarationDate, m8.declarationDate);

  if (signatureUrl) {
    await drawImage(7, signatureUrl, m8.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // PAGE 12: CONDUCT & DISCIPLINE ACCEPTANCE
  // ---------------------------------------------------------------------------
  const m12 = JOINING_PDF_MAPPINGS.page12;
  drawText(11, p.employeeName, m12.employeeName, true);
  drawText(11, decl.declarationDate, m12.date);

  if (signatureUrl) {
    await drawImage(11, signatureUrl, m12.signatureBox);
  }

  // ---------------------------------------------------------------------------
  // CONDITIONAL PAGE HANDLING (PART 14, 16, 24)
  // If candidate is NOT female (or did not consent), remove Page 6!
  // Note: Page 6 in 0-indexed is 5
  // ---------------------------------------------------------------------------
  if (!hasWomenConsent) {
    pdfDoc.removePage(5);
  }

  // 3. Serialize and return Blob
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

export async function downloadJoiningPacketPdf(formData: JoiningFormData): Promise<void> {
  const blob = await generateJoiningPacketPdf(formData);
  const candidateName = formData.personal.employeeName.replace(/[^a-zA-Z0-9]/g, '_') || 'Candidate';
  const fileName = `Joining_Packet_${candidateName}.pdf`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
