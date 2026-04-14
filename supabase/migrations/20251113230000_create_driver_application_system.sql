/*
  # Multi-Dealership Driver Application System

  ## Overview
  Creates the infrastructure for drivers to apply to multiple dealerships and for
  dealerships to approve/reject driver applications. Replaces the single dealer_id
  relationship with a flexible many-to-many system.

  ## New Tables

  ### `driver_applications`
  Tracks driver applications to specific dealerships with approval workflow
  - `id` (uuid, primary key) - Unique application identifier
  - `driver_id` (uuid, foreign key) - Reference to drivers table
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `status` (text) - Application status: pending, approved, rejected
  - `application_message` (text) - Optional message from driver to dealer
  - `applied_at` (timestamptz) - When application was submitted
  - `reviewed_at` (timestamptz) - When application was reviewed (nullable)
  - `reviewed_by_user_id` (uuid) - Auth user who reviewed the application (nullable)
  - `reviewer_notes` (text) - Optional feedback from dealer (nullable)

  ### `driver_dealerships`
  Junction table managing approved many-to-many relationships between drivers and dealers
  - `id` (uuid, primary key) - Unique relationship identifier
  - `driver_id` (uuid, foreign key) - Reference to drivers table
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `approved_at` (timestamptz) - When relationship was approved
  - `approved_by_user_id` (uuid) - Auth user who approved the driver
  - `is_active` (boolean) - Whether relationship is currently active
  - `deactivated_at` (timestamptz) - When relationship was deactivated (nullable)

  ## Changes to Existing Tables
  - `drivers.dealer_id` - Made nullable to support independent driver accounts

  ## Security
  - Enable RLS on all new tables
  - Drivers can view their own applications
  - Dealers can view applications to their dealership
  - Dealers can approve/reject applications
  - Delivery visibility updated to check driver_dealerships table

  ## Data Migration
  - Existing drivers with dealer_id will have pre-approved relationships created
  - Preserves all existing driver-dealer connections
*/

-- Create driver_applications table
CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  application_message text DEFAULT '',
  applied_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text DEFAULT '',
  UNIQUE(driver_id, dealer_id)
);

-- Create driver_dealerships junction table
CREATE TABLE IF NOT EXISTS driver_dealerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  approved_at timestamptz DEFAULT now() NOT NULL,
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  deactivated_at timestamptz,
  UNIQUE(driver_id, dealer_id)
);

-- Migrate existing driver-dealer relationships to driver_dealerships
-- Only migrate drivers that have both a user_id and dealer_id (active drivers)
INSERT INTO driver_dealerships (driver_id, dealer_id, approved_at, approved_by_user_id, is_active)
SELECT
  d.id as driver_id,
  d.dealer_id,
  d.created_at as approved_at,
  de.user_id as approved_by_user_id,
  true as is_active
FROM drivers d
INNER JOIN dealers de ON d.dealer_id = de.id
WHERE d.dealer_id IS NOT NULL
  AND d.user_id IS NOT NULL
  AND d.status = 'active'
ON CONFLICT (driver_id, dealer_id) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS driver_applications_driver_id_idx ON driver_applications(driver_id);
CREATE INDEX IF NOT EXISTS driver_applications_dealer_id_idx ON driver_applications(dealer_id);
CREATE INDEX IF NOT EXISTS driver_applications_status_idx ON driver_applications(status);
CREATE INDEX IF NOT EXISTS driver_applications_dealer_status_idx ON driver_applications(dealer_id, status);

CREATE INDEX IF NOT EXISTS driver_dealerships_driver_id_idx ON driver_dealerships(driver_id);
CREATE INDEX IF NOT EXISTS driver_dealerships_dealer_id_idx ON driver_dealerships(dealer_id);
CREATE INDEX IF NOT EXISTS driver_dealerships_active_idx ON driver_dealerships(driver_id, dealer_id, is_active);

-- Enable RLS
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_dealerships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_applications

-- Drivers can view their own applications
CREATE POLICY "Drivers can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Dealers can view applications to their dealership
CREATE POLICY "Dealers can view applications to their dealership"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Drivers can insert their own applications
CREATE POLICY "Drivers can create applications"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Dealers can update applications to their dealership (for approval/rejection)
CREATE POLICY "Dealers can update applications to their dealership"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Drivers can delete their own pending applications (withdraw)
CREATE POLICY "Drivers can delete own pending applications"
  ON driver_applications FOR DELETE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- RLS Policies for driver_dealerships

-- Drivers can view their own dealership relationships
CREATE POLICY "Drivers can view own dealership relationships"
  ON driver_dealerships FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Dealers can view their driver relationships
CREATE POLICY "Dealers can view their driver relationships"
  ON driver_dealerships FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Dealers can insert new driver relationships (when approving)
CREATE POLICY "Dealers can create driver relationships"
  ON driver_dealerships FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Dealers can update their driver relationships (deactivate)
CREATE POLICY "Dealers can update driver relationships"
  ON driver_dealerships FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

-- Sales can view available drivers (drivers approved for their dealership)
DROP POLICY IF EXISTS "Sales can view available drivers in their dealership" ON drivers;
CREATE POLICY "Sales can view available drivers in their dealership"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT dd.driver_id
      FROM driver_dealerships dd
      INNER JOIN sales s ON s.dealer_id = dd.dealer_id
      WHERE s.user_id = auth.uid()
        AND dd.is_active = true
        AND is_available = true
    )
  );

-- Update deliveries RLS policies to use driver_dealerships

-- Drivers can view deliveries from dealerships they're approved for
DROP POLICY IF EXISTS "Drivers can view deliveries from their dealership" ON deliveries;
CREATE POLICY "Drivers can view deliveries from approved dealerships"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dd.dealer_id
      FROM driver_dealerships dd
      INNER JOIN drivers d ON d.id = dd.driver_id
      WHERE d.user_id = auth.uid()
        AND dd.is_active = true
    )
  );

-- Drivers can update deliveries from approved dealerships
DROP POLICY IF EXISTS "Drivers can update deliveries from their dealership" ON deliveries;
CREATE POLICY "Drivers can update deliveries from approved dealerships"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dd.dealer_id
      FROM driver_dealerships dd
      INNER JOIN drivers d ON d.id = dd.driver_id
      WHERE d.user_id = auth.uid()
        AND dd.is_active = true
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dd.dealer_id
      FROM driver_dealerships dd
      INNER JOIN drivers d ON d.id = dd.driver_id
      WHERE d.user_id = auth.uid()
        AND dd.is_active = true
    )
  );

-- Add delivery_id to notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'delivery_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes on notifications for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);
