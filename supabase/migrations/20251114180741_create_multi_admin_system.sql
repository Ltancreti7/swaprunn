/*
  # Create Multi-Admin System for Dealerships

  ## Overview
  This migration enables dealerships to have multiple administrators with different permission levels.
  It creates a many-to-many relationship between dealers and users, replacing the single user_id model.

  ## New Tables

  ### `dealer_admins`
  - `id` (uuid, primary key) - Unique identifier
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `role` (text) - Admin role: 'owner', 'manager', or 'viewer'
  - `invited_by` (uuid) - User who invited this admin
  - `invited_at` (timestamptz) - When invitation was sent
  - `accepted_at` (timestamptz) - When invitation was accepted
  - `created_at` (timestamptz) - Record creation timestamp

  ### `admin_invitations`
  - `id` (uuid, primary key) - Unique identifier
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `email` (text) - Email of invited admin
  - `role` (text) - Proposed role for the admin
  - `invited_by` (uuid) - User who sent the invitation
  - `token` (text) - Unique invitation token
  - `status` (text) - 'pending', 'accepted', 'expired', 'revoked'
  - `expires_at` (timestamptz) - When invitation expires
  - `created_at` (timestamptz) - Record creation timestamp

  ## Data Migration
  - Migrate existing dealers to have their current user_id as the primary owner in dealer_admins

  ## Security
  - Enable RLS on all new tables
  - Update dealer policies to check dealer_admins table
  - Owners can manage all aspects
  - Managers can manage deliveries and team but not admins
  - Viewers have read-only access
*/

-- Create dealer_admins table
CREATE TABLE IF NOT EXISTS dealer_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id, user_id)
);

CREATE INDEX IF NOT EXISTS dealer_admins_dealer_id_idx ON dealer_admins(dealer_id);
CREATE INDEX IF NOT EXISTS dealer_admins_user_id_idx ON dealer_admins(user_id);

ALTER TABLE dealer_admins ENABLE ROW LEVEL SECURITY;

-- Admins can view other admins of their dealership
CREATE POLICY "Admins can view dealership admins"
  ON dealer_admins FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

-- Only owners can add new admins
CREATE POLICY "Owners can add admins"
  ON dealer_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can update admin roles
CREATE POLICY "Owners can update admin roles"
  ON dealer_admins FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can remove admins (except themselves)
CREATE POLICY "Owners can remove admins"
  ON dealer_admins FOR DELETE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND user_id != auth.uid()
  );

-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_invitations_dealer_id_idx ON admin_invitations(dealer_id);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS admin_invitations_token_idx ON admin_invitations(token);

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations for their dealership
CREATE POLICY "Admins can view dealership invitations"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON admin_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Owners can update invitations (revoke)
CREATE POLICY "Owners can update invitations"
  ON admin_invitations FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Anyone can view invitations by token (for accepting)
CREATE POLICY "Anyone can view invitations by token"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (true);

-- Migrate existing dealers to dealer_admins table
INSERT INTO dealer_admins (dealer_id, user_id, role, invited_by, invited_at, accepted_at)
SELECT id, user_id, 'owner', user_id, created_at, created_at
FROM dealers
WHERE user_id IS NOT NULL
ON CONFLICT (dealer_id, user_id) DO NOTHING;

-- Update dealer RLS policies to use dealer_admins table
-- Drop old policies
DROP POLICY IF EXISTS "Dealers can view their own data" ON dealers;
DROP POLICY IF EXISTS "Dealers can update their own data" ON dealers;

-- Create new policies using dealer_admins
CREATE POLICY "Admins can view their dealership data"
  ON dealers FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can update dealership data"
  ON dealers FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Update delivery policies to use dealer_admins
DROP POLICY IF EXISTS "Dealers can view their deliveries" ON deliveries;
DROP POLICY IF EXISTS "Dealers can create deliveries" ON deliveries;
DROP POLICY IF EXISTS "Dealers can update their deliveries" ON deliveries;

CREATE POLICY "Admins can view dealership deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can update deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Update sales policies to use dealer_admins
DROP POLICY IF EXISTS "Dealers can view their sales team" ON sales;

CREATE POLICY "Admins can view dealership sales team"
  ON sales FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );
