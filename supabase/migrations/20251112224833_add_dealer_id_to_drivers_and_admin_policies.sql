/*
  # Add Dealer ID to Drivers and Admin Team Management

  ## Overview
  Enables dealership admins to manage their own team members (sales staff and drivers).
  Drivers are now associated with specific dealerships.

  ## Changes Made
  
  ### 1. Schema Updates
    - Add `dealer_id` column to `drivers` table
    - Add foreign key constraint linking drivers to dealers
    - Add index on `dealer_id` for better query performance
  
  ### 2. Security Updates (RLS Policies)
    
    **Sales Table:**
    - Allow dealers to INSERT sales records for their dealership
    - Allow dealers to UPDATE sales records in their dealership
    - Allow dealers to DELETE sales records from their dealership
    
    **Drivers Table:**
    - Allow dealers to INSERT driver records for their dealership
    - Allow dealers to view all drivers in their dealership
    - Allow dealers to UPDATE driver records in their dealership
    - Allow dealers to DELETE driver records from their dealership
    - Update "Anyone can view available drivers" policy to exclude drivers from viewing other dealerships
    
    **Deliveries Table:**
    - Update policies to ensure sales can only see deliveries from their dealership
    - Update policies to ensure drivers can only see deliveries from their dealership

  ## Important Notes
  - Default dealer_id to NULL for existing drivers (independent contractors)
  - New drivers created by dealers will have dealer_id set
  - Dealers have full CRUD control over their team members
  - Team members can still view and update their own records
*/

-- Add dealer_id to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE drivers ADD COLUMN dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index on dealer_id for drivers
CREATE INDEX IF NOT EXISTS drivers_dealer_id_idx ON drivers(dealer_id);

-- ============================================
-- SALES TABLE POLICIES (Admin Management)
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "New sales can insert their data" ON sales;

-- Allow dealers to insert sales staff for their dealership
CREATE POLICY "Dealers can add sales staff"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to update sales staff in their dealership
CREATE POLICY "Dealers can update their sales staff"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to delete sales staff from their dealership
CREATE POLICY "Dealers can remove sales staff"
  ON sales FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DRIVERS TABLE POLICIES (Admin Management)
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "New drivers can insert their data" ON drivers;
DROP POLICY IF EXISTS "Anyone can view available drivers" ON drivers;

-- Allow dealers to insert drivers for their dealership
CREATE POLICY "Dealers can add drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to view their drivers
CREATE POLICY "Dealers can view their drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to update drivers in their dealership
CREATE POLICY "Dealers can update their drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Allow dealers to delete drivers from their dealership
CREATE POLICY "Dealers can remove drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

-- Sales can view available drivers from their dealership
CREATE POLICY "Sales can view available drivers from their dealership"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    is_available = true AND dealer_id IN (
      SELECT dealer_id FROM sales WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DELIVERIES TABLE POLICIES (Cross-Dealership Protection)
-- ============================================

-- Update sales policies to ensure they only see deliveries from their dealership
DROP POLICY IF EXISTS "Sales can view their deliveries" ON deliveries;

CREATE POLICY "Sales can view deliveries from their dealership"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM sales WHERE user_id = auth.uid()
    )
  );

-- Update sales insert policy to ensure dealer_id matches their dealership
DROP POLICY IF EXISTS "Sales can create delivery requests" ON deliveries;

CREATE POLICY "Sales can create deliveries for their dealership"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM sales WHERE user_id = auth.uid()
    )
  );

-- Update driver policies to ensure they only see deliveries from their dealership
DROP POLICY IF EXISTS "Drivers can view assigned deliveries" ON deliveries;
DROP POLICY IF EXISTS "Drivers can view available deliveries" ON deliveries;

CREATE POLICY "Drivers can view deliveries from their dealership"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM drivers WHERE user_id = auth.uid()
    ) OR driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Drivers can view available (unassigned) deliveries from their dealership
CREATE POLICY "Drivers can view available deliveries from their dealership"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    driver_id IS NULL 
    AND status = 'pending'
    AND dealer_id IN (
      SELECT dealer_id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Update driver claim policy
DROP POLICY IF EXISTS "Drivers can claim available deliveries" ON deliveries;

CREATE POLICY "Drivers can claim available deliveries from their dealership"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    driver_id IS NULL 
    AND dealer_id IN (
      SELECT dealer_id FROM drivers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );