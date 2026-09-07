-- ==============================================================================
-- Migration: 20260907000013_payments_ledger_hardening.sql
-- Description: Hardens payments ledger, updates record_offline_payment RPC to enforce
--              hardened admin role checks (SUPER_ADMIN, COORDINATOR, ACCOUNTANT)
--              and support standalone joining forms (joining_form_id), updates
--              complete_verified_payment for standalone support, and adds performance indexes.
-- Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Performance Indexes on public.payments
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON public.payments(purpose);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON public.payments(gateway_payment_id);

-- ------------------------------------------------------------------------------
-- 2. Hardened RPC: record_offline_payment
-- Supports both application_id and standalone joining_form_id
-- Strictly blocks DOCUMENT_VERIFIER (authorizes SUPER_ADMIN, COORDINATOR, ACCOUNTANT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_offline_payment(
  p_app_id UUID DEFAULT NULL,
  p_purpose TEXT DEFAULT 'REGISTRATION',
  p_amount NUMERIC DEFAULT 0,
  p_received_by TEXT DEFAULT 'Admin',
  p_notes TEXT DEFAULT NULL,
  p_joining_form_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
  v_joining RECORD;
  v_payment RECORD;
  v_ref TEXT;
  v_receipt_num TEXT;
  v_cand_name TEXT;
  v_cand_email TEXT;
  v_ref_num TEXT;
BEGIN
  -- 1. Strict Role Authorization check:
  -- Only SUPER_ADMIN, COORDINATOR, and ACCOUNTANT may record offline payments
  -- (DOCUMENT_VERIFIER is strictly blocked from executing this RPC)
  IF NOT public.has_admin_role('SUPER_ADMIN', 'COORDINATOR', 'ACCOUNTANT') THEN
    RAISE EXCEPTION 'Unauthorized: You do not have sufficient permissions to record offline payments.';
  END IF;

  -- 2. Validate source association
  IF p_app_id IS NULL AND p_joining_form_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request: Either application_id or joining_form_id must be provided.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: Payment amount must be greater than zero.';
  END IF;

  -- Handle Application-linked payment
  IF p_app_id IS NOT NULL THEN
    SELECT id, application_number, full_name, email
    INTO v_app
    FROM public.applications
    WHERE id = p_app_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Application with ID % not found.', p_app_id;
    END IF;

    v_cand_name := v_app.full_name;
    v_cand_email := v_app.email;
    v_ref_num := v_app.application_number;
  ELSE
    -- Handle Standalone Joining-linked payment
    SELECT id, joining_reference, candidate_name, email, application_id
    INTO v_joining
    FROM public.joining_forms
    WHERE id = p_joining_form_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Joining Form with ID % not found.', p_joining_form_id;
    END IF;

    v_cand_name := COALESCE(v_joining.candidate_name, 'Candidate');
    v_cand_email := v_joining.email;
    v_ref_num := COALESCE(v_joining.joining_reference, 'JOIN-PENDING');

    -- If joining form links to an application, store both
    IF v_joining.application_id IS NOT NULL THEN
      p_app_id := v_joining.application_id;
    END IF;
  END IF;

  -- 3. Generate sequential references
  v_ref := public.generate_payment_reference();
  v_receipt_num := public.generate_receipt_number();

  -- 4. Insert payment record
  INSERT INTO public.payments (
    application_id,
    joining_form_id,
    payment_reference,
    amount,
    currency,
    purpose,
    payment_method,
    gateway,
    status,
    paid_at,
    receipt_number
  ) VALUES (
    p_app_id,
    p_joining_form_id,
    v_ref,
    p_amount,
    'INR',
    p_purpose,
    'OFFLINE',
    'OFFLINE',
    'SUCCESS',
    now(),
    v_receipt_num
  ) RETURNING * INTO v_payment;

  -- 5. Update application status if applicable
  IF p_app_id IS NOT NULL THEN
    UPDATE public.applications
    SET status = 'PAYMENT_SUCCESSFUL'
    WHERE id = p_app_id;
  END IF;

  -- 6. Create notification
  INSERT INTO public.notifications (
    type,
    title,
    message,
    application_id
  ) VALUES (
    'PAYMENT_SUCCESS',
    'Offline Payment Recorded',
    'Offline payment of Rs. ' || p_amount || ' recorded by ' || COALESCE(p_received_by, 'Admin') || ' for ' || v_cand_name || ' (' || v_ref_num || '). Receipt: ' || v_receipt_num,
    p_app_id
  );

  -- 7. Audit Activity Log (entity_type = 'PAYMENT', entity_id = v_payment.id)
  INSERT INTO public.activity_logs (
    application_id,
    entity_type,
    entity_id,
    action,
    description
  ) VALUES (
    p_app_id,
    'PAYMENT',
    v_payment.id::TEXT,
    'OFFLINE_PAYMENT_RECORDED',
    'Offline payment recorded: Receipt ' || v_receipt_num || ', Ref: ' || v_ref || ', Received by: ' || COALESCE(p_received_by, 'Admin') || (CASE WHEN p_notes IS NOT NULL THEN ' Notes: ' || p_notes ELSE '' END)
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'payment_reference', v_ref,
    'receipt_number', v_receipt_num,
    'amount', v_payment.amount,
    'currency', v_payment.currency,
    'purpose', v_payment.purpose,
    'status', v_payment.status,
    'paid_at', v_payment.paid_at,
    'application_number', v_ref_num,
    'candidate_name', v_cand_name,
    'candidate_email', v_cand_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. Enhanced RPC: complete_verified_payment
-- Supports standalone joining forms when application_id is null
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_verified_payment(
  p_payment_id UUID,
  p_gateway_order_id TEXT,
  p_gateway_payment_id TEXT,
  p_payment_method TEXT DEFAULT 'RAZORPAY'
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_app RECORD;
  v_joining RECORD;
  v_receipt_num TEXT;
  v_cand_name TEXT := 'Candidate';
  v_cand_email TEXT := NULL;
  v_ref_num TEXT := 'N/A';
BEGIN
  -- Lock payment row
  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found.', p_payment_id;
  END IF;

  -- Retrieve candidate details
  IF v_payment.application_id IS NOT NULL THEN
    SELECT application_number, full_name, email
    INTO v_app
    FROM public.applications
    WHERE id = v_payment.application_id;

    IF FOUND THEN
      v_cand_name := v_app.full_name;
      v_cand_email := v_app.email;
      v_ref_num := v_app.application_number;
    END IF;
  ELSIF v_payment.joining_form_id IS NOT NULL THEN
    SELECT joining_reference, candidate_name, email
    INTO v_joining
    FROM public.joining_forms
    WHERE id = v_payment.joining_form_id;

    IF FOUND THEN
      v_cand_name := COALESCE(v_joining.candidate_name, 'Candidate');
      v_cand_email := v_joining.email;
      v_ref_num := COALESCE(v_joining.joining_reference, 'JOIN-PENDING');
    END IF;
  END IF;

  -- Idempotency check: if already SUCCESS, return existing data cleanly
  IF v_payment.status = 'SUCCESS' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'payment_id', v_payment.id,
      'payment_reference', v_payment.payment_reference,
      'receipt_number', v_payment.receipt_number,
      'amount', v_payment.amount,
      'currency', v_payment.currency,
      'purpose', v_payment.purpose,
      'paid_at', v_payment.paid_at,
      'gateway_payment_id', v_payment.gateway_payment_id,
      'gateway_order_id', v_payment.gateway_order_id,
      'application_number', v_ref_num,
      'candidate_name', v_cand_name,
      'candidate_email', v_cand_email
    );
  END IF;

  -- Generate receipt number
  v_receipt_num := public.generate_receipt_number();

  -- Update payment to SUCCESS
  UPDATE public.payments
  SET
    status = 'SUCCESS',
    gateway_order_id = COALESCE(p_gateway_order_id, gateway_order_id),
    gateway_payment_id = p_gateway_payment_id,
    payment_method = COALESCE(p_payment_method, 'ONLINE'),
    receipt_number = v_receipt_num,
    paid_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  -- Update application status to PAYMENT_SUCCESSFUL if application exists
  IF v_payment.application_id IS NOT NULL THEN
    UPDATE public.applications
    SET status = 'PAYMENT_SUCCESSFUL'
    WHERE id = v_payment.application_id;
  END IF;

  -- Create notification: PAYMENT_SUCCESS (prevent duplicates for same payment reference)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'PAYMENT_SUCCESS'
      AND message LIKE '%' || v_payment.payment_reference || '%'
  ) THEN
    INSERT INTO public.notifications (
      type,
      title,
      message,
      application_id
    ) VALUES (
      'PAYMENT_SUCCESS',
      'Payment Received',
      'Payment of Rs. ' || v_payment.amount || ' verified for ' || v_cand_name || ' (' || v_ref_num || '). Reference: ' || v_payment.payment_reference,
      v_payment.application_id
    );
  END IF;

  -- Record in activity logs (entity_type = 'PAYMENT', entity_id = v_payment.id)
  INSERT INTO public.activity_logs (
    application_id,
    entity_type,
    entity_id,
    action,
    description
  ) VALUES (
    v_payment.application_id,
    'PAYMENT',
    v_payment.id::TEXT,
    'PAYMENT_VERIFIED',
    'Payment verified successfully: Receipt ' || v_receipt_num || ', Ref: ' || v_payment.payment_reference || ' (Txn ID: ' || p_gateway_payment_id || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_verified', false,
    'payment_id', v_payment.id,
    'payment_reference', v_payment.payment_reference,
    'receipt_number', v_receipt_num,
    'amount', v_payment.amount,
    'currency', v_payment.currency,
    'purpose', v_payment.purpose,
    'paid_at', v_payment.paid_at,
    'gateway_payment_id', v_payment.gateway_payment_id,
    'gateway_order_id', v_payment.gateway_order_id,
    'application_number', v_ref_num,
    'candidate_name', v_cand_name,
    'candidate_email', v_cand_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
