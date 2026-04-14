/*
  # Fix Admin Invitation System - Add Notifications and Helper Functions

  ## Overview
  This migration fixes the admin invitation system by:
  1. Creating a secure function to get admin details with emails
  2. Adding automatic notifications when invitations are created
  3. Creating a function to accept invitations
  4. Fixing RLS policies to allow invitation acceptance

  ## New Functions

  ### `get_dealer_admins_with_emails(dealer_uuid)`
  - Returns admin information including email from auth.users
  - Uses SECURITY DEFINER to safely access auth.users
  - Only returns admins for dealerships the requesting user has access to

  ### `accept_admin_invitation(invitation_token)`
  - Allows a user to accept an invitation by token
  - Creates dealer_admins record
  - Updates invitation status to accepted
  - Returns success status

  ## Triggers

  ### `notify_admin_invitation`
  - Automatically creates notification when invitation is created
  - Only notifies if the invited user exists in the system
  - Provides direct information about the invitation

  ## Security
  - All functions use proper security checks
  - RLS policies updated to allow invitation acceptance
  - Functions only return data user has permission to see
*/

-- Function to get dealer admins with email addresses (fixes AdminManagement component)
CREATE OR REPLACE FUNCTION get_dealer_admins_with_emails(dealer_uuid uuid)
RETURNS TABLE (
  id uuid,
  dealer_id uuid,
  user_id uuid,
  role text,
  invited_by uuid,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz,
  email text,
  name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if requesting user has access to this dealer
  IF NOT EXISTS (
    SELECT 1 FROM dealer_admins 
    WHERE dealer_admins.dealer_id = dealer_uuid 
    AND dealer_admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return admin data with email from auth.users
  RETURN QUERY
  SELECT 
    da.id,
    da.dealer_id,
    da.user_id,
    da.role,
    da.invited_by,
    da.invited_at,
    da.accepted_at,
    da.created_at,
    au.email,
    au.raw_user_meta_data->>'name' as name
  FROM dealer_admins da
  LEFT JOIN auth.users au ON da.user_id = au.id
  WHERE da.dealer_id = dealer_uuid
  ORDER BY da.created_at;
END;
$$;

-- Function to accept an admin invitation
CREATE OR REPLACE FUNCTION accept_admin_invitation(invitation_token text)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation admin_invitations;
  v_user_id uuid;
  v_existing_admin uuid;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM admin_invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if invitation email matches current user
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = v_user_id 
    AND email = v_invitation.email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Invitation email does not match your account');
  END IF;

  -- Check if already an admin
  SELECT id INTO v_existing_admin
  FROM dealer_admins
  WHERE dealer_id = v_invitation.dealer_id
  AND user_id = v_user_id;

  IF v_existing_admin IS NOT NULL THEN
    -- Update invitation to accepted
    UPDATE admin_invitations
    SET status = 'accepted'
    WHERE id = v_invitation.id;

    RETURN json_build_object('success', true, 'message', 'You are already an admin for this dealership');
  END IF;

  -- Create admin record
  INSERT INTO dealer_admins (dealer_id, user_id, role, invited_by, invited_at, accepted_at)
  VALUES (
    v_invitation.dealer_id,
    v_user_id,
    v_invitation.role,
    v_invitation.invited_by,
    v_invitation.created_at,
    now()
  );

  -- Update invitation status
  UPDATE admin_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  -- Create notification
  INSERT INTO notifications (user_id, delivery_id, type, title, message, read)
  VALUES (
    v_user_id,
    NULL,
    'admin_role_granted',
    'Administrator Access Granted',
    'You have been granted ' || v_invitation.role || ' access to a dealership.',
    false
  );

  RETURN json_build_object('success', true, 'message', 'Invitation accepted successfully', 'role', v_invitation.role);
END;
$$;

-- Trigger to create notification when invitation is sent
CREATE OR REPLACE FUNCTION notify_user_of_admin_invitation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_dealer_name text;
  v_inviter_email text;
BEGIN
  -- Only process new pending invitations
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Check if invited email has an account
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = NEW.email;

  -- If user doesn't exist yet, they'll see invitation on login
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get dealer name
  SELECT name INTO v_dealer_name
  FROM dealers
  WHERE id = NEW.dealer_id;

  -- Get inviter email
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = NEW.invited_by;

  -- Create notification for the invited user
  INSERT INTO notifications (user_id, delivery_id, type, title, message, read)
  VALUES (
    v_user_id,
    NULL,
    'admin_invitation',
    'Admin Invitation Received',
    'You have been invited to be a ' || NEW.role || ' for ' || COALESCE(v_dealer_name, 'a dealership') || ' by ' || COALESCE(v_inviter_email, 'an administrator') || '. Check your profile to accept.',
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger for invitation notifications
DROP TRIGGER IF EXISTS trigger_notify_admin_invitation ON admin_invitations;
CREATE TRIGGER trigger_notify_admin_invitation
  AFTER INSERT ON admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_admin_invitation();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dealer_admins_with_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_admin_invitation(text) TO authenticated;

-- Update RLS policy to allow users to accept their own invitations
DROP POLICY IF EXISTS "Users can accept their own invitations" ON dealer_admins;
CREATE POLICY "Users can accept their own invitations"
  ON dealer_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_invitations
      WHERE admin_invitations.email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND admin_invitations.dealer_id = dealer_admins.dealer_id
      AND admin_invitations.status = 'pending'
      AND admin_invitations.expires_at > now()
    )
  );
