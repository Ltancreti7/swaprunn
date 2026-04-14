/*
  # Create Account Deletion Function

  1. Purpose
    - Enables users to delete their account and all associated data
    - Required for Apple App Store compliance
    - Ensures complete data removal across all related tables

  2. Function: delete_user_account()
    - Deletes user data from all application tables
    - Removes auth.users record (cascades to related data)
    - Returns success/error status

  3. Tables Affected
    - dealers: Dealership profiles
    - sales: Sales associate profiles
    - drivers: Driver profiles
    - deliveries: Associated deliveries
    - messages: User messages
    - notifications: User notifications
    - driver_applications: Driver applications
    - approved_driver_dealers: Driver-dealer relationships
    - dealer_admins: Admin access records
    - admin_invitations: Pending invitations
    - driver_preferences: Driver preferences
    - driver_statistics: Driver statistics
    - delivery_status_history: Status change history

  4. Security
    - RLS policies ensure users can only delete their own account
    - Function runs with invoker's security context
*/

-- Create function to handle complete account deletion
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Delete from tables in correct order (children first, then parents)
  
  -- Delete driver-related data
  DELETE FROM driver_statistics WHERE driver_id IN (
    SELECT id FROM drivers WHERE user_id = v_user_id
  );
  
  DELETE FROM driver_preferences WHERE driver_id IN (
    SELECT id FROM drivers WHERE user_id = v_user_id
  );
  
  DELETE FROM approved_driver_dealers WHERE driver_id IN (
    SELECT id FROM drivers WHERE user_id = v_user_id
  );
  
  DELETE FROM driver_applications WHERE driver_id IN (
    SELECT id FROM drivers WHERE user_id = v_user_id
  );

  -- Delete delivery-related data
  DELETE FROM delivery_status_history WHERE delivery_id IN (
    SELECT id FROM deliveries WHERE 
      driver_id IN (SELECT id FROM drivers WHERE user_id = v_user_id)
      OR sales_id IN (SELECT id FROM sales WHERE user_id = v_user_id)
      OR dealer_id IN (SELECT id FROM dealers WHERE user_id = v_user_id)
  );

  DELETE FROM messages WHERE 
    sender_id = v_user_id OR recipient_id = v_user_id;

  -- Delete notifications
  DELETE FROM notifications WHERE user_id = v_user_id;

  -- Delete deliveries (will cascade to related messages/history via FK if configured)
  DELETE FROM deliveries WHERE 
    driver_id IN (SELECT id FROM drivers WHERE user_id = v_user_id)
    OR sales_id IN (SELECT id FROM sales WHERE user_id = v_user_id)
    OR dealer_id IN (SELECT id FROM dealers WHERE user_id = v_user_id);

  -- Delete admin-related data
  DELETE FROM dealer_admins WHERE user_id = v_user_id;
  DELETE FROM admin_invitations WHERE invited_by = v_user_id;

  -- Delete invitations sent by this user (if dealer)
  DELETE FROM invitations WHERE dealer_id IN (
    SELECT id FROM dealers WHERE user_id = v_user_id
  );

  -- Delete profile records
  DELETE FROM drivers WHERE user_id = v_user_id;
  DELETE FROM sales WHERE user_id = v_user_id;
  DELETE FROM dealers WHERE user_id = v_user_id;

  -- Finally, delete the auth user (this will cascade to any remaining FK references)
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;