// ==============================================================================
// File: src/services/adminJoiningExportService.ts
// Description: Multi-sheet Joining Dossier & Submissions Excel (XLSX) Export Service
// Brand: A TIGER GROUPS — Centralized Admin Management Suite
// Features:
//   - High-performance batch retrieval (prevents N+1 query cascades)
//   - 5 distinct relational worksheets:
//       1. Joining Submissions (one row per candidate with document audit summary)
//       2. Uploaded Documents (granular file, side, and verification ledger)
//       3. Education Records (academic history linked by reference)
//       4. Family Details (nominee & family register linked by reference)
//       5. Emergency Contacts (contact directory linked by reference)
//   - Zero public storage URL exposure; points to authenticated Admin Dossier
//   - Graceful zero-record handling with pre-populated headers
// ==============================================================================

import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import type {
  JoiningFormRow,
  DocumentRow,
  EducationRecordRow,
  FamilyDetailRow,
  EmergencyContactRow,
  CompanyRow,
  JoiningSubmissionStatus
} from '../types/database';
import { getExportDateStamp } from '../utils/exportUtils';

export interface JoiningExportFilters {
  status?: string;
  companyId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  documentStatus?: 'ALL' | 'ALL_VERIFIED' | 'PENDING_REVIEW' | 'HAS_REJECTIONS';
}

export interface JoiningExportResult {
  recordCount: number;
  filename: string;
}

// -----------------------------------------------------------------------------
// Sheet Column Specifications
// -----------------------------------------------------------------------------

export const JOINING_SUBMISSIONS_COLUMNS = [
  'Sr. No.',
  'Joining Reference Number',
  'Employee Code',
  'Candidate Full Name',
  "Father's Name",
  "Mother's / Husband's Name",
  'Date of Birth',
  'Gender',
  'Marital Status',
  'Blood Group',
  'Contact Mobile Number',
  'Alternate Contact Number',
  'Email Address',
  'Permanent Address',
  'Permanent City',
  'Permanent District',
  'Permanent State',
  'Permanent Pin Code',
  'Current Address',
  'Current City',
  'Current District',
  'Current State',
  'Current Pin Code',
  'Allocated Company',
  'Unit / Plant',
  'Department',
  'Sub-Department',
  'Designation / Job Role',
  'Work Location',
  'Date of Joining',
  'Monthly Gross Salary',
  'Bank Name',
  'Branch Name',
  'Bank Account Holder Name',
  'Bank Account Number',
  'IFSC Code',
  'UAN (Provident Fund)',
  'ESIC Number',
  'PT Number',
  'Submission Status',
  'Submission Date',
  'Total Uploaded Documents',
  'Verified Documents',
  'Pending Documents',
  'Rejected Documents',
  'Photo Status',
  'Signature Status',
  'Aadhaar Front Status',
  'Aadhaar Back Status',
  'PAN Card Status',
  'Bank Passbook Status',
  'Education Certificate Status',
  'Admin Dossier Link'
];

export const UPLOADED_DOCUMENTS_COLUMNS = [
  'Joining Reference Number',
  'Employee Code',
  'Candidate Full Name',
  'Document Type',
  'Side',
  'Original File Name',
  'MIME Type',
  'File Size (KB)',
  'Verification Status',
  'Rejection Reason',
  'Uploaded At',
  'Verified At',
  'Admin Dossier Link'
];

export const EDUCATION_RECORDS_COLUMNS = [
  'Joining Reference Number',
  'Employee Code',
  'Candidate Full Name',
  'Qualification',
  'Board / University',
  'Passing Year',
  'Percentage / Grade'
];

export const FAMILY_DETAILS_COLUMNS = [
  'Joining Reference Number',
  'Employee Code',
  'Candidate Full Name',
  'Member Name',
  'Relationship',
  'Age / DOB'
];

