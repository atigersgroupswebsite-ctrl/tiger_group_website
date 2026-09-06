// ==============================================================================
// File: src/services/joiningService.ts
// Description: Candidate Joining Dossier Service Layer
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security:
//   - Gated by Supabase passwordless auth and applications.joining_access_enabled
//   - Sensitive PII (Aadhaar, PAN, Bank) is never logged
//   - Admin-controlled fields are immutable to candidates
//   - Atomic transactional persistence via save_joining_draft_bundle and submit_joining_form_bundle
//   - Private Supabase Storage with signed preview URLs
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
  notFound?: boolean;
}

/**
 * Resolves the authorized application for the currently authenticated candidate.
 * Strictly verifies auth.jwt email matches application.email AND joining_access_enabled = true.
 */
export async function getAuthorizedApplication(
  appIdParam?: string | null
): Promise<JoiningServiceResult<ApplicationRow>> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        id: appIdParam || 'demo-app-id',
        application_number: 'ATG-DEMO-001',
        full_name: 'Demo Candidate',
        email: 'candidate@demo.com',
        mobile: '9876543210',
        joining_access_enabled: true
      } as ApplicationRow
    };
  }

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user || !user.email) {
      return { success: false, accessDenied: true, error: 'Candidate session not found or expired.' };
    }

    const candidateEmail = user.email.toLowerCase().trim();

    let query = supabase
      .from('applications')
      .select('*')
      .ilike('email', candidateEmail)
      .eq('joining_access_enabled', true);

    if (appIdParam) {
      query = query.eq('id', appIdParam);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: appData, error: appErr } = await (query.maybeSingle() as any);

    if (appErr || !appData) {
      return {
        success: false,
        accessDenied: true,
        error: 'No active application with joining access enabled was found for your account.'
      };
    }

    const app = appData as ApplicationRow;
    if (app.email.toLowerCase().trim() !== candidateEmail || !app.joining_access_enabled) {
      return {
        success: false,
        accessDenied: true,
        error: 'Security authorization check failed for this application.'
      };
    }

    return { success: true, data: app };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authorization check failed.' };
  }
}

/**
 * Retrieves the normalized Joining Form dossier for an authorized application.
 * Generates temporary signed URLs for private candidate documents.
 */
export async function getJoiningForm(
  applicationId: string
): Promise<JoiningServiceResult<JoiningFormData>> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  if (!isSupabaseConfigured) {
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
    const authRes = await getAuthorizedApplication(applicationId);
    if (!authRes.success || !authRes.data) {
      return {
        success: false,
        accessDenied: authRes.accessDenied,
        error: authRes.error || 'Unauthorized application access.'
      };
    }
    const application = authRes.data;

    // 2. Fetch joining_forms record
    const { data: formRecordData, error: formErr } = await (supabase
      .from('joining_forms')
      .select('*')
      .eq('application_id', application.id)
      .maybeSingle() as any);

    if (formErr) {
      return { success: false, error: formErr.message };
    }

    let formRecord = formRecordData as JoiningFormRow | null;

    // If no joining_forms row exists yet, initialize a clean draft safely
    if (!formRecord) {
      const { data: newForm, error: initErr } = await (supabase
        .from('joining_forms')
        .insert({
          application_id: application.id,
          submission_status: 'DRAFT',
          email: application.email,
          employee_contact_number: application.mobile,
          permanent_address: application.address
        } as any)
        .select('*')
        .single() as any);

      if (initErr) {
        // In case another concurrent call inserted it, fetch again
        const { data: refetched } = await (supabase
          .from('joining_forms')
          .select('*')
          .eq('application_id', application.id)
          .maybeSingle() as any);
        formRecord = refetched as JoiningFormRow | null;
      } else {
        formRecord = newForm as JoiningFormRow;
      }
    }

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
      .eq('application_id', application.id) as any);

    const docRows = (docRowsData as DocumentRow[]) || [];

    // Map database documents into frontend categories with signed URLs
    const normalizedDocs: Record<DocumentCategory, UploadedDocument> = {
      ...INITIAL_JOINING_FORM_DATA.documents
    };

    await Promise.all(
      docRows.map(async (doc) => {
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
          let signedUrl: string | undefined = undefined;
          if (doc.storage_path) {
            const { data: urlData } = await supabase.storage
              .from('candidate-documents')
              .createSignedUrl(doc.storage_path, 3600);
            signedUrl = urlData?.signedUrl;
          }

          normalizedDocs[cat] = {
            ...normalizedDocs[cat],
            verificationStatus: doc.verification_status,
            rejectionReason: doc.rejection_reason || undefined,
            file: {
              name: doc.original_file_name || (doc as any).file_name || 'Document',
              size: doc.file_size || 0,
              type: doc.mime_type || 'application/pdf',
              dataUrl: signedUrl
            }
          };
        }
      })
    );

    const isSubmitted = formRecord?.submission_status === 'SUBMITTED';

    // 5. Construct full normalized JoiningFormData
    const result: JoiningFormData = {
      applicationId: application.application_number || application.id,
      currentStep: isSubmitted ? 9 : 1,
      status: isSubmitted ? 'SUBMITTED' : 'DRAFT',
      submissionStatus: isSubmitted ? 'SUBMITTED' : 'DRAFT',
      submittedAt: formRecord?.submitted_at || undefined,

      // Admin-controlled fields (Read-Only to candidate)
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
    return { success: false, error: err.message || 'Failed to load joining form.' };
  }
}

