-- ==============================================================================
-- Migration: 20260906000010_payments_and_receipts.sql
-- Description: Razorpay payments, receipt number generation, atomic verification RPC,
--              offline payments, payment notifications, and application status transitions.
-- Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
-- ==============================================================================

-- 1. Sequences for Payment References and Receipt Numbers
CREATE SEQUENCE IF NOT EXISTS public.payment_reference_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 1;

-- 2. Generator Functions
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.payment_reference_seq');
  RETURN 'PAY-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.receipt_number_seq');
  RETURN 'ATG-RCP-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Default payment_reference on insert trigger
CREATE OR REPLACE FUNCTION public.trg_payments_default_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_reference IS NULL OR NEW.payment_reference = '' THEN
    NEW.payment_reference := public.generate_payment_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_set_reference ON public.payments;
CREATE TRIGGER trg_payments_set_reference
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_payments_default_reference();

-- 4. Update applications.status check constraint to include payment stages
DO $$
BEGIN
  ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
  ALTER TABLE public.applications ADD CONSTRAINT applications_status_check CHECK (
    status IN (
      'NEW_ENQUIRY',
      'SCREENING',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_SELECTED',
      'JOINING_ACCESS_GRANTED',
      'JOINING_SUBMITTED',
      'DOCUMENT_VERIFIED',
      'PAYMENT_PENDING',
      'PAYMENT_SUCCESSFUL',
      'VERIFICATION_PENDING',
      'VERIFIED_ACTIVE',
      'REJECTED',
      'ARCHIVED'
    )
  );
END $$;

-- 5. RPC: create_or_get_pending_payment
-- Atomic, concurrency-safe payment initiation
CREATE OR REPLACE FUNCTION public.create_or_get_pending_payment(
  p_app_id UUID,
  p_purpose TEXT,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
  v_existing RECORD;
  v_new_payment RECORD;
  v_ref TEXT;
BEGIN
  -- Verify application exists
  SELECT id, application_number, full_name, email, mobile, status
  INTO v_app
  FROM public.applications
  WHERE id = p_app_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application with ID % not found.', p_app_id;
  END IF;

  -- 1. Check if a SUCCESS payment already exists for this application and purpose
  SELECT *
  INTO v_existing
  FROM public.payments
  WHERE application_id = p_app_id
    AND purpose = p_purpose
    AND status = 'SUCCESS'
  ORDER BY paid_at DESC
  LIMIT 1;

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

  -- 2. Check if a recent PENDING payment exists (within 24 hours) for this purpose
  SELECT *
  INTO v_existing
  FROM public.payments
  WHERE application_id = p_app_id
    AND purpose = p_purpose
    AND status = 'PENDING'
    AND created_at > (now() - INTERVAL '24 hours')
  ORDER BY created_at DESC
  LIMIT 1;

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
    payment_reference,
    amount,
    currency,
    purpose,
    payment_method,
    gateway,
    status
  ) VALUES (
    p_app_id,
    v_ref,
    p_amount,
    'INR',
    p_purpose,
    'ONLINE',
    'RAZORPAY',
    'PENDING'
  ) RETURNING * INTO v_new_payment;

  -- Record in activity logs (NO sensitive data logged)
  INSERT INTO public.activity_logs (
    application_id,
    action,
    description
  ) VALUES (
    p_app_id,
    'PAYMENT_CREATED',
    'Payment reference initiated: ' || v_ref || ' for purpose ' || p_purpose || ' (Amount: Rs. ' || p_amount || ')'
  );

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

-- 6. RPC: complete_verified_payment
-- Server-only verification completion (atomic & idempotent)
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
  v_receipt_num TEXT;
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

  -- Idempotency check: if already SUCCESS, return existing data cleanly
  IF v_payment.status = 'SUCCESS' THEN
    SELECT application_number, full_name, email
    INTO v_app
    FROM public.applications
    WHERE id = v_payment.application_id;

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
      'application_number', v_app.application_number,
      'candidate_name', v_app.full_name,
      'candidate_email', v_app.email
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

  -- Fetch application details
  SELECT application_number, full_name, email
  INTO v_app
  FROM public.applications
  WHERE id = v_payment.application_id;

  -- Update application status to PAYMENT_SUCCESSFUL
  UPDATE public.applications
  SET status = 'PAYMENT_SUCCESSFUL'
  WHERE id = v_payment.application_id;

  -- Create notification: PAYMENT_SUCCESS (prevent duplicates for same application and payment reference)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE application_id = v_payment.application_id
      AND type = 'PAYMENT_SUCCESS'
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
      'Payment of Rs. ' || v_payment.amount || ' verified for ' || v_app.full_name || ' (' || v_app.application_number || '). Reference: ' || v_payment.payment_reference,
      v_payment.application_id
    );
  END IF;

  -- Record in activity logs (NO sensitive data)
  INSERT INTO public.activity_logs (
    application_id,
    action,
    description
  ) VALUES (
    v_payment.application_id,
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
    'application_number', v_app.application_number,
    'candidate_name', v_app.full_name,
    'candidate_email', v_app.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: mark_payment_failed
CREATE OR REPLACE FUNCTION public.mark_payment_failed(
  p_payment_id UUID,
  p_reason TEXT DEFAULT 'Payment cancelled or failed at gateway'
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found.', p_payment_id;
  END IF;

  -- Only transition if currently PENDING
  IF v_payment.status = 'PENDING' THEN
    UPDATE public.payments
    SET status = 'FAILED'
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;

    INSERT INTO public.activity_logs (
      application_id,
      action,
      description
    ) VALUES (
      v_payment.application_id,
      'PAYMENT_FAILED',
      'Payment attempt ' || v_payment.payment_reference || ' failed: ' || COALESCE(p_reason, 'Unknown failure')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'payment_reference', v_payment.payment_reference,
    'status', v_payment.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: record_offline_payment
-- Admin manual offline payment recording
CREATE OR REPLACE FUNCTION public.record_offline_payment(
  p_app_id UUID,
  p_purpose TEXT,
  p_amount NUMERIC,
  p_received_by TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
  v_payment RECORD;
  v_ref TEXT;
  v_receipt_num TEXT;
BEGIN
  -- Verify admin authorization
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized administrators can record offline payments.';
  END IF;

  SELECT id, application_number, full_name, email
  INTO v_app
  FROM public.applications
  WHERE id = p_app_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found.', p_app_id;
  END IF;

  v_ref := public.generate_payment_reference();
  v_receipt_num := public.generate_receipt_number();

  INSERT INTO public.payments (
    application_id,
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

  -- Update application status
  UPDATE public.applications
  SET status = 'PAYMENT_SUCCESSFUL'
  WHERE id = p_app_id;

  -- Create notification
  INSERT INTO public.notifications (
    type,
    title,
    message,
    application_id
  ) VALUES (
    'PAYMENT_SUCCESS',
    'Offline Payment Recorded',
    'Offline payment of Rs. ' || p_amount || ' recorded by ' || COALESCE(p_received_by, 'Admin') || ' for ' || v_app.full_name || ' (' || v_app.application_number || '). Receipt: ' || v_receipt_num,
    p_app_id
  );

  -- Activity log
  INSERT INTO public.activity_logs (
    application_id,
    action,
    description
  ) VALUES (
    p_app_id,
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
    'application_number', v_app.application_number,
    'candidate_name', v_app.full_name,
    'candidate_email', v_app.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
