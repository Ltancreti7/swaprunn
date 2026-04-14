/*
  # Update Invitations System for Sales-Only Invitations

  ## Overview
  Updates the invitations table to support email-based invitations for sales team members only.
  Drivers will continue to use self-registration flow.

  ## Changes Made
  
  ### 1. Schema Updates
    - Add `role` column to invitations table (for future-proofing, will only be 'sales' for now)
    - Add `invited_by_name` column for better UX in invitation emails
    - Add index on email for faster lookups
    - Add constraint to ensure email is required
    
  ### 2. Update Existing Data
    - Set role to 'sales' for any existing invitations
    
  ### 3. Security Updates (RLS Policies)
    - Ensure dealers can create invitations for their dealership
    - Ensure dealers can view their own invitations
    - Allow anyone to validate invitation codes (for acceptance page)
    - Ensure dealers can cancel/delete their own pending invitations

  ## Important Notes
  - This migration focuses on sales invitations only
  - Drivers continue using self-registration (RegisterDriver page)
  - Invitation codes are unique and expire after 7 days
  - Once used, invitations cannot be reused
*/

-- Add role column to invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'role'
  ) THEN
    ALTER TABLE invitations ADD COLUMN role text NOT NULL DEFAULT 'sales';
  END IF;
END $$;

-- Add invited_by_name for better email UX
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'invited_by_name'
  ) THEN
    ALTER TABLE invitations ADD COLUMN invited_by_name text;
  END IF;
END $$;

-- Make email required (it was optional before)
ALTER TABLE invitations ALTER COLUMN email SET NOT NULL;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);

-- Add index on invitation_code for faster lookups
CREATE INDEX IF NOT EXISTS invitations_code_idx ON invitations(invitation_code);

-- ============================================
-- INVITATIONS TABLE POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Dealers can create invitations" ON invitations;
DROP POLICY IF EXISTS "Dealers can view their invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can validate invitation codes" ON invitations;
DROP POLICY IF EXISTS "Dealers can delete their invitations" ON invitations;

-- Allow dealers to create invitations for their dealership
CREATE POLICY "Dealers can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to view their own invitations
CREATE POLICY "Dealers can view their invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow anyone (including unauthenticated) to validate invitation codes for acceptance
CREATE POLICY "Anyone can validate invitation codes"
  ON invitations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow dealers to update their invitations (e.g., mark as used)
CREATE POLICY "Dealers can update their invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to delete/cancel their pending invitations
CREATE POLICY "Dealers can delete their invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    ) AND used = false
  );
