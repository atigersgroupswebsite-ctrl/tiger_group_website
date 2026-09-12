-- ==============================================================================
-- Migration: 20260912000023_admin_controlled_registration_fee.sql
-- Description: Aligns default_registration_fee setting in public.system_settings
--              from 350 to 500, and hardens create_or_get_pending_payment RPC
--              to resolve the authoritative registration fee from system_settings.
-- Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
-- ==============================================================================

-- 1. Align default_registration_fee to current production fee (500) if currently 350
UPDATE public.system_settings
SET
  value = '500'::jsonb,
  description = 'Authoritative candidate registration and document verification processing fee in INR charged through Cashfree.',
  updated_at = now()
WHERE key = 'default_registration_fee'
  AND (value = '350'::jsonb OR value = '"350"'::jsonb);

-- 2. Drop obsolete 3-parameter overload to avoid PostgREST PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.create_or_get_pending_payment(UUID, TEXT, NUMERIC);

-- 3. Update create_or_get_pending_payment RPC to enforce server-authoritative amount from system_settings
CREATE OR REPLACE FUNCTION public.create_or_get_pending_payment(
  p_app_id UUID DEFAULT NULL,
  p_purpose TEXT DEFAULT 'REGISTRATION',
  p_amount NUMERIC DEFAULT NULL,
  p_joining_form_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
  v_joining RECORD;
  v_existing RECORD;
  v_new_payment RECORD;
  v_ref TEXT;
  v_authoritative_amount NUMERIC;
  v_setting_val JSONB;
BEGIN
  -- Validate that at least one identifier is provided
  IF p_app_id IS NULL AND p_joining_form_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request: Either application_id or joining_form_id must be provided.';
  END IF;

  -- Resolve authoritative amount for REGISTRATION purpose from system_settings
  IF p_purpose = 'REGISTRATION' THEN
    SELECT value INTO v_setting_val
    FROM public.system_settings
    WHERE key = 'default_registration_fee';

    IF v_setting_val IS NULL THEN
      RAISE EXCEPTION 'Configuration error: default_registration_fee setting is missing from system_settings.';
    END IF;

    -- Extract numeric value from jsonb (handles both numeric and string-encoded numbers)
    BEGIN
      v_authoritative_amount := (v_setting_val #>> '{}')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Configuration error: default_registration_fee in system_settings is not a valid number.';
    END;

    IF v_authoritative_amount IS NULL OR v_authoritative_amount <= 0 THEN
      RAISE EXCEPTION 'Configuration error: default_registration_fee must be greater than zero.';
    END IF;
  ELSE
    -- For non-registration purposes (e.g. CONSULTANCY, OTHER), use provided amount or fallback
    v_authoritative_amount := COALESCE(p_amount, 0);
  END IF;

  -- Validate source existence
  IF p_app_id IS NOT NULL THEN
    SELECT id, application_number, full_name, email, mobile, status
    INTO v_app
    FROM public.applications
    WHERE id = p_app_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Application with ID % not found.', p_app_id;
    END IF;
  ELSE
    SELECT id, joining_reference, candidate_name, email, employee_contact_number, application_id
    INTO v_joining
    FROM public.joining_forms
    WHERE id = p_joining_form_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Joining Form with ID % not found.', p_joining_form_id;
    END IF;

    -- If joining form is linked to an application, track both
    IF v_joining.application_id IS NOT NULL THEN
      p_app_id := v_joining.application_id;
    END IF;
  END IF;

  -- 1. Check if a SUCCESS payment already exists for this source and purpose
  IF p_app_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.payments
    WHERE application_id = p_app_id
      AND purpose = p_purpose
      AND status = 'SUCCESS'
    ORDER BY paid_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_existing
    FROM public.payments
    WHERE joining_form_id = p_joining_form_id
      AND purpose = p_purpose
      AND status = 'SUCCESS'
    ORDER BY paid_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_existing_success', true,
      'payment_id', v_existing.id,
      'payment_reference', v_existing.payment_reference,
      'receipt_number', v_existing.receipt_number,
      'amount', v_existing.amount,
      'currency', v_existing.currency,
      'purpose', v_existing.purpose,
      'status', v_existing.status,
      'paid_at', v_existing.paid_at,
      'gateway_payment_id', v_existing.gateway_payment_id,
      'gateway_order_id', v_existing.gateway_order_id
    );
  END IF;

  -- 2. Check if a recent PENDING payment exists (within 24 hours) for this source and purpose
  IF p_app_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.payments
    WHERE application_id = p_app_id
      AND purpose = p_purpose
      AND status = 'PENDING'
      AND created_at > (now() - INTERVAL '24 hours')
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_existing
    FROM public.payments
    WHERE joining_form_id = p_joining_form_id
      AND purpose = p_purpose
      AND status = 'PENDING'
      AND created_at > (now() - INTERVAL '24 hours')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    -- If fee was changed by Admin since pending record was created, update pending record amount
    IF v_existing.amount <> v_authoritative_amount THEN
      UPDATE public.payments
      SET amount = v_authoritative_amount,
          updated_at = now()
      WHERE id = v_existing.id;
      v_existing.amount := v_authoritative_amount;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'is_existing_success', false,
      'payment_id', v_existing.id,
      'payment_reference', v_existing.payment_reference,
      'amount', v_existing.amount,
      'currency', v_existing.currency,
      'purpose', v_existing.purpose,
      'status', v_existing.status,
      'gateway_order_id', v_existing.gateway_order_id
    );
  END IF;

  -- 3. Create a new PENDING payment record with authoritative amount
  v_ref := public.generate_payment_reference();

  INSERT INTO public.payments (
    application_id,
    joining_form_id,
    payment_reference,
    amount,
    currency,
    purpose,
    payment_method,
    gateway,
    status
  ) VALUES (
    p_app_id,
    p_joining_form_id,
    v_ref,
    v_authoritative_amount,
    'INR',
    p_purpose,
    'ONLINE',
    'CASHFREE',
    'PENDING'
  ) RETURNING * INTO v_new_payment;

  -- Record in activity logs if application_id is available
  IF p_app_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      application_id,
      action,
      description
    ) VALUES (
      p_app_id,
      'PAYMENT_CREATED',
      'Payment reference initiated: ' || v_ref || ' for purpose ' || p_purpose || ' (Amount: Rs. ' || v_authoritative_amount || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_existing_success', false,
    'payment_id', v_new_payment.id,
    'payment_reference', v_new_payment.payment_reference,
    'amount', v_new_payment.amount,
    'currency', v_new_payment.currency,
    'purpose', v_new_payment.purpose,
    'status', v_new_payment.status,
    'gateway_order_id', v_new_payment.gateway_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_or_get_pending_payment(UUID, TEXT, NUMERIC, UUID) TO authenticated, service_role, anon;
