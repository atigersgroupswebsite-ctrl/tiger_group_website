// ==============================================================================
// File: src/services/regularJoiningExportService.ts
// Description: Multi-Sheet Excel (.xlsx) Export Service for Regular Joining Forms
// Brand: A TIGER GLOBAL — Career Solution & Consultancy
//
// Worksheets Generated:
//   1. "Employee Joining Details" (34 strictly sequenced columns, NO PAN column)
//   2. "Document Checklist" (10 document audit columns, no private URLs)
//   3. "Joining Summary" (Executive KPI metrics, Department, Designation & Date breakdowns)
//
// Single Employee Export:
//   - "ATG_Employee_<Employee_Code>.xlsx" (Executive Profile & Document Ledger)
// ==============================================================================

import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { RegularJoiningFormData } from './regularJoiningService';
import { getExportDateStamp } from '../utils/exportUtils';
import { logActivity } from './activityService';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface RegularJoiningExportFilters {
  searchQuery?: string;
  status?: string; // 'ALL' | 'DRAFT' | 'VERIFIED'
  department?: string;
  designation?: string;
  startDate?: string;
  endDate?: string;
  selectedIds?: string[];
}

export interface RegularJoiningExportResult {
  success: boolean;
  recordCount: number;
  filename: string;
  error?: string;
}

export interface EnrichedRegularJoiningRecord {
  form: RegularJoiningFormData;
  raw?: any;
  hasPhoto: boolean;
  hasAadhaar: boolean;
  hasPassbook: boolean;
  hasSignature: boolean;
  allDocsUploaded: boolean;
  referenceSlipStatus: string;
  idCardStatus: string;
  creationDate: string;
}

// -----------------------------------------------------------------------------
// Sheet 1: Column Header Constants (Exact 34 Columns in Specified Order)
// -----------------------------------------------------------------------------

export const REGULAR_JOINING_DETAILS_COLUMNS = [
  'Serial Number',
  'Joining Reference Number / Employee Code',
  'Joining Date',
  'Candidate Full Name',
  "Father's Name",
  'Date of Birth',
  'Gender',
  'Marital Status',
  'Department',
  'Designation',
  'Company Name',
  'Unit Name',
  'Factory / Supervisor Name',
  'Permanent Address',
  'Current Address',
  'Aadhaar-Linked Mobile Number',
  'Alternate Mobile Number',
  'Email ID',
  'Aadhaar Number',
  'UAN Number',
  'ESIC Number',
  'PT Number',
  'Bank Account Number',
  'IFSC Code',
  'Bank Name',
  'Branch Name',
  'PhonePe / UPI Number',
  'Date of Interview',
  'Salary (CTC)',
  'Verification Status',
  'Verification Date',
  'Reference Slip Status',
  'Employee ID Card Status',
  'Record Creation Date'
];

// -----------------------------------------------------------------------------
// Sheet 2: Document Checklist Columns (Exact 10 Columns)
// -----------------------------------------------------------------------------

export const DOCUMENT_CHECKLIST_COLUMNS = [
  'Employee Code',
  'Candidate Name',
  'Joining Date',
  'Live Photo Uploaded',
  'Aadhaar Card Photo Uploaded',
  'Bank Passbook Photo Uploaded',
  'Signature Photo Uploaded',
  'All Required Documents Uploaded',
  'Verification Status',
  'Verification Date'
];

// -----------------------------------------------------------------------------
// Helper: Sanitize Filename
// -----------------------------------------------------------------------------

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

// -----------------------------------------------------------------------------
// Helper: Calculate Proportional Column Widths
// -----------------------------------------------------------------------------

function calculateColumnWidths(matrix: (string | number | undefined | null)[][]): { wch: number }[] {
  if (!matrix || matrix.length === 0) return [];
  const colCount = Math.max(...matrix.map((r) => r.length));
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = 10;
    // Inspect up to first 150 rows for efficiency
    const sampleRows = matrix.slice(0, 150);
    for (const row of sampleRows) {
      const val = row[c];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    // Clamp column width between 12 and 48 characters to maintain neat view
    widths.push({ wch: Math.min(Math.max(maxLen + 3, 12), 48) });
  }

  return widths;
}

// -----------------------------------------------------------------------------
// Helper: Format Date String to YYYY-MM-DD
// -----------------------------------------------------------------------------

