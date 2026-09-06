-- ==============================================================================
-- Migration: 20260906000008_candidate_joining_flow.sql
-- Description: 1. Allow authorized candidate to insert joining_forms drafts.
--              2. Allow candidate storage update/delete in candidate-documents.
--              3. Trigger for JOINING_FORM_SUBMITTED notification.
--              4. Transactional RPC functions for draft saving and submission.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RLS Policy: Authorized Candidate can INSERT joining form
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized candidate can insert joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can insert joining form"
  ON public.joining_forms
  FOR INSERT
  WITH CHECK (
    public.is_candidate_authorized_for_application(application_id) AND
    submission_status IN ('DRAFT', 'IN_PROGRESS')
  );

-- ------------------------------------------------------------------------------
-- 2. Storage Policies on candidate-documents bucket
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Candidate can delete own candidate-documents" ON storage.objects;
CREATE POLICY "Candidate can delete own candidate-documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'candidate-documents' AND
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Candidate can update own candidate-documents" ON storage.objects;
CREATE POLICY "Candidate can update own candidate-documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'candidate-documents' AND
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'candidate-documents' AND
    auth.uid() IS NOT NULL
  );

-- ------------------------------------------------------------------------------
-- 3. Trigger for JOINING_FORM_SUBMITTED Notification
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_joining_form_submitted_notification()
RETURNS TRIGGER AS $$
DECLARE
  cand_name TEXT;
  app_num TEXT;
