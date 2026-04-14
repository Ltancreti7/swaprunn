/*
  # Fix Driver Delivery Visibility

  ## Problem
  Drivers cannot see delivery requests in their "Requests" tab because RLS policies 
  for drivers to view deliveries are missing.

  ## Solution
  Add RLS policies to allow drivers to view deliveries from dealerships they are 
  approved to work with via the approved_driver_dealers table.

  ## Changes
  1. Add SELECT policy for drivers to view deliveries from approved dealerships
  2. Add UPDATE policy for drivers to update deliveries from approved dealerships
  
  ## Security
  - Drivers can only see deliveries from dealerships they are approved for
  - Drivers can only update deliveries from dealerships they are approved for
  - Uses approved_driver_dealers junction table to enforce relationships
*/

-- Allow drivers to view deliveries from dealerships they're approved for
CREATE POLICY "Drivers can view deliveries from approved dealerships"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT add.dealer_id
      FROM approved_driver_dealers add
      INNER JOIN drivers d ON d.id = add.driver_id
      WHERE d.user_id = auth.uid()
    )
  );

-- Allow drivers to update deliveries they can accept or are assigned to
CREATE POLICY "Drivers can update deliveries from approved dealerships"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    -- Driver can update if assigned to them OR if from approved dealership (to accept)
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
    OR
    dealer_id IN (
      SELECT add.dealer_id
      FROM approved_driver_dealers add
      INNER JOIN drivers d ON d.id = add.driver_id
      WHERE d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- After update, delivery must either be assigned to this driver or unassigned
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
    OR
    driver_id IS NULL
  );
