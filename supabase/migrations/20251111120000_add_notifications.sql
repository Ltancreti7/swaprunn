/*
  # Add Notifications System

  ## Overview
  Adds a notifications table to track delivery updates, assignments, and system events.

  ## New Tables

  ### `notifications`
  - `id` (uuid, primary key) - Unique identifier for notification
  - `user_id` (uuid, foreign key) - Reference to auth.users who receives the notification
  - `delivery_id` (uuid, foreign key) - Reference to related delivery (nullable)
  - `type` (text) - Notification type (delivery_assigned, status_update, new_message, etc.)
  - `title` (text) - Notification title
  - `message` (text) - Notification message content
  - `is_read` (boolean) - Whether notification has been read
  - `created_at` (timestamptz) - Notification timestamp

  ## Security
  - Enable RLS on notifications table
  - Users can only view their own notifications
  - Users can mark their own notifications as read
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_delivery_id uuid,
  p_type text,
  p_title text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, delivery_id, type, title, message)
  VALUES (p_user_id, p_delivery_id, p_type, p_title, p_message)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;
