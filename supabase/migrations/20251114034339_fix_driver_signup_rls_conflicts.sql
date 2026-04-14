/*
  # Fix Driver Signup RLS Policy Conflicts

  ## Problem
  Two conflicting INSERT policies exist on the drivers table:
  1. "Dealers can add drivers" - Only allows dealer-managed inserts
  2. "Dealers can pre-register drivers or drivers self-register" - Allows self-registration
  
  These policies conflict and cause signup failures for independent drivers.

  ## Solution
  1. Drop the conflicting "Dealers can add drivers" policy
  2. Keep the unified "Dealers can pre-register drivers or drivers self-register" policy
  3. This policy allows:
     - Drivers to self-register (auth.uid() = user_id, dealer_id can be NULL)
     - Dealers to pre-register drivers (dealer_id matches, user_id is NULL)

  ## Changes Made
  - Remove duplicate INSERT policy that blocks self-registration
  - Ensure drivers can sign up independently without dealer affiliation
  - Maintain dealer pre-registration capability

  ## Security
  - Self-registering drivers must set their own user_id matching auth.uid()
  - Dealers can only pre-register drivers for their own dealership
  - All existing SELECT, UPDATE, DELETE policies remain unchanged
*/

-- Drop the conflicting policy that only allows dealer-managed inserts
DROP POLICY IF EXISTS "Dealers can add drivers" ON drivers;

-- The remaining policy "Dealers can pre-register drivers or drivers self-register" 
-- already handles both cases correctly:
-- - Drivers can self-register: (auth.uid() = user_id)
-- - Dealers can pre-register: (dealer_id matches AND user_id IS NULL)

-- Verify the policy exists with correct logic
DO $$
BEGIN
  -- Check if the unified policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'drivers' 
    AND policyname = 'Dealers can pre-register drivers or drivers self-register'
  ) THEN
    -- Recreate it if somehow missing
    CREATE POLICY "Dealers can pre-register drivers or drivers self-register"
      ON drivers FOR INSERT
      TO authenticated
      WITH CHECK (
        -- User is inserting their own record (self-registration)
        (auth.uid() = user_id)
        OR
        -- Dealer is pre-registering a driver (user_id will be null, dealer_id must be set)
        (dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()) AND user_id IS NULL)
      );
  END IF;
END $$;
