/*
  # SwapRunn Database Schema

  ## Overview
  Creates the complete database schema for SwapRunn, a logistics platform connecting car dealerships, 
  salespeople, and drivers for vehicle swaps and deliveries.

  ## New Tables
  
  ### `dealers`
  - `id` (uuid, primary key) - Unique identifier for dealership
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `name` (text) - Dealership name
  - `address` (text) - Physical address
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone number
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `sales`
  - `id` (uuid, primary key) - Unique identifier for salesperson
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `name` (text) - Salesperson name
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone number
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `drivers`
  - `id` (uuid, primary key) - Unique identifier for driver
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `name` (text) - Driver name
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone number
  - `vehicle_type` (text) - Type of vehicle (car/truck/trailer)
  - `radius` (integer) - Service radius in miles
  - `available_for_customer_deliveries` (boolean) - Customer delivery availability
  - `available_for_dealer_swaps` (boolean) - Dealer swap availability
  - `is_available` (boolean) - Current availability status
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `deliveries`
  - `id` (uuid, primary key) - Unique identifier for delivery
  - `dealer_id` (uuid, foreign key) - Reference to dealers table
  - `driver_id` (uuid, foreign key) - Reference to drivers table (nullable)
  - `sales_id` (uuid, foreign key) - Reference to sales table (nullable)
  - `pickup` (text) - Pickup location
  - `dropoff` (text) - Dropoff location
  - `vin` (text) - Vehicle identification number
  - `notes` (text) - Additional delivery notes
  - `status` (text) - Delivery status (pending/assigned/in_progress/completed/cancelled)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp
  
  ### `messages`
  - `id` (uuid, primary key) - Unique identifier for message
  - `delivery_id` (uuid, foreign key) - Reference to deliveries table
  - `sender_id` (uuid, foreign key) - Reference to auth.users
  - `recipient_id` (uuid, foreign key) - Reference to auth.users
  - `content` (text) - Message content
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - Enable RLS on all tables
  - Create policies for role-based access control
  - Users can only access data relevant to their role
  - Messages are only visible to sender and recipient
*/

-- Create dealers table
CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view their own data"
  ON dealers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Dealers can update their own data"
  ON dealers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view dealer names for selection"
  ON dealers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "New dealers can insert their data"
  ON dealers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales can view their own data"
  ON sales FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sales can update their own data"
  ON sales FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dealers can view their sales team"
  ON sales FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "New sales can insert their data"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  vehicle_type text NOT NULL,
  radius integer NOT NULL DEFAULT 50,
  available_for_customer_deliveries boolean DEFAULT true,
  available_for_dealer_swaps boolean DEFAULT true,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own data"
  ON drivers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own data"
  ON drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view available drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "New drivers can insert their data"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  sales_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  pickup text NOT NULL,
  dropoff text NOT NULL,
  vin text NOT NULL,
  notes text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view their deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can update their deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view assigned deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update assigned deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales can view their deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    sales_id IN (
      SELECT id FROM sales WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales can create delivery requests"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_id IN (
      SELECT id FROM sales WHERE user_id = auth.uid()
    )
  );

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view messages sent to them"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS dealers_user_id_idx ON dealers(user_id);
CREATE INDEX IF NOT EXISTS sales_user_id_idx ON sales(user_id);
CREATE INDEX IF NOT EXISTS sales_dealer_id_idx ON sales(dealer_id);
CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON drivers(user_id);
CREATE INDEX IF NOT EXISTS deliveries_dealer_id_idx ON deliveries(dealer_id);
CREATE INDEX IF NOT EXISTS deliveries_driver_id_idx ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS deliveries_sales_id_idx ON deliveries(sales_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries(status);
CREATE INDEX IF NOT EXISTS messages_delivery_id_idx ON messages(delivery_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON messages(recipient_id);