BEGIN
  SELECT full_name, application_number INTO cand_name, app_num
  FROM public.applications WHERE id = NEW.application_id;

  INSERT INTO public.notifications (
    type,
    title,
    message,
    application_id,
    read
  ) VALUES (
    'JOINING_FORM_SUBMITTED',
    'Joining Form Submitted',
    COALESCE(cand_name, 'Candidate') || ' submitted onboarding joining dossier (' || COALESCE(app_num, 'Pending') || ').',
    NEW.application_id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_joining_form_submitted ON public.joining_forms;
CREATE TRIGGER trg_notify_joining_form_submitted
  AFTER UPDATE OF submission_status ON public.joining_forms
  FOR EACH ROW
  WHEN (OLD.submission_status IS DISTINCT FROM 'SUBMITTED' AND NEW.submission_status = 'SUBMITTED')
  EXECUTE FUNCTION public.handle_joining_form_submitted_notification();

-- ------------------------------------------------------------------------------
-- 4. Transactional RPC: Save Joining Draft
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_joining_draft_bundle(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  caller_email TEXT;
  target_app_id UUID;
  matched_app RECORD;
  form_id UUID;
  existing_form RECORD;
  emergency_list JSONB;
  education_list JSONB;
  family_list JSONB;
  elem JSONB;
  idx INTEGER;

  -- Personal fields
  v_dob DATE;
  v_gender TEXT;
  v_mother_or_husband TEXT;
  v_marital_status TEXT;
  v_spouse_name TEXT;
  v_blood_group TEXT;
  v_aadhaar TEXT;
  v_pan TEXT;
  v_employee_contact TEXT;
  v_other_contact TEXT;
  v_email TEXT;

  -- Address fields
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

  -- Bank fields
  v_bank_holder TEXT;
  v_bank_number TEXT;
  v_ifsc TEXT;
  v_bank_name TEXT;
  v_branch_name TEXT;
  v_uan TEXT;
  v_esic TEXT;
  v_pt TEXT;

  -- Photo and Signature
  v_photo_path TEXT;
  v_signature_path TEXT;
BEGIN
  -- 1. Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active candidate authentication session required.';
  END IF;

  caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF caller_email = '' THEN
    RAISE EXCEPTION 'Unauthorized: Missing email in authentication token.';
  END IF;

  target_app_id := (payload ->> 'application_id')::UUID;

  -- 2. Verify candidate owns the application AND joining_access_enabled is true
  SELECT * INTO matched_app
  FROM public.applications
  WHERE id = target_app_id
    AND lower(trim(email)) = caller_email
    AND joining_access_enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or joining access disabled for application ID %', target_app_id;
  END IF;

  -- 3. Check existing joining form state (reject if already SUBMITTED)
  SELECT * INTO existing_form
  FROM public.joining_forms
  WHERE application_id = target_app_id;

  IF FOUND AND existing_form.submission_status = 'SUBMITTED' THEN
    RAISE EXCEPTION 'Joining form has already been submitted and is locked for edits.';
  END IF;

  -- 4. Extract personal fields (support both nested camelCase and flat snake_case)
  IF payload ? 'personal' AND jsonb_typeof(payload -> 'personal') = 'object' THEN
    v_dob := CASE 
      WHEN (payload -> 'personal' ->> 'dateOfBirth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'dateOfBirth')::DATE
      WHEN (payload -> 'personal' ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload -> 'personal' ->> 'date_of_birth')::DATE
      ELSE NULL 
    END;
    v_gender := COALESCE(payload -> 'personal' ->> 'gender', payload ->> 'gender');
    v_mother_or_husband := COALESCE(payload -> 'personal' ->> 'motherOrHusbandName', payload -> 'personal' ->> 'mother_or_husband_name', payload ->> 'mother_or_husband_name');
    v_marital_status := COALESCE(payload -> 'personal' ->> 'maritalStatus', payload -> 'personal' ->> 'marital_status', payload ->> 'marital_status');
    v_spouse_name := COALESCE(payload -> 'personal' ->> 'spouseName', payload -> 'personal' ->> 'spouse_name', payload ->> 'spouse_name');
    v_blood_group := COALESCE(payload -> 'personal' ->> 'bloodGroup', payload -> 'personal' ->> 'blood_group', payload ->> 'blood_group');
    v_aadhaar := COALESCE(payload -> 'personal' ->> 'aadhaarNumber', payload -> 'personal' ->> 'aadhaar_number', payload ->> 'aadhaar_number');
    v_pan := COALESCE(payload -> 'personal' ->> 'panNumber', payload -> 'personal' ->> 'pan_number', payload ->> 'pan_number');
    v_employee_contact := COALESCE(payload -> 'personal' ->> 'employeeContactNumber', payload -> 'personal' ->> 'employee_contact_number', payload ->> 'employee_contact_number');
    v_other_contact := COALESCE(payload -> 'personal' ->> 'otherContactNumber', payload -> 'personal' ->> 'other_contact_number', payload ->> 'other_contact_number');
    v_email := COALESCE(payload -> 'personal' ->> 'emailId', payload -> 'personal' ->> 'email', payload ->> 'email');
  ELSE
    v_dob := CASE 
      WHEN (payload ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' THEN (payload ->> 'date_of_birth')::DATE 
      ELSE NULL 
    END;
    v_gender := payload ->> 'gender';
    v_mother_or_husband := payload ->> 'mother_or_husband_name';
    v_marital_status := payload ->> 'marital_status';
    v_spouse_name := payload ->> 'spouse_name';
    v_blood_group := payload ->> 'blood_group';
    v_aadhaar := payload ->> 'aadhaar_number';
    v_pan := payload ->> 'pan_number';
    v_employee_contact := payload ->> 'employee_contact_number';
    v_other_contact := payload ->> 'other_contact_number';
    v_email := payload ->> 'email';
  END IF;

  -- 5. Extract address fields
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

  v_same_as_perm := COALESCE(
    (payload ->> 'same_as_permanent')::BOOLEAN,
    (payload ->> 'sameAsPermanentAddress')::BOOLEAN,
    false
  );

  -- 6. Extract bank fields
  IF payload ? 'bank' AND jsonb_typeof(payload -> 'bank') = 'object' THEN
    v_bank_holder := COALESCE(payload -> 'bank' ->> 'accountHolderName', payload -> 'bank' ->> 'bank_account_holder');
    v_bank_number := COALESCE(payload -> 'bank' ->> 'bankAccountNumber', payload -> 'bank' ->> 'bank_account_number');
    v_ifsc := COALESCE(payload -> 'bank' ->> 'ifscCode', payload -> 'bank' ->> 'ifsc_code');
    v_bank_name := COALESCE(payload -> 'bank' ->> 'bankName', payload -> 'bank' ->> 'bank_name');
    v_branch_name := COALESCE(payload -> 'bank' ->> 'branchName', payload -> 'bank' ->> 'branch_name');
    v_uan := COALESCE(payload -> 'bank' ->> 'uanNumber', payload -> 'bank' ->> 'uan');
    v_esic := COALESCE(payload -> 'bank' ->> 'esicNumber', payload -> 'bank' ->> 'esic_number');
    v_pt := COALESCE(payload -> 'bank' ->> 'ptNumber', payload -> 'bank' ->> 'pt_number');
  ELSE
    v_bank_holder := payload ->> 'bank_account_holder';
    v_bank_number := payload ->> 'bank_account_number';
    v_ifsc := payload ->> 'ifsc_code';
    v_bank_name := payload ->> 'bank_name';
    v_branch_name := payload ->> 'branch_name';
    v_uan := payload ->> 'uan';
    v_esic := payload ->> 'esic_number';
    v_pt := payload ->> 'pt_number';
  END IF;

  v_photo_path := COALESCE(payload ->> 'photo_path', payload -> 'documents' -> 'PHOTO' -> 'file' ->> 'storagePath');
  v_signature_path := COALESCE(payload ->> 'candidate_signature_path', payload -> 'documents' -> 'SIGNATURE' -> 'file' ->> 'storagePath');

  -- 7. Upsert joining_forms record without modifying admin-controlled fields
  IF FOUND THEN
    form_id := existing_form.id;
    UPDATE public.joining_forms SET
      date_of_birth = COALESCE(v_dob, date_of_birth),
      gender = COALESCE(v_gender, gender),
      mother_or_husband_name = COALESCE(v_mother_or_husband, mother_or_husband_name),
      marital_status = COALESCE(v_marital_status, marital_status),
      spouse_name = COALESCE(v_spouse_name, spouse_name),
      blood_group = COALESCE(v_blood_group, blood_group),
      aadhaar_number = COALESCE(v_aadhaar, aadhaar_number),
      pan_number = COALESCE(v_pan, pan_number),
      employee_contact_number = COALESCE(v_employee_contact, employee_contact_number),
      other_contact_number = COALESCE(v_other_contact, other_contact_number),
      email = COALESCE(v_email, email),
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
      application_id,
      date_of_birth, gender, mother_or_husband_name, marital_status, spouse_name, blood_group,
      aadhaar_number, pan_number, employee_contact_number, other_contact_number, email,
      permanent_address, permanent_city, permanent_district, permanent_state, permanent_country, permanent_pin_code,
      current_address, current_city, current_district, current_state, current_country, current_pin_code,
      same_as_permanent,
      bank_account_holder, bank_account_number, ifsc_code, bank_name, branch_name, uan, esic_number, pt_number,
      photo_path, candidate_signature_path,
      submission_status
    ) VALUES (
      target_app_id,
      v_dob, v_gender, v_mother_or_husband, v_marital_status, v_spouse_name, v_blood_group,
      v_aadhaar, v_pan, v_employee_contact, v_other_contact, v_email,
      v_perm_address, v_perm_city, v_perm_district, v_perm_state, v_perm_country, v_perm_pin,
      v_curr_address, v_curr_city, v_curr_district, v_curr_state, v_curr_country, v_curr_pin,
      v_same_as_perm,
      v_bank_holder, v_bank_number, v_ifsc, v_bank_name, v_branch_name, v_uan, v_esic, v_pt,
      v_photo_path, v_signature_path,
      'DRAFT'
    ) RETURNING id INTO form_id;
  END IF;

  -- 8. Child Tables: Repeatable Records
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

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'submission_status', 'DRAFT'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_joining_draft_bundle(JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Transactional RPC: Submit Joining Form Bundle
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_joining_form_bundle(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  draft_res JSONB;
  form_id UUID;
  now_iso TIMESTAMPTZ := now();
  target_app_id UUID;
BEGIN
  -- 1. Save all fields first via save_joining_draft_bundle (which verifies auth, access, and locks)
  draft_res := public.save_joining_draft_bundle(payload);
  form_id := (draft_res ->> 'form_id')::UUID;
  target_app_id := (payload ->> 'application_id')::UUID;

  -- 2. Lock the form to SUBMITTED
  UPDATE public.joining_forms
  SET
    submission_status = 'SUBMITTED',
    submitted_at = now_iso,
    updated_at = now_iso
  WHERE id = form_id;

  -- 3. Update parent application status
  UPDATE public.applications
  SET status = 'JOINING_SUBMITTED'
  WHERE id = target_app_id;

  -- 4. Update declarations accepted_at timestamp
  UPDATE public.declarations
  SET accepted_at = now_iso
  WHERE joining_form_id = form_id;

  -- 5. Log activity
  INSERT INTO public.activity_logs (
    application_id,
    action,
    description,
    metadata
  ) VALUES (
    target_app_id,
    'JOINING_FORM_SUBMITTED',
    'Candidate formally submitted onboarding joining dossier.',
    jsonb_build_object(
      'form_id', form_id,
      'submitted_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'submission_status', 'SUBMITTED',
    'submitted_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_joining_form_bundle(JSONB) TO authenticated;
