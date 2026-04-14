-- Allow drivers to view available (unassigned) deliveries
CREATE POLICY IF NOT EXISTS "Drivers can view available deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    driver_id IS NULL AND status = 'pending'
  );

-- Allow drivers to claim a pending delivery by assigning themselves
CREATE POLICY IF NOT EXISTS "Drivers can claim available deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (driver_id IS NULL)
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );
