/*
  # Update Schema for Pre-Registration System

  ## Overview
  Updates the sales and drivers tables to support pre-registration where admins add team members
  before they complete sign-up. Team members can only sign up if their email is pre-registered.

  ## Changes Made
  
  ### 1. Sales Table Updates
    - Make `user_id` nullable to allow pending sign-ups (not yet created auth account)
    - Add `role` field to store job title/position
    - Add `activated_at` timestamp to track when sign-up completed
    - Ensure `status` field exists with proper values (pending_signup, active, inactive)
    
  ### 2. Drivers Table Updates
    - Make `user_id` nullable to allow pending sign-ups
    - Add `status` field for tracking (pending_signup, active, inactive)
    - Add `activated_at` timestamp to track when sign-up completed
    
  ### 3. Update RLS Policies
    - Update policies to handle null user_id for pending records
    - Allow dealers to insert sales/drivers without user_id (pre-registration)
    - Ensure proper access control for all scenarios
    
  ## Important Notes
  - Pending records have null user_id until the team member completes sign-up
  - Status 'pending_signup' indicates pre-registered but not yet signed up
  - Status 'active' indicates signed up and account is active
  - Admins can manage pending team members before they sign up
*/

-- Update sales table to allow nullable user_id for pending sign-ups
ALTER TABLE sales ALTER COLUMN user_id DROP NOT NULL;

-- Add role field to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'role'
  ) THEN
    ALTER TABLE sales ADD COLUMN role text;
  END IF;
END $$;

-- Add activated_at field to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

-- Update the status check constraint for sales to include pending_signup
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sales' AND constraint_name = 'sales_status_check'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_status_check;
  END IF;
  
  -- Add new constraint with pending_signup status
  ALTER TABLE sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('pending_signup', 'pending', 'active', 'inactive'));
END $$;

-- Update default status for sales to pending_signup
ALTER TABLE sales ALTER COLUMN status SET DEFAULT 'pending_signup';

-- Update drivers table to allow nullable user_id for pending sign-ups
ALTER TABLE drivers ALTER COLUMN user_id DROP NOT NULL;

-- Add status field to drivers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'status'
  ) THEN
    ALTER TABLE drivers ADD COLUMN status text DEFAULT 'pending_signup' CHECK (status IN ('pending_signup', 'active', 'inactive'));
  END IF;
END $$;

-- Add activated_at field to drivers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE drivers ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

-- Update existing records to have 'active' status and activated_at timestamp
UPDATE sales 
SET status = 'active', activated_at = COALESCE(accepted_at, created_at)
WHERE user_id IS NOT NULL AND (status IS NULL OR status = 'pending');

UPDATE drivers 
SET status = 'active', activated_at = created_at
WHERE user_id IS NOT NULL AND (status IS NULL OR status != 'active');

-- Drop and recreate unique constraint on sales.user_id to handle nulls properly
DO $$
BEGIN
  -- Drop the unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sales' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%user_id%'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_key;
  END IF;
END $$;

-- Create partial unique index that only applies when user_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS sales_user_id_unique_idx ON sales(user_id) WHERE user_id IS NOT NULL;

-- Drop and recreate unique constraint on drivers.user_id to handle nulls properly
DO $$
BEGIN
  -- Drop the unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'drivers' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%user_id%'
  ) THEN
    ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_user_id_key;
  END IF;
END $$;

-- Create partial unique index that only applies when user_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS drivers_user_id_unique_idx ON drivers(user_id) WHERE user_id IS NOT NULL;

-- Update RLS policies for sales to handle pre-registration

-- Drop old sales insert policy
DROP POLICY IF EXISTS "New sales can insert their data" ON sales;

-- Create new policy that allows dealers to pre-register sales staff
CREATE POLICY "Dealers can pre-register sales staff"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either the user is inserting their own record (completing sign-up)
    (auth.uid() = user_id)
    OR
    -- Or a dealer is pre-registering a sales person (user_id will be null)
    (dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL)
  );

-- Allow sales to update their record to add user_id when completing sign-up
CREATE POLICY "Sales can complete their sign-up"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's their record
    (auth.uid() = user_id)
    OR
    -- Can update if it's a pending record matching their email (completing sign-up)
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Allow dealers to update their pre-registered sales staff
CREATE POLICY "Dealers can update their pre-registered sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL
  )
  WITH CHECK (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Allow dealers to delete pending sales staff
CREATE POLICY "Dealers can delete pending sales"
  ON sales FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL
  );

-- Update RLS policies for drivers to handle pre-registration

-- Drop old drivers insert policy
DROP POLICY IF EXISTS "New drivers can insert their data" ON drivers;

-- Create new policy that allows dealers to pre-register drivers (if dealer_id exists)
-- or allows drivers to register themselves independently (if no dealer_id)
CREATE POLICY "Dealers can pre-register drivers or drivers self-register"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is inserting their own record (completing sign-up or independent registration)
    (auth.uid() = user_id)
    OR
    -- Dealer is pre-registering a driver (user_id will be null, dealer_id must be set)
    (dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL)
  );

-- Allow drivers to update their record to add user_id when completing sign-up
CREATE POLICY "Drivers can complete their sign-up"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's their record
    (auth.uid() = user_id)
    OR
    -- Can update if it's a pending record matching their email (completing sign-up)
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Allow dealers to update their pre-registered drivers
CREATE POLICY "Dealers can update their pre-registered drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL
  )
  WITH CHECK (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Allow dealers to delete pending drivers
CREATE POLICY "Dealers can delete pending drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL
  );

-- Add index for email lookups during sign-up validation
CREATE INDEX IF NOT EXISTS sales_email_idx ON sales(email);
CREATE INDEX IF NOT EXISTS drivers_email_idx ON drivers(email);
CREATE INDEX IF NOT EXISTS sales_dealer_email_idx ON sales(dealer_id, email);
CREATE INDEX IF NOT EXISTS drivers_dealer_email_idx ON drivers(dealer_id, email);
