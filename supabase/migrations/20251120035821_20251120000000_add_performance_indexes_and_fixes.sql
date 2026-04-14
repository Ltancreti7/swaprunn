/*
  # Add performance indexes and data integrity fixes

  1. Performance Improvements
    - Add compound indexes for common query patterns:
      - deliveries (dealer_id, status, created_at) - for dealer dashboard filtering
      - deliveries (driver_id, status, created_at) - for driver dashboard filtering
      - messages (delivery_id, recipient_id, read) - for unread message queries
      - notifications (user_id, read, created_at) - for notification center
      - driver_applications (dealer_id, status, applied_at) - for application queries
    
  2. Data Integrity
    - Clean up orphaned driver applications (where driver was deleted)
    - Add check constraint to ensure driver_id is set when status requires it
*/

-- Add compound indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_dealer_status_created 
  ON deliveries(dealer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status_created 
  ON deliveries(driver_id, status, created_at DESC) 
  WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_delivery_recipient_read 
  ON messages(delivery_id, recipient_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_applications_dealer_status 
  ON driver_applications(dealer_id, status, applied_at DESC);

-- Clean up orphaned driver applications (where driver was deleted)
DELETE FROM driver_applications
WHERE driver_id NOT IN (SELECT id FROM drivers);

-- Add check constraint to ensure driver_id is set when status is 'accepted' or 'in_progress'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'deliveries_driver_required_when_accepted'
  ) THEN
    ALTER TABLE deliveries 
    ADD CONSTRAINT deliveries_driver_required_when_accepted 
    CHECK (
      (status IN ('accepted', 'in_progress', 'completed') AND driver_id IS NOT NULL) 
      OR 
      (status NOT IN ('accepted', 'in_progress', 'completed'))
    );
  END IF;
END $$;