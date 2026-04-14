/*
  # Fix Infinite Recursion in Driver Applications

  ## Problem
  When dealers view driver applications with joined driver data, an infinite recursion 
  occurs in the RLS policies:
  - Query: driver_applications JOIN drivers
  - Triggers: "Dealers can view drivers who applied to their dealership" policy on drivers table
  - That policy has subquery: SELECT driver_id FROM driver_applications WHERE dealer_id IN (...)
  - This creates circular dependency: driver_applications → drivers → driver_applications → ∞

  ## Solution
  Remove the circular policy and create a security definer function that breaks the 
  recursion chain. The function bypasses RLS to check if a dealer can view a specific 
  driver based on applications, then the policy uses this function instead of a subquery.

  ## Security
  - Function is SECURITY DEFINER but carefully validates dealer ownership
  - Only allows dealers to view drivers who have applied to their dealership
  - Maintains strict access control without circular dependencies
  - Function is marked STABLE for query optimization

  ## Changes
  1. Drop the problematic circular policy on drivers table
  2. Create security definer function to check dealer-driver application relationship
  3. Create new policy using the function (breaks recursion)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Dealers can view drivers who applied to their dealership" ON drivers;

-- Create a security definer function that checks if a dealer can view a driver
-- This breaks the recursion because it's evaluated in a separate security context
CREATE OR REPLACE FUNCTION can_dealer_view_applicant_driver(driver_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the current user is a dealer and the driver has applied to their dealership
  RETURN EXISTS (
    SELECT 1
    FROM driver_applications da
    INNER JOIN dealers d ON d.id = da.dealer_id
    WHERE da.driver_id = driver_uuid
      AND d.user_id = auth.uid()
  );
END;
$$;

-- Create new policy using the function (no circular dependency)
CREATE POLICY "Dealers can view driver applicants"
  ON drivers FOR SELECT
  TO authenticated
  USING (can_dealer_view_applicant_driver(id));

-- Add comment explaining the function
COMMENT ON FUNCTION can_dealer_view_applicant_driver IS 
  'Security definer function to check if the current dealer user can view a driver based on applications. Breaks RLS recursion by evaluating in separate security context.';
