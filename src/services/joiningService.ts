// ==============================================================================
// File: src/services/joiningService.ts
// Description: Candidate Joining Dossier Service Layer (Standalone & Application Compatible)
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { JoiningFormData, DocumentCategory, UploadedDocument, EducationRecord } from '../types/joining';
import type { Database } from '../types/database';
import { INITIAL_JOINING_FORM_DATA } from '../data/mockJoiningData';
import { validateAllSteps } from '../utils/joiningValidation';
import { normalizeIndianPhoneNumber, getIndianPhoneDisplayDigits } from '../utils/phoneUtils';
import { getJoiningFieldConfigMap } from './joiningConfigService';

/**
 * Sanitizes education records by removing empty or dummy placeholder rows.
 * Only returns records that have real user-entered content.
 */
export function sanitizeEducationRecords(
  records: JoiningFormData['education'] | undefined | null
): EducationRecord[] {
  if (!records || !Array.isArray(records)) return [];
  return records.filter((rec) => {
    if (!rec) return false;
    const q = (rec.qualification || '').trim();
    const b = (rec.boardOrUniversity || '').trim();
    const y = (rec.yearOfPassing || '').trim();
    const p = (rec.percentageOrGrade || '').trim();

    // Check if it's the legacy dummy template row with no user-entered details
    const isLegacyDummy =
      (q === '10th / SSC' || q === '12th / HSC') && !b && !y && !p;
    if (isLegacyDummy) return false;

    // Must have at least one field entered
    return Boolean(q || b || y || p);
  });
}

function canonicalizePersonalPhones(personal: any) {
  if (!personal) return personal;
  return {
    ...personal,
    employeeContactNumber: personal.employeeContactNumber
      ? (normalizeIndianPhoneNumber(personal.employeeContactNumber).isValid
          ? normalizeIndianPhoneNumber(personal.employeeContactNumber).normalized
          : String(personal.employeeContactNumber).trim())
      : personal.employeeContactNumber,
    otherContactNumber: personal.otherContactNumber
      ? (normalizeIndianPhoneNumber(personal.otherContactNumber).isValid
          ? normalizeIndianPhoneNumber(personal.otherContactNumber).normalized
          : String(personal.otherContactNumber).trim())
      : personal.otherContactNumber
  };
}

function canonicalizeEmergencyPhones(contacts: any[]) {
  if (!Array.isArray(contacts)) return contacts;
  return contacts.map((c) => ({
    ...c,
    contactNumber: c.contactNumber
      ? (normalizeIndianPhoneNumber(c.contactNumber).isValid
          ? normalizeIndianPhoneNumber(c.contactNumber).normalized
          : String(c.contactNumber).trim())
      : c.contactNumber
  }));
}

type ApplicationRow = Database['public']['Tables']['applications']['Row'];
type EmergencyContactRow = Database['public']['Tables']['emergency_contacts']['Row'];
type EducationRecordRow = Database['public']['Tables']['education_records']['Row'];
type FamilyDetailRow = Database['public']['Tables']['family_details']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DeclarationRow = Database['public']['Tables']['declarations']['Row'];
type JoiningFormRow = Database['public']['Tables']['joining_forms']['Row'];

export interface JoiningServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  accessDenied?: boolean;
  notFound?: boolean;
}

/**
 * Resolves the authenticated candidate's active session.
 */
export async function getCandidateSession(): Promise<{ authenticated: boolean; user?: any; email?: string; error?: string }> {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user || !user.email) {
      return { authenticated: false, error: authErr?.message || 'No active candidate session' };
    }
    return { authenticated: true, user, email: user.email.toLowerCase().trim() };
  } catch (err: any) {
    return { authenticated: false, error: err.message };
  }
}

/**
 * Backward compatibility: Resolves application if one exists for the email.
 * Does not block if no application exists.
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
    const sessionRes = await getCandidateSession();
    if (!sessionRes.authenticated || !sessionRes.email) {
      return { success: false, accessDenied: true, error: 'Candidate session not found or expired.' };
    }

    const candidateEmail = sessionRes.email;

    let query = supabase
      .from('applications')
      .select('*')
      .ilike('email', candidateEmail);

    if (appIdParam && appIdParam !== 'STANDALONE') {
      query = query.eq('id', appIdParam);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: appData, error: appErr } = await (query.maybeSingle() as any);

    if (appErr || !appData) {
      return {
        success: false,
        notFound: true,
        error: 'No application record found.'
      };
    }

    return { success: true, data: appData as ApplicationRow };
  } catch (err: any) {
    return { success: false, error: err.message || 'Application lookup error.' };
  }
}

/**
 * Retrieves or initializes the Joining Form dossier for the authenticated candidate.
 * Operates standalone based on the authenticated Supabase user session.
 */
