/*
  # Fix Infinite Recursion in driver_applications SELECT Policy

  ## Problem
  The current RLS setup creates infinite recursion:
  1. Driver tries to SELECT from driver_applications
  2. Policy checks: driver_id IN (SELECT drivers.id WHERE user_id = auth.uid())
  3. This triggers SELECT on drivers table
  4. Drivers SELECT policy includes: can_dealer_view_applicant_driver(id)
  5. That function queries driver_applications again
  6. Loop: driver_applications → drivers → driver_applications → ∞

  ## Solution
  Replace the subquery in driver_applications SELECT policy with a direct comparison:
  - Instead of: driver_id IN (SELECT drivers.id WHERE user_id = auth.uid())
  - Use a JOIN or function that doesn't trigger the recursive SELECT

  We'll create a helper function that uses SECURITY DEFINER to bypass RLS
  when checking driver ownership.

  ## Changes
  1. Create a helper function to check if a driver_id belongs to current user
  2. Update driver_applications SELECT policy to use the helper function
  3. This breaks the recursion chain

  ## Security
  - The helper function only returns true/false
  - It doesn't expose any data, just ownership verification
  - Uses SECURITY DEFINER to bypass RLS during the check
*/

-- Create a helper function that bypasses RLS to check driver ownership
CREATE OR REPLACE FUNCTION is_driver_owner(driver_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Directly check if this driver belongs to the current user
  -- SECURITY DEFINER means this runs with function owner's privileges (bypasses RLS)
  RETURN EXISTS (
    SELECT 1
    FROM drivers
    WHERE id = driver_uuid
    AND user_id = auth.uid()
  );
END;
$$;

-- Drop and recreate the driver_applications SELECT policy for drivers
DROP POLICY IF EXISTS "Drivers can view own applications" ON driver_applications;

CREATE POLICY "Drivers can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    -- Use the helper function instead of a subquery
    -- This breaks the recursion chain
    is_driver_owner(driver_id)
  );
