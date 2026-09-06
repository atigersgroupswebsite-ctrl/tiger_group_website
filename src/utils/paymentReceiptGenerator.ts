// ==============================================================================
// File: src/utils/paymentReceiptGenerator.ts
// Description: Professional Payment Receipt PDF Generator for A Tiger Global
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Note: Official receipt for registration / consultancy fee. Not a tax invoice.
// ==============================================================================

import { jsPDF } from 'jspdf';

export interface PaymentReceiptData {
  applicationNumber: string;
  paymentReference: string;
  receiptNumber: string;
  candidateName: string;
  candidateEmail: string;
  candidateMobile?: string;
  paymentPurpose: string;
  amount: number;
  currency: string;
  paymentDate: string | Date;
  paymentStatus: string;
  paymentMethod?: string;
  gateway?: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  receivedBy?: string;
}

/**
 * Constructs a crisp, executive-grade Payment Receipt PDF document.
 */
export function buildPaymentReceiptPdf(data: PaymentReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const navy = [25, 42, 86] as const; // #192A56
  const gold = [197, 160, 89] as const; // #C5A059
  const darkSlate = [30, 41, 59] as const; // #1E293B
  const slate = [100, 116, 139] as const; // #64748B
  const lightBg = [248, 250, 252] as const; // #F8FAFC
  const borderGray = [226, 232, 240] as const; // #E2E8F0
  const emerald = [22, 101, 52] as const; // #166534

  // Top Header Accent Bar
  doc.setFillColor(...navy);
  doc.rect(margin, y, contentWidth, 3, 'F');
  y += 9;

  // Company Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.text('A TIGER GLOBAL', margin, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gold);
  doc.text('CAREER SOLUTION & CONSULTANCY', margin, y + 5);

  // Document Title Pill on the right
  doc.setFillColor(...navy);
  doc.roundedRect(pageWidth - margin - 52, y - 4, 52, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT RECEIPT', pageWidth - margin - 26, y + 3, { align: 'center' });

  y += 14;

  // Subtitle / Address line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text('Unit of A TIGER GROUPS • Certified Industrial Workforce & Placement Consultancy', margin, y);
  doc.text('Official Email: info@atigergroup.com  •  Website: www.atigergroup.com', margin, y + 4);

  y += 8;

  // Dividing Line
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Key Metadata Box (Receipt Number, Reference, Date, Status)
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const colWidth = contentWidth / 4;

  // Col 1: Receipt Number
  doc.setFontSize(7.5);
  doc.setTextColor(...slate);
  doc.text('RECEIPT NUMBER', margin + 4, y + 6);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(data.receiptNumber || 'N/A', margin + 4, y + 14);

  // Col 2: Payment Reference
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('PAYMENT REFERENCE', margin + colWidth + 4, y + 6);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(data.paymentReference || 'N/A', margin + colWidth + 4, y + 14);

  // Col 3: Payment Date
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('DATE ISSUED', margin + colWidth * 2 + 4, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(formattedDate, margin + colWidth * 2 + 4, y + 14);

  // Col 4: Status
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('PAYMENT STATUS', margin + colWidth * 3 + 4, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emerald);
  doc.text('✓ SUCCESSFUL', margin + colWidth * 3 + 4, y + 14);

  y += 31;

  // Candidate Information Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...navy);
  doc.text('CANDIDATE INFORMATION', margin, y);
  y += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'D');

  const halfWidth = contentWidth / 2;

  // Row 1: Candidate Name & Application Number
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Candidate Name:', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(data.candidateName || 'N/A', margin + 35, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Application ID:', margin + halfWidth + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(data.applicationNumber || 'N/A', margin + halfWidth + 35, y + 7);

  // Row 2: Registered Email & Mobile
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Registered Email:', margin + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(data.candidateEmail || 'N/A', margin + 35, y + 16);

  if (data.candidateMobile) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text('Contact Mobile:', margin + halfWidth + 4, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(data.candidateMobile, margin + halfWidth + 35, y + 16);
  }

  y += 32;

  // Fee Particulars Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...navy);
  doc.text('FEE PARTICULARS & PAYMENT BREAKDOWN', margin, y);
  y += 4;

  // Table Header
  doc.setFillColor(...navy);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SR', margin + 4, y + 5.5);
  doc.text('PARTICULARS / DESCRIPTION', margin + 16, y + 5.5);
  doc.text('PURPOSE', margin + 115, y + 5.5);
  doc.text('AMOUNT (INR)', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 8;

  // Table Body Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 14, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text('1.', margin + 4, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Registration & Dossier Verification Fee', margin + 16, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slate);
  doc.text('Joining Dossier verification and corporate job coordination', margin + 16, y + 10.5);

  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text(data.paymentPurpose || 'REGISTRATION', margin + 115, y + 8);

  const formattedAmount = `INR ${Number(data.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text(formattedAmount, pageWidth - margin - 4, y + 8, { align: 'right' });

  y += 14;

  // Total Summary Row
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('TOTAL AMOUNT PAID', margin + 16, y + 6.5);
  doc.setFontSize(10);
  doc.text(formattedAmount, pageWidth - margin - 4, y + 6.5, { align: 'right' });

  y += 17;

  // Transaction & Gateway Audit Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...navy);
  doc.text('PAYMENT GATEWAY & AUDIT TRAIL', margin, y);
  y += 4;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Payment Gateway:', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(data.gateway || 'RAZORPAY', margin + 40, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Payment Method:', margin + halfWidth + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(data.paymentMethod || 'ONLINE / NET BANKING / UPI', margin + halfWidth + 40, y + 6);

  if (data.gatewayPaymentId) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text('Gateway Payment ID:', margin + 4, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text(data.gatewayPaymentId, margin + 40, y + 14);
  }

  if (data.gatewayOrderId) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text('Gateway Order ID:', margin + halfWidth + 4, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text(data.gatewayOrderId, margin + halfWidth + 40, y + 14);
  }

  if (data.receivedBy) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text('Authorized Receiver:', margin + 4, y + 21);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(data.receivedBy, margin + 40, y + 21);
  }

  y += 33;

  // Consultancy Terms Notice Box
  doc.setFillColor(254, 243, 199); // Light amber
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // Dark amber
  doc.text('A TIGER GLOBAL CONSULTANCY FEE POLICY CLAUSE:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text(
    'Total consultancy charge is Rs. 1,000/-. Rs. 500/- is collected upon registration and joining dossier submission.',
    margin + 4,
    y + 9.5
  );
  doc.text(
    'The remaining Rs. 500/- will be coordinated after one month of continuous employment at the assigned plant/firm.',
    margin + 4,
    y + 13.5
  );

  y += 24;

  // Authorization Signatures
  doc.setFontSize(7.5);
  doc.setTextColor(...slate);
  doc.text('Verified Digital Authorization', pageWidth - margin - 50, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  doc.text('Accounts & Compliance Officer', pageWidth - margin - 50, y + 4.5);
  doc.text('A TIGER GLOBAL', pageWidth - margin - 50, y + 8.5);

  // Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerText =
    'This is an authentic computer-generated digital Payment Receipt issued by A Tiger Global Career Solution & Consultancy. ' +
    'Valid without physical seal when verified against application database. Not a tax invoice.';
  doc.text(footerText, pageWidth / 2, 287, { align: 'center', maxWidth: contentWidth });

  return doc;
}

/**
 * Triggers browser download of the generated PDF receipt.
 */
export function downloadPaymentReceiptPdf(data: PaymentReceiptData): void {
  const doc = buildPaymentReceiptPdf(data);
  const safeRef = (data.receiptNumber || data.paymentReference || 'RECEIPT').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeRef}_Payment_Receipt.pdf`);
}

/**
 * Returns Uint8Array of the PDF receipt for server email attachments.
 */
export function getPaymentReceiptPdfBuffer(data: PaymentReceiptData): Uint8Array {
  const doc = buildPaymentReceiptPdf(data);
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