/**
 * Saves draft progress of the Joining Form via transactional RPC.
 * Persists joining_forms, education, family, emergency contacts, and declarations.
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
    const authRes = await getAuthorizedApplication(applicationId);
    if (!authRes.success || !authRes.data) {
      return { success: false, accessDenied: true, error: authRes.error || 'Unauthorized.' };
    }
    const realAppId = authRes.data.id;

    const payload = {
      application_id: realAppId,
      personal: data.personal || {},
      permanent_address: data.permanentAddress || {},
      current_address: data.currentAddress || {},
      same_as_permanent: data.sameAsPermanentAddress ?? false,
      bank: data.bank || {},
      emergency_contacts: data.emergencyContacts || [],
      education: data.education || [],
      family: data.family || [],
      declarations: data.declarations || {}
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('save_joining_draft_bundle', {
      payload: payload as any
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    const res = rpcRes as { success?: boolean; error?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Failed to save draft.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Draft saving failed.' };
  }
}

/**
 * Submits the completed Joining Form via transactional RPC.
 * Locks status to SUBMITTED and creates admin notification.
 */
export async function submitJoiningForm(
  applicationId: string,
  data: JoiningFormData
): Promise<JoiningServiceResult<{ submittedAt: string }>> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  // 1. Step-by-step client validation check
  const stepValidation = validateAllSteps(data);
  const hasErrors = Object.values(stepValidation).some((res) => !res.isValid);
  if (hasErrors) {
    return { success: false, error: 'Please resolve all required fields before submission.' };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: { submittedAt: new Date().toISOString() }
    };
  }

  try {
    const authRes = await getAuthorizedApplication(applicationId);
    if (!authRes.success || !authRes.data) {
      return { success: false, accessDenied: true, error: authRes.error || 'Unauthorized.' };
    }
    const realAppId = authRes.data.id;

    const payload = {
      application_id: realAppId,
      personal: data.personal,
      permanent_address: data.permanentAddress,
      current_address: data.currentAddress,
      same_as_permanent: data.sameAsPermanentAddress,
      bank: data.bank,
      emergency_contacts: data.emergencyContacts,
      education: data.education,
      family: data.family,
      declarations: data.declarations
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_joining_form_bundle', {
      payload: payload as any
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    const res = rpcRes as { success?: boolean; error?: string; submitted_at?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Failed to submit joining dossier.' };
    }

    return {
      success: true,
      data: { submittedAt: res.submitted_at || new Date().toISOString() }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Joining submission failed.' };
  }
}

/**
 * Uploads a candidate statutory document to private Supabase Storage and records it in public.documents.
 * Aadhaar Front and Back are stored as separate records and files.
 */
export async function uploadCandidateDocument(
  applicationId: string,
  category: DocumentCategory,
  file: File
): Promise<JoiningServiceResult<{ name: string; size: number; type: string; dataUrl: string; storagePath: string }>> {
  if (!applicationId || !file) {
    return { success: false, error: 'Application and file are required.' };
  }

  // Max 5MB check
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File size must not exceed 5MB.' };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: URL.createObjectURL(file),
        storagePath: 'mock/path'
      }
    };
  }

  try {
    const authRes = await getAuthorizedApplication(applicationId);
    if (!authRes.success || !authRes.data) {
      return { success: false, accessDenied: true, error: authRes.error || 'Unauthorized.' };
    }
    const realAppId = authRes.data.id;

    // Map category to document_type and document_side
    let docType = 'OTHER';
    let docSide: 'FRONT' | 'BACK' | null = null;

    if (category === 'PHOTO') docType = 'PHOTO';
    else if (category === 'SIGNATURE') docType = 'SIGNATURE';
    else if (category === 'AADHAAR_FRONT') {
      docType = 'AADHAAR';
      docSide = 'FRONT';
    } else if (category === 'AADHAAR_BACK') {
      docType = 'AADHAAR';
      docSide = 'BACK';
    } else if (category === 'PAN') docType = 'PAN';
    else if (category === 'BANK_PASSBOOK') docType = 'BANK_PASSBOOK';
    else if (category === 'EDUCATION_CERTIFICATE') docType = 'EDUCATION_CERTIFICATE';
    else if (category === 'ADDRESS_PROOF') docType = 'ADDRESS_PROOF';
    else if (category === 'EXPERIENCE_CERTIFICATE') docType = 'EXPERIENCE_CERTIFICATE';
    else if (category === 'OTHER') docType = 'OTHER';

    // File path: ${applicationId}/${category}_${timestamp}.${ext}
    const fileExt = file.name.split('.').pop() || 'bin';
    const cleanFileName = `${category.toLowerCase()}_${Date.now()}.${fileExt}`;
    const storagePath = `${realAppId}/${cleanFileName}`;

    // 1. Upload to private Supabase bucket: candidate-documents
    const { error: uploadErr } = await supabase.storage
      .from('candidate-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      return { success: false, error: `Upload failed: ${uploadErr.message}` };
    }

    // 2. Check if a document record already exists for this type/side
    let query = supabase
      .from('documents')
      .select('id, storage_path')
      .eq('application_id', realAppId)
      .eq('document_type', docType as any);

    if (docSide) {
      query = query.eq('document_side', docSide as any);
    }

    const { data: existingDoc } = await (query.maybeSingle() as any);

    // 3. Upsert into public.documents
    if (existingDoc?.id) {
      // Old file cleanup if storagePath changed
      if (existingDoc.storage_path && existingDoc.storage_path !== storagePath) {
        await supabase.storage.from('candidate-documents').remove([existingDoc.storage_path]);
      }

      await (supabase
        .from('documents')
        .update({
          file_name: cleanFileName,
          original_file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          verification_status: 'PENDING'
        } as any)
        .eq('id', existingDoc.id) as any);
    } else {
      await (supabase
        .from('documents')
        .insert({
          application_id: realAppId,
          document_type: docType as any,
          document_side: docSide as any,
          file_name: cleanFileName,
          original_file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          verification_status: 'PENDING'
        } as any) as any);
    }

    // 4. Generate signed URL for preview
    const { data: signedData, error: signErr } = await supabase.storage
      .from('candidate-documents')
      .createSignedUrl(storagePath, 3600);

    if (signErr || !signedData?.signedUrl) {
      return { success: false, error: 'Could not generate document preview.' };
    }

    return {
      success: true,
      data: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: signedData.signedUrl,
        storagePath
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Document upload failed.' };
  }
}

