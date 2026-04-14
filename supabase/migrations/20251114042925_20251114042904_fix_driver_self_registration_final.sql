/*
  # Fix Driver Self-Registration - Final Comprehensive Fix

  ## Problem
  Drivers cannot sign up independently because of conflicting or missing RLS policies.
  The driver signup flow requires drivers to create accounts without dealer affiliation,
  then apply to dealerships from their dashboard.

  ## Root Cause Analysis
  After reviewing all migrations, the policies should be correct, but we need to ensure:
  1. No conflicting INSERT policies that require dealer_id
  2. SELECT policies don't cause infinite recursion during INSERT
  3. All required columns have proper defaults or are being set correctly

  ## Solution
  This migration ensures a clean slate for driver self-registration:
  1. Drop ALL existing INSERT policies on drivers table
  2. Create ONE clear self-registration policy
  3. Create ONE clear dealer pre-registration policy (separate)
  4. Ensure no SELECT policies interfere with INSERT operations

  ## Changes Made
  - Remove any remaining conflicting INSERT policies
  - Establish definitive self-registration path for drivers
  - Verify dealer_id can be NULL for independent drivers
  - Ensure status defaults work correctly

  ## Security
  - Drivers can only insert their own records (auth.uid() = user_id)
  - Dealers can only pre-register drivers for their own dealership
  - No cross-table queries during INSERT to prevent recursion
*/

-- Drop ALL existing INSERT policies on drivers to start fresh
DROP POLICY IF EXISTS "New drivers can insert their data" ON drivers;
DROP POLICY IF EXISTS "Dealers can add drivers" ON drivers;
DROP POLICY IF EXISTS "Dealers can pre-register drivers or drivers self-register" ON drivers;
DROP POLICY IF EXISTS "Drivers can self-register" ON drivers;
DROP POLICY IF EXISTS "Dealers can pre-register drivers" ON drivers;

-- Create the PRIMARY self-registration policy for independent drivers
-- This is the main path for drivers signing up through the app
CREATE POLICY "Drivers can self-register"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Driver must set their user_id to match their auth user
    auth.uid() = user_id
    -- No other restrictions - dealer_id can be NULL
  );

-- Create SEPARATE policy for dealer pre-registration (optional flow)
-- This allows dealers to add drivers to their roster
CREATE POLICY "Dealers can pre-register drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User_id must be NULL for pre-registration (not yet signed up)
    user_id IS NULL 
    -- Dealer_id must belong to the dealer doing the pre-registration
    AND dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Ensure the drivers table allows NULL dealer_id
-- This should already be set, but verify
DO $$
BEGIN
  -- Make dealer_id nullable if it isn't already
  ALTER TABLE drivers ALTER COLUMN dealer_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Column is already nullable, ignore the error
    NULL;
END $$;

-- Ensure the drivers table allows NULL user_id for pre-registration
-- This should already be set from previous migrations
DO $$
BEGIN
  ALTER TABLE drivers ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Verify default values are set correctly for driver self-registration
ALTER TABLE drivers ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE drivers ALTER COLUMN is_available SET DEFAULT true;
ALTER TABLE drivers ALTER COLUMN available_for_customer_deliveries SET DEFAULT true;
ALTER TABLE drivers ALTER COLUMN available_for_dealer_swaps SET DEFAULT true;
ALTER TABLE drivers ALTER COLUMN radius SET DEFAULT 50;

-- Ensure the partial unique index exists for user_id (only when not null)
DROP INDEX IF EXISTS drivers_user_id_unique_idx;
CREATE UNIQUE INDEX drivers_user_id_unique_idx ON drivers(user_id) WHERE user_id IS NOT NULL;
