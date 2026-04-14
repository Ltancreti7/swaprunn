/*
  # Add Tracking Fields to Sales Table

  ## Overview
  Adds fields to track invitation acceptance and password management for sales team members.

  ## Changes Made
  
  ### 1. Schema Updates
    - Add `password_changed` column to track if user has changed initial password
    - Add `invited_at` timestamp to track when invitation was sent
    - Add `accepted_at` timestamp to track when invitation was accepted
    - Add `last_login` timestamp to track user activity
    
  ### 2. Update Existing Data
    - Set password_changed to true for existing sales (assume they set their own password)
    - Set invited_at to created_at for existing sales
    
  ## Important Notes
  - These fields help with onboarding UX and security
  - password_changed flag can trigger "change password" prompt on first login
  - Timestamps provide audit trail for team member lifecycle
*/

-- Add password_changed field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'password_changed'
  ) THEN
    ALTER TABLE sales ADD COLUMN password_changed boolean DEFAULT false;
  END IF;
END $$;

-- Add invited_at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN invited_at timestamptz;
  END IF;
END $$;

-- Add accepted_at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Add last_login field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE sales ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Update existing sales records to have password_changed = true
-- (they created their own accounts with their own passwords)
UPDATE sales 
SET password_changed = true, invited_at = created_at, accepted_at = created_at
WHERE password_changed IS NULL OR password_changed = false;

-- Add check constraint to ensure status is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sales' AND constraint_name = 'sales_status_check'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_status_check 
    CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;
END $$;
