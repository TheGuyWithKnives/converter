/*
  # Add Admin Flag to User Profiles

  1. Changes
    - Add `is_admin` boolean column to `user_profiles` table
    - Default value is false for all users
    - Set matej.klima10@seznam.cz as admin user
  
  2. Security
    - Only admins can see real Meshy AI balance
    - Normal users continue with local credit system
*/

-- Add is_admin column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;

-- Set matej.klima10@seznam.cz as admin
UPDATE user_profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'matej.klima10@seznam.cz'
);
