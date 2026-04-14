/*
  # Fix Infinite Recursion in dealer_admins RLS Policies

  ## Problem
  The RLS policies on dealer_admins table query the same table they protect,
  causing infinite recursion when PostgreSQL tries to evaluate the policies.

  ## Solution
  Remove the recursive policies and create simpler, non-recursive policies:
  - Users can view their own admin records
  - Users can view all admins of dealerships they belong to (using a security definer function)
  - Only owners can manage admins (checked via application logic or separate function)

  ## Changes
  1. Drop all existing policies on dealer_admins
  2. Create new non-recursive policies
  3. Create a security definer function to safely check admin status
*/

-- Drop all existing policies on dealer_admins that cause recursion
DROP POLICY IF EXISTS "Admins can view dealership admins" ON dealer_admins;
DROP POLICY IF EXISTS "Owners can add admins" ON dealer_admins;
DROP POLICY IF EXISTS "Owners can update admin roles" ON dealer_admins;
DROP POLICY IF EXISTS "Owners can remove admins" ON dealer_admins;

-- Drop policies on admin_invitations that cause recursion
DROP POLICY IF EXISTS "Admins can view dealership invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Owners can update invitations" ON admin_invitations;

-- Create a security definer function to get user's dealer IDs without recursion
CREATE OR REPLACE FUNCTION get_user_dealer_ids(check_user_id uuid)
RETURNS TABLE(dealer_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT dealer_id FROM dealer_admins WHERE user_id = check_user_id;
$$;

-- Create a security definer function to check if user is owner
CREATE OR REPLACE FUNCTION is_dealer_owner(check_user_id uuid, check_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dealer_admins 
    WHERE user_id = check_user_id 
    AND dealer_id = check_dealer_id 
    AND role = 'owner'
  );
$$;

-- New simple policies for dealer_admins

-- Users can always view their own admin records
CREATE POLICY "Users can view own admin records"
  ON dealer_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view all admins of dealerships they belong to
CREATE POLICY "Users can view dealership admins"
  ON dealer_admins FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));

-- Users can insert admin records if they are an owner (checked by function)
CREATE POLICY "Owners can add admins"
  ON dealer_admins FOR INSERT
  TO authenticated
  WITH CHECK (is_dealer_owner(auth.uid(), dealer_id));

-- Users can update admin records if they are an owner
CREATE POLICY "Owners can update admin roles"
  ON dealer_admins FOR UPDATE
  TO authenticated
  USING (is_dealer_owner(auth.uid(), dealer_id))
  WITH CHECK (is_dealer_owner(auth.uid(), dealer_id));

-- Users can delete admin records if they are an owner (but not themselves)
CREATE POLICY "Owners can remove admins"
  ON dealer_admins FOR DELETE
  TO authenticated
  USING (is_dealer_owner(auth.uid(), dealer_id) AND user_id != auth.uid());

-- New policies for admin_invitations

CREATE POLICY "Admins can view dealership invitations"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (dealer_id IN (SELECT get_user_dealer_ids(auth.uid())));

CREATE POLICY "Owners can create invitations"
  ON admin_invitations FOR INSERT
  TO authenticated
  WITH CHECK (is_dealer_owner(auth.uid(), dealer_id));

CREATE POLICY "Owners can update invitations"
  ON admin_invitations FOR UPDATE
  TO authenticated
  USING (is_dealer_owner(auth.uid(), dealer_id))
  WITH CHECK (is_dealer_owner(auth.uid(), dealer_id));