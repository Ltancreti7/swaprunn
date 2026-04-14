/*
  # Add Vehicle Details and Service Type to Deliveries

  ## Summary
  Enhances the deliveries table to capture comprehensive vehicle information and service type details,
  enabling better logistics management and delivery tracking.

  ## Changes Made

  ### New Columns Added to `deliveries` table:
  
  #### Vehicle Details:
  - `year` (integer, nullable) - Vehicle year (e.g., 2005-2025)
  - `make` (text, nullable) - Vehicle manufacturer (e.g., Toyota, Honda, Ford)
  - `model` (text, nullable) - Vehicle model name
  - `transmission` (text, nullable) - Transmission type (Automatic or Manual)
  
  #### Service Type:
  - `service_type` (text, nullable, default 'delivery') - Type of service requested
    - Options: 'delivery' or 'swap'
    - Defaults to 'delivery' for backward compatibility
  
  #### Conditional Delivery Fields:
  - `has_trade` (boolean, nullable) - Indicates if there is a trade-in involved
    - Only applicable when service_type is 'delivery'
  - `requires_second_driver` (boolean, nullable) - Indicates if a second driver is needed
    - Only applicable when service_type is 'delivery'

  ## Indexes
  - Added index on `year` column for efficient filtering and reporting
  - Added index on `make` column for quick vehicle manufacturer searches
  - Added index on `service_type` column for filtering by service type

  ## Important Notes
  1. All new columns are nullable to maintain backward compatibility with existing delivery records
  2. Default value for service_type is 'delivery' to match the default behavior in the UI
  3. Check constraint ensures service_type is either 'delivery' or 'swap'
  4. Conditional fields (has_trade, requires_second_driver) are nullable and only populated when service_type is 'delivery'
*/

-- Add vehicle detail columns to deliveries table
DO $$
BEGIN
  -- Add year column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'year'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN year integer;
  END IF;

  -- Add make column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'make'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN make text;
  END IF;

  -- Add model column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'model'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN model text;
  END IF;

  -- Add transmission column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'transmission'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN transmission text;
  END IF;

  -- Add service_type column with default value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN service_type text DEFAULT 'delivery';
  END IF;

  -- Add has_trade column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'has_trade'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN has_trade boolean;
  END IF;

  -- Add requires_second_driver column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'requires_second_driver'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN requires_second_driver boolean;
  END IF;
END $$;

-- Add check constraint for service_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deliveries_service_type_check'
  ) THEN
    ALTER TABLE deliveries
    ADD CONSTRAINT deliveries_service_type_check
    CHECK (service_type IN ('delivery', 'swap'));
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS deliveries_year_idx ON deliveries(year);
CREATE INDEX IF NOT EXISTS deliveries_make_idx ON deliveries(make);
CREATE INDEX IF NOT EXISTS deliveries_service_type_idx ON deliveries(service_type);