function formatDate(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  if (isoOrDateString.includes('T')) {
    return isoOrDateString.split('T')[0];
  }
  return isoOrDateString;
}

const KNOWN_COMPANY_LOOKUP: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'A TIGER GLOBAL Career Solution & Consultancy',
  '00000000-0000-0000-0000-000000000002': 'A TIGER GLOBAL Safety & Security Services',
  '00000000-0000-0000-0000-000000000003': 'A TIGER GLOBAL Logistics & Supply Chain',
  '00000000-0000-0000-0000-000000000004': 'A TIGER GLOBAL Properties & Infrastructure',
  '00000000-0000-0000-0000-000000000005': 'A TIGER GLOBAL Footwear & Manufacturing',
  '00000000-0000-0000-0000-000000000010': "Haldiram's",
  '00000000-0000-0000-0000-000000000011': 'Signet Group',
  '00000000-0000-0000-0000-000000000012': 'Geeta Glass India Private Limited'
};

// -----------------------------------------------------------------------------
// Core Fetcher: Batch Retrieve and Enrich Regular Joining Records
// -----------------------------------------------------------------------------

export async function fetchAndEnrichRegularRecords(
  filters?: RegularJoiningExportFilters,
  explicitRecords?: RegularJoiningFormData[]
): Promise<EnrichedRegularJoiningRecord[]> {
  let forms: any[] = [];

  if (explicitRecords && explicitRecords.length > 0) {
    // Transform explicit in-memory records
    forms = explicitRecords.map((r) => ({
      id: r.id,
      joining_reference: r.employeeCode,
      employee_code: r.employeeCode,
      candidate_name: r.fullName,
      father_name: r.fatherName,
      date_of_birth: r.dob,
      gender: r.gender,
      marital_status: r.maritalStatus,
      department: r.department,
      designation: r.designation,
      company_name: r.companyName,
      unit: r.unitName,
      factory_supervisor_name: r.factorySupervisorName,
      permanent_address: r.permanentAddress,
      current_address: r.currentAddress,
      employee_contact_number: r.mobile,
      other_contact_number: r.alternateMobile,
      email: r.email,
      aadhaar_number: r.aadhaarNumber,
      uan: r.uanNumber,
      esic_number: r.esicNumber,
      pt_number: r.ptNumber,
      bank_account_number: r.bankAccountNumber,
      ifsc_code: r.ifscCode,
      bank_name: r.bankName,
      branch_name: r.branchName,
      upi_number: r.upiNumber,
      gross_salary: r.salaryCtc,
      interview_date: r.interviewDate,
      date_of_joining: r.joiningDate,
      photo_path: r.photo?.storagePath,
      candidate_signature_path: r.signature?.storagePath,
      custom_fields: {
        documentsMetadata: {
          photo: r.photo,
          aadhaar: r.aadhaar,
          bankPassbook: r.bankPassbook,
          signature: r.signature
        }
      },
      submission_status: r.submissionStatus,
      verified_at: r.verifiedAt,
      verified_by: r.verifiedBy,
      created_at: r.createdAt || new Date().toISOString()
    }));
  } else if (isSupabaseConfigured) {
    // 1. Query matching Regular Joining Forms from Supabase
    let query = supabase
      .from('joining_forms')
      .select('*')
      .or('joining_reference.ilike.ATG-%,employee_code.ilike.ATG-%')
      .order('created_at', { ascending: false });

    // Status filter
    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('submission_status', filters.status as any);
    }

    // Department filter
    if (filters?.department && filters.department.trim()) {
      query = query.ilike('department', `%${filters.department.trim()}%`);
    }

    // Designation filter
    if (filters?.designation && filters.designation.trim()) {
      query = query.ilike('designation', `%${filters.designation.trim()}%`);
    }

    // Date range filter
    if (filters?.startDate) {
      query = query.gte('date_of_joining', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date_of_joining', filters.endDate);
    }

    const { data: dbData, error: dbErr } = await query;
    if (dbErr) {
      throw new Error(`Failed to query regular joining forms: ${dbErr.message}`);
    }
    forms = dbData || [];
  }

  // Selective export filtering
  if (filters?.selectedIds && filters.selectedIds.length > 0) {
    const idSet = new Set(filters.selectedIds);
    forms = forms.filter((f) => idSet.has(f.id) || idSet.has(f.employee_code));
  }

  // Client Search filtering
  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    forms = forms.filter((f) => {
      const code = (f.employee_code || f.joining_reference || '').toLowerCase();
      const name = (f.candidate_name || '').toLowerCase();
      const dept = (f.department || '').toLowerCase();
      const desig = (f.designation || '').toLowerCase();
      const mob = (f.employee_contact_number || '').toLowerCase();
      return code.includes(q) || name.includes(q) || dept.includes(q) || desig.includes(q) || mob.includes(q);
    });
  }

  if (forms.length === 0) {
    return [];
  }

  const formIds = forms.map((f) => f.id).filter(Boolean);
  const employeeCodes = forms.map((f) => f.employee_code || f.joining_reference).filter(Boolean);

  // 2. Batch Fetch Document Ledger (Avoids N+1 queries)
  const docsByFormId = new Map<string, any[]>();
  if (isSupabaseConfigured && formIds.length > 0) {
    try {
      const { data: docRows } = await supabase
        .from('documents')
        .select('*')
        .in('joining_form_id', formIds);

      (docRows || []).forEach((doc: any) => {
        if (doc.joining_form_id) {
          const list = docsByFormId.get(doc.joining_form_id) || [];
          list.push(doc);
          docsByFormId.set(doc.joining_form_id, list);
        }
      });
    } catch (docErr) {
      console.warn('[RegularExport] Documents batch lookup warning:', docErr);
    }
  }

  // 3. Batch Fetch Linked Employee Records for ID Card status
  const empByCode = new Map<string, any>();
  if (isSupabaseConfigured && employeeCodes.length > 0) {
    try {
      const { data: empRows } = await supabase
        .from('employees')
        .select('id, employee_code, joining_form_id, employment_status, id_card_number, created_at')
        .in('employee_code', employeeCodes);

      (empRows || []).forEach((emp: any) => {
        if (emp.employee_code) {
          empByCode.set(emp.employee_code, emp);
        }
      });
    } catch (empErr) {
      console.warn('[RegularExport] Employees batch lookup warning:', empErr);
    }
  }

  // 4. Enrich each record
  const enriched: EnrichedRegularJoiningRecord[] = forms.map((row) => {
    const custom = (row.custom_fields || {}) as any;
    const docList = docsByFormId.get(row.id) || [];
    const empRecord = empByCode.get(row.employee_code) || empByCode.get(row.joining_reference);

    // Document Presence Check (from documents table OR custom_fields OR direct paths)
    const hasPhoto = Boolean(
      row.photo_path ||
      docList.some((d) => d.document_type === 'PHOTO' && d.storage_path) ||
      custom.documentsMetadata?.photo?.storagePath
    );

    const hasAadhaar = Boolean(
      docList.some((d) => d.document_type === 'AADHAAR' && d.storage_path) ||
      custom.documentsMetadata?.aadhaar?.storagePath
    );

    const hasPassbook = Boolean(
      docList.some((d) => d.document_type === 'BANK_PASSBOOK' && d.storage_path) ||
      custom.documentsMetadata?.bankPassbook?.storagePath
    );

    const hasSignature = Boolean(
      row.candidate_signature_path ||
      docList.some((d) => d.document_type === 'SIGNATURE' && d.storage_path) ||
      custom.documentsMetadata?.signature?.storagePath
    );

    const allDocsUploaded = hasPhoto && hasAadhaar && hasPassbook && hasSignature;
    const isVerified = row.submission_status === 'VERIFIED';

    // Status Descriptions
    const referenceSlipStatus = isVerified ? 'Generated / Available' : 'Pending Verification';
    const idCardStatus = empRecord
      ? 'Generated / Active'
      : isVerified
      ? 'Provisioned / Ready'
      : 'Pending Verification';

    const empCode = row.employee_code || row.joining_reference || 'ATG-501-2026';

    const formDataObj: RegularJoiningFormData = {
      id: row.id,
      employeeCode: empCode,
      joiningDate: row.date_of_joining || formatDate(row.created_at),
      department: row.department || '',
      designation: row.designation || '',
      companyName: row.company_name || custom.companyName || (row.company_id && KNOWN_COMPANY_LOOKUP[row.company_id]) || '',
      unitName: row.unit || custom.unitName || '',
      factorySupervisorName: row.factory_supervisor_name || custom.factorySupervisorName || '',
      salaryCtc: row.gross_salary || custom.salaryCtc || null,
      interviewDate: row.interview_date || custom.interviewDate || null,

      fullName: row.candidate_name || '',
      fatherName: row.father_name || '',
      dob: row.date_of_birth || '',
      gender: row.gender || 'MALE',
      maritalStatus: row.marital_status || 'SINGLE',
      aadhaarNumber: row.aadhaar_number || '',
      permanentAddress: row.permanent_address || '',
      currentAddress: row.current_address || '',
      sameAsPermanent: row.same_as_permanent ?? false,
      uanNumber: row.uan || custom.uanNumber || '',
      esicNumber: row.esic_number || custom.esicNumber || '',
      ptNumber: row.pt_number || custom.ptNumber || '',
      mobile: row.employee_contact_number || '',
      alternateMobile: row.other_contact_number || custom.alternateMobile || '',
      email: row.email || '',

      bankAccountNumber: row.bank_account_number || '',
      ifscCode: row.ifsc_code || '',
      bankName: row.bank_name || '',
      branchName: row.branch_name || '',
      upiNumber: row.upi_number || custom.upiNumber || '',

      photo: hasPhoto ? { name: 'photo.jpg', size: 0, type: 'image/jpeg', storagePath: row.photo_path } : null,
      aadhaar: hasAadhaar ? { name: 'aadhaar.jpg', size: 0, type: 'image/jpeg' } : null,
      bankPassbook: hasPassbook ? { name: 'passbook.jpg', size: 0, type: 'image/jpeg' } : null,
      signature: hasSignature ? { name: 'signature.png', size: 0, type: 'image/png', storagePath: row.candidate_signature_path } : null,

      submissionStatus: row.submission_status || 'DRAFT',
      verifiedAt: row.verified_at || custom.verifiedAt || null,
      verifiedBy: row.verified_by || custom.verifiedBy || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return {
      form: formDataObj,
      raw: row,
      hasPhoto,
      hasAadhaar,
      hasPassbook,
      hasSignature,
      allDocsUploaded,
      referenceSlipStatus,
      idCardStatus,
      creationDate: formatDate(row.created_at)
    };
  });

  return enriched;
}

// -----------------------------------------------------------------------------
// Sheet 1 Builder: "Employee Joining Details" (34 Strictly Ordered Columns)
// -----------------------------------------------------------------------------

function buildEmployeeJoiningDetailsSheet(
  records: EnrichedRegularJoiningRecord[]
): XLSX.WorkSheet {
  const dataRows: (string | number)[][] = records.map((item, idx) => {
    const f = item.form;
    const serialNumber = idx + 1;
    // Joining Reference Number and Employee Code are guaranteed identical
    const empCode = f.employeeCode;
    const joiningDate = f.joiningDate || '—';
    const fullName = f.fullName || '—';
    const fatherName = f.fatherName || '—';
    const dob = f.dob || '—';
    const gender = f.gender || '—';
    const maritalStatus = f.maritalStatus || '—';
    const department = f.department || '—';
    const designation = f.designation || '—';
    const companyName = f.companyName || '—';
    const unitName = f.unitName || '—';
    const factorySupervisor = f.factorySupervisorName || '—';
    const permanentAddress = f.permanentAddress || '—';
    const currentAddress = f.currentAddress || '—';
    const mobile = f.mobile || '—';
    const alternateMobile = f.alternateMobile || '—';
    const email = f.email || '—';
    const aadhaar = f.aadhaarNumber || '—';
    const uan = f.uanNumber || '—';
    const esic = f.esicNumber || '—';
    const pt = f.ptNumber || '—';
    const bankAccount = f.bankAccountNumber || '—';
    const ifsc = f.ifscCode || '—';
    const bankName = f.bankName || '—';
    const branchName = f.branchName || '—';
    const upi = f.upiNumber || '—';
    const interviewDate = f.interviewDate || '—';
    const salaryCtc = typeof f.salaryCtc === 'number' ? f.salaryCtc : (f.salaryCtc ? Number(f.salaryCtc) : 0);
    const verificationStatus = f.submissionStatus || 'DRAFT';
    const verificationDate = f.verifiedAt ? formatDate(f.verifiedAt) : (verificationStatus === 'VERIFIED' ? joiningDate : 'Pending');
    const referenceSlipStatus = item.referenceSlipStatus;
    const idCardStatus = item.idCardStatus;
    const creationDate = item.creationDate;

    return [
      serialNumber,           // 1. Serial Number
      empCode,                // 2. Joining Reference Number / Employee Code
      joiningDate,            // 3. Joining Date
      fullName,               // 4. Candidate Full Name
      fatherName,             // 5. Father's Name
      dob,                    // 6. Date of Birth
      gender,                 // 7. Gender
      maritalStatus,          // 8. Marital Status
      department,             // 9. Department
      designation,            // 10. Designation
      companyName,            // 11. Company Name
      unitName,               // 12. Unit Name
      factorySupervisor,      // 13. Factory / Supervisor Name
      permanentAddress,       // 14. Permanent Address
      currentAddress,         // 15. Current Address
      mobile,                 // 16. Aadhaar-Linked Mobile Number
      alternateMobile,        // 17. Alternate Mobile Number
      email,                  // 18. Email ID
      aadhaar,                // 19. Aadhaar Number (text cell to prevent scientific notation)
      uan,                    // 20. UAN Number
      esic,                   // 21. ESIC Number
      pt,                     // 22. PT Number
      bankAccount,            // 23. Bank Account Number (text cell)
      ifsc,                   // 24. IFSC Code
      bankName,               // 25. Bank Name
      branchName,             // 26. Branch Name
      upi,                    // 27. PhonePe / UPI Number
      interviewDate,          // 28. Date of Interview
      salaryCtc,              // 29. Salary (CTC) (numeric cell)
      verificationStatus,     // 30. Verification Status
      verificationDate,       // 31. Verification Date
      referenceSlipStatus,    // 32. Reference Slip Status
      idCardStatus,           // 33. Employee ID Card Status
      creationDate            // 34. Record Creation Date
    ];
  });

  const matrix: (string | number)[][] = [REGULAR_JOINING_DETAILS_COLUMNS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(matrix);

  // Auto-fit column widths
  ws['!cols'] = calculateColumnWidths(matrix);

  // Freeze top header row so it stays pinned while scrolling
  ws['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0, activeCell: 'A2' }];

  // Enable Excel column autofilter on all 34 columns
  const endColLetter = XLSX.utils.encode_col(REGULAR_JOINING_DETAILS_COLUMNS.length - 1);
  const totalRows = Math.max(dataRows.length + 1, 1);
  ws['!autofilter'] = { ref: `A1:${endColLetter}${totalRows}` };

  // Explicit cell formatting: ensure sensitive numbers are stored as string types
  // to prevent scientific notation (e.g. 1.23E+11) or leading zero loss
  if (dataRows.length > 0) {
    for (let r = 0; r < dataRows.length; r++) {
      const rowIndex = r + 2; // 1-based index in Excel (Row 1 is header)

      // Column 19: Aadhaar Number (Col index 18)
      const aadhaarCell = ws[`S${rowIndex}`];
      if (aadhaarCell) {
        aadhaarCell.t = 's';
        aadhaarCell.v = String(aadhaarCell.v);
      }

      // Column 23: Bank Account Number (Col index 22 -> W)
      const bankCell = ws[`W${rowIndex}`];
      if (bankCell) {
        bankCell.t = 's';
        bankCell.v = String(bankCell.v);
      }

      // Column 29: Salary (CTC) (Col index 28 -> AC)
      const salaryCell = ws[`AC${rowIndex}`];
      if (salaryCell && typeof salaryCell.v === 'number') {
        salaryCell.t = 'n';
        salaryCell.z = '₹#,##0';
      }
    }
  }

  return ws;
}

// -----------------------------------------------------------------------------
// Sheet 2 Builder: "Document Checklist" (10 Columns)
// -----------------------------------------------------------------------------

function buildDocumentChecklistSheet(
  records: EnrichedRegularJoiningRecord[]
): XLSX.WorkSheet {
  const dataRows: string[][] = records.map((item) => {
    const f = item.form;
    const isVerified = f.submissionStatus === 'VERIFIED';
    const verificationDate = f.verifiedAt ? formatDate(f.verifiedAt) : (isVerified ? (f.joiningDate || '—') : 'Pending');

    return [
      f.employeeCode,                                      // 1. Employee Code
      f.fullName || '—',                                   // 2. Candidate Name
      f.joiningDate || '—',                                // 3. Joining Date
      item.hasPhoto ? 'Uploaded' : 'Missing',              // 4. Live Photo Uploaded
      item.hasAadhaar ? 'Uploaded' : 'Missing',            // 5. Aadhaar Card Photo Uploaded
      item.hasPassbook ? 'Uploaded' : 'Missing',           // 6. Bank Passbook Photo Uploaded
      item.hasSignature ? 'Uploaded' : 'Missing',          // 7. Signature Photo Uploaded
      item.allDocsUploaded ? 'Yes' : 'No',                 // 8. All Required Documents Uploaded
      f.submissionStatus || 'DRAFT',                       // 9. Verification Status
      verificationDate                                     // 10. Verification Date
    ];
  });

  const matrix: string[][] = [DOCUMENT_CHECKLIST_COLUMNS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(matrix);

  ws['!cols'] = calculateColumnWidths(matrix);
  ws['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0, activeCell: 'A2' }];

  const endColLetter = XLSX.utils.encode_col(DOCUMENT_CHECKLIST_COLUMNS.length - 1);
  const totalRows = Math.max(dataRows.length + 1, 1);
  ws['!autofilter'] = { ref: `A1:${endColLetter}${totalRows}` };

  return ws;
}

// -----------------------------------------------------------------------------
// Sheet 3 Builder: "Joining Summary" (Executive KPIs & Breakdown Tables)
// -----------------------------------------------------------------------------

function buildJoiningSummarySheet(
  records: EnrichedRegularJoiningRecord[]
): XLSX.WorkSheet {
  const totalCount = records.length;
  const verifiedCount = records.filter((r) => r.form.submissionStatus === 'VERIFIED').length;
  const pendingCount = records.filter((r) => r.form.submissionStatus !== 'VERIFIED').length;
  const draftCount = records.filter((r) => r.form.submissionStatus === 'DRAFT').length;
  const missingDocsCount = records.filter((r) => !r.allDocsUploaded).length;
  const slipsCount = verifiedCount;
  const idCardsCount = records.filter((r) => r.idCardStatus.includes('Active') || r.idCardStatus.includes('Ready')).length;

  // Department-wise aggregation
  const deptCounts: Record<string, number> = {};
  records.forEach((r) => {
    const d = r.form.department?.trim() || 'Unassigned / Operations';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const deptRows = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, count]) => [
      dept,
      count,
      `${Math.round((count / (totalCount || 1)) * 100)}%`
    ]);

  // Designation-wise aggregation
  const desigCounts: Record<string, number> = {};
  records.forEach((r) => {
    const d = r.form.designation?.trim() || 'Unassigned';
    desigCounts[d] = (desigCounts[d] || 0) + 1;
  });
  const desigRows = Object.entries(desigCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([desig, count]) => [
      desig,
      count,
      `${Math.round((count / (totalCount || 1)) * 100)}%`
    ]);

  // Joining-date-wise aggregation
  const dateCounts: Record<string, number> = {};
  records.forEach((r) => {
    const dt = r.form.joiningDate || 'Unspecified';
    dateCounts[dt] = (dateCounts[dt] || 0) + 1;
  });
  const dateRows = Object.entries(dateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dt, count]) => [
      dt,
      count
    ]);

  const rows: (string | number)[][] = [
    ['A TIGER GLOBAL — REGULAR JOINING SUMMARY REPORT'],
    [`Generated On: ${new Date().toLocaleString('en-IN')}`, `Export Date Stamp: ${getExportDateStamp()}`],
    [],
    ['EXECUTIVE SUMMARY METRICS', 'COUNT', 'SHARE OF TOTAL'],
    ['1. Total Regular Joining Records', totalCount, '100%'],
    ['2. Verified Records', verifiedCount, `${Math.round((verifiedCount / (totalCount || 1)) * 100)}%`],
    ['3. Pending Verification', pendingCount, `${Math.round((pendingCount / (totalCount || 1)) * 100)}%`],
    ['4. Draft Records', draftCount, `${Math.round((draftCount / (totalCount || 1)) * 100)}%`],
    ['5. Records With Missing Documents', missingDocsCount, `${Math.round((missingDocsCount / (totalCount || 1)) * 100)}%`],
    ['6. Reference Slips Generated / Eligible', slipsCount, `${Math.round((slipsCount / (totalCount || 1)) * 100)}%`],
    ['7. Employee ID Cards Generated / Ready', idCardsCount, `${Math.round((idCardsCount / (totalCount || 1)) * 100)}%`],
    [],
    ['DEPARTMENT-WISE BREAKDOWN', 'EMPLOYEE COUNT', 'SHARE (%)'],
    ...(deptRows.length > 0 ? deptRows : [['No department data available', 0, '0%']]),
    [],
    ['DESIGNATION-WISE BREAKDOWN', 'EMPLOYEE COUNT', 'SHARE (%)'],
    ...(desigRows.length > 0 ? desigRows : [['No designation data available', 0, '0%']]),
    [],
    ['JOINING DATE-WISE BREAKDOWN', 'EMPLOYEE COUNT'],
    ...(dateRows.length > 0 ? dateRows : [['No date records', 0]])
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 42 }, // Column A
    { wch: 22 }, // Column B
    { wch: 18 }  // Column C
  ];

  return ws;
}

