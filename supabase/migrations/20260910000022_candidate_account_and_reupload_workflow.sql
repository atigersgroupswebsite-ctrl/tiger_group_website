-- ==============================================================================
-- Migration: 20260910000022_candidate_account_and_reupload_workflow.sql
-- Description: Secure Candidate Account Auth, Identity Linking, Document Rejection,
--              Controlled Re-Upload & Resubmission Workflow
-- Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Candidate Identity & Profiles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_email ON public.candidate_profiles(lower(email));

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidate can read own profile" ON public.candidate_profiles;
CREATE POLICY "Candidate can read own profile"
  ON public.candidate_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_active_admin());

DROP POLICY IF EXISTS "Candidate can update own profile" ON public.candidate_profiles;
CREATE POLICY "Candidate can update own profile"
  ON public.candidate_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to candidate profiles" ON public.candidate_profiles;
CREATE POLICY "Admins have full access to candidate profiles"
  ON public.candidate_profiles
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 2. Schema Enhancements on public.joining_forms
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Add candidate_auth_user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'candidate_auth_user_id'
  ) THEN
    ALTER TABLE public.joining_forms 
      ADD COLUMN candidate_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add field_corrections column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'joining_forms' AND column_name = 'field_corrections'
  ) THEN
    ALTER TABLE public.joining_forms 
      ADD COLUMN field_corrections JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update check constraint on submission_status to support controlled re-upload lifecycle
ALTER TABLE public.joining_forms 
  DROP CONSTRAINT IF EXISTS joining_forms_submission_status_check;

ALTER TABLE public.joining_forms 
  ADD CONSTRAINT joining_forms_submission_status_check CHECK (
    submission_status IN (
      'DRAFT', 
      'IN_PROGRESS', 
      'SUBMITTED', 
      'UNDER_REVIEW', 
      'REUPLOAD_REQUIRED', 
      'RESUBMITTED', 
      'VERIFIED', 
      'APPROVED', 
      'REJECTED'
    )
  );

-- Backfill candidate_auth_user_id from existing user_id where available
UPDATE public.joining_forms
SET candidate_auth_user_id = user_id
WHERE candidate_auth_user_id IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_joining_forms_candidate_auth_user_id 
  ON public.joining_forms(candidate_auth_user_id);

-- Expand notifications type constraint to support candidate workflow notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'NEW_JOB_ENQUIRY',
    'NEW_EMPLOYER_ENQUIRY',
    'PAYMENT_SUCCESS',
    'DOCUMENT_UPLOADED',
    'JOINING_FORM_SUBMITTED',
    'DOCUMENT_REJECTED',
    'JOINING_FORM_RESUBMITTED',
    'DOCUMENT_REUPLOADED',
    'JOINING_FORM_APPROVED'
  )
);

-- ------------------------------------------------------------------------------
-- 3. Schema Enhancements on public.documents
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'rejected_by'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'is_current'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_current_doc 
  ON public.documents(joining_form_id, is_current);

