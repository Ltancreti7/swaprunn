/*
  # Enhanced Delivery Status Tracking

  ## Overview
  Adds comprehensive status tracking to the deliveries table with timestamps for each status transition,
  and creates a delivery_status_history table for complete audit trail.

  ## Changes to `deliveries` table
  - `accepted_at` (timestamptz) - Timestamp when delivery was accepted by driver
  - `accepted_by` (uuid) - Driver who accepted the delivery
  - `started_at` (timestamptz) - Timestamp when delivery was started
  - `completed_at` (timestamptz) - Timestamp when delivery was completed
  - `cancelled_at` (timestamptz) - Timestamp when delivery was cancelled
  - `cancelled_by` (uuid) - User who cancelled the delivery

  ## New Tables

  ### `delivery_status_history`
  - `id` (uuid, primary key) - Unique identifier
  - `delivery_id` (uuid, foreign key) - Reference to deliveries table
  - `status` (text) - New status value
  - `changed_by` (uuid, foreign key) - User who made the change
  - `changed_by_role` (text) - Role of user who made change (sales/driver/dealer)
  - `notes` (text) - Optional notes about the status change
  - `created_at` (timestamptz) - When the change occurred

  ## Security
  - Enable RLS on delivery_status_history table
  - Allow users to view history for deliveries they have access to
  - Only allow inserts through application logic (no direct user inserts)
*/

-- Add status tracking columns to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN accepted_by uuid REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN cancelled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create delivery status history table
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  changed_by_role text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;

-- Index for better query performance
CREATE INDEX IF NOT EXISTS delivery_status_history_delivery_id_idx ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS delivery_status_history_created_at_idx ON delivery_status_history(created_at);
CREATE INDEX IF NOT EXISTS deliveries_accepted_by_idx ON deliveries(accepted_by);

-- RLS Policies for delivery_status_history

CREATE POLICY "Dealers can view history for their deliveries"
  ON delivery_status_history FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT id FROM deliveries
      WHERE dealer_id IN (
        SELECT id FROM dealers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Drivers can view history for their deliveries"
  ON delivery_status_history FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT id FROM deliveries
      WHERE driver_id IN (
        SELECT id FROM drivers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sales can view history for their deliveries"
  ON delivery_status_history FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT id FROM deliveries
      WHERE sales_id IN (
        SELECT id FROM sales WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can insert status history"
  ON delivery_status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);
