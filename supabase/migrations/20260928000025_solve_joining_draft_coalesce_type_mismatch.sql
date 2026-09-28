-- Migration: 20260928000025_solve_joining_draft_coalesce_type_mismatch.sql
-- Description: Solve COALESCE type mismatch (text vs jsonb) in save_joining_draft_bundle
--              and ensure atomic persistence of candidate designation & department.

-- 1. Correct public.save_joining_draft_bundle
CREATE OR REPLACE FUNCTION public.save_joining_draft_bundle(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  caller_uid UUID;
  caller_email TEXT;
  target_app_id UUID;
  form_id UUID;
  existing_form RECORD;
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
  v_email TEXT;
  v_designation TEXT;
  v_department TEXT;
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
  v_same_as_perm BOOLEAN;
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
BEGIN
  -- 1. Identify caller authentication context
  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User authentication required';
  END IF;
  caller_email := auth.jwt() ->> 'email';

  -- 2. Identify candidate target application or form ID
  IF payload ? 'form_id' AND payload ->> 'form_id' IS NOT NULL AND trim(payload ->> 'form_id') != '' THEN
    form_id := (payload ->> 'form_id')::UUID;
  END IF;

  IF payload ? 'application_id' AND payload ->> 'application_id' IS NOT NULL AND trim(payload ->> 'application_id') != '' THEN
    target_app_id := (payload ->> 'application_id')::UUID;
  END IF;

  -- 3. Resolve existing joining form or verify ownership
  IF form_id IS NOT NULL THEN
    SELECT * INTO existing_form FROM public.joining_forms WHERE id = form_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Joining form not found: %', form_id;
    END IF;
    -- Ownership check: if user_id is assigned, must match or be admin
    IF existing_form.user_id IS NOT NULL AND existing_form.user_id != caller_uid AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Forbidden: You do not have access to this joining form';
    END IF;
    IF existing_form.submission_status = 'SUBMITTED' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Cannot edit: Joining form is already SUBMITTED and locked';
    END IF;
  ELSE
    -- Try resolving existing draft by user_id
    SELECT * INTO existing_form FROM public.joining_forms
    WHERE user_id = caller_uid
    ORDER BY created_at DESC
    LIMIT 1;
    IF FOUND THEN
      form_id := existing_form.id;
      IF existing_form.submission_status = 'SUBMITTED' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Cannot edit: Joining form is already SUBMITTED and locked';
      END IF;
    END IF;
  END IF;

  -- 4. Extract personal fields (Note: All arguments inside COALESCE use ->> so all evaluate to TEXT)
  IF payload ? 'personal' AND jsonb_typeof(payload -> 'personal') = 'object' THEN
    v_cand_name := COALESCE(payload -> 'personal' ->> 'employeeName', payload -> 'personal' ->> 'full_name', payload ->> 'candidate_name');
    v_dob := CASE 
      WHEN (payload -> 'personal' ->> 'dateOfBirth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'dateOfBirth')::DATE
      WHEN (payload -> 'personal' ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'date_of_birth')::DATE
      ELSE NULL 
    END;
    v_gender := COALESCE(payload -> 'personal' ->> 'gender', payload ->> 'gender');
    v_father_name := COALESCE(payload -> 'personal' ->> 'fatherName', payload -> 'personal' ->> 'father_name');
    v_mother_or_husband := COALESCE(payload -> 'personal' ->> 'motherOrHusbandName', payload -> 'personal' ->> 'mother_or_husband_name', payload ->> 'mother_or_husband_name');
    v_marital_status := COALESCE(payload -> 'personal' ->> 'maritalStatus', payload -> 'personal' ->> 'marital_status', payload ->> 'marital_status');
    v_spouse_name := COALESCE(payload -> 'personal' ->> 'spouseName', payload -> 'personal' ->> 'spouse_name', payload ->> 'spouse_name');
    v_blood_group := COALESCE(payload -> 'personal' ->> 'bloodGroup', payload -> 'personal' ->> 'blood_group', payload ->> 'blood_group');
    v_aadhaar := COALESCE(payload -> 'personal' ->> 'aadhaarNumber', payload -> 'personal' ->> 'aadhaar_number', payload ->> 'aadhaar_number');
    v_pan := COALESCE(payload -> 'personal' ->> 'panNumber', payload -> 'personal' ->> 'pan_number', payload ->> 'pan_number');
    v_employee_contact := COALESCE(payload -> 'personal' ->> 'employeeContactNumber', payload -> 'personal' ->> 'employee_contact_number', payload ->> 'employee_contact_number');
    v_other_contact := COALESCE(payload -> 'personal' ->> 'otherContactNumber', payload -> 'personal' ->> 'other_contact_number', payload ->> 'other_contact_number');
    v_email := COALESCE(payload -> 'personal' ->> 'emailId', payload -> 'personal' ->> 'email', caller_email);
  ELSE
    v_cand_name := payload ->> 'candidate_name';
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
    v_email := COALESCE(payload ->> 'email', caller_email);
  END IF;

  -- Extract employment fields
  v_designation := COALESCE(payload -> 'employment' ->> 'designation', payload ->> 'designation');
  v_department := COALESCE(payload -> 'employment' ->> 'department', payload ->> 'department');

  -- Extract custom fields
  v_custom_fields := COALESCE(payload -> 'custom_fields', payload -> 'customFields', '{}'::jsonb);

  -- 5. Extract address fields
  IF payload ? 'permanent_address' AND jsonb_typeof(payload -> 'permanent_address') = 'object' THEN
    v_perm_address := payload -> 'permanent_address' ->> 'address';
    v_perm_city := payload -> 'permanent_address' ->> 'city';
    v_perm_district := payload -> 'permanent_address' ->> 'district';
    v_perm_state := payload -> 'permanent_address' ->> 'state';
    v_perm_country := COALESCE(payload -> 'permanent_address' ->> 'country', 'India');
    v_perm_pin := payload -> 'permanent_address' ->> 'pinCode';
  END IF;

  IF payload ? 'current_address' AND jsonb_typeof(payload -> 'current_address') = 'object' THEN
    v_curr_address := payload -> 'current_address' ->> 'address';
    v_curr_city := payload -> 'current_address' ->> 'city';
    v_curr_district := payload -> 'current_address' ->> 'district';
    v_curr_state := payload -> 'current_address' ->> 'state';
    v_curr_country := COALESCE(payload -> 'current_address' ->> 'country', 'India');
    v_curr_pin := payload -> 'current_address' ->> 'pinCode';
  END IF;

  v_same_as_perm := COALESCE((payload ->> 'same_as_permanent')::BOOLEAN, (payload ->> 'sameAsPermanentAddress')::BOOLEAN, false);

  -- 6. Extract bank details
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

  -- 7. Document file paths
  IF payload ? 'documents' AND jsonb_typeof(payload -> 'documents') = 'object' THEN
    v_photo_path := payload -> 'documents' -> 'PHOTO' -> 'file' ->> 'dataUrl';
    v_signature_path := payload -> 'documents' -> 'SIGNATURE' -> 'file' ->> 'dataUrl';
  END IF;

  -- 8. Insert or Update joining_forms
  IF form_id IS NOT NULL THEN
    UPDATE public.joining_forms
    SET
      user_id = COALESCE(user_id, caller_uid),
      candidate_name = COALESCE(v_cand_name, candidate_name),
      date_of_birth = COALESCE(v_dob, date_of_birth),
      gender = COALESCE(v_gender, gender),
      father_name = COALESCE(v_father_name, father_name),
      mother_or_husband_name = COALESCE(v_mother_or_husband, mother_or_husband_name),
      marital_status = COALESCE(v_marital_status, marital_status),
      spouse_name = COALESCE(v_spouse_name, spouse_name),
      blood_group = COALESCE(v_blood_group, blood_group),
      aadhaar_number = COALESCE(v_aadhaar, aadhaar_number),
      pan_number = COALESCE(v_pan, pan_number),
      employee_contact_number = COALESCE(v_employee_contact, employee_contact_number),
      other_contact_number = COALESCE(v_other_contact, other_contact_number),
      email = COALESCE(v_email, email, caller_email),
      designation = COALESCE(v_designation, designation),
      department = COALESCE(v_department, department),
      custom_fields = CASE 
        WHEN v_custom_fields IS NOT NULL AND jsonb_typeof(v_custom_fields) = 'object' AND v_custom_fields != '{}'::jsonb 
        THEN COALESCE(custom_fields, '{}'::jsonb) || v_custom_fields 
        ELSE custom_fields 
      END,
      permanent_address = COALESCE(v_perm_address, permanent_address),
      permanent_city = COALESCE(v_perm_city, permanent_city),
      permanent_district = COALESCE(v_perm_district, permanent_district),
      permanent_state = COALESCE(v_perm_state, permanent_state),
      permanent_country = COALESCE(v_perm_country, permanent_country),
      permanent_pin_code = COALESCE(v_perm_pin, permanent_pin_code),
      current_address = COALESCE(v_curr_address, current_address),
      current_city = COALESCE(v_curr_city, current_city),
      current_district = COALESCE(v_curr_district, current_district),
      current_state = COALESCE(v_curr_state, current_state),
      current_country = COALESCE(v_curr_country, current_country),
      current_pin_code = COALESCE(v_curr_pin, current_pin_code),
      same_as_permanent = COALESCE(v_same_as_perm, same_as_permanent),
      bank_account_holder = COALESCE(v_bank_holder, bank_account_holder),
      bank_account_number = COALESCE(v_bank_number, bank_account_number),
      ifsc_code = COALESCE(v_ifsc, ifsc_code),
      bank_name = COALESCE(v_bank_name, bank_name),
      branch_name = COALESCE(v_branch_name, branch_name),
      uan = COALESCE(v_uan, uan),
      esic_number = COALESCE(v_esic, esic_number),
      pt_number = COALESCE(v_pt, pt_number),
      photo_path = COALESCE(v_photo_path, photo_path),
      candidate_signature_path = COALESCE(v_signature_path, candidate_signature_path),
      submission_status = 'DRAFT',
      updated_at = now()
    WHERE id = form_id;
  ELSE
    INSERT INTO public.joining_forms (
      user_id,
      candidate_name,
      date_of_birth, gender, father_name, mother_or_husband_name, marital_status, spouse_name, blood_group,
      aadhaar_number, pan_number, employee_contact_number, other_contact_number, email, custom_fields,
      designation, department,
      permanent_address, permanent_city, permanent_district, permanent_state, permanent_country, permanent_pin_code,
      current_address, current_city, current_district, current_state, current_country, current_pin_code,
      same_as_permanent,
      bank_account_holder, bank_account_number, ifsc_code, bank_name, branch_name, uan, esic_number, pt_number,
      photo_path, candidate_signature_path,
      submission_status
    ) VALUES (
      caller_uid,
      v_cand_name,
      v_dob, v_gender, v_father_name, v_mother_or_husband, v_marital_status, v_spouse_name, v_blood_group,
      v_aadhaar, v_pan, v_employee_contact, v_other_contact, COALESCE(v_email, caller_email), COALESCE(v_custom_fields, '{}'::jsonb),
      v_designation, v_department,
      v_perm_address, v_perm_city, v_perm_district, v_perm_state, v_perm_country, v_perm_pin,
      v_curr_address, v_curr_city, v_curr_district, v_curr_state, v_curr_country, v_curr_pin,
      v_same_as_perm,
      v_bank_holder, v_bank_number, v_ifsc, v_bank_name, v_branch_name, v_uan, v_esic, v_pt,
      v_photo_path, v_signature_path,
      'DRAFT'
    ) RETURNING id INTO form_id;
  END IF;

  -- 9. Child Tables
  -- Emergency Contacts
  IF payload ? 'emergency_contacts' THEN
    emergency_list := payload -> 'emergency_contacts';
  ELSIF payload ? 'emergencyContacts' THEN
    emergency_list := payload -> 'emergencyContacts';
  ELSE
    emergency_list := NULL;
  END IF;

  IF emergency_list IS NOT NULL AND jsonb_typeof(emergency_list) = 'array' THEN
    DELETE FROM public.emergency_contacts WHERE joining_form_id = form_id;
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
    DELETE FROM public.education_records WHERE joining_form_id = form_id;
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
    DELETE FROM public.family_details WHERE joining_form_id = form_id;
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
      candidate_signature_path
    ) VALUES (
      form_id,
      COALESCE(
        (payload -> 'declarations' ->> 'candidateDeclarationAcknowledged')::BOOLEAN,
        (payload -> 'declarations' ->> 'candidate_acceptance')::BOOLEAN,
        false
      ),
      COALESCE(
        (payload -> 'declarations' ->> 'backgroundVerificationConsent')::BOOLEAN,
        (payload -> 'declarations' ->> 'background_check_consent')::BOOLEAN,
        false
      ),
      COALESCE(
        (payload -> 'declarations' ->> 'rulesAndConductAccepted')::BOOLEAN,
        (payload -> 'declarations' ->> 'code_of_conduct_acceptance')::BOOLEAN,
        false
      ),
      COALESCE(
        payload -> 'declarations' ->> 'signatoryName',
        payload -> 'declarations' ->> 'signatory_name'
      ),
      CASE 
        WHEN (payload -> 'declarations' ->> 'declarationDate') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'declarations' ->> 'declarationDate')::DATE
        WHEN (payload -> 'declarations' ->> 'declaration_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'declarations' ->> 'declaration_date')::DATE
        ELSE CURRENT_DATE 
      END,
      COALESCE(
        payload -> 'declarations' ->> 'candidateSignaturePath',
        payload -> 'declarations' ->> 'candidate_signature_path',
        v_signature_path
      )
    ) ON CONFLICT (joining_form_id) DO UPDATE SET
      candidate_acceptance = EXCLUDED.candidate_acceptance,
      background_check_consent = EXCLUDED.background_check_consent,
      code_of_conduct_acceptance = EXCLUDED.code_of_conduct_acceptance,
      signatory_name = COALESCE(EXCLUDED.signatory_name, public.declarations.signatory_name),
      declaration_date = COALESCE(EXCLUDED.declaration_date, public.declarations.declaration_date),
      candidate_signature_path = COALESCE(EXCLUDED.candidate_signature_path, public.declarations.candidate_signature_path);
  END IF;

  -- Re-query to get joining_reference
  SELECT joining_reference INTO existing_form FROM public.joining_forms WHERE id = form_id;

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'joining_reference', existing_form.joining_reference,
    'submission_status', 'DRAFT'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_joining_draft_bundle(jsonb) TO authenticated;


-- 2. Enhanced public.submit_joining_form_bundle to natively persist candidate designation and department
CREATE OR REPLACE FUNCTION public.submit_joining_form_bundle(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  form_id UUID;
  now_iso TIMESTAMPTZ := now();
  ref_num TEXT;
  cand_name TEXT;
  target_app_id UUID := NULL;
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
  v_designation TEXT;
  v_department TEXT;
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
  caller_id UUID;
BEGIN
  caller_id := auth.uid();

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

  -- Upsert candidate profile if authenticated
  IF caller_id IS NOT NULL THEN
    INSERT INTO public.candidate_profiles (id, email, full_name, phone, updated_at)
    VALUES (
      caller_id,
      v_email,
      v_cand_name,
      COALESCE(payload -> 'personal' ->> 'employeeContactNumber', payload -> 'personal' ->> 'employee_contact_number', ''),
      now_iso
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.candidate_profiles.phone),
      updated_at = now_iso;
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

  -- Extract employment details
  v_designation := COALESCE(payload -> 'employment' ->> 'designation', payload ->> 'designation');
  v_department := COALESCE(payload -> 'employment' ->> 'department', payload ->> 'department');

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

  -- 8. Insert new standalone Joining Form record with candidate ownership link
  INSERT INTO public.joining_forms (
    joining_reference,
    application_id,
    user_id,
    candidate_auth_user_id,
    candidate_name,
    designation,
    department,
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
    caller_id,
    caller_id,
    v_cand_name,
    v_designation,
    v_department,
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

  -- 9. Insert Child Tables
  -- Emergency Contacts
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
    DELETE FROM public.family_details WHERE joining_form_id = form_id;
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
      doc_path := COALESCE(
        NULLIF(doc_val -> 'file' ->> 'storagePath', ''),
        NULLIF(doc_val ->> 'storagePath', '')
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
          uploaded_at,
          is_current
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
          now_iso,
          true
        );
      END IF;
    END LOOP;
  END IF;

  -- 11. If linked to an application, update application status
  IF target_app_id IS NOT NULL THEN
    UPDATE public.applications
    SET status = 'JOINING_SUBMITTED'
    WHERE id = target_app_id;
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
    'Candidate ' || v_cand_name || ' submitted joining dossier ' || ref_num || '.',
    jsonb_build_object(
      'form_id', form_id,
      'joining_reference', ref_num,
      'email', v_email,
      'candidate_auth_user_id', caller_id,
      'submitted_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'joining_reference', ref_num,
    'submission_status', 'SUBMITTED',
    'submitted_at', now_iso
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_joining_form_bundle(jsonb) TO anon, authenticated;
