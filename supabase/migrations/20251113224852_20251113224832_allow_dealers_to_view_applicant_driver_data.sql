/*
  # Fix Driver Data Visibility in Applications

  ## Problem
  Dealers cannot see driver information when viewing driver applications because
  the drivers table RLS policies don't allow dealers to view driver records that
  are part of applications to their dealership.

  ## Solution
  Add a new RLS policy to the drivers table that allows dealers to view driver
  data when the driver has an application to that dealer's dealership.

  ## Security
  - Policy is restrictive: only allows viewing driver data for applications to the dealer's own dealership
  - Does not allow dealers to view all drivers, only those who have applied
  - Maintains data privacy while enabling the application review workflow
*/

-- Allow dealers to view driver data for applications to their dealership
DROP POLICY IF EXISTS "Dealers can view drivers who applied to their dealership" ON drivers;
CREATE POLICY "Dealers can view drivers who applied to their dealership"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT driver_id
      FROM driver_applications
      WHERE dealer_id IN (
        SELECT id FROM dealers WHERE user_id = auth.uid()
      )
    )
  );