/*
  # Fix Infinite Recursion in Driver INSERT Policy

  ## Problem
  When a driver tries to self-register (INSERT into drivers table), an infinite recursion occurs:
  1. INSERT policy checks: (auth.uid() = user_id)
  2. This implicitly requires SELECT permission on the row being inserted
  3. SELECT policies include "Dealers can view driver applicants" using can_dealer_view_applicant_driver()
  4. That function queries driver_applications table
  5. driver_applications policies query back to drivers table: (driver_id IN (SELECT drivers.id WHERE user_id = auth.uid()))
  6. This creates infinite loop: INSERT → SELECT → driver_applications → drivers → ∞

  ## Solution
  Simplify the INSERT policy to NOT require complex checks that could trigger SELECT policies.
  For self-registration, we just need to verify auth.uid() = user_id without querying the table.
  
  The key insight: During INSERT, we're checking the NEW row data, not existing table data.
  We don't need to query the drivers table at all - we just compare auth.uid() with the 
  user_id value being inserted.

  ## Changes
  1. Drop the existing INSERT policy that causes recursion
  2. Create a simpler INSERT policy that doesn't trigger SELECT cascades
  3. Separate self-registration from dealer pre-registration for clarity

  ## Security
  - Self-registering drivers MUST set user_id = auth.uid()
  - Dealer pre-registration requires dealer_id from dealers table and user_id IS NULL
  - No recursive queries during INSERT validation
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Dealers can pre-register drivers or drivers self-register" ON drivers;

-- Create simplified INSERT policy for self-registration (no table lookups needed)
CREATE POLICY "Drivers can self-register"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Driver is inserting their own record
    -- This only checks the NEW row values, doesn't query the table
    auth.uid() = user_id
  );

-- Create separate INSERT policy for dealer pre-registration
CREATE POLICY "Dealers can pre-register drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Dealer is pre-registering (user_id null, dealer must own the dealer_id)
    user_id IS NULL 
    AND dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );
