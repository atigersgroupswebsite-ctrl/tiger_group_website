// ==============================================================================
// File: src/services/joiningService.ts
// Description: Joining Form Data & Lifecycle Service Layer
// SECURITY:
//   - Enforces joining_access_enabled check
//   - Sensitive data (Aadhaar, PAN, Bank) is never logged
//   - Handles 1-to-1 joining form normalization and repeatable child records
//   - Distinguishes independent Aadhaar Front & Back records
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { JoiningFormData, DocumentCategory, UploadedDocument } from '../types/joining';
import type { Database } from '../types/database';
import { INITIAL_JOINING_FORM_DATA } from '../data/mockJoiningData';
import { validateAllSteps } from '../utils/joiningValidation';

type ApplicationRow = Database['public']['Tables']['applications']['Row'];
type JoiningFormRow = Database['public']['Tables']['joining_forms']['Row'];
type EmergencyContactRow = Database['public']['Tables']['emergency_contacts']['Row'];
type EducationRecordRow = Database['public']['Tables']['education_records']['Row'];
type FamilyDetailRow = Database['public']['Tables']['family_details']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DeclarationRow = Database['public']['Tables']['declarations']['Row'];

export interface JoiningServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  accessDenied?: boolean;
}

/**
 * Retrieves the normalized Joining Form dossier for an application.
 * Verifies that joining access has been formally authorized.
 */
export async function getJoiningForm(
  applicationId: string
): Promise<JoiningServiceResult<JoiningFormData>> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  if (!isSupabaseConfigured) {
    // In local demo mode, return the local initial state
    return {
      success: true,
      data: {
        ...INITIAL_JOINING_FORM_DATA,
        applicationId
      }
    };
  }

  try {
    // 1. Verify parent application existence and access grant
    const { data: applicationData, error: appError } = await (supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle() as any);

    const application = applicationData as ApplicationRow | null;

    if (appError || !application) {
      return { success: false, error: 'Application dossier not found.' };
    }

    if (!application.joining_access_enabled) {
      return {
        success: false,
        accessDenied: true,
        error: 'Joining packet access is not yet activated for this application. Please contact your recruitment coordinator.'
      };
    }

    // 2. Fetch joining_forms record
    const { data: formRecordData } = await (supabase
      .from('joining_forms')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle() as any);

    const formRecord = formRecordData as JoiningFormRow | null;

    // 3. Fetch repeatable child tables if form exists
    let emergencyRows: EmergencyContactRow[] = [];
    let educationRows: EducationRecordRow[] = [];
    let familyRows: FamilyDetailRow[] = [];
    let declarationRow: DeclarationRow | null = null;

    if (formRecord?.id) {
      const [emRes, eduRes, famRes, declRes] = await Promise.all([
        supabase.from('emergency_contacts').select('*').eq('joining_form_id', formRecord.id).order('sort_order', { ascending: true }),
        supabase.from('education_records').select('*').eq('joining_form_id', formRecord.id).order('sort_order', { ascending: true }),
        supabase.from('family_details').select('*').eq('joining_form_id', formRecord.id).order('sort_order', { ascending: true }),
        supabase.from('declarations').select('*').eq('joining_form_id', formRecord.id).maybeSingle()
      ]);

      emergencyRows = (emRes.data as any[]) || [];
      educationRows = (eduRes.data as any[]) || [];
      familyRows = (famRes.data as any[]) || [];
      declarationRow = (declRes.data as any) || null;
    }

    // 4. Fetch uploaded documents for application
    const { data: docRowsData } = await (supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId) as any);

    const docRows = docRowsData as DocumentRow[] | null;

    // Map database documents into frontend categories (with Front & Back distinction)
    const normalizedDocs: Record<DocumentCategory, UploadedDocument> = {
      ...INITIAL_JOINING_FORM_DATA.documents
    };

    if (docRows) {
      docRows.forEach((doc) => {
        let cat: DocumentCategory | null = null;

        if (doc.document_type === 'PHOTO') cat = 'PHOTO';
        else if (doc.document_type === 'SIGNATURE') cat = 'SIGNATURE';
        else if (doc.document_type === 'AADHAAR') {
          cat = doc.document_side === 'BACK' ? 'AADHAAR_BACK' : 'AADHAAR_FRONT';
        } else if (doc.document_type === 'PAN') cat = 'PAN';
        else if (doc.document_type === 'BANK_PASSBOOK') cat = 'BANK_PASSBOOK';
        else if (doc.document_type === 'EDUCATION_CERTIFICATE') cat = 'EDUCATION_CERTIFICATE';
        else if (doc.document_type === 'ADDRESS_PROOF') cat = 'ADDRESS_PROOF';
        else if (doc.document_type === 'EXPERIENCE_CERTIFICATE') cat = 'EXPERIENCE_CERTIFICATE';
        else if (doc.document_type === 'OTHER') cat = 'OTHER';

        if (cat && normalizedDocs[cat]) {
          normalizedDocs[cat] = {
            ...normalizedDocs[cat],
            file: doc.original_file_name
              ? {
                  name: doc.original_file_name,
                  size: doc.file_size || 0,
                  type: doc.mime_type || 'application/octet-stream',
                  dataUrl: doc.storage_path || undefined
                }
              : undefined
          };
        }
      });
    }

    // 5. Construct full normalized JoiningFormData
    const result: JoiningFormData = {
      applicationId: application.application_number || applicationId,
      currentStep: formRecord?.submission_status === 'SUBMITTED' ? 9 : 1,
      status: formRecord?.submission_status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      submissionStatus: formRecord?.submission_status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      submittedAt: formRecord?.submitted_at || undefined,

      employment: {
        companyName: formRecord?.company_address ? application.desired_company : INITIAL_JOINING_FORM_DATA.employment.companyName,
        unit: formRecord?.unit || INITIAL_JOINING_FORM_DATA.employment.unit,
        address: formRecord?.company_address || INITIAL_JOINING_FORM_DATA.employment.address,
        employeeCode: formRecord?.employee_code || INITIAL_JOINING_FORM_DATA.employment.employeeCode,
        designation: formRecord?.designation || application.designation || INITIAL_JOINING_FORM_DATA.employment.designation,
        department: formRecord?.department || INITIAL_JOINING_FORM_DATA.employment.department,
        subDepartment: formRecord?.sub_department || INITIAL_JOINING_FORM_DATA.employment.subDepartment,
        location: formRecord?.location || INITIAL_JOINING_FORM_DATA.employment.location,
        dateOfJoining: formRecord?.date_of_joining || INITIAL_JOINING_FORM_DATA.employment.dateOfJoining,
        grossSalaryCTC: formRecord?.gross_salary ? String(formRecord.gross_salary) : INITIAL_JOINING_FORM_DATA.employment.grossSalaryCTC,
        ownership: INITIAL_JOINING_FORM_DATA.employment.ownership
      },

      personal: {
        employeeName: application.full_name || '',
        dateOfBirth: formRecord?.date_of_birth || '',
        gender: (formRecord?.gender as any) || '',
        fatherName: application.father_name || '',
        motherOrHusbandName: formRecord?.mother_or_husband_name || '',
        maritalStatus: (formRecord?.marital_status as any) || '',
        spouseName: formRecord?.spouse_name || '',
        bloodGroup: formRecord?.blood_group || '',
        aadhaarNumber: formRecord?.aadhaar_number || '',
        panNumber: formRecord?.pan_number || '',
        employeeContactNumber: formRecord?.employee_contact_number || application.mobile || '',
        otherContactNumber: formRecord?.other_contact_number || '',
        emailId: formRecord?.email || application.email || ''
      },

      permanentAddress: {
        address: formRecord?.permanent_address || application.address || '',
        city: formRecord?.permanent_city || '',
        district: formRecord?.permanent_district || '',
        state: formRecord?.permanent_state || '',
        country: formRecord?.permanent_country || 'India',
        pinCode: formRecord?.permanent_pin_code || ''
      },

      currentAddress: {
        address: formRecord?.current_address || '',
        city: formRecord?.current_city || '',
        district: formRecord?.current_district || '',
        state: formRecord?.current_state || '',
        country: formRecord?.current_country || 'India',
        pinCode: formRecord?.current_pin_code || ''
      },

      sameAsPermanentAddress: formRecord?.same_as_permanent ?? false,

      emergencyContacts: emergencyRows.length > 0
        ? emergencyRows.map((em) => ({
            id: em.id,
            name: em.name,
            contactNumber: em.contact_number,
            relation: em.relation,
            address: em.address || ''
          }))
        : INITIAL_JOINING_FORM_DATA.emergencyContacts,

      bank: {
        accountHolderName: formRecord?.bank_account_holder || application.full_name || '',
        bankAccountNumber: formRecord?.bank_account_number || '',
        confirmBankAccountNumber: formRecord?.bank_account_number || '',
        ifscCode: formRecord?.ifsc_code || '',
        bankName: formRecord?.bank_name || '',
        branchName: formRecord?.branch_name || '',
        uanNumber: formRecord?.uan || '',
        esicNumber: formRecord?.esic_number || '',
        ptNumber: formRecord?.pt_number || ''
      },

      education: educationRows.length > 0
        ? educationRows.map((edu) => ({
            id: edu.id,
            qualification: edu.qualification,
            boardOrUniversity: edu.board_university || '',
            yearOfPassing: edu.year ? String(edu.year) : '',
            percentageOrGrade: edu.percentage_or_grade || ''
          }))
        : INITIAL_JOINING_FORM_DATA.education,

      family: familyRows.length > 0
        ? familyRows.map((fam) => ({
            id: fam.id,
            name: fam.name,
            dateOfBirthOrAge: fam.age_or_date_of_birth || '',
            relation: fam.relation
          }))
        : INITIAL_JOINING_FORM_DATA.family,

      documents: normalizedDocs,

      declarations: {
        candidateDeclarationAcknowledged: declarationRow?.candidate_acceptance ?? false,
        backgroundVerificationConsent: declarationRow?.background_check_consent ?? false,
        rulesAndConductAccepted: declarationRow?.code_of_conduct_acceptance ?? false,
        signatoryName: declarationRow?.signatory_name || application.full_name || '',
        declarationDate: declarationRow?.declaration_date || new Date().toISOString().split('T')[0]
      }
    };

    return { success: true, data: result };
  } catch (err: any) {
    console.error('[getJoiningForm] Error:', err);
    return { success: false, error: err.message || 'Failed to load joining form.' };
  }
}

