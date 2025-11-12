/*
  # Add password field to profiles table

  1. Changes
    - Add `password` column to `profiles` table
    - Password is required for authentication
    - No encryption for simplicity (in production, use proper hashing)

  2. Security
    - RLS policies remain unchanged
    - Password is stored as plain text (for development only)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password text NOT NULL DEFAULT '';
  END IF;
END $$;
