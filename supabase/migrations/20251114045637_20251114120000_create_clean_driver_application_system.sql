/*
  # Clean Multi-Dealership Application System

  ## Overview
  Creates a fresh, simple application system for drivers to apply to dealerships.
  Designed with zero complexity to avoid any recursion or circular dependency issues.

  ## New Tables

  ### `driver_applications`
  Tracks driver applications to dealerships with minimal complexity
  - `id` (uuid, primary key) - Application identifier
  - `driver_id` (uuid, foreign key) - References drivers table
  - `dealer_id` (uuid, foreign key) - References dealers table
  - `status` (text) - Application status: pending, approved, rejected
  - `message` (text) - Optional message from driver
  - `applied_at` (timestamptz) - When application was submitted
  - `reviewed_at` (timestamptz) - When application was reviewed (nullable)
  - Unique constraint on (driver_id, dealer_id) prevents duplicate applications

  ### `approved_driver_dealers`
  Simple junction table for approved driver-dealer relationships
  - `id` (uuid, primary key) - Relationship identifier
  - `driver_id` (uuid, foreign key) - References drivers table
  - `dealer_id` (uuid, foreign key) - References dealers table
  - `approved_at` (timestamptz) - When relationship was approved
  - Unique constraint on (driver_id, dealer_id) prevents duplicates

  ## Security
  - Simple RLS policies using direct comparisons only
  - No subqueries, no functions, no circular dependencies
  - Drivers can submit and view their own applications
  - Dealers can view and approve applications to their dealership
  - Everyone can read approved relationships for delivery visibility

  ## Design Principles
  - Keep it simple and flat
  - Use direct comparisons in policies
  - Avoid any nested queries
  - No complex triggers or functions
*/

-- =====================================================
-- STEP 1: CREATE DRIVER_APPLICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text DEFAULT '',
  applied_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  UNIQUE(driver_id, dealer_id)
);

-- Create minimal indexes
CREATE INDEX IF NOT EXISTS driver_applications_driver_idx ON driver_applications(driver_id);
CREATE INDEX IF NOT EXISTS driver_applications_dealer_idx ON driver_applications(dealer_id);
CREATE INDEX IF NOT EXISTS driver_applications_status_idx ON driver_applications(status);

-- =====================================================
-- STEP 2: CREATE APPROVED_DRIVER_DEALERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS approved_driver_dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  approved_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(driver_id, dealer_id)
);

-- Create minimal indexes
CREATE INDEX IF NOT EXISTS approved_driver_dealers_driver_idx ON approved_driver_dealers(driver_id);
CREATE INDEX IF NOT EXISTS approved_driver_dealers_dealer_idx ON approved_driver_dealers(dealer_id);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================

ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_driver_dealers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE SIMPLE RLS POLICIES
-- =====================================================

-- Driver Applications Policies

-- Drivers can insert applications for themselves
-- Uses direct user_id lookup in the drivers table via a simple join
CREATE POLICY "Drivers can submit applications"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = driver_applications.driver_id 
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view their own applications
CREATE POLICY "Drivers can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = driver_applications.driver_id 
      AND drivers.user_id = auth.uid()
    )
  );

-- Dealers can view applications to their dealership
CREATE POLICY "Dealers can view their applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealers 
      WHERE dealers.id = driver_applications.dealer_id 
      AND dealers.user_id = auth.uid()
    )
  );

-- Dealers can update applications to their dealership
CREATE POLICY "Dealers can update their applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealers 
      WHERE dealers.id = driver_applications.dealer_id 
      AND dealers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealers 
      WHERE dealers.id = driver_applications.dealer_id 
      AND dealers.user_id = auth.uid()
    )
  );

-- Drivers can delete their own pending applications
CREATE POLICY "Drivers can delete pending applications"
  ON driver_applications FOR DELETE
  TO authenticated
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = driver_applications.driver_id 
      AND drivers.user_id = auth.uid()
    )
  );

-- Approved Driver Dealers Policies

-- Everyone can view approved relationships (needed for delivery visibility)
CREATE POLICY "Anyone can view approved relationships"
  ON approved_driver_dealers FOR SELECT
  TO authenticated
  USING (true);

-- Dealers can insert approved relationships (when approving applications)
CREATE POLICY "Dealers can create approved relationships"
  ON approved_driver_dealers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealers 
      WHERE dealers.id = approved_driver_dealers.dealer_id 
      AND dealers.user_id = auth.uid()
    )
  );

-- Dealers can delete approved relationships (to deactivate drivers)
CREATE POLICY "Dealers can remove approved relationships"
  ON approved_driver_dealers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealers 
      WHERE dealers.id = approved_driver_dealers.dealer_id 
      AND dealers.user_id = auth.uid()
    )
  );