export const EMERGENCY_CONTACTS_COLUMNS = [
  'Joining Reference Number',
  'Employee Code',
  'Candidate Full Name',
  'Contact Name',
  'Relationship',
  'Contact Number',
  'Address'
];

// -----------------------------------------------------------------------------
// Helper: Helper to safely format worksheet with auto-width columns
// -----------------------------------------------------------------------------

function buildWorksheet(
  rows: Record<string, unknown>[],
  columns: string[]
): XLSX.WorkSheet {
  let ws: XLSX.WorkSheet;

  if (rows.length === 0) {
    ws = XLSX.utils.aoa_to_sheet([columns]);
  } else {
    ws = XLSX.utils.json_to_sheet(rows, { header: columns });
  }

  // Calculate proportional column widths
  const colWidths = columns.map((colName) => {
    let maxLen = colName.length;
    rows.slice(0, 100).forEach((row) => {
      const val = row[colName];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 55) };
  });

  ws['!cols'] = colWidths;
  return ws;
}

// -----------------------------------------------------------------------------
// Helper: Categorize document status helper
// -----------------------------------------------------------------------------

function resolveSpecificDocStatus(
  docs: DocumentRow[],
  targetType: string,
  targetSide?: 'FRONT' | 'BACK' | null
): string {
  const match = docs.find((d) => {
    if (d.document_type !== targetType) return false;
    if (targetSide !== undefined && targetSide !== null) {
      return d.document_side === targetSide;
    }
    return true;
  });

  if (!match) return 'NOT_UPLOADED';
  return match.verification_status || 'UPLOADED';
}

// -----------------------------------------------------------------------------
// Main Export Function
// -----------------------------------------------------------------------------

