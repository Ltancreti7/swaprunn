/*
  # Fix RLS Policies for Pending Signup Records

  ## Problem
  Users attempting to sign up cannot view their pending pre-registered records because:
  - Existing SELECT policies only allow users to view records where auth.uid() = user_id
  - Pending records have user_id = NULL (not yet signed up)
  - This causes queries during signup to fail with RLS policy violations

  ## Solution
  Add SELECT policies that allow authenticated users to view pending records matching their email address.
  This enables the signup flow to work while maintaining security by only showing pending records.

  ## Changes Made

  ### 1. Sales Table - Add SELECT Policy for Pending Records
    - Allow any authenticated user to SELECT pending_signup records where email matches their auth email
    - This allows users to find and claim their pre-registered accounts during signup
    - Restricted to only pending_signup status for security

  ### 2. Drivers Table - Add SELECT Policy for Pending Records
    - Same policy as sales table
    - Enables driver signup flow with pre-registration

  ## Security Notes
  - Policies only expose records with status = 'pending_signup'
  - Users can only see records matching their authenticated email address
  - Once activated (user_id set, status = 'active'), existing policies take over
  - No risk of users accessing other users' data
*/

-- Add SELECT policy for sales table to allow users to view their pending pre-registered records
CREATE POLICY "Users can view their pending sales records by email"
  ON sales FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing pending records that match the authenticated user's email
    status = 'pending_signup' 
    AND user_id IS NULL 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add SELECT policy for drivers table to allow users to view their pending pre-registered records
CREATE POLICY "Users can view their pending driver records by email"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing pending records that match the authenticated user's email
    status = 'pending_signup' 
    AND user_id IS NULL 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
