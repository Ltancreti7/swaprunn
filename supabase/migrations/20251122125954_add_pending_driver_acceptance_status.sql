/*
  # Add pending driver acceptance status

  1. Changes
    - Add check constraint to allow 'pending_driver_acceptance' status for deliveries
    - This status indicates a delivery has been assigned to a specific driver by sales staff
      but the driver has not yet accepted or rejected it
  
  2. Status Flow
    - pending: No driver assigned yet, available to all approved drivers
    - pending_driver_acceptance: Assigned to specific driver, waiting for driver's response
    - accepted: Driver accepted the delivery
    - assigned: (deprecated - will be phased out, same as accepted)
    - in_progress: Driver started the delivery
    - completed: Delivery finished
    - cancelled: Delivery cancelled

  3. Security
    - No RLS changes needed
    - Existing policies handle the new status appropriately
*/

-- Drop the existing check constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deliveries_status_check' 
    AND table_name = 'deliveries'
  ) THEN
    ALTER TABLE deliveries DROP CONSTRAINT deliveries_status_check;
  END IF;
END $$;

-- Add new check constraint with pending_driver_acceptance status
ALTER TABLE deliveries
ADD CONSTRAINT deliveries_status_check
CHECK (status IN (
  'pending',
  'pending_driver_acceptance',
  'accepted',
  'assigned',
  'in_progress',
  'completed',
  'cancelled'
));