/**
 * Saves draft progress of the Joining Form without submitting.
 */
export async function saveJoiningDraft(
  applicationId: string,
  data: Partial<JoiningFormData>
): Promise<JoiningServiceResult> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    // 1. Find or verify application
    const { data: appData, error: appErr } = await (supabase
      .from('applications')
      .select('id, joining_access_enabled')
      .eq('id', applicationId)
      .maybeSingle() as any);

    const application = appData as ApplicationRow | null;

    if (appErr || !application) {
      return { success: false, error: 'Application not found.' };
    }

    // 2. Upsert joining_forms table
    const { data: formRecordData, error: formErr } = await (supabase
      .from('joining_forms')
      .upsert(
        {
          application_id: application.id,
          date_of_birth: data.personal?.dateOfBirth || null,
          gender: data.personal?.gender || null,
          mother_or_husband_name: data.personal?.motherOrHusbandName || null,
          marital_status: data.personal?.maritalStatus || null,
          spouse_name: data.personal?.spouseName || null,
          blood_group: data.personal?.bloodGroup || null,
          aadhaar_number: data.personal?.aadhaarNumber || null,
          pan_number: data.personal?.panNumber || null,
          employee_contact_number: data.personal?.employeeContactNumber || null,
          other_contact_number: data.personal?.otherContactNumber || null,
          email: data.personal?.emailId || null,

          permanent_address: data.permanentAddress?.address || null,
          permanent_city: data.permanentAddress?.city || null,
          permanent_district: data.permanentAddress?.district || null,
          permanent_state: data.permanentAddress?.state || null,
          permanent_country: data.permanentAddress?.country || null,
          permanent_pin_code: data.permanentAddress?.pinCode || null,

          current_address: data.currentAddress?.address || null,
          current_city: data.currentAddress?.city || null,
          current_district: data.currentAddress?.district || null,
          current_state: data.currentAddress?.state || null,
          current_country: data.currentAddress?.country || null,
          current_pin_code: data.currentAddress?.pinCode || null,
          same_as_permanent: data.sameAsPermanentAddress ?? false,

          bank_account_holder: data.bank?.accountHolderName || null,
          bank_account_number: data.bank?.bankAccountNumber || null,
          ifsc_code: data.bank?.ifscCode || null,
          bank_name: data.bank?.bankName || null,
          branch_name: data.bank?.branchName || null,
          uan: data.bank?.uanNumber || null,
          esic_number: data.bank?.esicNumber || null,
          pt_number: data.bank?.ptNumber || null,

          submission_status: 'DRAFT'
        } as any,
        { onConflict: 'application_id' }
      )
      .select('id')
      .single() as any);

    if (formErr || !formRecordData) {
      return { success: false, error: formErr?.message || 'Failed to save form record.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveJoiningDraft] Error:', err);
    return { success: false, error: err.message || 'Draft saving failed.' };
  }
}

