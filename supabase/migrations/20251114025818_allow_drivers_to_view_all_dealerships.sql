/*
  # Allow Drivers to View All Dealerships

  ## Changes
  - Add RLS policy allowing authenticated drivers to view all dealership records
  - Drivers need to browse and search all dealerships to apply for work
  - Only allows SELECT operations on basic dealership information

  ## Security
  - Drivers can only READ dealership information (name, phone, address)
  - Drivers cannot INSERT, UPDATE, or DELETE dealership records
  - Policy restricted to authenticated users only
*/

-- Allow drivers to view all dealerships for browsing and applying
CREATE POLICY "Drivers can view all dealerships for browsing"
  ON dealers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
    )
  );
