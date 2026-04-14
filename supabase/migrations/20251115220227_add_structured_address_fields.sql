/*
  # Add Structured Address Fields to Deliveries and Sales Tables

  ## Changes to deliveries table
  - Add `pickup_street` (text) - Street address for pickup location
  - Add `pickup_city` (text) - City for pickup location
  - Add `pickup_state` (text) - Two-letter state code for pickup location
  - Add `pickup_zip` (text) - ZIP code for pickup location
  - Add `dropoff_street` (text) - Street address for dropoff location
  - Add `dropoff_city` (text) - City for dropoff location
  - Add `dropoff_state` (text) - Two-letter state code for dropoff location
  - Add `dropoff_zip` (text) - ZIP code for dropoff location

  ## Changes to sales table
  - Add `default_pickup_street` (text) - Default street address for sales user
  - Add `default_pickup_city` (text) - Default city for sales user
  - Add `default_pickup_state` (text) - Default two-letter state code for sales user
  - Add `default_pickup_zip` (text) - Default ZIP code for sales user

  ## Notes
  - All new fields are nullable to maintain backward compatibility
  - Existing `pickup`, `dropoff`, and `default_pickup_location` fields remain unchanged
  - The legacy fields will continue to store formatted full addresses
  - New structured fields enable better validation and autocomplete functionality
*/

-- Add structured address fields to deliveries table
DO $$
BEGIN
  -- Pickup location fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'pickup_street'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_street text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'pickup_city'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'pickup_state'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'pickup_zip'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_zip text;
  END IF;

  -- Dropoff location fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'dropoff_street'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN dropoff_street text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'dropoff_city'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN dropoff_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'dropoff_state'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN dropoff_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'dropoff_zip'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN dropoff_zip text;
  END IF;
END $$;

-- Add structured address fields to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'default_pickup_street'
  ) THEN
    ALTER TABLE sales ADD COLUMN default_pickup_street text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'default_pickup_city'
  ) THEN
    ALTER TABLE sales ADD COLUMN default_pickup_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'default_pickup_state'
  ) THEN
    ALTER TABLE sales ADD COLUMN default_pickup_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'default_pickup_zip'
  ) THEN
    ALTER TABLE sales ADD COLUMN default_pickup_zip text;
  END IF;
END $$;