/**
 * Submits the completed Joining Form, locking the record.
 * Validates all mandatory sections and locks status to SUBMITTED.
 */
export async function submitJoiningForm(
  applicationId: string,
  data: JoiningFormData
): Promise<JoiningServiceResult<{ submittedAt: string }>> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  // Complete validation check
  const stepValidation = validateAllSteps(data);
  const hasErrors = Object.values(stepValidation).some((res) => !res.isValid);
  if (hasErrors) {
    return { success: false, error: 'Please resolve all required fields before submission.' };
  }

  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: { submittedAt: nowIso }
    };
  }

  try {
    // 1. Resolve application
    const { data: appData, error: appErr } = await (supabase
      .from('applications')
      .select('id, application_number')
      .eq('id', applicationId)
      .maybeSingle() as any);

    const application = appData as ApplicationRow | null;

    if (appErr || !application) {
      return { success: false, error: 'Application record not found.' };
    }

    // 2. Lock joining_forms record
    const { data: formRecordData, error: formErr } = await (supabase
      .from('joining_forms')
      .upsert(
        {
          application_id: application.id,
          date_of_birth: data.personal.dateOfBirth || null,
          gender: data.personal.gender || null,
          mother_or_husband_name: data.personal.motherOrHusbandName || null,
          marital_status: data.personal.maritalStatus || null,
          spouse_name: data.personal.spouseName || null,
          blood_group: data.personal.bloodGroup || null,
          aadhaar_number: data.personal.aadhaarNumber || null,
          pan_number: data.personal.panNumber || null,
          employee_contact_number: data.personal.employeeContactNumber || null,
          other_contact_number: data.personal.otherContactNumber || null,
          email: data.personal.emailId || null,

          permanent_address: data.permanentAddress.address || null,
          permanent_city: data.permanentAddress.city || null,
          permanent_district: data.permanentAddress.district || null,
          permanent_state: data.permanentAddress.state || null,
          permanent_country: data.permanentAddress.country || null,
          permanent_pin_code: data.permanentAddress.pinCode || null,

          current_address: data.currentAddress.address || null,
          current_city: data.currentAddress.city || null,
          current_district: data.currentAddress.district || null,
          current_state: data.currentAddress.state || null,
          current_country: data.currentAddress.country || null,
          current_pin_code: data.currentAddress.pinCode || null,
          same_as_permanent: data.sameAsPermanentAddress,

          bank_account_holder: data.bank.accountHolderName || null,
          bank_account_number: data.bank.bankAccountNumber || null,
          ifsc_code: data.bank.ifscCode || null,
          bank_name: data.bank.bankName || null,
          branch_name: data.bank.branchName || null,
          uan: data.bank.uanNumber || null,
          esic_number: data.bank.esicNumber || null,
          pt_number: data.bank.ptNumber || null,

          submission_status: 'SUBMITTED',
          submitted_at: nowIso
        } as any,
        { onConflict: 'application_id' }
      )
      .select('id')
      .single() as any);

    if (formErr || !formRecordData) {
      return { success: false, error: formErr?.message || 'Failed to submit joining record.' };
    }

    const formRecord = formRecordData as JoiningFormRow;

    // 3. Upsert declarations
    await (supabase.from('declarations').upsert(
      {
        joining_form_id: formRecord.id,
        candidate_acceptance: data.declarations.candidateDeclarationAcknowledged,
        background_check_consent: data.declarations.backgroundVerificationConsent,
        code_of_conduct_acceptance: data.declarations.rulesAndConductAccepted,
        signatory_name: data.declarations.signatoryName,
        declaration_date: data.declarations.declarationDate,
        accepted_at: nowIso
      } as any,
      { onConflict: 'joining_form_id' }
    ) as any);

    // 4. Update parent application status
    await ((supabase.from('applications') as any)
      .update({ status: 'JOINING_SUBMITTED' })
      .eq('id', application.id));

    // 5. Append activity log
    await ((supabase.from('activity_logs') as any).insert({
      application_id: application.id,
      action: 'JOINING_FORM_SUBMITTED',
      description: `Joining dossier formally submitted by candidate ${data.personal.employeeName}.`
    }));

    return {
      success: true,
      data: { submittedAt: nowIso }
    };
  } catch (err: any) {
    console.error('[submitJoiningForm] Error:', err);
    return { success: false, error: err.message || 'Joining submission failed.' };
  }
}