/**
 * Removes a candidate statutory document from storage and database.
 */
export async function removeCandidateDocument(
  applicationId: string,
  category: DocumentCategory
): Promise<JoiningServiceResult> {
  if (!applicationId) {
    return { success: false, error: 'Application ID is required.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const authRes = await getAuthorizedApplication(applicationId);
    if (!authRes.success || !authRes.data) {
      return { success: false, accessDenied: true, error: authRes.error || 'Unauthorized.' };
    }
    const realAppId = authRes.data.id;

    let docType = 'OTHER';
    let docSide: 'FRONT' | 'BACK' | null = null;

    if (category === 'PHOTO') docType = 'PHOTO';
    else if (category === 'SIGNATURE') docType = 'SIGNATURE';
    else if (category === 'AADHAAR_FRONT') {
      docType = 'AADHAAR';
      docSide = 'FRONT';
    } else if (category === 'AADHAAR_BACK') {
      docType = 'AADHAAR';
      docSide = 'BACK';
    } else if (category === 'PAN') docType = 'PAN';
    else if (category === 'BANK_PASSBOOK') docType = 'BANK_PASSBOOK';
    else if (category === 'EDUCATION_CERTIFICATE') docType = 'EDUCATION_CERTIFICATE';
    else if (category === 'ADDRESS_PROOF') docType = 'ADDRESS_PROOF';
    else if (category === 'EXPERIENCE_CERTIFICATE') docType = 'EXPERIENCE_CERTIFICATE';
    else if (category === 'OTHER') docType = 'OTHER';

    let query = supabase
      .from('documents')
      .select('id, storage_path')
      .eq('application_id', realAppId)
      .eq('document_type', docType as any);

    if (docSide) {
      query = query.eq('document_side', docSide as any);
    }

    const { data: existingDoc } = await (query.maybeSingle() as any);

    if (existingDoc) {
      if (existingDoc.storage_path) {
        await supabase.storage.from('candidate-documents').remove([existingDoc.storage_path]);
      }
      await (supabase.from('documents').delete().eq('id', existingDoc.id) as any);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Document removal failed.' };
  }
}

