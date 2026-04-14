/*
  # Add Read Status to Messages

  ## Overview
  Adds a read status field to the messages table to track whether a message has been read by the recipient.
  This enables unread message counters and read receipts in the chat interface.

  ## Changes to `messages` table
  - `read` (boolean) - Indicates whether the message has been read by the recipient (default: false)

  ## Indexes
  - Compound index on (delivery_id, recipient_id, read) for efficient unread message queries

  ## Notes
  - Messages are marked as unread by default when sent
  - Recipients can mark messages as read when viewing the chat
  - Unread count queries use this field for badge display
*/

-- Add read status field to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE messages ADD COLUMN read boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create compound index for efficient unread message queries
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(delivery_id, recipient_id, read);

-- Update existing messages to be marked as read (historical data)
UPDATE messages SET read = true WHERE read IS NULL;
