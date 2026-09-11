-- ==============================================================================
-- Migration: 20260911000022_standalone_joining_payments.sql
-- Description: Updates create_or_get_pending_payment RPC to support standalone
--              joining forms (joining_form_id) while preserving application_id support.
-- Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_or_get_pending_payment(
  p_app_id UUID DEFAULT NULL,
  p_purpose TEXT DEFAULT 'REGISTRATION',
  p_amount NUMERIC DEFAULT 500,
  p_joining_form_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
  v_joining RECORD;
  v_existing RECORD;
  v_new_payment RECORD;
  v_ref TEXT;
BEGIN
  -- Validate that at least one identifier is provided
  IF p_app_id IS NULL AND p_joining_form_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request: Either application_id or joining_form_id must be provided.';
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
    SELECT id, joining_reference, candidate_name, email, mobile_number, application_id
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

  -- 3. Create a new PENDING payment record
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
    p_amount,
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
      'Payment reference initiated: ' || v_ref || ' for purpose ' || p_purpose || ' (Amount: Rs. ' || p_amount || ')'
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