-- ------------------------------------------------------------------------------
-- 4. Secure Authorization Helper: is_candidate_authorized_for_joining_form
-- Strips email equality fallback. Strictly checks auth.uid() ownership.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_candidate_authorized_for_joining_form(form_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  caller_id UUID;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.joining_forms jf
    WHERE jf.id = form_id
      AND (
        jf.candidate_auth_user_id = caller_id
        OR jf.user_id = caller_id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. Hardened RLS Policies on joining_forms
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized candidate can read joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can read joining form"
  ON public.joining_forms
  FOR SELECT
  TO authenticated
  USING (
    candidate_auth_user_id = auth.uid() OR
    user_id = auth.uid() OR
    public.is_active_admin()
  );

DROP POLICY IF EXISTS "Authorized candidate can update joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can update joining form"
  ON public.joining_forms
  FOR UPDATE
  TO authenticated
  USING (
    (candidate_auth_user_id = auth.uid() OR user_id = auth.uid()) AND
    submission_status IN ('DRAFT', 'IN_PROGRESS', 'REUPLOAD_REQUIRED')
  )
  WITH CHECK (
    (candidate_auth_user_id = auth.uid() OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authorized candidate can insert joining form" ON public.joining_forms;
CREATE POLICY "Authorized candidate can insert joining form"
  ON public.joining_forms
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (auth.uid() IS NULL) OR
    (candidate_auth_user_id = auth.uid() OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins have full access to joining forms" ON public.joining_forms;
CREATE POLICY "Admins have full access to joining forms"
  ON public.joining_forms
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ------------------------------------------------------------------------------
-- 6. Hardened RLS Policies on public.documents
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized candidate can view documents" ON public.documents;
CREATE POLICY "Authorized candidate can view documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    (joining_form_id IS NOT NULL AND public.is_candidate_authorized_for_joining_form(joining_form_id)) OR
    (application_id IS NOT NULL AND public.is_candidate_authorized_for_application(application_id)) OR
    public.is_active_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. Enhanced submit_joining_form_bundle
-- Associates authenticated candidate_auth_user_id, upserts candidate_profiles
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_joining_form_bundle(payload JSONB)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_joining_form_bundle(JSONB) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. Enhanced admin_reject_document: Sets REUPLOAD_REQUIRED and captures metadata
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_document(p_doc_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  target_doc RECORD;
  target_form RECORD;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
  trimmed_reason TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL AND auth.role() = 'service_role' THEN
    SELECT id, role INTO caller_id, caller_role
    FROM public.admin_profiles
    WHERE active = true AND role = 'SUPER_ADMIN'
    LIMIT 1;
  ELSE
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
    END IF;

    SELECT role INTO caller_role
    FROM public.admin_profiles
    WHERE id = caller_id AND active = true;

    IF caller_role IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
    END IF;
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
    verified_by = NULL,
    rejection_reason = trimmed_reason,
    rejected_at = now_iso,
    rejected_by = caller_id
  WHERE id = p_doc_id;

  -- Transition parent joining form to REUPLOAD_REQUIRED if attached
  IF target_doc.joining_form_id IS NOT NULL THEN
    UPDATE public.joining_forms
    SET
      submission_status = 'REUPLOAD_REQUIRED',
      updated_at = now_iso
    WHERE id = target_doc.joining_form_id
    RETURNING * INTO target_form;
  END IF;

  -- Human-readable document label
  doc_label := replace(target_doc.document_type, '_', ' ');
  IF target_doc.document_side IS NOT NULL AND target_doc.document_side NOT IN ('SINGLE', '') THEN
    doc_label := doc_label || ' (' || target_doc.document_side || ')';
  END IF;

  -- Insert notification for candidate / administrative tracking
  INSERT INTO public.notifications (
    type,
    title,
    message,
    joining_form_id,
    application_id,
    read
  ) VALUES (
    'DOCUMENT_REJECTED',
    'Document Rejected — Action Required',
    'Document ' || doc_label || ' was rejected: ' || trimmed_reason || '. Re-upload required.',
    target_doc.joining_form_id,
    target_doc.application_id,
    false
  );

  -- Activity Log
  INSERT INTO public.activity_logs (
    joining_form_id,
    application_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.joining_form_id,
    target_doc.application_id,
    'DOCUMENT',
    p_doc_id::TEXT,
    'DOCUMENT_REJECTED',
    'Administrator rejected document ' || doc_label || '. Reason: ' || trimmed_reason,
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'rejected_by', caller_id,
      'rejection_reason', trimmed_reason,
      'rejected_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_doc_id,
    'document_type', target_doc.document_type,
    'document_side', target_doc.document_side,
    'document_label', doc_label,
    'verification_status', 'REJECTED',
    'rejection_reason', trimmed_reason,
    'rejected_at', now_iso,
    'joining_form_id', target_doc.joining_form_id,
    'joining_reference', target_form.joining_reference,
    'candidate_name', target_form.candidate_name,
    'candidate_email', target_form.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reject_document(UUID, TEXT) TO authenticated, service_role;

-- Enhanced admin_verify_document supporting service_role and active admin
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
  IF caller_id IS NULL AND auth.role() = 'service_role' THEN
    SELECT id, role INTO caller_id, caller_role
    FROM public.admin_profiles
    WHERE active = true AND role = 'SUPER_ADMIN'
    LIMIT 1;
  ELSE
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Active administrator session required.';
    END IF;

    SELECT role INTO caller_role
    FROM public.admin_profiles
    WHERE id = caller_id AND active = true;

    IF caller_role IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not an active administrator.';
    END IF;
  END IF;

  IF caller_role = 'ACCOUNTANT' THEN
    RAISE EXCEPTION 'Forbidden: Role % is not authorized to verify documents.', caller_role;
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  UPDATE public.documents
  SET
    verification_status = 'VERIFIED',
    verified_at = now_iso,
    verified_by = caller_id,
    rejection_reason = NULL,
    rejected_at = NULL,
    rejected_by = NULL
  WHERE id = p_doc_id;

  doc_label := replace(target_doc.document_type, '_', ' ');
  IF target_doc.document_side IS NOT NULL AND target_doc.document_side NOT IN ('SINGLE', '') THEN
    doc_label := doc_label || ' (' || target_doc.document_side || ')';
  END IF;

  INSERT INTO public.activity_logs (
    joining_form_id,
    application_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.joining_form_id,
    target_doc.application_id,
    'DOCUMENT',
    p_doc_id::TEXT,
    'DOCUMENT_VERIFIED',
    'Administrator verified document ' || doc_label,
    jsonb_build_object(
      'document_id', p_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'verified_by', caller_id,
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

GRANT EXECUTE ON FUNCTION public.admin_verify_document(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. Candidate Controlled Document Re-Upload RPC
-- Strictly permits candidate to re-upload ONLY items that are currently REJECTED.
-- Archives old rejected document (is_current = false) and creates new current record.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.candidate_reupload_document(
  p_doc_id UUID,
  p_storage_path TEXT,
  p_original_file_name TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT
)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  target_doc RECORD;
  target_form RECORD;
  new_doc_id UUID;
  now_iso TIMESTAMPTZ := now();
  doc_label TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Candidate login required.';
  END IF;

  SELECT * INTO target_doc FROM public.documents WHERE id = p_doc_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found for ID %', p_doc_id;
  END IF;

  IF target_doc.joining_form_id IS NULL THEN
    RAISE EXCEPTION 'Document is not linked to a joining form.';
  END IF;

  -- Ensure caller owns this joining form
  SELECT * INTO target_form 
  FROM public.joining_forms 
  WHERE id = target_doc.joining_form_id;

  IF target_form.id IS NULL OR (target_form.candidate_auth_user_id IS DISTINCT FROM caller_id AND target_form.user_id IS DISTINCT FROM caller_id) THEN
    RAISE EXCEPTION 'Forbidden: You do not have permission to modify this document.';
  END IF;

  -- Strict rule: Only REJECTED documents can be re-uploaded. Verified or pending documents are locked.
  IF target_doc.verification_status != 'REJECTED' THEN
    RAISE EXCEPTION 'Only rejected documents may be re-uploaded. Current status is %.', target_doc.verification_status;
  END IF;

  IF trim(coalesce(p_storage_path, '')) = '' THEN
    RAISE EXCEPTION 'Storage path is required for re-upload.';
  END IF;

  -- 1. Preserve historical document record: mark old document as archived
  UPDATE public.documents
  SET
    is_current = false
  WHERE id = p_doc_id;

  -- 2. Insert new current document record in PENDING / UPLOADED status
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
    target_doc.joining_form_id,
    target_doc.application_id,
    target_doc.document_type,
    target_doc.document_side,
    p_storage_path,
    COALESCE(p_original_file_name, target_doc.document_type || '.jpg'),
    COALESCE(p_mime_type, 'application/octet-stream'),
    COALESCE(p_file_size, 0),
    'UPLOADED',
    now_iso,
    true
  ) RETURNING id INTO new_doc_id;

  doc_label := target_doc.document_type || 
    CASE WHEN target_doc.document_side IS NOT NULL AND target_doc.document_side != 'SINGLE' THEN ' (' || target_doc.document_side || ')' ELSE '' END;

  -- Log candidate re-upload event in activity log
  INSERT INTO public.activity_logs (
    joining_form_id,
    application_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    target_doc.joining_form_id,
    target_doc.application_id,
    'DOCUMENT',
    new_doc_id::TEXT,
    'CANDIDATE_DOCUMENT_REUPLOADED',
    'Candidate re-uploaded replacement document for ' || doc_label || '.',
    jsonb_build_object(
      'old_document_id', p_doc_id,
      'new_document_id', new_doc_id,
      'document_type', target_doc.document_type,
      'document_side', target_doc.document_side,
      'storage_path', p_storage_path,
      'reuploaded_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_document_id', p_doc_id,
    'new_document_id', new_doc_id,
    'verification_status', 'UPLOADED',
    'uploaded_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.candidate_reupload_document(UUID, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. Candidate Resubmit Joining Form RPC
-- Transitions status to RESUBMITTED once all rejected items have been replaced
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.candidate_resubmit_joining_form(p_form_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  target_form RECORD;
  unresolved_rejected_count INTEGER;
  now_iso TIMESTAMPTZ := now();
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Candidate login required.';
  END IF;

  SELECT * INTO target_form 
  FROM public.joining_forms 
  WHERE id = p_form_id;

  IF target_form.id IS NULL OR (target_form.candidate_auth_user_id IS DISTINCT FROM caller_id AND target_form.user_id IS DISTINCT FROM caller_id) THEN
    RAISE EXCEPTION 'Forbidden: You do not have permission to resubmit this joining dossier.';
  END IF;

  -- Check if any active/current document is still in REJECTED state
  SELECT count(*) INTO unresolved_rejected_count
  FROM public.documents
  WHERE joining_form_id = p_form_id
    AND is_current = true
    AND verification_status = 'REJECTED';

  IF unresolved_rejected_count > 0 THEN
    RAISE EXCEPTION 'Cannot resubmit: % document(s) still require re-upload.', unresolved_rejected_count;
  END IF;

  -- Update submission status to RESUBMITTED
  UPDATE public.joining_forms
  SET
    submission_status = 'RESUBMITTED',
    updated_at = now_iso
  WHERE id = p_form_id;

  -- Notify administrators
  INSERT INTO public.notifications (
    type,
    title,
    message,
    joining_form_id,
    application_id,
    read
  ) VALUES (
    'JOINING_FORM_RESUBMITTED',
    'Joining Dossier Resubmitted',
    target_form.candidate_name || ' resubmitted corrected joining dossier (' || target_form.joining_reference || ').',
    p_form_id,
    target_form.application_id,
    false
  );

  -- Log action
  INSERT INTO public.activity_logs (
    joining_form_id,
    application_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  ) VALUES (
    p_form_id,
    target_form.application_id,
    'JOINING_FORM',
    p_form_id::TEXT,
    'JOINING_FORM_RESUBMITTED',
    'Candidate ' || target_form.candidate_name || ' resubmitted joining dossier ' || target_form.joining_reference || ' after document corrections.',
    jsonb_build_object(
      'form_id', p_form_id,
      'joining_reference', target_form.joining_reference,
      'resubmitted_at', now_iso
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'form_id', p_form_id,
    'submission_status', 'RESUBMITTED',
    'resubmitted_at', now_iso
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.candidate_resubmit_joining_form(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 11. Candidate Dossiers Listing RPC: get_candidate_joining_dossiers
-- Strictly returns only dossiers owned by the authenticated caller.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_candidate_joining_dossiers()
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  dossiers JSONB;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', jf.id,
      'joining_reference', jf.joining_reference,
      'candidate_name', jf.candidate_name,
      'email', jf.email,
      'submission_status', jf.submission_status,
      'submitted_at', jf.submitted_at,
      'created_at', jf.created_at,
      'updated_at', jf.updated_at,
      'designation', jf.designation,
      'location', jf.location,
      'rejected_document_count', (
        SELECT count(*) FROM public.documents d 
        WHERE d.joining_form_id = jf.id AND d.is_current = true AND d.verification_status = 'REJECTED'
      ),
      'field_corrections', jf.field_corrections
    ) ORDER BY jf.created_at DESC
  ), '[]'::jsonb)
  INTO dossiers
  FROM public.joining_forms jf
  WHERE jf.candidate_auth_user_id = caller_id
     OR jf.user_id = caller_id;

  RETURN dossiers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_candidate_joining_dossiers() TO authenticated;