export async function getJoiningForm(
  identifier?: string | null
): Promise<JoiningServiceResult<JoiningFormData>> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        ...INITIAL_JOINING_FORM_DATA,
        applicationId: identifier || 'demo-app-id',
        joiningReference: 'JOIN-2026-000001'
      }
    };
  }

  try {
    const sessionRes = await getCandidateSession();
    if (!sessionRes.authenticated || !sessionRes.user || !sessionRes.email) {
      return {
        success: true,
        data: INITIAL_JOINING_FORM_DATA
      };
    }

    const user = sessionRes.user;
    const candidateEmail = sessionRes.email;

    // 1. Fetch existing joining_forms record by user_id, email, or identifier
    let formRecord: any = null;

    if (identifier && identifier !== 'STANDALONE' && identifier !== 'PREVIEW-DEMO-APP') {
      const { data: byId } = await (supabase
        .from('joining_forms')
        .select('*')
        .or(`id.eq.${identifier},application_id.eq.${identifier},joining_reference.eq.${identifier}`)
        .maybeSingle() as any);

      if (byId) {
        formRecord = byId;
      }
    }

    if (!formRecord) {
      // Find candidate's own form
      const { data: byUser } = await (supabase
        .from('joining_forms')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${candidateEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (byUser) {
        formRecord = byUser;
      }
    }

    // 2. If no record exists, initialize a new standalone record
    if (!formRecord) {
      const { data: newForm, error: initErr } = await (supabase
        .from('joining_forms')
        .insert({
          user_id: user.id,
          email: candidateEmail,
          candidate_name: user.user_metadata?.full_name || '',
          submission_status: 'DRAFT'
        } as any)
        .select('*')
        .single() as any);

      if (initErr) {
        return { success: false, error: initErr.message };
      }
      formRecord = newForm;
    }

    const formId = formRecord.id;

    // 3. Fetch repeatable child records
    const [
      { data: emergencyData },
      { data: educationData },
      { data: familyData },
      { data: declarationsData }
    ] = await Promise.all([
      supabase.from('emergency_contacts').select('*').eq('joining_form_id', formId).order('sort_order'),
      supabase.from('education_records').select('*').eq('joining_form_id', formId).order('sort_order'),
      supabase.from('family_details').select('*').eq('joining_form_id', formId).order('sort_order'),
      supabase.from('declarations').select('*').eq('joining_form_id', formId).maybeSingle()
    ]);

    const emergencyRows = (emergencyData || []) as EmergencyContactRow[];
    const educationRows = (educationData || []) as EducationRecordRow[];
    const familyRows = (familyData || []) as FamilyDetailRow[];
    const declarationRow = declarationsData as DeclarationRow | null;

    // 4. Generate signed URLs for private photos and signatures if available
    let signedPhotoUrl: string | undefined = undefined;
    let signedSigUrl: string | undefined = undefined;

    if (formRecord.photo_path) {
      const { data: pUrl } = await supabase.storage
        .from('candidate-documents')
        .createSignedUrl(formRecord.photo_path, 3600);
      signedPhotoUrl = pUrl?.signedUrl;
    }

    if (formRecord.candidate_signature_path) {
      const { data: sUrl } = await supabase.storage
        .from('candidate-documents')
        .createSignedUrl(formRecord.candidate_signature_path, 3600);
      signedSigUrl = sUrl?.signedUrl;
    }

    // 5. Fetch associated document records
    const documentQuery = formRecord.application_id
      ? supabase.from('documents').select('*').eq('application_id', formRecord.application_id)
      : null;

    const { data: docsData } = documentQuery ? await (documentQuery as any) : { data: [] };
    const docRows = (docsData || []) as DocumentRow[];

    const normalizedDocs: Record<DocumentCategory, UploadedDocument> = {
      ...INITIAL_JOINING_FORM_DATA.documents
    };

    for (const doc of docRows) {
      const cat = doc.document_type as DocumentCategory;
      if (normalizedDocs[cat]) {
        let signedUrl: string | undefined = undefined;
        if (doc.storage_path) {
          const { data: sUrl } = await supabase.storage
            .from('candidate-documents')
            .createSignedUrl(doc.storage_path, 3600);
          signedUrl = sUrl?.signedUrl;
        }

        normalizedDocs[cat] = {
          ...normalizedDocs[cat],
          verificationStatus: doc.verification_status as any,
          rejectionReason: doc.rejection_reason || undefined,
          file: {
            name: doc.original_file_name || (doc as any).file_name || 'Document',
            size: doc.file_size || 0,
            type: doc.mime_type || 'application/octet-stream',
            dataUrl: signedUrl
          }
        };
      }
    }

    // Embed signed photo & signature into normalized documents
    if (signedPhotoUrl && normalizedDocs.PHOTO) {
      normalizedDocs.PHOTO.file = {
        name: 'Passport Photo',
        size: 0,
        type: 'image/jpeg',
        dataUrl: signedPhotoUrl
      };
    }

    if (signedSigUrl && normalizedDocs.SIGNATURE) {
      normalizedDocs.SIGNATURE.file = {
        name: 'Candidate Signature',
        size: 0,
        type: 'image/png',
        dataUrl: signedSigUrl
      };
    }

    const result = buildJoiningFormDataFromDb({
      formRecord,
      emergencyRows,
      educationRows,
      familyRows,
      declarationRow,
      docRows,
      signedPhotoUrl,
      signedSigUrl
    });

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load joining form.' };
  }
}

export interface BuildJoiningFormDataParams {
  formRecord?: any | null;
  applicationRecord?: ApplicationRow | null;
  emergencyRows?: EmergencyContactRow[];
  educationRows?: EducationRecordRow[];
  familyRows?: FamilyDetailRow[];
  declarationRow?: DeclarationRow | null;
  docRows?: DocumentRow[];
  signedPhotoUrl?: string | null;
  signedSigUrl?: string | null;
}

/**
 * Shared canonical adapter that transforms database rows into the unified JoiningFormData view model.
 * Single source of truth used across Candidate Review, Admin Review, and PDF Generation.
 */
export function buildJoiningFormDataFromDb(params: BuildJoiningFormDataParams): JoiningFormData {
  const {
    formRecord,
    applicationRecord,
    emergencyRows = [],
    educationRows = [],
    familyRows = [],
    declarationRow = null,
    docRows = [],
    signedPhotoUrl,
    signedSigUrl
  } = params;

  // Normalized documents map
  const normalizedDocs: Record<DocumentCategory, UploadedDocument> = {
    ...INITIAL_JOINING_FORM_DATA.documents
  };

  for (const doc of docRows) {
    const cat = doc.document_type as DocumentCategory;
    if (normalizedDocs[cat]) {
      normalizedDocs[cat] = {
        ...normalizedDocs[cat],
        verificationStatus: doc.verification_status as any,
        rejectionReason: doc.rejection_reason || undefined,
        file: {
          name: doc.original_file_name || (doc as any).file_name || 'Document',
          size: doc.file_size || 0,
          type: doc.mime_type || 'application/octet-stream',
          dataUrl: undefined
        }
      };
    }
  }

  // Embed signed photo & signature into normalized documents
  if (signedPhotoUrl && normalizedDocs.PHOTO) {
    normalizedDocs.PHOTO.file = {
      name: 'Passport Photo',
      size: 0,
      type: 'image/jpeg',
      dataUrl: signedPhotoUrl
    };
  }

  if (signedSigUrl && normalizedDocs.SIGNATURE) {
    normalizedDocs.SIGNATURE.file = {
      name: 'Candidate Signature',
      size: 0,
      type: 'image/png',
      dataUrl: signedSigUrl
    };
  }

  const resolvedStatus = (formRecord?.submission_status || 'DRAFT') as any;
  const candidateName = formRecord?.candidate_name || applicationRecord?.full_name || '';
  const candidateEmail = formRecord?.email || applicationRecord?.email || '';

  return {
    applicationId: formRecord?.application_id || applicationRecord?.id || undefined,
    formId: formRecord?.id || undefined,
    joiningReference: formRecord?.joining_reference || (applicationRecord ? `APP-${applicationRecord.application_number}` : 'JOIN-PENDING'),
    userEmail: candidateEmail,
    candidateAuthUserId: formRecord?.candidate_auth_user_id || formRecord?.user_id || undefined,
    fieldCorrections: formRecord?.field_corrections || {},
    currentStep: resolvedStatus === 'SUBMITTED' ? 8 : 1,
    status: resolvedStatus,
    submissionStatus: resolvedStatus,
    submittedAt: formRecord?.submitted_at || undefined,

    employment: {
      companyName: formRecord?.company_address
        ? 'Designated Employer Partner'
        : (applicationRecord?.desired_company || 'To Be Allocated by A Tiger Global'),
      unit: formRecord?.unit || 'Assigned Operations Unit',
      address: formRecord?.company_address || 'Nagpur Industrial Cluster, MH',
      employeeCode: formRecord?.employee_code || formRecord?.joining_reference || (applicationRecord ? applicationRecord.application_number : 'Assigned on Deployment'),
      designation: formRecord?.designation || applicationRecord?.designation || 'Staff / Trainee Associate',
      department: formRecord?.department || 'Operations',
      subDepartment: formRecord?.sub_department || 'General Operations',
      location: formRecord?.location || 'Nagpur, Maharashtra',
      dateOfJoining: formRecord?.date_of_joining || '',
      grossSalaryCTC: formRecord?.gross_salary ? `₹${formRecord.gross_salary.toLocaleString()} / Month` : 'As per Client Offer Letter',
      ownership: INITIAL_JOINING_FORM_DATA.employment.ownership
    },

    personal: {
      employeeName: candidateName,
      dateOfBirth: formRecord?.date_of_birth || '',
      gender: (formRecord?.gender as any) || '',
      fatherName: formRecord?.father_name || applicationRecord?.father_name || '',
      motherOrHusbandName: formRecord?.mother_or_husband_name || '',
      maritalStatus: (formRecord?.marital_status as any) || '',
      spouseName: formRecord?.spouse_name || '',
      bloodGroup: formRecord?.blood_group || '',
      aadhaarNumber: formRecord?.aadhaar_number || '',
      panNumber: formRecord?.pan_number || '',
      employeeContactNumber: formRecord?.employee_contact_number
        ? getIndianPhoneDisplayDigits(formRecord.employee_contact_number)
        : (applicationRecord?.mobile ? getIndianPhoneDisplayDigits(applicationRecord.mobile) : ''),
      otherContactNumber: formRecord?.other_contact_number ? getIndianPhoneDisplayDigits(formRecord.other_contact_number) : '',
      emailId: candidateEmail
    },

    permanentAddress: {
      address: formRecord?.permanent_address || applicationRecord?.address || '',
      city: formRecord?.permanent_city || '',
      district: formRecord?.permanent_district || '',
      state: formRecord?.permanent_state || 'Maharashtra',
      country: formRecord?.permanent_country || 'India',
      pinCode: formRecord?.permanent_pin_code || ''
    },

    currentAddress: {
      address: formRecord?.current_address || (formRecord?.same_as_permanent ? (formRecord?.permanent_address || applicationRecord?.address || '') : ''),
      city: formRecord?.current_city || (formRecord?.same_as_permanent ? (formRecord?.permanent_city || '') : ''),
      district: formRecord?.current_district || (formRecord?.same_as_permanent ? (formRecord?.permanent_district || '') : ''),
      state: formRecord?.current_state || (formRecord?.same_as_permanent ? (formRecord?.permanent_state || 'Maharashtra') : 'Maharashtra'),
      country: formRecord?.current_country || 'India',
      pinCode: formRecord?.current_pin_code || (formRecord?.same_as_permanent ? (formRecord?.permanent_pin_code || '') : '')
    },

    sameAsPermanentAddress: formRecord?.same_as_permanent ?? false,

    emergencyContacts: emergencyRows.length > 0
      ? emergencyRows.map((em) => ({
          id: em.id,
          name: em.name,
          contactNumber: em.contact_number ? getIndianPhoneDisplayDigits(em.contact_number) : '',
          relation: em.relation,
          address: em.address || ''
        }))
      : INITIAL_JOINING_FORM_DATA.emergencyContacts,

    bank: {
      accountHolderName: formRecord?.bank_account_holder || candidateName || '',
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
      ? sanitizeEducationRecords(
          educationRows.map((edu) => ({
            id: edu.id,
            qualification: edu.qualification,
            boardOrUniversity: edu.board_university || '',
            yearOfPassing: edu.year ? String(edu.year) : '',
            percentageOrGrade: edu.percentage_or_grade || ''
          }))
        )
      : [],

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
      selfDeclarationAcknowledged: Boolean((declarationRow as any)?.self_declaration_acknowledged ?? false),
      previousEmployerName: (declarationRow as any)?.previous_employer_name || '',
      previousEmployerLastWorkingDay: (declarationRow as any)?.previous_employer_last_day || '',
      relativeDeclarationAcknowledged: Boolean((declarationRow as any)?.relative_declaration_acknowledged ?? false),
      hasRelativeInOrganization: Boolean((declarationRow as any)?.has_relative_in_org ?? false),
      relativeName: (declarationRow as any)?.relative_name || '',
      relativeDepartment: (declarationRow as any)?.relative_dept || '',
      relativeRelationship: (declarationRow as any)?.relative_relation || '',
      womenNightShiftConsent: Boolean((declarationRow as any)?.women_night_shift_consent ?? false),
      womenNightShiftPlace: (declarationRow as any)?.women_night_shift_place || '',
      signatoryName: declarationRow?.signatory_name || candidateName,
      declarationDate: declarationRow?.declaration_date || (formRecord?.submitted_at ? new Date(formRecord.submitted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    },
    customFields: (formRecord as any)?.custom_fields || {}
  };
}

export interface AdminJoiningDossierResult {
  formData: JoiningFormData;
  raw: {
    joiningForm: JoiningFormRow | null;
    application: ApplicationRow | null;
    emergency: EmergencyContactRow[];
    education: EducationRecordRow[];
    family: FamilyDetailRow[];
    declarations: DeclarationRow | null;
    documents: DocumentRow[];
    signedPhotoUrl: string | null;
    signedSigUrl: string | null;
  };
}

/**
 * Admin helper to retrieve a candidate's complete joining dossier without candidate session dependency.
 * Supports both standalone Joining Forms and Linked Applications.
 */
export async function getAdminJoiningDossier(
  identifier: string
): Promise<JoiningServiceResult<AdminJoiningDossierResult>> {
  if (!identifier) {
    return { success: false, notFound: true, error: 'Identifier is required.' };
  }

  if (!isSupabaseConfigured) {
    const formData: JoiningFormData = {
      ...INITIAL_JOINING_FORM_DATA,
      applicationId: identifier,
      joiningReference: 'JOIN-DEMO-001',
      status: 'SUBMITTED',
      submissionStatus: 'SUBMITTED'
    };
    return {
      success: true,
      data: {
        formData,
        raw: {
          joiningForm: null,
          application: null,
          emergency: [],
          education: [],
          family: [],
          declarations: null,
          documents: [],
          signedPhotoUrl: null,
          signedSigUrl: null
        }
      }
    };
  }

  try {
    // 1. Try finding in joining_forms by id, application_id, or joining_reference
    let formRecord: any = null;
    const { data: formData } = await (supabase
      .from('joining_forms')
      .select('*')
      .or(`id.eq.${identifier},application_id.eq.${identifier},joining_reference.eq.${identifier}`)
      .maybeSingle() as any);

    if (formData) {
      formRecord = formData;
    }

    let applicationRecord: ApplicationRow | null = null;
    let emergencyRows: EmergencyContactRow[] = [];
    let educationRows: EducationRecordRow[] = [];
    let familyRows: FamilyDetailRow[] = [];
    let declarationRow: DeclarationRow | null = null;
    let docRows: DocumentRow[] = [];
    let signedPhotoUrl: string | null = null;
    let signedSigUrl: string | null = null;

    if (formRecord) {
      const formId = formRecord.id;
      const appId = formRecord.application_id;

      // Parallel queries for all child details
      const [appRes, emRes, eduRes, famRes, declRes, docRes] = await Promise.all([
        appId ? supabase.from('applications').select('*').eq('id', appId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('emergency_contacts').select('*').eq('joining_form_id', formId).order('sort_order', { ascending: true }),
        supabase.from('education_records').select('*').eq('joining_form_id', formId).order('sort_order', { ascending: true }),
        supabase.from('family_details').select('*').eq('joining_form_id', formId).order('sort_order', { ascending: true }),
        supabase.from('declarations').select('*').eq('joining_form_id', formId).maybeSingle(),
        appId
          ? supabase.from('documents').select('*').or(`application_id.eq.${appId},joining_form_id.eq.${formId}`)
          : supabase.from('documents').select('*').eq('joining_form_id', formId)
      ]);

      if (appRes.data) applicationRecord = appRes.data as ApplicationRow;
      if (emRes.data) emergencyRows = emRes.data as EmergencyContactRow[];
      if (eduRes.data) educationRows = eduRes.data as EducationRecordRow[];
      if (famRes.data) familyRows = famRes.data as FamilyDetailRow[];
      if (declRes.data) declarationRow = declRes.data as DeclarationRow;
      if (docRes.data) docRows = docRes.data as DocumentRow[];

      // Resolve Photo signed URL
      const photoPath = formRecord.photo_storage_path || formRecord.photo_path || docRows.find((d) => d.document_type === 'PHOTO')?.storage_path;
      if (photoPath) {
        const { data: pUrl } = await supabase.storage.from('candidate-documents').createSignedUrl(photoPath, 3600);
        if (pUrl?.signedUrl) signedPhotoUrl = pUrl.signedUrl;
      }

      // Resolve Signature signed URL
      const sigPath = formRecord.signature_storage_path || formRecord.candidate_signature_path || declarationRow?.candidate_signature_path || docRows.find((d) => d.document_type === 'SIGNATURE')?.storage_path;
      if (sigPath) {
        const { data: sUrl } = await supabase.storage.from('candidate-documents').createSignedUrl(sigPath, 3600);
        if (sUrl?.signedUrl) signedSigUrl = sUrl.signedUrl;
      }
    } else {
      // 2. Form record not found; check applications table
      const { data: appData } = await (supabase
        .from('applications')
        .select('*')
        .or(`id.eq.${identifier},application_number.eq.${identifier}`)
        .maybeSingle() as any);

      if (!appData) {
        return { success: false, notFound: true, error: 'No joining or application record found.' };
      }

      applicationRecord = appData as ApplicationRow;

      // Check documents for this application
      const { data: docs } = await supabase.from('documents').select('*').eq('application_id', applicationRecord.id);
      if (docs) docRows = docs as DocumentRow[];

      const photoPath = docRows.find((d) => d.document_type === 'PHOTO')?.storage_path;
      if (photoPath) {
        const { data: pUrl } = await supabase.storage.from('candidate-documents').createSignedUrl(photoPath, 3600);
        if (pUrl?.signedUrl) signedPhotoUrl = pUrl.signedUrl;
      }

      const sigPath = docRows.find((d) => d.document_type === 'SIGNATURE')?.storage_path;
      if (sigPath) {
        const { data: sUrl } = await supabase.storage.from('candidate-documents').createSignedUrl(sigPath, 3600);
        if (sUrl?.signedUrl) signedSigUrl = sUrl.signedUrl;
      }
    }

    const fullFormData = buildJoiningFormDataFromDb({
      formRecord,
      applicationRecord,
      emergencyRows,
      educationRows,
      familyRows,
      declarationRow,
      docRows,
      signedPhotoUrl,
      signedSigUrl
    });

    return {
      success: true,
      data: {
        formData: fullFormData,
        raw: {
          joiningForm: formRecord,
          application: applicationRecord,
          emergency: emergencyRows,
          education: educationRows,
          family: familyRows,
          declarations: declarationRow,
          documents: docRows,
          signedPhotoUrl,
          signedSigUrl
        }
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retrieve admin joining dossier.' };
  }
}

/**
 * Saves draft progress of the Joining Form via transactional RPC.
 */
export async function saveJoiningDraft(
  identifier: string | undefined,
  data: Partial<JoiningFormData>
): Promise<JoiningServiceResult> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const sessionRes = await getCandidateSession();
    if (!sessionRes.authenticated) {
      return { success: true };
    }

    const payload = {
      form_id: data.formId || identifier,
      application_id: data.applicationId || null,
      personal: canonicalizePersonalPhones(data.personal || {}),
      permanent_address: data.permanentAddress || {},
      current_address: data.currentAddress || {},
      same_as_permanent: data.sameAsPermanentAddress ?? false,
      bank: data.bank || {},
      emergency_contacts: canonicalizeEmergencyPhones(data.emergencyContacts || []),
      education: sanitizeEducationRecords(data.education || []),
      family: data.family || [],
      declarations: data.declarations || {},
      custom_fields: data.customFields || {},
      photo_path: data.documents?.PHOTO?.file?.dataUrl?.includes('storage/v1') ? undefined : undefined,
      candidate_signature_path: data.documents?.SIGNATURE?.file?.dataUrl?.includes('storage/v1') ? undefined : undefined
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

    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err.message || 'Draft saving failed.' };
  }
}

/**
 * Submits the completed Joining Form via transactional RPC.
 */
export async function submitJoiningForm(
  identifier: string | undefined,
  data: JoiningFormData
): Promise<JoiningServiceResult<{ submittedAt: string; joiningReference?: string; formId?: string }>> {
  // 1. Authoritative validation check against dynamic database field configuration
  const configMap = await getJoiningFieldConfigMap();
  const stepValidation = validateAllSteps(data, configMap);
  const hasErrors = Object.values(stepValidation).some((res) => !res.isValid);
  if (hasErrors) {
    return { success: false, error: 'Please resolve all required fields before submission.' };
  }

  const candidateEmail = (data.personal?.emailId || data.userEmail || '').trim().toLowerCase();
  if (!candidateEmail || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(candidateEmail)) {
    return { success: false, error: 'A valid candidate email address is required for confirmation delivery.' };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        submittedAt: new Date().toISOString(),
        joiningReference: 'JOIN-2026-000001'
      }
    };
  }

  try {
    const payload = {
      form_id: data.formId || identifier,
      application_id: data.applicationId || null,
      candidate_name: (data.personal?.employeeName || '').trim(),
      email: candidateEmail,
      personal: canonicalizePersonalPhones(data.personal || {}),
      permanent_address: data.permanentAddress || {},
      current_address: data.currentAddress || {},
      same_as_permanent: data.sameAsPermanentAddress ?? false,
      bank: data.bank || {},
      emergency_contacts: canonicalizeEmergencyPhones(data.emergencyContacts || []),
      education: sanitizeEducationRecords(data.education || []),
      family: data.family || [],
      declarations: data.declarations || {},
      documents: data.documents || {},
      custom_fields: data.customFields || {}
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_joining_form_bundle', {
      payload: payload as any
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    const res = rpcRes as {
      success?: boolean;
      error?: string;
      submitted_at?: string;
      joining_reference?: string;
      form_id?: string;
    };

    if (!res?.success) {
      return { success: false, error: res?.error || 'Submission failed.' };
    }

    const submittedAt = res.submitted_at || new Date().toISOString();
    const joiningReference = res.joining_reference || 'JOIN-REFERENCE';
    const formId = res.form_id;

    // Asynchronously dispatch confirmation receipt email via server endpoint
    try {
      fetch('/api/joining/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: data.personal?.employeeName || 'Candidate',
          candidateEmail,
          joiningReference,
          companyName: data.employment?.companyName,
          designation: data.employment?.designation,
          submittedAt
        })
      }).catch((emailErr) => console.warn('[JoiningReceiptEmail] Non-blocking dispatch notice:', emailErr));
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      data: {
        submittedAt,
        joiningReference,
        formId
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Form submission failed.' };
  }
}

/**
 * Uploads a candidate statutory document to private Supabase Storage.
 * Allows anonymous candidate uploads into 'candidates/' folder.
 */
export async function uploadCandidateDocument(
  identifier: string | undefined,
  category: DocumentCategory,
  file: File
): Promise<JoiningServiceResult<{ name: string; size: number; type: string; dataUrl: string; storagePath: string }>> {
  if (!file) {
    return { success: false, error: 'File is required.' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File size must not exceed 5MB.' };
  }

  // Generate instant local data URL for immediate client preview
  const dataUrl = URL.createObjectURL(file);

  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        storagePath: `mock/${category.toLowerCase()}`
      }
    };
  }

  try {
    const candidateOwner = identifier || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `candidates/${candidateOwner}/${category.toLowerCase()}_${Date.now()}_${cleanFileName}`;

    // Upload to Supabase private storage
    const { error: uploadErr } = await supabase.storage
      .from('candidate-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      console.warn('[uploadCandidateDocument] Storage warning, using local preview:', uploadErr.message);
      return {
        success: true,
        data: {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          storagePath
        }
      };
    }

    return {
      success: true,
      data: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        storagePath
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Document upload failed.' };
  }
}

/**
 * Removes a candidate statutory document from private storage.
 */
export async function removeCandidateDocument(
  identifier: string | undefined,
  category: DocumentCategory
): Promise<JoiningServiceResult> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const session = await getCandidateSession();
    const candidateOwner = session?.user?.id || identifier;

    if (category === 'PHOTO' && candidateOwner) {
      await (supabase
        .from('joining_forms')
        .update({ photo_storage_path: null } as any)
        .or(`id.eq.${candidateOwner},user_id.eq.${candidateOwner}`) as any);
    } else if (category === 'SIGNATURE' && candidateOwner) {
      await (supabase
        .from('joining_forms')
        .update({ signature_storage_path: null } as any)
        .or(`id.eq.${candidateOwner},user_id.eq.${candidateOwner}`) as any);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Document removal failed.' };
  }
}

/**
 * Registers a new candidate account using the server endpoint (Supabase Auth Admin)
 * and immediately authenticates the candidate session.
 */
export async function registerCandidateAccount(payload: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}): Promise<{ success: boolean; userId?: string; code?: string; error?: string }> {
  try {
    const res = await fetch('/api/candidate/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        code: data.code || 'REGISTRATION_FAILED',
        error: data.error || 'Failed to create candidate account.'
      };
    }

    // Automatically sign in candidate to establish client session
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: payload.email.trim().toLowerCase(),
      password: payload.password
    });

    if (signInErr) {
      return {
        success: true,
        userId: data.userId,
        error: 'Account created. Please log in with your credentials.'
      };
    }

    return {
      success: true,
      userId: data.userId
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err.message || 'Unable to connect to authentication server.'
    };
  }
}

/**
 * Retrieves all joining dossiers authorized for the current candidate session.
 */
export async function getCandidateJoiningDossiers(): Promise<JoiningServiceResult<any[]>> {
  if (!isSupabaseConfigured) {
    return { success: true, data: [] };
  }

  try {
    const sessionRes = await getCandidateSession();
    if (!sessionRes.authenticated) {
      return { success: false, accessDenied: true, error: 'Authentication required.' };
    }

    const { data, error } = await supabase.rpc('get_candidate_joining_dossiers');
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as any[]) || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch candidate dossiers.' };
  }
}

