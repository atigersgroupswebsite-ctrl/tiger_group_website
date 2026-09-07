-- ==============================================================================
-- Migration: 20260907000011_standalone_joining_and_admin_directory.sql
-- Description: 1. Standalone Joining Submissions (disconnect application dependency).
--              2. Unique Joining Reference Generator (JOIN-YYYY-000001).
--              3. Standalone Candidate RLS and Transactional RPCs.
--              4. Admin Profiles Management & Directory Security (SUPER_ADMIN authorization).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Extensions for Standalone joining_forms
-- ------------------------------------------------------------------------------
-- Allow application_id to be NULL for standalone candidates
ALTER TABLE public.joining_forms ALTER COLUMN application_id DROP NOT NULL;

-- Add candidate owner columns if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='joining_forms' AND column_name='user_id') THEN
    ALTER TABLE public.joining_forms ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='joining_forms' AND column_name='candidate_name') THEN
    ALTER TABLE public.joining_forms ADD COLUMN candidate_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='joining_forms' AND column_name='joining_reference') THEN
    ALTER TABLE public.joining_forms ADD COLUMN joining_reference TEXT;
  END IF;
END $$;

-- Sequence and generator for standalone joining reference (e.g. JOIN-2026-000001)
CREATE SEQUENCE IF NOT EXISTS public.joining_ref_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_joining_reference()
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  year_str TEXT := to_char(CURRENT_DATE, 'YYYY');
BEGIN
  next_val := nextval('public.joining_ref_seq');
  RETURN 'JOIN-' || year_str || '-' || lpad(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.joining_forms ALTER COLUMN joining_reference SET DEFAULT public.generate_joining_reference();

-- Backfill any existing records without joining_reference
UPDATE public.joining_forms
SET joining_reference = public.generate_joining_reference()
WHERE joining_reference IS NULL;

-- Ensure unique index on joining_reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_joining_forms_reference ON public.joining_forms(joining_reference);
CREATE INDEX IF NOT EXISTS idx_joining_forms_user_id ON public.joining_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_joining_forms_email ON public.joining_forms(lower(email));

-- Optional foreign key in notifications for standalone joining forms
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='joining_form_id') THEN
    ALTER TABLE public.notifications ADD COLUMN joining_form_id UUID REFERENCES public.joining_forms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_notifications_joining_form_id ON public.notifications(joining_form_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Authorization Helper Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_candidate_authorized_for_joining_form(form_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_email TEXT;
  jwt_uid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  jwt_uid := auth.uid();
  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  RETURN EXISTS (
    SELECT 1 FROM public.joining_forms jf
    WHERE jf.id = form_id
      AND (
        jf.user_id = jwt_uid
        OR (jwt_email <> '' AND lower(trim(coalesce(jf.email, ''))) = jwt_email)
        OR (
          jf.application_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = jf.application_id
              AND lower(trim(a.email)) = jwt_email
          )
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. Row Level Security on joining_forms
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized candidate can read joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can read joining form"
  ON public.joining_forms
  FOR SELECT
  USING (
    public.is_candidate_authorized_for_joining_form(id) OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NOT NULL AND lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = lower(trim(coalesce(email, ''))))
  );

DROP POLICY IF EXISTS "Authorized candidate can update joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can update joining form"
  ON public.joining_forms
  FOR UPDATE
  USING (
    (
      public.is_candidate_authorized_for_joining_form(id) OR
      (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = lower(trim(coalesce(email, ''))))
    ) AND
    submission_status IN ('DRAFT', 'IN_PROGRESS')
  )
  WITH CHECK (
    public.is_candidate_authorized_for_joining_form(id) OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NOT NULL AND lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = lower(trim(coalesce(email, ''))))
  );

DROP POLICY IF EXISTS "Authorized candidate can insert joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can insert joining form"
  ON public.joining_forms
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = lower(trim(coalesce(email, '')))) AND
    submission_status IN ('DRAFT', 'IN_PROGRESS')
  );

