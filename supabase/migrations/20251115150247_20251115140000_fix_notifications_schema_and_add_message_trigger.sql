/*
  # Fix Notifications Schema and Add Message Notification Trigger

  ## Overview
  This migration fixes the notification system to work properly in real-time:
  1. Renames the `is_read` column to `read` to match TypeScript interface
  2. Creates automatic notification trigger for new messages
  3. Updates all indexes and policies to use correct column name

  ## Changes Made

  ### Schema Updates
  - Rename `notifications.is_read` to `notifications.read`
  - Update index from `notifications_is_read_idx` to `notifications_read_idx`
  - Maintain backward compatibility during transition

  ### New Functions and Triggers
  - `notify_message_recipient()` - Function to create notification when message is sent
  - `notify_message_recipient_trigger` - Trigger that fires on message INSERT
  - Automatically notifies recipient with delivery context for chat navigation

  ## Security
  - Maintains existing RLS policies
  - Ensures notifications only created for valid recipients
  - Prevents notifications to null user_ids
*/

-- Step 1: Rename is_read column to read
DO $$
BEGIN
  -- Check if is_read exists and read doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    -- Rename the column
    ALTER TABLE notifications RENAME COLUMN is_read TO read;
  END IF;
END $$;

-- Step 2: Drop old index if it exists
DROP INDEX IF EXISTS notifications_is_read_idx;

-- Step 3: Create new index with correct name
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

-- Step 4: Update RLS policies to ensure they reference correct column
-- (The existing policies should work fine, but we'll recreate them to be sure)

-- Drop and recreate the user update policy to ensure it references the correct column
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Create function to automatically notify message recipients
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_name text;
  v_sender_name text;
  v_delivery_vin text;
BEGIN
  -- Get recipient information (name from drivers, sales, or dealers)
  SELECT COALESCE(d.name, s.name, dl.name, 'Unknown')
  INTO v_recipient_name
  FROM auth.users u
  LEFT JOIN drivers d ON d.user_id = u.id
  LEFT JOIN sales s ON s.user_id = u.id
  LEFT JOIN dealers dl ON dl.user_id = u.id
  WHERE u.id = NEW.recipient_id;

  -- Get sender information
  SELECT COALESCE(d.name, s.name, dl.name, 'Someone')
  INTO v_sender_name
  FROM auth.users u
  LEFT JOIN drivers d ON d.user_id = u.id
  LEFT JOIN sales s ON s.user_id = u.id
  LEFT JOIN dealers dl ON dl.user_id = u.id
  WHERE u.id = NEW.sender_id;

  -- Get delivery VIN for context
  SELECT vin INTO v_delivery_vin
  FROM deliveries
  WHERE id = NEW.delivery_id;

  -- Only create notification if recipient has a user_id (is signed up)
  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      delivery_id,
      type,
      title,
      message,
      read
    ) VALUES (
      NEW.recipient_id,
      NEW.delivery_id,
      'new_message',
      'New Message',
      v_sender_name || ' sent you a message about VIN: ' || COALESCE(v_delivery_vin, 'Unknown'),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Step 6: Create trigger to notify on new messages
DROP TRIGGER IF EXISTS notify_message_recipient_trigger ON messages;

CREATE TRIGGER notify_message_recipient_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_recipient();

-- Step 7: Add comment to table for documentation
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read by the user';
COMMENT ON TRIGGER notify_message_recipient_trigger ON messages IS 'Automatically creates a notification when a new message is sent';
