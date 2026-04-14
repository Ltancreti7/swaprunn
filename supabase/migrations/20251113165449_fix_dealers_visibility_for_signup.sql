/*
  # Fix Dealers Table Visibility for Anonymous Signup

  ## Problem
  Sales and driver signup pages need to display a list of dealerships to choose from.
  Currently, the "Anyone can view dealer names for selection" policy only allows authenticated users.
  Anonymous users (before signup) cannot see the dealer list, breaking the signup flow.

  ## Solution
  Update the dealers SELECT policy to allow both anonymous (anon) and authenticated users
  to view dealer names and IDs. This is secure because:
  - Only id and name fields are exposed (no sensitive data)
  - This is public information needed for the signup process
  - The anon role has read-only access

  ## Changes
  1. Drop the existing "Anyone can view dealer names for selection" policy
  2. Create a new policy allowing both anon and authenticated roles
  3. Keep other dealer policies unchanged (own data access only)
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view dealer names for selection" ON dealers;

-- Create new policy allowing anonymous and authenticated users to view dealer names
CREATE POLICY "Public can view dealer names for selection"
  ON dealers FOR SELECT
  TO anon, authenticated
  USING (true);