/**
 * Controlled document re-upload by candidate.
 * Strictly allowed only if document status is currently REJECTED.
 * Preserves old record (is_current = false) and creates new current document.
 */
export async function candidateReuploadDocument(
  docId: string,
  storagePath: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<{ success: boolean; newDocId?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, newDocId: 'mock_new_doc' };
  }

  try {
    const { data, error } = await supabase.rpc('candidate_reupload_document', {
      p_doc_id: docId,
      p_storage_path: storagePath,
      p_original_file_name: fileName,
      p_mime_type: mimeType,
      p_file_size: fileSize
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; new_document_id?: string; error?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Re-upload failed.' };
    }

    return { success: true, newDocId: res.new_document_id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit document replacement.' };
  }
}

/**
 * Candidate resubmission of corrected joining form for administrative review.
 */
export async function candidateResubmitJoiningForm(
  formId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('candidate_resubmit_joining_form', {
      p_form_id: formId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; error?: string };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Resubmission failed.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resubmit joining dossier.' };
  }
}

/**
 * Retrieves the full dossier details along with active and historical documents
 * for the authenticated candidate's workspace.
 */
export async function getCandidateDossierDetails(
  formId: string
): Promise<JoiningServiceResult<{ form: any; documents: any[] }>> {
  if (!isSupabaseConfigured) {
    return { success: true, data: { form: {}, documents: [] } };
  }

  try {
    const sessionRes = await getCandidateSession();
    if (!sessionRes.authenticated) {
      return { success: false, accessDenied: true, error: 'Authentication required.' };
    }

    // Query joining form (RLS enforces caller ownership)
    const { data: form, error: formErr } = await supabase
      .from('joining_forms')
      .select('*')
      .eq('id', formId)
      .maybeSingle();

    if (formErr || !form) {
      return { success: false, notFound: true, error: 'Joining dossier not found or access denied.' };
    }

    // Query all documents (both current and historical)
    const { data: docList, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('joining_form_id', formId)
      .order('uploaded_at', { ascending: false });

    if (docErr) {
      return { success: false, error: docErr.message };
    }

    return {
      success: true,
      data: {
        form,
        documents: docList || []
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load dossier details.' };
  }
}

