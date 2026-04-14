/*
  # Create Driver Preferences and Performance Statistics System

  ## Overview
  Implements driver selection preferences and performance tracking to help dealerships
  and sales staff choose the best drivers for deliveries.

  ## New Tables

  ### `driver_preferences`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users (dealer or sales user)
  - `driver_id` (uuid, foreign key) - Reference to drivers table
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `preference_level` (integer) - Rating from 1-5 (5=favorite)
  - `last_used_at` (timestamptz) - Last time this driver was selected
  - `use_count` (integer) - Number of times this driver was selected
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `driver_statistics`
  - `id` (uuid, primary key) - Unique identifier
  - `driver_id` (uuid, foreign key) - Reference to drivers table
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `total_deliveries` (integer) - Total completed deliveries
  - `completed_deliveries` (integer) - Successfully completed deliveries
  - `cancelled_deliveries` (integer) - Cancelled deliveries
  - `average_completion_time` (interval) - Average time to complete delivery
  - `on_time_percentage` (numeric) - Percentage of on-time deliveries
  - `last_delivery_at` (timestamptz) - Last completed delivery timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - Enable RLS on all new tables
  - Create policies for role-based access
  - Dealers and sales can view and manage preferences for their dealership
  - Statistics are visible to dealers and sales staff
  - Drivers can view their own statistics

  ## Notes
  - Driver preferences help users quickly select trusted drivers
  - Statistics provide data-driven insights for driver selection
  - System tracks usage patterns to suggest frequently used drivers
*/

-- Create driver_preferences table
CREATE TABLE IF NOT EXISTS driver_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  preference_level integer DEFAULT 3 CHECK (preference_level >= 1 AND preference_level <= 5),
  last_used_at timestamptz DEFAULT now(),
  use_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, driver_id, dealer_id)
);

ALTER TABLE driver_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON driver_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
  ON driver_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON driver_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON driver_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Dealers can view preferences for their dealership"
  ON driver_preferences FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

-- Create driver_statistics table
CREATE TABLE IF NOT EXISTS driver_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  total_deliveries integer DEFAULT 0,
  completed_deliveries integer DEFAULT 0,
  cancelled_deliveries integer DEFAULT 0,
  average_completion_time interval DEFAULT '0 seconds',
  on_time_percentage numeric(5,2) DEFAULT 100.00,
  last_delivery_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, dealer_id)
);

ALTER TABLE driver_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view statistics for their dealership"
  ON driver_statistics FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales can view statistics for their dealership"
  ON driver_statistics FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT dealer_id FROM sales WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view their own statistics"
  ON driver_statistics FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS driver_preferences_user_id_idx ON driver_preferences(user_id);
CREATE INDEX IF NOT EXISTS driver_preferences_driver_id_idx ON driver_preferences(driver_id);
CREATE INDEX IF NOT EXISTS driver_preferences_dealer_id_idx ON driver_preferences(dealer_id);
CREATE INDEX IF NOT EXISTS driver_preferences_preference_level_idx ON driver_preferences(preference_level);
CREATE INDEX IF NOT EXISTS driver_preferences_last_used_at_idx ON driver_preferences(last_used_at DESC);

CREATE INDEX IF NOT EXISTS driver_statistics_driver_id_idx ON driver_statistics(driver_id);
CREATE INDEX IF NOT EXISTS driver_statistics_dealer_id_idx ON driver_statistics(dealer_id);
CREATE INDEX IF NOT EXISTS driver_statistics_completed_deliveries_idx ON driver_statistics(completed_deliveries DESC);

-- Create function to update driver statistics when deliveries are completed
CREATE OR REPLACE FUNCTION update_driver_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO driver_statistics (
      driver_id,
      dealer_id,
      total_deliveries,
      completed_deliveries,
      last_delivery_at,
      updated_at
    )
    VALUES (
      NEW.driver_id,
      NEW.dealer_id,
      1,
      1,
      NEW.completed_at,
      now()
    )
    ON CONFLICT (driver_id, dealer_id)
    DO UPDATE SET
      total_deliveries = driver_statistics.total_deliveries + 1,
      completed_deliveries = driver_statistics.completed_deliveries + 1,
      last_delivery_at = NEW.completed_at,
      updated_at = now();
  ELSIF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO driver_statistics (
      driver_id,
      dealer_id,
      total_deliveries,
      cancelled_deliveries,
      updated_at
    )
    VALUES (
      NEW.driver_id,
      NEW.dealer_id,
      1,
      1,
      now()
    )
    ON CONFLICT (driver_id, dealer_id)
    DO UPDATE SET
      total_deliveries = driver_statistics.total_deliveries + 1,
      cancelled_deliveries = driver_statistics.cancelled_deliveries + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update statistics
DROP TRIGGER IF EXISTS update_driver_statistics_trigger ON deliveries;
CREATE TRIGGER update_driver_statistics_trigger
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION update_driver_statistics();

-- Create function to update driver preference usage
CREATE OR REPLACE FUNCTION update_driver_preference_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    -- Get the user_id from sales or dealer_admins table
    DECLARE
      preference_user_id uuid;
    BEGIN
      IF NEW.sales_id IS NOT NULL THEN
        SELECT user_id INTO preference_user_id FROM sales WHERE id = NEW.sales_id;
      ELSE
        SELECT user_id INTO preference_user_id FROM dealer_admins 
        WHERE dealer_id = NEW.dealer_id 
        ORDER BY created_at ASC 
        LIMIT 1;
      END IF;

      IF preference_user_id IS NOT NULL THEN
        INSERT INTO driver_preferences (
          user_id,
          driver_id,
          dealer_id,
          last_used_at,
          use_count
        )
        VALUES (
          preference_user_id,
          NEW.driver_id,
          NEW.dealer_id,
          now(),
          1
        )
        ON CONFLICT (user_id, driver_id, dealer_id)
        DO UPDATE SET
          last_used_at = now(),
          use_count = driver_preferences.use_count + 1,
          updated_at = now();
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track driver preference usage
DROP TRIGGER IF EXISTS track_driver_preference_trigger ON deliveries;
CREATE TRIGGER track_driver_preference_trigger
  AFTER INSERT ON deliveries
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION update_driver_preference_usage();