/*
  # Add Delivery Timeframe and Scheduling Fields

  ## Overview
  Adds timeframe selection and schedule confirmation fields to support driver-sales coordination workflow.
  Sales persons specify required completion timeframe when creating delivery requests, then confirm exact
  schedule after coordinating with driver through chat.

  ## Changes to `deliveries` table

  ### Timeframe Fields
  - `required_timeframe` (text) - When delivery needs to be completed: 'tomorrow', 'next_few_days', 'next_week', 'custom'
  - `custom_date` (date) - Specific date when sales person selects 'custom' timeframe option

  ### Schedule Confirmation Fields
  - `scheduled_date` (date) - Final confirmed delivery date set by sales person
  - `scheduled_time` (time) - Final confirmed delivery time set by sales person
  - `schedule_confirmed_by` (uuid) - Sales person who confirmed the final schedule
  - `schedule_confirmed_at` (timestamptz) - When schedule was finalized

  ### Chat Activation
  - `chat_activated_at` (timestamptz) - When chat became available after driver acceptance

  ## Indexes
  - Index on `required_timeframe` for filtering by urgency
  - Index on `scheduled_date` for calendar queries
  - Index on `schedule_confirmed_at` for tracking confirmations

  ## Notes
  - Required timeframe is set by sales person at delivery request creation
  - Schedule confirmation happens after driver acceptance and chat coordination
  - Only sales person can confirm final schedule through schedule_confirmed_by constraint
*/

-- Add required timeframe field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'required_timeframe'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN required_timeframe text;
  END IF;
END $$;

-- Add custom date field for custom timeframe option
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'custom_date'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN custom_date date;
  END IF;
END $$;

-- Add scheduled date field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN scheduled_date date;
  END IF;
END $$;

-- Add scheduled time field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN scheduled_time time;
  END IF;
END $$;

-- Add schedule confirmed by field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'schedule_confirmed_by'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN schedule_confirmed_by uuid REFERENCES sales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add schedule confirmed at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'schedule_confirmed_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN schedule_confirmed_at timestamptz;
  END IF;
END $$;

-- Add chat activated at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'chat_activated_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN chat_activated_at timestamptz;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS deliveries_required_timeframe_idx ON deliveries(required_timeframe);
CREATE INDEX IF NOT EXISTS deliveries_scheduled_date_idx ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS deliveries_schedule_confirmed_at_idx ON deliveries(schedule_confirmed_at);
CREATE INDEX IF NOT EXISTS deliveries_custom_date_idx ON deliveries(custom_date);

-- Add check constraint to ensure valid timeframe values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deliveries_required_timeframe_check'
  ) THEN
    ALTER TABLE deliveries
    ADD CONSTRAINT deliveries_required_timeframe_check
    CHECK (required_timeframe IN ('tomorrow', 'next_few_days', 'next_week', 'custom') OR required_timeframe IS NULL);
  END IF;
END $$;

-- Add check constraint to ensure custom_date is set when timeframe is custom
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deliveries_custom_date_required_check'
  ) THEN
    ALTER TABLE deliveries
    ADD CONSTRAINT deliveries_custom_date_required_check
    CHECK (
      (required_timeframe = 'custom' AND custom_date IS NOT NULL) OR
      (required_timeframe != 'custom' OR required_timeframe IS NULL)
    );
  END IF;
END $$;