export async function exportJoiningFormsXlsx(
  filters: JoiningExportFilters = {},
  applyFilters = true
): Promise<JoiningExportResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // 1. Query Matching Joining Forms
  let query = supabase.from('joining_forms').select('*');

  if (applyFilters) {
    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('submission_status', filters.status as JoiningSubmissionStatus);
    }
    if (filters.companyId && filters.companyId !== 'ALL') {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters.department && filters.department.trim()) {
      query = query.ilike('department', `%${filters.department.trim()}%`);
    }
    if (filters.startDate) {
      query = query.gte('created_at', new Date(filters.startDate).toISOString());
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data: formsData, error: formsErr } = await query;
  if (formsErr) {
    throw new Error(`Failed to query joining form records: ${formsErr.message}`);
  }

  let forms = (formsData as JoiningFormRow[]) || [];
  const formIds = forms.map((f) => f.id);

  // 2. Efficient Batch Query for Child Records (exactly 5 queries total)
  let docs: DocumentRow[] = [];
  let education: EducationRecordRow[] = [];
  let family: FamilyDetailRow[] = [];
  let emergency: EmergencyContactRow[] = [];
  let companies: CompanyRow[] = [];

  if (formIds.length > 0) {
    const [docsRes, eduRes, famRes, emRes, compRes] = await Promise.all([
      supabase.from('documents').select('*').in('joining_form_id', formIds),
      supabase.from('education_records').select('*').in('joining_form_id', formIds).order('sort_order', { ascending: true }),
      supabase.from('family_details').select('*').in('joining_form_id', formIds).order('sort_order', { ascending: true }),
      supabase.from('emergency_contacts').select('*').in('joining_form_id', formIds).order('sort_order', { ascending: true }),
      supabase.from('companies').select('*')
    ]);

    if (docsRes.data) docs = docsRes.data as DocumentRow[];
    if (eduRes.data) education = eduRes.data as EducationRecordRow[];
    if (famRes.data) family = famRes.data as FamilyDetailRow[];
    if (emRes.data) emergency = emRes.data as EmergencyContactRow[];
    if (compRes.data) companies = compRes.data as CompanyRow[];
  }

  // 3. Index child data into Maps for O(1) in-memory resolution
  const docsByFormId = new Map<string, DocumentRow[]>();
  docs.forEach((doc) => {
    if (!doc.joining_form_id) return;
    const existing = docsByFormId.get(doc.joining_form_id) || [];
    existing.push(doc);
    docsByFormId.set(doc.joining_form_id, existing);
  });

  const eduByFormId = new Map<string, EducationRecordRow[]>();
  education.forEach((e) => {
    const existing = eduByFormId.get(e.joining_form_id) || [];
    existing.push(e);
    eduByFormId.set(e.joining_form_id, existing);
  });

  const famByFormId = new Map<string, FamilyDetailRow[]>();
  family.forEach((f) => {
    const existing = famByFormId.get(f.joining_form_id) || [];
    existing.push(f);
    famByFormId.set(f.joining_form_id, existing);
  });

  const emByFormId = new Map<string, EmergencyContactRow[]>();
  emergency.forEach((em) => {
    const existing = emByFormId.get(em.joining_form_id) || [];
    existing.push(em);
    emByFormId.set(em.joining_form_id, existing);
  });

  const companyMap = new Map<string, string>();
  companies.forEach((c) => {
    companyMap.set(c.id, c.name);
  });

  // 4. Apply in-memory document verification state filter if requested
  if (applyFilters && filters.documentStatus && filters.documentStatus !== 'ALL') {
    forms = forms.filter((form) => {
      const formDocs = docsByFormId.get(form.id) || [];
      const totalDocs = formDocs.length;
      const verifiedDocs = formDocs.filter((d) => d.verification_status === 'VERIFIED').length;
      const rejectedDocs = formDocs.filter((d) => d.verification_status === 'REJECTED').length;
      const pendingDocs = formDocs.filter((d) => d.verification_status === 'UPLOADED' || d.verification_status === 'PENDING').length;

      if (filters.documentStatus === 'ALL_VERIFIED') {
        return totalDocs > 0 && verifiedDocs === totalDocs && rejectedDocs === 0;
      }
      if (filters.documentStatus === 'PENDING_REVIEW') {
        return pendingDocs > 0;
      }
      if (filters.documentStatus === 'HAS_REJECTIONS') {
        return rejectedDocs > 0;
      }
      return true;
    });
  }

  // 5. Assemble Dataset for Sheet 1: Joining Submissions
  const joiningSubmissionsRows: Record<string, unknown>[] = forms.map((form, index) => {
    const formDocs = docsByFormId.get(form.id) || [];
    const verifiedCount = formDocs.filter((d) => d.verification_status === 'VERIFIED').length;
    const pendingCount = formDocs.filter((d) => d.verification_status === 'UPLOADED' || d.verification_status === 'PENDING').length;
    const rejectedCount = formDocs.filter((d) => d.verification_status === 'REJECTED').length;

    const companyName = form.company_id ? companyMap.get(form.company_id) || 'Allocated' : 'Unallocated';
    const dossierUrl = `${origin}/admin/joining/${form.id}`;

    return {
      'Sr. No.': index + 1,
      'Joining Reference Number': form.joining_reference || 'PENDING',
      'Employee Code': form.employee_code || 'N/A',
      'Candidate Full Name': form.candidate_name || 'N/A',
      "Father's Name": form.father_name || 'N/A',
      "Mother's / Husband's Name": form.mother_or_husband_name || 'N/A',
      'Date of Birth': form.date_of_birth || 'N/A',
      'Gender': form.gender || 'N/A',
      'Marital Status': form.marital_status || 'N/A',
      'Blood Group': form.blood_group || 'N/A',
      'Contact Mobile Number': form.employee_contact_number || 'N/A',
      'Alternate Contact Number': form.other_contact_number || 'N/A',
      'Email Address': form.email || 'N/A',
      'Permanent Address': form.permanent_address || 'N/A',
      'Permanent City': form.permanent_city || 'N/A',
      'Permanent District': form.permanent_district || 'N/A',
      'Permanent State': form.permanent_state || 'N/A',
      'Permanent Pin Code': form.permanent_pin_code || 'N/A',
      'Current Address': form.current_address || (form.same_as_permanent ? form.permanent_address || 'N/A' : 'N/A'),
      'Current City': form.current_city || (form.same_as_permanent ? form.permanent_city || 'N/A' : 'N/A'),
      'Current District': form.current_district || (form.same_as_permanent ? form.permanent_district || 'N/A' : 'N/A'),
      'Current State': form.current_state || (form.same_as_permanent ? form.permanent_state || 'N/A' : 'N/A'),
      'Current Pin Code': form.current_pin_code || (form.same_as_permanent ? form.permanent_pin_code || 'N/A' : 'N/A'),
      'Allocated Company': companyName,
      'Unit / Plant': form.unit || 'N/A',
      'Department': form.department || 'N/A',
      'Sub-Department': form.sub_department || 'N/A',
      'Designation / Job Role': form.designation || 'N/A',
      'Work Location': form.location || 'N/A',
      'Date of Joining': form.date_of_joining || 'N/A',
      'Monthly Gross Salary': form.gross_salary !== null && form.gross_salary !== undefined ? form.gross_salary : 'N/A',
      'Bank Name': form.bank_name || 'N/A',
      'Branch Name': form.branch_name || 'N/A',
      'Bank Account Holder Name': form.bank_account_holder || 'N/A',
      'Bank Account Number': form.bank_account_number || 'N/A',
      'IFSC Code': form.ifsc_code || 'N/A',
      'UAN (Provident Fund)': form.uan || 'N/A',
      'ESIC Number': form.esic_number || 'N/A',
      'PT Number': form.pt_number || 'N/A',
      'Submission Status': form.submission_status || 'DRAFT',
      'Submission Date': form.submitted_at
        ? new Date(form.submitted_at).toLocaleString('en-IN')
        : form.created_at
          ? new Date(form.created_at).toLocaleString('en-IN')
          : 'N/A',
      'Total Uploaded Documents': formDocs.length,
      'Verified Documents': verifiedCount,
      'Pending Documents': pendingCount,
      'Rejected Documents': rejectedCount,
      'Photo Status': resolveSpecificDocStatus(formDocs, 'PHOTO'),
      'Signature Status': resolveSpecificDocStatus(formDocs, 'SIGNATURE'),
      'Aadhaar Front Status': resolveSpecificDocStatus(formDocs, 'AADHAAR', 'FRONT'),
      'Aadhaar Back Status': resolveSpecificDocStatus(formDocs, 'AADHAAR', 'BACK'),
      'PAN Card Status': resolveSpecificDocStatus(formDocs, 'PAN'),
      'Bank Passbook Status': resolveSpecificDocStatus(formDocs, 'BANK_PASSBOOK'),
      'Education Certificate Status': resolveSpecificDocStatus(formDocs, 'EDUCATION_CERTIFICATE'),
      'Admin Dossier Link': dossierUrl
    };
  });

  // 6. Assemble Dataset for Sheet 2: Uploaded Documents
  const uploadedDocumentsRows: Record<string, unknown>[] = [];
  forms.forEach((form) => {
    const formDocs = docsByFormId.get(form.id) || [];
    const dossierUrl = `${origin}/admin/joining/${form.id}`;

    formDocs.forEach((doc) => {
      uploadedDocumentsRows.push({
        'Joining Reference Number': form.joining_reference || 'PENDING',
        'Employee Code': form.employee_code || 'N/A',
        'Candidate Full Name': form.candidate_name || 'N/A',
        'Document Type': doc.document_type || 'N/A',
        'Side': doc.document_side || 'SINGLE',
        'Original File Name': doc.original_file_name || 'N/A',
        'MIME Type': doc.mime_type || 'N/A',
        'File Size (KB)': doc.file_size ? (doc.file_size / 1024).toFixed(1) : 'N/A',
        'Verification Status': doc.verification_status || 'UPLOADED',
        'Rejection Reason': doc.rejection_reason || '',
        'Uploaded At': doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-IN') : 'N/A',
        'Verified At': doc.verified_at ? new Date(doc.verified_at).toLocaleString('en-IN') : 'N/A',
        'Admin Dossier Link': dossierUrl
      });
    });
  });

  // 7. Assemble Dataset for Sheet 3: Education Records
  const educationRecordsRows: Record<string, unknown>[] = [];
  forms.forEach((form) => {
    const formEdu = eduByFormId.get(form.id) || [];
    formEdu.forEach((e) => {
      educationRecordsRows.push({
        'Joining Reference Number': form.joining_reference || 'PENDING',
        'Employee Code': form.employee_code || 'N/A',
        'Candidate Full Name': form.candidate_name || 'N/A',
        'Qualification': e.qualification || 'N/A',
        'Board / University': e.board_university || 'N/A',
        'Passing Year': e.year !== null && e.year !== undefined ? String(e.year) : 'N/A',
        'Percentage / Grade': e.percentage_or_grade || 'N/A'
      });
    });
  });

  // 8. Assemble Dataset for Sheet 4: Family Details
  const familyDetailsRows: Record<string, unknown>[] = [];
  forms.forEach((form) => {
    const formFam = famByFormId.get(form.id) || [];
    formFam.forEach((fam) => {
      familyDetailsRows.push({
        'Joining Reference Number': form.joining_reference || 'PENDING',
        'Employee Code': form.employee_code || 'N/A',
        'Candidate Full Name': form.candidate_name || 'N/A',
        'Member Name': fam.name || 'N/A',
        'Relationship': fam.relation || 'N/A',
        'Age / DOB': fam.age_or_date_of_birth || 'N/A'
      });
    });
  });

  // 9. Assemble Dataset for Sheet 5: Emergency Contacts
  const emergencyContactsRows: Record<string, unknown>[] = [];
  forms.forEach((form) => {
    const formEm = emByFormId.get(form.id) || [];
    formEm.forEach((em) => {
      emergencyContactsRows.push({
        'Joining Reference Number': form.joining_reference || 'PENDING',
        'Employee Code': form.employee_code || 'N/A',
        'Candidate Full Name': form.candidate_name || 'N/A',
        'Contact Name': em.name || 'N/A',
        'Relationship': em.relation || 'N/A',
        'Contact Number': em.contact_number || 'N/A',
        'Address': em.address || 'N/A'
      });
    });
  });

  // 10. Generate 5-Sheet Excel Workbook
  const workbook = XLSX.utils.book_new();

  const wsJoining = buildWorksheet(joiningSubmissionsRows, JOINING_SUBMISSIONS_COLUMNS);
  const wsDocs = buildWorksheet(uploadedDocumentsRows, UPLOADED_DOCUMENTS_COLUMNS);
  const wsEdu = buildWorksheet(educationRecordsRows, EDUCATION_RECORDS_COLUMNS);
  const wsFam = buildWorksheet(familyDetailsRows, FAMILY_DETAILS_COLUMNS);
  const wsEm = buildWorksheet(emergencyContactsRows, EMERGENCY_CONTACTS_COLUMNS);

  XLSX.utils.book_append_sheet(workbook, wsJoining, 'Joining Submissions');
  XLSX.utils.book_append_sheet(workbook, wsDocs, 'Uploaded Documents');
  XLSX.utils.book_append_sheet(workbook, wsEdu, 'Education Records');
  XLSX.utils.book_append_sheet(workbook, wsFam, 'Family Details');
  XLSX.utils.book_append_sheet(workbook, wsEm, 'Emergency Contacts');

  const filename = `ATG_Joining_Submissions_Export_${getExportDateStamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return {
    recordCount: forms.length,
    filename
  };
}