// -----------------------------------------------------------------------------
// Main Export Function: Multi-Sheet Workbook (.xlsx)
// -----------------------------------------------------------------------------

export async function exportRegularJoiningRecordsXlsx(options?: {
  filters?: RegularJoiningExportFilters;
  explicitRecords?: RegularJoiningFormData[];
}): Promise<RegularJoiningExportResult> {
  const enriched = await fetchAndEnrichRegularRecords(
    options?.filters,
    options?.explicitRecords
  );

  // Construct 3-Sheet Excel Workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Employee Joining Details
  const wsDetails = buildEmployeeJoiningDetailsSheet(enriched);
  XLSX.utils.book_append_sheet(workbook, wsDetails, 'Employee Joining Details');

  // Sheet 2: Document Checklist
  const wsDocs = buildDocumentChecklistSheet(enriched);
  XLSX.utils.book_append_sheet(workbook, wsDocs, 'Document Checklist');

  // Sheet 3: Joining Summary
  const wsSummary = buildJoiningSummarySheet(enriched);
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Joining Summary');

  // Output filename: ATG_Regular_Joining_Records_YYYY-MM-DD.xlsx
  const filename = `ATG_Regular_Joining_Records_${getExportDateStamp()}.xlsx`;

  // Write file via SheetJS browser trigger
  XLSX.writeFile(workbook, filename);

  // Audit activity log
  await logActivity({
    entityType: 'JOINING_FORM',
    action: 'REGULAR_JOINING_EXCEL_EXPORT',
    description: `Exported ${enriched.length} Regular Joining records to Excel (${filename}).`,
    metadata: {
      recordCount: enriched.length,
      filename,
      filters: options?.filters || {}
    }
  });

  return {
    success: true,
    recordCount: enriched.length,
    filename
  };
}

