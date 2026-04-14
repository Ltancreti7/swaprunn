/*
  # Complete Driver Authentication System Reset

  ## Overview
  This migration completely resets the driver authentication system by removing all
  conflicting policies, triggers, and complex table structures that have been causing
  signup failures and infinite recursion issues.

  ## Changes Made
  
  ### 1. Policy Cleanup
  - Drop ALL existing RLS policies on drivers table
  - Drop ALL existing RLS policies on driver_applications table
  - Remove any complex cross-table policy checks that cause recursion
  
  ### 2. Table Cleanup
  - Drop driver_applications table entirely (simplifying the flow)
  - Clean up drivers table constraints
  - Reset all column definitions with proper defaults
  
  ### 3. Fresh Table Schema
  - Recreate drivers table with simplified structure
  - Essential columns only for basic driver signup
  - Proper defaults for all fields
  - Clean foreign key relationships
  
  ### 4. Simple RLS Policies
  - Three simple policies: INSERT (self-register), SELECT (own data + all drivers), UPDATE (own data)
  - No cross-table queries during INSERT to prevent recursion
  - Clear, straightforward access control
  
  ## Security
  - RLS enabled on drivers table
  - Drivers can only insert their own records
  - Drivers can view all other drivers (for dealer search functionality)
  - Drivers can only update their own records
  - Dealers can view all drivers
*/

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop all policies on drivers table
DROP POLICY IF EXISTS "Drivers can view their own data" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own data" ON drivers;
DROP POLICY IF EXISTS "Anyone can view available drivers" ON drivers;
DROP POLICY IF EXISTS "New drivers can insert their data" ON drivers;
DROP POLICY IF EXISTS "Dealers can view their drivers" ON drivers;
DROP POLICY IF EXISTS "Dealers can add drivers" ON drivers;
DROP POLICY IF EXISTS "Dealers can update their drivers" ON drivers;
DROP POLICY IF EXISTS "Dealers can view drivers for their dealership" ON drivers;
DROP POLICY IF EXISTS "Dealers can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can view other drivers" ON drivers;
DROP POLICY IF EXISTS "Dealers can pre-register drivers or drivers self-register" ON drivers;
DROP POLICY IF EXISTS "Drivers can self-register" ON drivers;
DROP POLICY IF EXISTS "Dealers can pre-register drivers" ON drivers;
DROP POLICY IF EXISTS "Allow drivers to view other drivers for search" ON drivers;
DROP POLICY IF EXISTS "Dealers can view applicant driver data" ON drivers;
DROP POLICY IF EXISTS "Sales can view their dealer's drivers" ON drivers;

-- Drop all policies on driver_applications table if it exists
DROP POLICY IF EXISTS "Drivers can create applications" ON driver_applications;
DROP POLICY IF EXISTS "Drivers can view their own applications" ON driver_applications;
DROP POLICY IF EXISTS "Dealers can view applications to their dealership" ON driver_applications;
DROP POLICY IF EXISTS "Dealers can update applications to their dealership" ON driver_applications;

-- =====================================================
-- STEP 2: DROP COMPLEX TABLES
-- =====================================================

-- Drop driver_applications table entirely - we'll use a simpler approach
DROP TABLE IF EXISTS driver_applications CASCADE;

-- =====================================================
-- STEP 3: CLEAN AND RECREATE DRIVERS TABLE
-- =====================================================

-- Drop and recreate drivers table with clean schema
DROP TABLE IF EXISTS drivers CASCADE;

CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  vehicle_type text NOT NULL,
  license_number text,
  radius integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'active',
  is_available boolean NOT NULL DEFAULT true,
  available_for_customer_deliveries boolean NOT NULL DEFAULT true,
  available_for_dealer_swaps boolean NOT NULL DEFAULT true,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE SIMPLE, CLEAN RLS POLICIES
-- =====================================================

-- Policy 1: Drivers can insert their own record during signup
-- This is the PRIMARY path for driver self-registration
CREATE POLICY "Drivers can self-register"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: SELECT policy - drivers can view their own data, and all users can view all drivers
-- This supports the driver search functionality where drivers/dealers need to see available drivers
CREATE POLICY "Users can view all drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Drivers can update only their own record
CREATE POLICY "Drivers can update their own data"
  ON drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Dealers can update drivers in their dealership
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

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON drivers(user_id);
CREATE INDEX IF NOT EXISTS drivers_dealer_id_idx ON drivers(dealer_id);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON drivers(status);
CREATE INDEX IF NOT EXISTS drivers_is_available_idx ON drivers(is_available);

-- =====================================================
-- STEP 7: UPDATE DELIVERIES TABLE FOREIGN KEY
-- =====================================================

-- Ensure deliveries table still references drivers correctly
-- The foreign key should already exist, but we verify it's set to SET NULL on delete
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_driver_id_fkey;
  
  -- Add it back with proper ON DELETE behavior
  ALTER TABLE deliveries ADD CONSTRAINT deliveries_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists with correct definition
END $$;
