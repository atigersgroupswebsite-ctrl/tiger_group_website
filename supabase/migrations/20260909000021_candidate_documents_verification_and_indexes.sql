-- ==============================================================================
-- Migration: 20260909000021_candidate_documents_verification_and_indexes.sql
-- Description: Robust Candidate Statutory Document Association, Admin Verification Queue,
--              and Performance Indexing
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Performance Indexes on public.documents
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documents_joining_type_side
  ON public.documents(joining_form_id, document_type, document_side);

CREATE INDEX IF NOT EXISTS idx_documents_verification_status
  ON public.documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at
  ON public.documents(uploaded_at DESC);

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_activity_logs_joining_form_id
  ON public.activity_logs(joining_form_id);

-- ------------------------------------------------------------------------------
-- 2. Enhanced submit_joining_form_bundle with Correct Document Association
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_joining_form_bundle(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  form_id UUID;
  now_iso TIMESTAMPTZ := now();
  ref_num TEXT;
  cand_name TEXT;
  target_app_id UUID := NULL;
  caller_email TEXT;
  v_email TEXT;
  v_cand_name TEXT;
  v_dob DATE;
  v_gender TEXT;
  v_father_name TEXT;
  v_mother_or_husband TEXT;
  v_marital_status TEXT;
  v_spouse_name TEXT;
  v_blood_group TEXT;
  v_aadhaar TEXT;
  v_pan TEXT;
  v_employee_contact TEXT;
  v_other_contact TEXT;
  v_perm_address TEXT;
  v_perm_city TEXT;
  v_perm_district TEXT;
  v_perm_state TEXT;
  v_perm_country TEXT;
  v_perm_pin TEXT;
  v_curr_address TEXT;
  v_curr_city TEXT;
  v_curr_district TEXT;
  v_curr_state TEXT;
  v_curr_country TEXT;
  v_curr_pin TEXT;
  v_same_as_perm BOOLEAN := false;
  v_bank_holder TEXT;
  v_bank_number TEXT;
  v_ifsc TEXT;
  v_bank_name TEXT;
  v_branch_name TEXT;
  v_uan TEXT;
  v_esic TEXT;
  v_pt TEXT;
  v_photo_path TEXT;
  v_signature_path TEXT;
  v_custom_fields JSONB;
  emergency_list JSONB;
  education_list JSONB;
  family_list JSONB;
  elem JSONB;
  idx INTEGER;
  doc_key TEXT;
  doc_val JSONB;
  doc_path TEXT;
  doc_name TEXT;
  doc_size BIGINT;
  doc_mime TEXT;
  v_doc_type TEXT;
  v_doc_side TEXT;
BEGIN
  -- 1. Validate candidate name
  v_cand_name := trim(COALESCE(
    payload -> 'personal' ->> 'employeeName',
    payload -> 'personal' ->> 'full_name',
    payload ->> 'candidate_name',
    ''
  ));
  IF v_cand_name = '' OR length(v_cand_name) < 2 THEN
    RAISE EXCEPTION 'Candidate full name is required (minimum 2 characters).';
  END IF;

  -- 2. Extract & validate candidate email
  v_email := lower(trim(COALESCE(
    payload -> 'personal' ->> 'emailId',
    payload -> 'personal' ->> 'email',
    payload ->> 'email',
    ''
  )));
  IF v_email = '' OR v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required for candidate confirmation and receipt delivery.';
  END IF;

  -- Optional application link if provided
  IF payload ? 'application_id' AND (payload ->> 'application_id') IS NOT NULL AND (payload ->> 'application_id') != '' THEN
    BEGIN
      target_app_id := (payload ->> 'application_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      target_app_id := NULL;
    END;
  END IF;

  -- 3. Extract personal details
  IF payload ? 'personal' AND jsonb_typeof(payload -> 'personal') = 'object' THEN
    v_dob := CASE 
      WHEN (payload -> 'personal' ->> 'dateOfBirth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'dateOfBirth')::DATE
      WHEN (payload -> 'personal' ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'date_of_birth')::DATE
      ELSE NULL 
    END;
    v_gender := COALESCE(payload -> 'personal' ->> 'gender', payload ->> 'gender');
    v_father_name := COALESCE(payload -> 'personal' ->> 'fatherName', payload -> 'personal' ->> 'father_name');
    v_mother_or_husband := COALESCE(payload -> 'personal' ->> 'motherOrHusbandName', payload -> 'personal' ->> 'mother_or_husband_name');
    v_marital_status := COALESCE(payload -> 'personal' ->> 'maritalStatus', payload -> 'personal' ->> 'marital_status');
    v_spouse_name := COALESCE(payload -> 'personal' ->> 'spouseName', payload -> 'personal' ->> 'spouse_name');
    v_blood_group := COALESCE(payload -> 'personal' ->> 'bloodGroup', payload -> 'personal' ->> 'blood_group');
    v_aadhaar := COALESCE(payload -> 'personal' ->> 'aadhaarNumber', payload -> 'personal' ->> 'aadhaar_number');
    v_pan := COALESCE(payload -> 'personal' ->> 'panNumber', payload -> 'personal' ->> 'pan_number');
    v_employee_contact := COALESCE(payload -> 'personal' ->> 'employeeContactNumber', payload -> 'personal' ->> 'employee_contact_number');
    v_other_contact := COALESCE(payload -> 'personal' ->> 'otherContactNumber', payload -> 'personal' ->> 'other_contact_number');
  ELSE
    v_dob := CASE 
      WHEN (payload ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload ->> 'date_of_birth')::DATE 
      ELSE NULL 
    END;
    v_gender := payload ->> 'gender';
    v_father_name := payload ->> 'father_name';
    v_mother_or_husband := payload ->> 'mother_or_husband_name';
    v_marital_status := payload ->> 'marital_status';
    v_spouse_name := payload ->> 'spouse_name';
    v_blood_group := payload ->> 'blood_group';
    v_aadhaar := payload ->> 'aadhaar_number';
    v_pan := payload ->> 'pan_number';
    v_employee_contact := payload ->> 'employee_contact_number';
    v_other_contact := payload ->> 'other_contact_number';
  END IF;

  -- 4. Extract address details
  IF payload ? 'permanent_address' AND jsonb_typeof(payload -> 'permanent_address') = 'object' THEN
    v_perm_address := payload -> 'permanent_address' ->> 'address';
    v_perm_city := payload -> 'permanent_address' ->> 'city';
    v_perm_district := payload -> 'permanent_address' ->> 'district';
    v_perm_state := payload -> 'permanent_address' ->> 'state';
    v_perm_country := COALESCE(payload -> 'permanent_address' ->> 'country', 'India');
    v_perm_pin := COALESCE(payload -> 'permanent_address' ->> 'pinCode', payload -> 'permanent_address' ->> 'pin_code');
  ELSE
    v_perm_address := payload ->> 'permanent_address';
    v_perm_city := payload ->> 'permanent_city';
    v_perm_district := payload ->> 'permanent_district';
    v_perm_state := payload ->> 'permanent_state';
    v_perm_country := COALESCE(payload ->> 'permanent_country', 'India');
    v_perm_pin := payload ->> 'permanent_pin_code';
  END IF;

  IF payload ? 'current_address' AND jsonb_typeof(payload -> 'current_address') = 'object' THEN
    v_curr_address := payload -> 'current_address' ->> 'address';
    v_curr_city := payload -> 'current_address' ->> 'city';
    v_curr_district := payload -> 'current_address' ->> 'district';
    v_curr_state := payload -> 'current_address' ->> 'state';
    v_curr_country := COALESCE(payload -> 'current_address' ->> 'country', 'India');
    v_curr_pin := COALESCE(payload -> 'current_address' ->> 'pinCode', payload -> 'current_address' ->> 'pin_code');
  ELSE
    v_curr_address := payload ->> 'current_address';
    v_curr_city := payload ->> 'current_city';
    v_curr_district := payload ->> 'current_district';
    v_curr_state := payload ->> 'current_state';
    v_curr_country := COALESCE(payload ->> 'current_country', 'India');
    v_curr_pin := payload ->> 'current_pin_code';
  END IF;

  IF payload ? 'same_as_permanent' THEN
    v_same_as_perm := COALESCE((payload ->> 'same_as_permanent')::BOOLEAN, false);
  END IF;

  -- 5. Extract bank details
  IF payload ? 'bank' AND jsonb_typeof(payload -> 'bank') = 'object' THEN
    v_bank_holder := COALESCE(payload -> 'bank' ->> 'accountHolderName', payload -> 'bank' ->> 'bank_account_holder');
    v_bank_number := COALESCE(payload -> 'bank' ->> 'bankAccountNumber', payload -> 'bank' ->> 'bank_account_number');
    v_ifsc := COALESCE(payload -> 'bank' ->> 'ifscCode', payload -> 'bank' ->> 'ifsc_code');
    v_bank_name := COALESCE(payload -> 'bank' ->> 'bankName', payload -> 'bank' ->> 'bank_name');
    v_branch_name := COALESCE(payload -> 'bank' ->> 'branchName', payload -> 'bank' ->> 'branch_name');
    v_uan := COALESCE(payload -> 'bank' ->> 'uanNumber', payload -> 'bank' ->> 'uan');
    v_esic := COALESCE(payload -> 'bank' ->> 'esicNumber', payload -> 'bank' ->> 'esic_number');
    v_pt := COALESCE(payload -> 'bank' ->> 'ptNumber', payload -> 'bank' ->> 'pt_number');
  END IF;

  -- 6. Extract photo & signature paths
  v_photo_path := COALESCE(
    payload -> 'documents' -> 'PHOTO' -> 'file' ->> 'storagePath',
    payload -> 'documents' -> 'PHOTO' ->> 'storagePath',
    payload ->> 'photo_path'
  );
  v_signature_path := COALESCE(
    payload -> 'documents' -> 'SIGNATURE' -> 'file' ->> 'storagePath',
    payload -> 'documents' -> 'SIGNATURE' ->> 'storagePath',
    payload -> 'declarations' ->> 'candidateSignaturePath',
    payload ->> 'candidate_signature_path'
  );

  v_custom_fields := COALESCE(payload -> 'custom_fields', payload -> 'customFields', '{}'::jsonb);

  -- 7. Generate unique Joining Reference
  ref_num := public.generate_joining_reference();

  -- 8. Insert new standalone Joining Form record
  INSERT INTO public.joining_forms (
    joining_reference,
    application_id,
    user_id,
    candidate_name,
    date_of_birth,
    gender,
    father_name,
    mother_or_husband_name,
    marital_status,
    spouse_name,
    blood_group,
    aadhaar_number,
    pan_number,
    employee_contact_number,
    other_contact_number,
    email,
    custom_fields,
    permanent_address,
    permanent_city,
    permanent_district,
    permanent_state,
    permanent_country,
    permanent_pin_code,
    current_address,
    current_city,
    current_district,
    current_state,
    current_country,
    current_pin_code,
    same_as_permanent,
    bank_account_holder,
    bank_account_number,
    ifsc_code,
    bank_name,
    branch_name,
    uan,
    esic_number,
    pt_number,
    photo_path,
    candidate_signature_path,
    submission_status,
    submitted_at,
    created_at,
    updated_at
  ) VALUES (
    ref_num,
    target_app_id,
    auth.uid(),
    v_cand_name,
    v_dob,
    v_gender,
    v_father_name,
    v_mother_or_husband,
    v_marital_status,
    v_spouse_name,
    v_blood_group,
    v_aadhaar,
    v_pan,
    v_employee_contact,
    v_other_contact,
    v_email,
    v_custom_fields,
    v_perm_address,
    v_perm_city,
    v_perm_district,
    v_perm_state,
    v_perm_country,
    v_perm_pin,
    v_curr_address,
    v_curr_city,
    v_curr_district,
    v_curr_state,
    v_curr_country,
    v_curr_pin,
    v_same_as_perm,
    v_bank_holder,
    v_bank_number,
    v_ifsc,
    v_bank_name,
    v_branch_name,
    v_uan,
    v_esic,
    v_pt,
    v_photo_path,
    v_signature_path,
    'SUBMITTED',
    now_iso,
    now_iso,
    now_iso
  ) RETURNING id INTO form_id;

  -- 9. Child Tables: Emergency Contacts
  IF payload ? 'emergency_contacts' THEN
    emergency_list := payload -> 'emergency_contacts';
  ELSIF payload ? 'emergencyContacts' THEN
    emergency_list := payload -> 'emergencyContacts';
  ELSE
    emergency_list := NULL;
  END IF;

  IF emergency_list IS NOT NULL AND jsonb_typeof(emergency_list) = 'array' THEN
    idx := 0;
    FOR elem IN SELECT * FROM jsonb_array_elements(emergency_list) LOOP
      IF trim(coalesce(elem ->> 'name', '')) != '' THEN
        INSERT INTO public.emergency_contacts (joining_form_id, name, contact_number, relation, address, sort_order)
        VALUES (
          form_id,
          elem ->> 'name',
          coalesce(elem ->> 'contactNumber', elem ->> 'contact_number', ''),
          coalesce(elem ->> 'relation', 'Emergency Contact'),
          coalesce(elem ->> 'address', ''),
          idx
        );
        idx := idx + 1;
      END IF;
    END LOOP;
  END IF;

  -- Education Records
  IF payload ? 'education' THEN
    education_list := payload -> 'education';
  ELSIF payload ? 'education_records' THEN
    education_list := payload -> 'education_records';
  ELSE
    education_list := NULL;
  END IF;

  IF education_list IS NOT NULL AND jsonb_typeof(education_list) = 'array' THEN
    idx := 0;
    FOR elem IN SELECT * FROM jsonb_array_elements(education_list) LOOP
      IF trim(coalesce(elem ->> 'qualification', '')) != '' THEN
        INSERT INTO public.education_records (joining_form_id, qualification, board_university, year, percentage_or_grade, sort_order)
        VALUES (
          form_id,
          elem ->> 'qualification',
          coalesce(elem ->> 'boardOrUniversity', elem ->> 'board_university', ''),
          CASE 
            WHEN (elem ->> 'yearOfPassing') ~ '^\d+$' THEN (elem ->> 'yearOfPassing')::INTEGER
            WHEN (elem ->> 'year') ~ '^\d+$' THEN (elem ->> 'year')::INTEGER
            ELSE NULL 
          END,
          coalesce(elem ->> 'percentageOrGrade', elem ->> 'percentage_or_grade', ''),
          idx
        );
        idx := idx + 1;
      END IF;
    END LOOP;
  END IF;

  -- Family Details
  IF payload ? 'family' THEN
    family_list := payload -> 'family';
  ELSIF payload ? 'family_details' THEN
    family_list := payload -> 'family_details';
  ELSE
    family_list := NULL;
  END IF;

  IF family_list IS NOT NULL AND jsonb_typeof(family_list) = 'array' THEN
    idx := 0;
    FOR elem IN SELECT * FROM jsonb_array_elements(family_list) LOOP
      IF trim(coalesce(elem ->> 'name', '')) != '' THEN
        INSERT INTO public.family_details (joining_form_id, name, age_or_date_of_birth, relation, sort_order)
        VALUES (
          form_id,
          elem ->> 'name',
          coalesce(elem ->> 'dateOfBirthOrAge', elem ->> 'age_or_date_of_birth', ''),
          coalesce(elem ->> 'relation', 'Dependent'),
          idx
        );
        idx := idx + 1;
      END IF;
    END LOOP;
  END IF;

  -- Declarations
  IF payload ? 'declarations' AND jsonb_typeof(payload -> 'declarations') = 'object' THEN
    INSERT INTO public.declarations (
      joining_form_id,
      candidate_acceptance,
      background_check_consent,
      code_of_conduct_acceptance,
      signatory_name,
      declaration_date,
      candidate_signature_path,
      accepted_at
    ) VALUES (
      form_id,
      COALESCE(
        (payload -> 'declarations' ->> 'candidateDeclarationAcknowledged')::BOOLEAN,
        (payload -> 'declarations' ->> 'candidate_acceptance')::BOOLEAN,
        true
      ),
      COALESCE(
        (payload -> 'declarations' ->> 'backgroundVerificationConsent')::BOOLEAN,
        (payload -> 'declarations' ->> 'background_check_consent')::BOOLEAN,
        true
      ),
      COALESCE(
        (payload -> 'declarations' ->> 'rulesAndConductAccepted')::BOOLEAN,
        (payload -> 'declarations' ->> 'code_of_conduct_acceptance')::BOOLEAN,
        true
      ),
      COALESCE(
        payload -> 'declarations' ->> 'signatoryName',
        payload -> 'declarations' ->> 'signatory_name',
        v_cand_name
      ),
      CASE 
        WHEN (payload -> 'declarations' ->> 'declarationDate') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'declarations' ->> 'declarationDate')::DATE
        WHEN (payload -> 'declarations' ->> 'declaration_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'declarations' ->> 'declaration_date')::DATE
        ELSE CURRENT_DATE 
      END,
      v_signature_path,
      now_iso
    );
  END IF;

  -- 10. Persist uploaded document references into public.documents
  IF payload ? 'documents' AND jsonb_typeof(payload -> 'documents') = 'object' THEN
    FOR doc_key, doc_val IN SELECT * FROM jsonb_each(payload -> 'documents') LOOP
      -- Extract doc_path
      doc_path := COALESCE(
        NULLIF(doc_val -> 'file' ->> 'storagePath', ''),
        NULLIF(doc_val ->> 'storagePath', ''),
        CASE 
          WHEN (doc_val -> 'file' ->> 'dataUrl') NOT LIKE 'data:%' 
           AND (doc_val -> 'file' ->> 'dataUrl') NOT LIKE 'blob:%' 
           AND (doc_val -> 'file' ->> 'dataUrl') NOT LIKE 'http%' 
          THEN NULLIF(doc_val -> 'file' ->> 'dataUrl', '')
          ELSE NULL
        END,
        CASE 
          WHEN (doc_val ->> 'dataUrl') NOT LIKE 'data:%' 
           AND (doc_val ->> 'dataUrl') NOT LIKE 'blob:%' 
           AND (doc_val ->> 'dataUrl') NOT LIKE 'http%' 
          THEN NULLIF(doc_val ->> 'dataUrl', '')
          ELSE NULL
        END
      );

      IF doc_key = 'PHOTO' AND doc_path IS NULL AND v_photo_path IS NOT NULL AND v_photo_path NOT LIKE 'data:%' AND v_photo_path NOT LIKE 'blob:%' THEN
        doc_path := v_photo_path;
      END IF;

      IF doc_key = 'SIGNATURE' AND doc_path IS NULL AND v_signature_path IS NOT NULL AND v_signature_path NOT LIKE 'data:%' AND v_signature_path NOT LIKE 'blob:%' THEN
        doc_path := v_signature_path;
      END IF;

      IF doc_path IS NOT NULL AND doc_path != '' THEN
        doc_name := COALESCE(doc_val -> 'file' ->> 'name', doc_val ->> 'name', doc_key || '.jpg');
        doc_mime := COALESCE(doc_val -> 'file' ->> 'type', doc_val ->> 'type', 'application/octet-stream');
        doc_size := CASE
          WHEN (doc_val -> 'file' ->> 'size') ~ '^\d+$' THEN (doc_val -> 'file' ->> 'size')::BIGINT
          WHEN (doc_val ->> 'size') ~ '^\d+$' THEN (doc_val ->> 'size')::BIGINT
          ELSE 0
        END;

        -- Map key to document_type and document_side (NO ENUM CASTS, standard TEXT matching CHECK constraint)
        IF doc_key = 'AADHAAR_FRONT' THEN
          v_doc_type := 'AADHAAR';
          v_doc_side := 'FRONT';
        ELSIF doc_key = 'AADHAAR_BACK' THEN
          v_doc_type := 'AADHAAR';
          v_doc_side := 'BACK';
        ELSIF doc_key IN ('PHOTO', 'SIGNATURE', 'PAN', 'BANK_PASSBOOK', 'EDUCATION_CERTIFICATE', 'ADDRESS_PROOF', 'EXPERIENCE_CERTIFICATE') THEN
          v_doc_type := doc_key;
          v_doc_side := COALESCE(doc_val ->> 'side', doc_val -> 'file' ->> 'side', 'SINGLE');
        ELSIF (doc_val ->> 'type') IN ('PHOTO', 'SIGNATURE', 'AADHAAR', 'PAN', 'BANK_PASSBOOK', 'EDUCATION_CERTIFICATE', 'ADDRESS_PROOF', 'EXPERIENCE_CERTIFICATE', 'OTHER') THEN
          v_doc_type := doc_val ->> 'type';
          v_doc_side := COALESCE(doc_val ->> 'side', doc_val -> 'file' ->> 'side', 'SINGLE');
        ELSE
          v_doc_type := 'OTHER';
          v_doc_side := 'SINGLE';
        END IF;

        -- Clean up existing record for same form_id, doc_type, and side before inserting to prevent duplicates
        DELETE FROM public.documents
        WHERE joining_form_id = form_id
          AND document_type = v_doc_type
          AND (document_side = v_doc_side OR (document_side IS NULL AND v_doc_side = 'SINGLE'));

        INSERT INTO public.documents (
          joining_form_id,
          application_id,
          document_type,
          document_side,
          storage_path,
          original_file_name,
          mime_type,
          file_size,
          verification_status,
          uploaded_at
        ) VALUES (
          form_id,
          target_app_id,
          v_doc_type,
          v_doc_side,
          doc_path,
          doc_name,
          doc_mime,
          doc_size,
          'UPLOADED',
          now_iso
        );
      END IF;
    END LOOP;
  END IF;

  -- 11. If linked to an application, update application status
  IF target_app_id IS NOT NULL THEN
    UPDATE public.applications
    SET status = 'JOINING_SUBMITTED'
    WHERE id = target_app_id;

    INSERT INTO public.activity_logs (
      application_id,
      joining_form_id,
      entity_type,
      entity_id,
      action,
      description,
      metadata
    ) VALUES (
      target_app_id,
      form_id,
      'JOINING_FORM',
      form_id::TEXT,
      'JOINING_FORM_SUBMITTED',
      'Candidate ' || v_cand_name || ' submitted public joining dossier ' || ref_num || '.',
      jsonb_build_object(
        'form_id', form_id,
        'joining_reference', ref_num,
        'email', v_email,
        'submitted_at', now_iso
      )
    );
  END IF;

  -- 12. Insert notification for administrators
  INSERT INTO public.notifications (
    type,
    title,
    message,
    joining_form_id,
    application_id,
    read
  ) VALUES (
    'JOINING_FORM_SUBMITTED',
    'Joining Form Submitted',
    v_cand_name || ' submitted onboarding joining dossier (' || ref_num || ').',
    form_id,
    target_app_id,
    false
  );

  -- 13. Audit log
  INSERT INTO public.activity_logs (
    joining_form_id,
    application_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    form_id,
    target_app_id,
    'JOINING_FORM',
    form_id::TEXT,
    'JOINING_FORM_SUBMITTED',
    'Candidate ' || v_cand_name || ' submitted public joining dossier ' || ref_num || '.',
    jsonb_build_object(
      'form_id', form_id,
      'joining_reference', ref_num,
      'email', v_email,
      'submitted_at', now_iso
    )
  );

  -- 14. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'joining_reference', ref_num,
    'submission_status', 'SUBMITTED',
    'submitted_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_joining_form_bundle(JSONB) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Update admin_verify_document & admin_reject_document for Standalone Joining Forms
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_verify_document(p_doc_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  target_doc RECORD;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
  END IF;

  SELECT role INTO caller_role
  FROM public.admin_profiles
  WHERE id = caller_id AND active = true;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
  END IF;

  IF caller_role = 'ACCOUNTANT' THEN
    RAISE EXCEPTION 'Forbidden: Role % is not authorized to verify documents.', caller_role;
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  -- Update document status
  UPDATE public.documents
  SET
    verification_status = 'VERIFIED',
    verified_at = now_iso,
    verified_by = caller_id,
    rejection_reason = NULL
  WHERE id = p_doc_id;

  doc_label := target_doc.document_type || 
    CASE WHEN target_doc.document_side IS NOT NULL AND target_doc.document_side != 'SINGLE' THEN ' (' || target_doc.document_side || ')' ELSE '' END;

  -- Log action in activity_logs (supports both application_id and standalone joining_form_id)
  INSERT INTO public.activity_logs (
    application_id,
    joining_form_id,
    entity_type,
    entity_id,
    admin_user_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.application_id,
    target_doc.joining_form_id,
    'DOCUMENT',
    p_doc_id::TEXT,
    caller_id,
    'DOCUMENT_VERIFIED',
    'Administrator verified document: ' || doc_label || '.',
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'joining_form_id', target_doc.joining_form_id,
      'application_id', target_doc.application_id,
      'verified_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_doc_id,
    'verification_status', 'VERIFIED',
    'verified_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_verify_document(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_document(p_doc_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  target_doc RECORD;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
  trimmed_reason TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
  END IF;

  SELECT role INTO caller_role
  FROM public.admin_profiles
  WHERE id = caller_id AND active = true;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
  END IF;

  IF caller_role = 'ACCOUNTANT' THEN
    RAISE EXCEPTION 'Forbidden: Role % is not authorized to reject documents.', caller_role;
  END IF;

  trimmed_reason := trim(coalesce(p_reason, ''));
  IF trimmed_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is mandatory to reject candidate document.';
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  -- Update document status
  UPDATE public.documents
  SET
    verification_status = 'REJECTED',
    verified_at = NULL,
    verified_by = caller_id,
    rejection_reason = trimmed_reason
  WHERE id = p_doc_id;

  doc_label := target_doc.document_type || 
    CASE WHEN target_doc.document_side IS NOT NULL AND target_doc.document_side != 'SINGLE' THEN ' (' || target_doc.document_side || ')' ELSE '' END;

  -- Log action in activity_logs (supports both application_id and standalone joining_form_id)
  INSERT INTO public.activity_logs (
    application_id,
    joining_form_id,
    entity_type,
    entity_id,
    admin_user_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.application_id,
    target_doc.joining_form_id,
    'DOCUMENT',
    p_doc_id::TEXT,
    caller_id,
    'DOCUMENT_REJECTED',
    'Administrator rejected document: ' || doc_label || '. Reason: ' || trimmed_reason,
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'joining_form_id', target_doc.joining_form_id,
      'application_id', target_doc.application_id,
      'rejection_reason', trimmed_reason,
      'rejected_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_doc_id,
    'verification_status', 'REJECTED',
    'rejection_reason', trimmed_reason,
    'rejected_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reject_document(UUID, TEXT) TO authenticated;