// -----------------------------------------------------------------------------
// Individual Employee Export Function
// Filename: ATG_Employee_<Employee_Code>.xlsx
// -----------------------------------------------------------------------------

export async function exportIndividualRegularJoiningXlsx(
  recordOrId: RegularJoiningFormData | string
): Promise<RegularJoiningExportResult> {
  let enrichedList: EnrichedRegularJoiningRecord[];

  if (typeof recordOrId === 'string') {
    enrichedList = await fetchAndEnrichRegularRecords({ searchQuery: recordOrId });
  } else {
    enrichedList = await fetchAndEnrichRegularRecords(undefined, [recordOrId]);
  }

  if (enrichedList.length === 0) {
    throw new Error('Employee record could not be found for export.');
  }

  const item = enrichedList[0];
  const f = item.form;
  const cleanCode = sanitizeFilename(f.employeeCode || 'ATG-501-2026');
  const filename = `ATG_Employee_${cleanCode}.xlsx`;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Comprehensive Employee Dossier
  const dossierRows: (string | number)[][] = [
    ['A TIGER GLOBAL — CAREER SOLUTION & CONSULTANCY'],
    ['EMPLOYEE REGULAR JOINING DOSSIER', `Export Date: ${getExportDateStamp()}`],
    [],
    ['SECTION', 'FIELD NAME', 'VALUE'],
    // Section A: Joining Details
    ['Joining Details', 'Employee Code / Ref Number', f.employeeCode],
    ['Joining Details', 'Joining Date', f.joiningDate || '—'],
    ['Joining Details', 'Department', f.department || '—'],
    ['Joining Details', 'Designation', f.designation || '—'],
    ['Joining Details', 'Company Name', f.companyName || '—'],
    ['Joining Details', 'Unit Name', f.unitName || '—'],
    ['Joining Details', 'Factory / Supervisor Name', f.factorySupervisorName || '—'],
    ['Joining Details', 'Date of Interview', f.interviewDate || '—'],
    ['Joining Details', 'Gross Salary (CTC)', typeof f.salaryCtc === 'number' ? f.salaryCtc : (f.salaryCtc ? Number(f.salaryCtc) : 0)],
    // Section B: Candidate Personal Details
    ['Personal Details', 'Candidate Full Name', f.fullName],
    ['Personal Details', "Father's Name", f.fatherName || '—'],
    ['Personal Details', 'Date of Birth', f.dob || '—'],
    ['Personal Details', 'Gender', f.gender || '—'],
    ['Personal Details', 'Marital Status', f.maritalStatus || '—'],
    ['Personal Details', 'Aadhaar Card Number', f.aadhaarNumber || '—'],
    // Section C: Contact & Address
    ['Contact & Address', 'Permanent Address', f.permanentAddress || '—'],
    ['Contact & Address', 'Current Address', f.currentAddress || '—'],
    ['Contact & Address', 'Aadhaar-Linked Mobile', f.mobile || '—'],
    ['Contact & Address', 'Alternate Mobile Number', f.alternateMobile || '—'],
    ['Contact & Address', 'Email ID', f.email || '—'],
    // Section D: Statutory Employment IDs (NO PAN)
    ['Statutory Identifiers', 'UAN (Provident Fund)', f.uanNumber || '—'],
    ['Statutory Identifiers', 'ESIC Number', f.esicNumber || '—'],
    ['Statutory Identifiers', 'PT Number', f.ptNumber || '—'],
    // Section E: Bank Details
    ['Banking Details', 'Bank Account Number', f.bankAccountNumber || '—'],
    ['Banking Details', 'IFSC Code', f.ifscCode || '—'],
    ['Banking Details', 'Bank Name', f.bankName || '—'],
    ['Banking Details', 'Branch Name', f.branchName || '—'],
    ['Banking Details', 'PhonePe / UPI Number', f.upiNumber || '—'],
    // Section F: Verification & Governance
    ['Governance & Status', 'Verification Status', f.submissionStatus || 'DRAFT'],
    ['Governance & Status', 'Verification Date', f.verifiedAt ? formatDate(f.verifiedAt) : 'Pending'],
    ['Governance & Status', 'Verified By Administrator', f.verifiedBy || 'Administrator'],
    ['Governance & Status', 'Reference Slip Status', item.referenceSlipStatus],
    ['Governance & Status', 'Employee ID Card Status', item.idCardStatus],
    ['Governance & Status', 'Record Creation Date', item.creationDate]
  ];

  const wsDossier = XLSX.utils.aoa_to_sheet(dossierRows);
  wsDossier['!cols'] = [
    { wch: 25 },
    { wch: 32 },
    { wch: 45 }
  ];

  // Format salary cell
  for (let r = 0; r < dossierRows.length; r++) {
    if (dossierRows[r][1] === 'Gross Salary (CTC)') {
      const cell = wsDossier[`C${r + 1}`];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '₹#,##0';
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, wsDossier, 'Employee Dossier');

  // Sheet 2: Document Checklist
  const wsDocChecklist = buildDocumentChecklistSheet([item]);
  XLSX.utils.book_append_sheet(workbook, wsDocChecklist, 'Document Checklist');

  XLSX.writeFile(workbook, filename);

  await logActivity({
    entityType: 'JOINING_FORM',
    entityId: f.id || null,
    action: 'REGULAR_EMPLOYEE_EXCEL_EXPORT',
    description: `Exported individual employee record for ${f.fullName} (${f.employeeCode}) to Excel (${filename}).`,
    metadata: {
      employeeCode: f.employeeCode,
      filename
    }
  });

  return {
    success: true,
    recordCount: 1,
    filename
  };
}
