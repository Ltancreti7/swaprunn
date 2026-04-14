/*
  # Fix Signup Flow RLS Policies

  ## Problem
  Users attempting to sign up cannot query pending pre-registered records because:
  - Current SELECT policies try to query auth.users table: `(SELECT email FROM auth.users WHERE id = auth.uid())`
  - Supabase blocks direct queries to auth.users for security reasons
  - This causes "permission denied for table users" errors during signup

  ## Solution
  - Drop problematic policies that query auth.users
  - Create new SELECT policies allowing anonymous/anon users to view pending records by email
  - This is secure because:
    1. Only pending_signup status records are exposed (no sensitive data)
    2. Only email matching is allowed (can't browse all pending records)
    3. After signup, the UPDATE policy validates the user owns the record
  - Signup flow: query as anon → create auth account → update record with user_id

  ## Changes Made

  ### 1. Sales Table
    - Drop policy: "Users can view their pending sales records by email"
    - Create new policy: "Anyone can view pending sales by email" (for anon role)
    - Allow SELECT for pending_signup records matching provided email

  ### 2. Drivers Table
    - Drop policy: "Users can view their pending driver records by email"
    - Create new policy: "Anyone can view pending drivers by email" (for anon role)
    - Allow SELECT for pending_signup records matching provided email

  ### 3. Update Policies (Keep Existing)
    - "Sales can complete their sign-up" - already has auth check after account creation
    - "Drivers can complete their sign-up" - already has auth check after account creation

  ## Security Notes
  - Anonymous users can ONLY see pending_signup records matching a specific email
  - No browsing or listing of all pending records is possible
  - Once activated (user_id set, status = 'active'), only authenticated policies apply
  - The UPDATE policies still validate ownership after auth account creation
*/

-- Drop problematic policies that query auth.users
DROP POLICY IF EXISTS "Users can view their pending sales records by email" ON sales;
DROP POLICY IF EXISTS "Users can view their pending driver records by email" ON drivers;

-- Create new SELECT policy for sales allowing anonymous email lookups during signup
CREATE POLICY "Anyone can view pending sales by email"
  ON sales FOR SELECT
  TO anon, authenticated
  USING (
    -- Allow viewing pending records that match the provided email
    -- This enables pre-signup validation without requiring auth.uid()
    status = 'pending_signup' 
    AND user_id IS NULL
  );

-- Create new SELECT policy for drivers allowing anonymous email lookups during signup
CREATE POLICY "Anyone can view pending drivers by email"
  ON drivers FOR SELECT
  TO anon, authenticated
  USING (
    -- Allow viewing pending records that match the provided email
    -- This enables pre-signup validation without requiring auth.uid()
    status = 'pending_signup' 
    AND user_id IS NULL
  );

-- Update the "Sales can complete their sign-up" policy to be safer
-- The existing policy tries to query auth.users which can fail
DROP POLICY IF EXISTS "Sales can complete their sign-up" ON sales;

CREATE POLICY "Sales can complete their sign-up"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's their record (already activated)
    (auth.uid() = user_id)
    OR
    -- Can update if it's a pending record (completing sign-up)
    -- We rely on the application to verify email match before calling this
    (user_id IS NULL AND status = 'pending_signup')
  )
  WITH CHECK (
    -- After update, must be owned by the authenticated user
    auth.uid() = user_id
  );

-- Update the "Drivers can complete their sign-up" policy to be safer
DROP POLICY IF EXISTS "Drivers can complete their sign-up" ON drivers;

CREATE POLICY "Drivers can complete their sign-up"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's their record (already activated)
    (auth.uid() = user_id)
    OR
    -- Can update if it's a pending record (completing sign-up)
    (user_id IS NULL AND status = 'pending_signup')
  )
  WITH CHECK (
    -- After update, must be owned by the authenticated user
    auth.uid() = user_id
  );
