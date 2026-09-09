-- ==============================================================================
-- Migration: 20260908000017_joining_form_configuration.sql
-- Description: Production-Ready Joining Form Dynamic Configuration Layer
-- Architecture:
--   1. Centralized Field Configuration Table (joining_form_field_configs)
--   2. Normalizes father_name and custom_fields in public.joining_forms
--   3. Updates save_joining_draft_bundle RPC to persist father_name and custom_fields
--   4. RLS security: Public read for active form definition; SUPER_ADMIN only mutations
--   5. Seeds all existing form fields to preserve 100% backward compatibility
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Configuration Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.joining_form_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  help_text TEXT,
  options JSONB,
  conditional_rule JSONB,
  validation_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy retrieval by section and order
CREATE INDEX IF NOT EXISTS idx_joining_field_configs_section_order
  ON public.joining_form_field_configs (section, display_order);

CREATE INDEX IF NOT EXISTS idx_joining_field_configs_enabled
  ON public.joining_form_field_configs (is_enabled);

-- ------------------------------------------------------------------------------
-- 2. Add columns to joining_forms table
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'father_name'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN father_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE public.joining_forms ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Row Level Security Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.joining_form_field_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view joining form field configs" ON public.joining_form_field_configs;
CREATE POLICY "Anyone can view joining form field configs"
  ON public.joining_form_field_configs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "SUPER_ADMIN can insert joining form field configs" ON public.joining_form_field_configs;
CREATE POLICY "SUPER_ADMIN can insert joining form field configs"
  ON public.joining_form_field_configs
  FOR INSERT
  WITH CHECK (public.has_admin_role('SUPER_ADMIN'));

DROP POLICY IF EXISTS "SUPER_ADMIN can update joining form field configs" ON public.joining_form_field_configs;
CREATE POLICY "SUPER_ADMIN can update joining form field configs"
  ON public.joining_form_field_configs
  FOR UPDATE
  USING (public.has_admin_role('SUPER_ADMIN'))
  WITH CHECK (public.has_admin_role('SUPER_ADMIN'));

DROP POLICY IF EXISTS "SUPER_ADMIN can delete joining form field configs" ON public.joining_form_field_configs;
CREATE POLICY "SUPER_ADMIN can delete joining form field configs"
  ON public.joining_form_field_configs
  FOR DELETE
  USING (public.has_admin_role('SUPER_ADMIN') AND is_system = false);

-- ------------------------------------------------------------------------------
-- 4. Update save_joining_draft_bundle RPC to persist father_name and custom_fields
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_joining_draft_bundle(payload JSONB)
RETURNS JSONB AS $$
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
    v_blood_group := COALESCE(payload -> 'personal' ->> 'bloodGroup', payload -> 'personal' ->> 'blood_group', payload -> 'blood_group');
    v_aadhaar := COALESCE(payload -> 'personal' ->> 'aadhaarNumber', payload -> 'personal' ->> 'aadhaar_number', payload ->> 'aadhaar_number');
    v_pan := COALESCE(payload -> 'personal' ->> 'panNumber', payload -> 'personal' ->> 'pan_number', payload -> 'pan_number');
    v_employee_contact := COALESCE(payload -> 'personal' ->> 'employeeContactNumber', payload -> 'personal' ->> 'employee_contact_number', payload -> 'employee_contact_number');
    v_other_contact := COALESCE(payload -> 'personal' ->> 'otherContactNumber', payload -> 'personal' ->> 'other_contact_number', payload -> 'other_contact_number');
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_joining_draft_bundle(JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Seed Initial System Field Configurations
-- ------------------------------------------------------------------------------
INSERT INTO public.joining_form_field_configs (
  field_key, section, label, field_type, is_required, is_enabled, is_system, display_order, placeholder, help_text, conditional_rule, options
) VALUES
  -- Personal Information (Step 02)
  ('personal.employeeName', 'personal', 'Full Name (as per Aadhaar)', 'text', true, true, true, 1, 'e.g. Rahul Manohar Patil', 'Enter candidate full legal name as printed on Aadhaar card.', NULL, NULL),
  ('personal.dateOfBirth', 'personal', 'Date of Birth', 'date', true, true, true, 2, NULL, 'Candidate must be at least 18 years of age.', NULL, NULL),
  ('personal.gender', 'personal', 'Gender', 'select', true, true, true, 3, 'Select Gender', 'Statutory gender classification.', NULL, '[{"label":"Male","value":"Male"},{"label":"Female","value":"Female"},{"label":"Other","value":"Other"}]'::jsonb),
  ('personal.maritalStatus', 'personal', 'Marital Status', 'select', true, true, true, 4, 'Select Status', 'Legal marital status.', NULL, '[{"label":"Single / Unmarried","value":"Single"},{"label":"Married","value":"Married"},{"label":"Divorced","value":"Divorced"},{"label":"Widowed","value":"Widowed"}]'::jsonb),
  ('personal.bloodGroup', 'personal', 'Blood Group', 'select', false, true, true, 5, 'Select Blood Group', 'Optional medical records blood group.', NULL, '[{"label":"A+","value":"A+"},{"label":"A-","value":"A-"},{"label":"B+","value":"B+"},{"label":"B-","value":"B-"},{"label":"AB+","value":"AB+"},{"label":"AB-","value":"AB-"},{"label":"O+","value":"O+"},{"label":"O-","value":"O-"}]'::jsonb),
  ('personal.fatherName', 'personal', 'Father''s Full Name', 'text', true, true, true, 6, 'Father''s full name', 'Full legal name of father.', NULL, NULL),
  ('personal.motherOrHusbandName', 'personal', 'Mother''s / Husband''s Name', 'text', true, true, true, 7, 'Mother''s or husband''s name', 'Full name of mother or husband.', NULL, NULL),
  ('personal.spouseName', 'personal', 'Spouse Name', 'text', false, true, true, 8, 'Spouse full name', 'Required only for married candidates.', '{"dependsOn":"personal.maritalStatus","value":"Married"}'::jsonb, NULL),
  ('personal.aadhaarNumber', 'personal', '12-Digit Aadhaar Number', 'text', true, true, true, 9, '12-digit Aadhaar number', 'Mandatory 12-digit Indian national identity number.', NULL, NULL),
  ('personal.panNumber', 'personal', '10-Character PAN Number', 'text', true, true, true, 10, '10-character PAN (e.g. ABCDE1234F)', 'Income tax Permanent Account Number.', NULL, NULL),
  ('personal.employeeContactNumber', 'personal', 'Primary Contact Number', 'phone', true, true, true, 11, '10-digit mobile number', 'Valid 10-digit Indian mobile number.', NULL, NULL),
  ('personal.otherContactNumber', 'personal', 'Alternate Contact Number', 'phone', false, true, true, 12, 'Alternate mobile number', 'Optional second contact number.', NULL, NULL),
  ('personal.emailId', 'personal', 'Email Address', 'email', true, true, true, 13, 'candidate@example.com', 'Official candidate communication email.', NULL, NULL),

  -- Address & Emergency Contacts (Step 03)
  ('address.perm_address', 'address', 'Permanent Street Address', 'text', true, true, true, 1, 'House No, Building, Street, Area', 'Permanent residential address line.', NULL, NULL),
  ('address.perm_city', 'address', 'Permanent City / Town', 'text', true, true, true, 2, 'City or Town', 'Permanent residential city or town.', NULL, NULL),
  ('address.perm_district', 'address', 'Permanent District', 'text', true, true, true, 3, 'District', 'Permanent administrative district.', NULL, NULL),
  ('address.perm_state', 'address', 'Permanent State', 'text', true, true, true, 4, 'Select State', 'Permanent Indian state / UT.', NULL, NULL),
  ('address.perm_pinCode', 'address', 'Permanent PIN Code', 'text', true, true, true, 5, '6-digit PIN code', 'Permanent 6-digit postal index number.', NULL, NULL),
  ('address.curr_address', 'address', 'Current Street Address', 'text', true, true, true, 6, 'House No, Building, Street, Area', 'Current communication address (if different from permanent).', NULL, NULL),
  ('address.curr_city', 'address', 'Current City / Town', 'text', true, true, true, 7, 'City or Town', 'Current communication city or town.', NULL, NULL),
  ('address.curr_district', 'address', 'Current District', 'text', true, true, true, 8, 'District', 'Current administrative district.', NULL, NULL),
  ('address.curr_state', 'address', 'Current State', 'text', true, true, true, 9, 'Select State', 'Current Indian state / UT.', NULL, NULL),
  ('address.curr_pinCode', 'address', 'Current PIN Code', 'text', true, true, true, 10, '6-digit PIN code', 'Current 6-digit postal index number.', NULL, NULL),
  ('address.emergency', 'address', 'Emergency Family Contact', 'text', true, true, true, 11, 'Emergency Contact Details', 'At least one family emergency contact with name, phone, relation, and address.', NULL, NULL),

  -- Bank & Statutory Registrations (Step 04)
  ('bank.accountHolderName', 'bank', 'Bank Account Holder Name', 'text', true, true, true, 1, 'Name as in bank records', 'Legal name on bank passbook / statement.', NULL, NULL),
  ('bank.bankAccountNumber', 'bank', 'Bank Account Number', 'text', true, true, true, 2, 'Account Number (9-18 digits)', 'Savings or salary bank account number.', NULL, NULL),
  ('bank.confirmBankAccountNumber', 'bank', 'Confirm Bank Account Number', 'text', true, true, true, 3, 'Re-enter account number', 'Must match bank account number.', NULL, NULL),
  ('bank.ifscCode', 'bank', '11-Character IFSC Code', 'text', true, true, true, 4, 'e.g. SBIN0001234', '11-character Indian Financial System Code.', NULL, NULL),
  ('bank.bankName', 'bank', 'Bank Name', 'text', true, true, true, 5, 'e.g. State Bank of India', 'Official name of the banking institution.', NULL, NULL),
  ('bank.branchName', 'bank', 'Branch Name', 'text', true, true, true, 6, 'Branch location / area', 'Bank branch location.', NULL, NULL),
  ('bank.uanNumber', 'bank', 'Universal Account Number (UAN)', 'text', false, true, true, 7, '12-digit UAN', 'Optional EPFO Universal Account Number.', NULL, NULL),
  ('bank.esicNumber', 'bank', 'ESIC Insurance Number', 'text', false, true, true, 8, '17-digit ESIC', 'Optional Employees'' State Insurance Corporation number.', NULL, NULL),
  ('bank.ptNumber', 'bank', 'Professional Tax (PT) Number', 'text', false, true, true, 9, 'PT Registration No', 'Optional state professional tax number.', NULL, NULL),

  -- Education Details (Step 05)
  ('education.records', 'education', 'Academic Qualifications', 'text', false, true, true, 1, NULL, 'Candidate education qualification history (optional).', NULL, NULL),

  -- Family Details (Step 06)
  ('family.records', 'family', 'Family Dependents Records', 'text', true, true, true, 1, NULL, 'At least one family member / dependent record for statutory gratuity & PF nominations.', NULL, NULL),

  -- Document Uploads (Step 07 - Separate Document Requirement Category)
  ('documents.PHOTO', 'documents', 'Passport Size Photograph', 'file', true, true, true, 1, NULL, 'Recent color passport-size candidate photograph.', NULL, NULL),
  ('documents.SIGNATURE', 'documents', 'Specimen Signature', 'file', true, true, true, 2, NULL, 'Clear candidate signature sample on white paper.', NULL, NULL),
  ('documents.AADHAAR_FRONT', 'documents', 'Aadhaar Card (Front Side)', 'file', true, true, true, 3, NULL, 'Clear scan or photo of Aadhaar front side.', NULL, NULL),
  ('documents.AADHAAR_BACK', 'documents', 'Aadhaar Card (Back Side)', 'file', true, true, true, 4, NULL, 'Clear scan or photo of Aadhaar back side.', NULL, NULL),
  ('documents.PAN', 'documents', 'PAN Card Copy', 'file', true, true, true, 5, NULL, 'Clear copy of Indian Permanent Account Number card.', NULL, NULL),
  ('documents.BANK_PASSBOOK', 'documents', 'Bank Passbook / Cancelled Cheque', 'file', true, true, true, 6, NULL, 'Legible first page of bank passbook or cancelled cheque with candidate name.', NULL, NULL),
  ('documents.EDUCATION_CERTIFICATE', 'documents', 'Academic Certificates', 'file', false, true, true, 7, NULL, 'Optional marksheet or graduation diploma.', NULL, NULL),
  ('documents.EXPERIENCE_CERTIFICATE', 'documents', 'Experience / Relieving Certificates', 'file', false, true, true, 8, NULL, 'Optional past employment certificate.', NULL, NULL),

  -- Declarations & Undertaking (Step 08)
  ('declarations.candidateDeclarationAcknowledged', 'declarations', 'Joining Undertaking', 'checkbox', true, true, true, 1, NULL, 'Candidate acknowledgement of joining terms.', NULL, NULL),
  ('declarations.rulesAndConductAccepted', 'declarations', 'Code of Conduct Acceptance', 'checkbox', true, true, true, 2, NULL, 'Candidate acceptance of company rules.', NULL, NULL),
  ('declarations.backgroundVerificationConsent', 'declarations', 'Background Verification Consent', 'checkbox', true, true, true, 3, NULL, 'Consent for KYC and statutory verification.', NULL, NULL),
  ('declarations.selfDeclarationAcknowledged', 'declarations', 'Dual Employment & Relieving Declaration', 'checkbox', true, true, true, 4, NULL, 'Declaration confirming formal relieving from prior employers.', NULL, NULL),
  ('declarations.relativeDeclarationAcknowledged', 'declarations', 'Relative Employment Declaration', 'checkbox', true, true, true, 5, NULL, 'Declaration of any relatives employed in the group.', NULL, NULL),
  ('declarations.womenNightShiftConsent', 'declarations', 'Women Worker Night Shift Consent', 'checkbox', false, true, true, 6, NULL, 'Form L Rule 13 consent applicable to female candidates only.', '{"dependsOn":"personal.gender","value":"Female"}'::jsonb, NULL),
  ('declarations.signatoryName', 'declarations', 'Signatory Name', 'text', true, true, true, 7, 'Full Name', 'Candidate name as digital signatory.', NULL, NULL),
  ('declarations.declarationDate', 'declarations', 'Declaration Date', 'date', true, true, true, 8, NULL, 'Date of declaration submission.', NULL, NULL)

ON CONFLICT (field_key) DO UPDATE SET
  label = EXCLUDED.label,
  section = EXCLUDED.section,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  placeholder = EXCLUDED.placeholder,
  help_text = EXCLUDED.help_text,
  options = EXCLUDED.options,
  conditional_rule = EXCLUDED.conditional_rule;
