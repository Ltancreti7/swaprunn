/*
  # Add Default Pickup Location to Sales Table

  1. Changes
    - Add `default_pickup_location` column to `sales` table
      - Type: text (nullable)
      - Purpose: Store the sales representative's default pickup address (usually their dealership location)
      - Allows sales reps to avoid re-entering the same pickup location for every delivery request

  2. Purpose
    - Improve user experience by eliminating repetitive data entry
    - Sales representatives typically work from the same dealership location
    - This field stores their preferred default pickup address for convenience

  3. Notes
    - Field is optional (nullable) to support existing records and new users
    - Can be updated by sales representatives through their profile settings
    - Does not restrict users from entering different pickup locations per delivery
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'default_pickup_location'
  ) THEN
    ALTER TABLE sales ADD COLUMN default_pickup_location text;
  END IF;
END $$;
