/*
  # Add License Number to Drivers Table

  ## Changes
  - Add `license_number` column to drivers table (optional text field)

  ## Purpose
  Allows drivers to optionally provide their driver's license number during signup
*/

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number text;
