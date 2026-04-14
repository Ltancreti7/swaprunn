/*
  # Fix Infinite Recursion in Driver RLS Policies

  ## Changes
  - Drop the problematic policy that causes infinite recursion
  - Keep the simpler "Sales can view available drivers from their dealership" policy
  
  ## Security
  The remaining policy allows sales reps to view drivers from their dealership
  without causing infinite recursion by avoiding self-referential table lookups
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Sales can view available drivers in their dealership" ON drivers;
