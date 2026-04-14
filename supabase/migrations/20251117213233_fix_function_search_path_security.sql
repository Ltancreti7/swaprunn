/*
  # Fix Function Search Path Security Issues

  ## Overview
  This migration fixes security warnings by setting immutable search_path for all database functions.
  Functions with mutable search_path are vulnerable to search path hijacking attacks.

  ## Changes
  1. Update all SECURITY DEFINER functions to use immutable search_path
  2. Set search_path to empty string or specific schemas to prevent attacks

  ## Security
  - Prevents search path hijacking by explicitly setting search_path
  - All function calls will use fully qualified names or specified schema only
*/

-- Fix get_user_dealer_ids function
CREATE OR REPLACE FUNCTION get_user_dealer_ids(check_user_id uuid)
RETURNS TABLE(dealer_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT dealer_id FROM dealer_admins WHERE user_id = check_user_id;
$$;

-- Fix is_dealer_owner function
CREATE OR REPLACE FUNCTION is_dealer_owner(check_user_id uuid, check_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dealer_admins 
    WHERE user_id = check_user_id 
    AND dealer_id = check_dealer_id 
    AND role = 'owner'
  );
$$;

-- Fix can_dealer_view_applicant_driver function
CREATE OR REPLACE FUNCTION can_dealer_view_applicant_driver(driver_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM driver_applications da
    WHERE da.driver_id = driver_uuid
    AND da.dealer_id IN (
      SELECT dealer_id 
      FROM dealer_admins 
      WHERE user_id = auth.uid()
    )
  );
$$;

-- Fix update_driver_statistics function
CREATE OR REPLACE FUNCTION update_driver_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id uuid;
  v_driver_id uuid;
  v_completed_count integer;
  v_cancelled_count integer;
  v_total_count integer;
  v_avg_time interval;
  v_on_time_pct numeric;
BEGIN
  v_dealer_id := NEW.dealer_id;
  v_driver_id := NEW.driver_id;

  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*)
  INTO v_completed_count, v_cancelled_count, v_total_count
  FROM deliveries
  WHERE dealer_id = v_dealer_id 
    AND driver_id = v_driver_id;

  SELECT AVG(completed_at - created_at)
  INTO v_avg_time
  FROM deliveries
  WHERE dealer_id = v_dealer_id 
    AND driver_id = v_driver_id 
    AND status = 'completed'
    AND completed_at IS NOT NULL;

  IF v_completed_count > 0 THEN
    v_on_time_pct := (v_completed_count::numeric / NULLIF(v_total_count, 0)) * 100;
  ELSE
    v_on_time_pct := 0;
  END IF;

  INSERT INTO driver_statistics (
    driver_id,
    dealer_id,
    total_deliveries,
    completed_deliveries,
    cancelled_deliveries,
    average_completion_time,
    on_time_percentage,
    last_delivery_at,
    updated_at
  )
  VALUES (
    v_driver_id,
    v_dealer_id,
    v_total_count,
    v_completed_count,
    v_cancelled_count,
    v_avg_time,
    v_on_time_pct,
    NEW.updated_at,
    NOW()
  )
  ON CONFLICT (driver_id, dealer_id)
  DO UPDATE SET
    total_deliveries = EXCLUDED.total_deliveries,
    completed_deliveries = EXCLUDED.completed_deliveries,
    cancelled_deliveries = EXCLUDED.cancelled_deliveries,
    average_completion_time = EXCLUDED.average_completion_time,
    on_time_percentage = EXCLUDED.on_time_percentage,
    last_delivery_at = EXCLUDED.last_delivery_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Fix update_driver_preference_usage function
CREATE OR REPLACE FUNCTION update_driver_preference_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id uuid;
  v_driver_id uuid;
  v_user_id uuid;
BEGIN
  v_dealer_id := NEW.dealer_id;
  v_driver_id := NEW.driver_id;

  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id
  FROM dealers
  WHERE id = v_dealer_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT da.user_id INTO v_user_id
    FROM dealer_admins da
    WHERE da.dealer_id = v_dealer_id
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO driver_preferences (
      user_id,
      driver_id,
      dealer_id,
      preference_level,
      last_used_at,
      use_count
    )
    VALUES (
      v_user_id,
      v_driver_id,
      v_dealer_id,
      5,
      NOW(),
      1
    )
    ON CONFLICT (user_id, driver_id, dealer_id)
    DO UPDATE SET
      use_count = driver_preferences.use_count + 1,
      last_used_at = NOW(),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Fix notify_message_recipient function
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    delivery_id,
    type,
    title,
    message,
    read
  )
  VALUES (
    NEW.recipient_id,
    NEW.delivery_id,
    'new_message',
    'New Message',
    'You have a new message in your delivery chat',
    false
  );
  
  RETURN NEW;
END;
$$;