DROP POLICY IF EXISTS "Admins have full access to joining forms" ON public.joining_forms;
CREATE POLICY "Admins have full access to joining forms"
  ON public.joining_forms
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 4. Standalone Transactional RPC: Save Joining Draft
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_joining_draft_bundle(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  caller_email TEXT;
  caller_uid UUID;
  form_id UUID;
  existing_form RECORD;
  emergency_list JSONB;
  education_list JSONB;
  family_list JSONB;
  elem JSONB;
  idx INTEGER;

  -- Personal fields
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
  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Active candidate authentication session required.';
  END IF;

  caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF caller_email = '' THEN
    RAISE EXCEPTION 'Unauthorized: Missing email in authentication token.';
  END IF;

  -- 2. Identify target form: either by explicit form_id, or by caller user_id / email
  IF payload ? 'form_id' AND (payload ->> 'form_id') IS NOT NULL AND (payload ->> 'form_id') != '' THEN
    SELECT * INTO existing_form
    FROM public.joining_forms
    WHERE id = (payload ->> 'form_id')::UUID;
  ELSE
    SELECT * INTO existing_form
    FROM public.joining_forms
    WHERE user_id = caller_uid
       OR lower(trim(email)) = caller_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- 3. Check existing joining form state (reject if already SUBMITTED)
  IF existing_form.id IS NOT NULL AND existing_form.submission_status = 'SUBMITTED' THEN
    RAISE EXCEPTION 'Joining form has already been submitted and is locked for edits.';
  END IF;

  -- 4. Extract personal fields
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

  -- 7. Upsert joining_forms record
  IF existing_form.id IS NOT NULL THEN
    form_id := existing_form.id;
    UPDATE public.joining_forms SET
      user_id = COALESCE(user_id, caller_uid),
      candidate_name = COALESCE(v_cand_name, candidate_name),
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
      email = COALESCE(v_email, email, caller_email),
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
      date_of_birth, gender, mother_or_husband_name, marital_status, spouse_name, blood_group,
      aadhaar_number, pan_number, employee_contact_number, other_contact_number, email,
      permanent_address, permanent_city, permanent_district, permanent_state, permanent_country, permanent_pin_code,
      current_address, current_city, current_district, current_state, current_country, current_pin_code,
      same_as_permanent,
      bank_account_holder, bank_account_number, ifsc_code, bank_name, branch_name, uan, esic_number, pt_number,
      photo_path, candidate_signature_path,
      submission_status
    ) VALUES (
      caller_uid,
      v_cand_name,
      v_dob, v_gender, v_mother_or_husband, v_marital_status, v_spouse_name, v_blood_group,
      v_aadhaar, v_pan, v_employee_contact, v_other_contact, COALESCE(v_email, caller_email),
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

  -- Re-query to get joining_reference
  SELECT joining_reference INTO existing_form FROM public.joining_forms WHERE id = form_id;

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'joining_reference', existing_form.joining_reference,
    'submission_status', 'DRAFT'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_joining_draft_bundle(JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Standalone Transactional RPC: Submit Joining Form Bundle
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_joining_form_bundle(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  draft_res JSONB;
  form_id UUID;
  now_iso TIMESTAMPTZ := now();
  ref_num TEXT;
  cand_name TEXT;
  target_app_id UUID;
BEGIN
  -- 1. Save all fields first via save_joining_draft_bundle (which validates session and draft state)
  draft_res := public.save_joining_draft_bundle(payload);
  form_id := (draft_res ->> 'form_id')::UUID;

  -- 2. Lock the form to SUBMITTED
  UPDATE public.joining_forms
  SET
    submission_status = 'SUBMITTED',
    submitted_at = now_iso,
    updated_at = now_iso
  WHERE id = form_id
  RETURNING joining_reference, candidate_name, application_id INTO ref_num, cand_name, target_app_id;

  -- 3. Update declarations accepted_at timestamp
  UPDATE public.declarations
  SET accepted_at = now_iso
  WHERE joining_form_id = form_id;

  -- 4. If linked to an application, update application status
  IF target_app_id IS NOT NULL THEN
    UPDATE public.applications
    SET status = 'JOINING_SUBMITTED'
    WHERE id = target_app_id;

    INSERT INTO public.activity_logs (
      application_id,
      action,
      description,
      metadata
    ) VALUES (
      target_app_id,
      'JOINING_FORM_SUBMITTED',
      'Candidate formally submitted onboarding joining dossier (' || COALESCE(ref_num, 'Pending') || ').',
      jsonb_build_object(
        'form_id', form_id,
        'joining_reference', ref_num,
        'submitted_at', now_iso
      )
    );
  END IF;

  -- 5. Insert notification for administrators
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
    COALESCE(cand_name, 'Candidate') || ' submitted onboarding joining dossier (' || COALESCE(ref_num, 'Pending') || ').',
    form_id,
    target_app_id,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'form_id', form_id,
    'joining_reference', ref_num,
    'submission_status', 'SUBMITTED',
    'submitted_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_joining_form_bundle(JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. Admin Profiles Security & Permissions
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.admin_profiles;
CREATE POLICY "Admins can view admin profiles"
  ON public.admin_profiles
  FOR SELECT
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Super admin can insert admin profiles" ON public.admin_profiles;
CREATE POLICY "Super admin can insert admin profiles"
  ON public.admin_profiles
  FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update admin profiles" ON public.admin_profiles;
CREATE POLICY "Super admin can update admin profiles"
  ON public.admin_profiles
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
