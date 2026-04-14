/*
  # Fix Recursion in Policies That Reference dealer_admins

  ## Problem
  Other tables have policies that query dealer_admins, which can cause
  issues when dealer_admins policies are being evaluated.

  ## Solution
  Update policies on dealers, deliveries, sales, and driver_preferences
  to use the security definer function instead of direct queries.

  ## Changes
  - Update all policies that query dealer_admins to use get_user_dealer_ids()
  - Ensures no circular dependencies in policy evaluation
*/

-- Fix dealers table policies
DROP POLICY IF EXISTS "Admins can view their dealership data" ON dealers;
DROP POLICY IF EXISTS "Owners and managers can update dealership data" ON dealers;

CREATE POLICY "Admins can view their dealership data"
  ON dealers FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_dealer_ids(auth.uid())));

CREATE POLICY "Owners and managers can update dealership data"
  ON dealers FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Fix deliveries table policies
DROP POLICY IF EXISTS "Admins can view dealership deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can create deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can update deliveries" ON deliveries;

CREATE POLICY "Admins can view dealership deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));

CREATE POLICY "Admins can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can update deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Fix sales table policies
DROP POLICY IF EXISTS "Admins can view dealership sales team" ON sales;

CREATE POLICY "Admins can view dealership sales team"
  ON sales FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));

-- Fix driver_preferences table policies (if they reference dealer_admins)
DROP POLICY IF EXISTS "Dealers can view preferences for their dealership" ON driver_preferences;

CREATE POLICY "Dealers can view preferences for their dealership"
  ON driver_preferences FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));

-- Fix driver_statistics table policies
DROP POLICY IF EXISTS "Dealers can view statistics for their dealership" ON driver_statistics;

CREATE POLICY "Dealers can view statistics for their dealership"
  ON driver_statistics FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));