/*
  # Meshy Balance Tracking and Admin System

  This migration creates the infrastructure for tracking Meshy.ai API balance
  and managing virtual credits vs. real credits.

  ## New Tables
  
  1. `meshy_balance_log`
     - `id` (uuid, primary key)
     - `balance` (integer) - Current Meshy.ai API balance
     - `last_checked` (timestamptz) - When balance was checked
     - `created_at` (timestamptz)
  
  2. `credit_pricing`
     - `id` (uuid, primary key)
     - `meshy_cost` (decimal) - Real cost of 1 Meshy credit
     - `user_price` (decimal) - Price user pays for 1 virtual credit
     - `margin_percent` (decimal) - Profit margin percentage
     - `active` (boolean) - Currently active pricing
     - `created_at` (timestamptz)
  
  3. `admin_notifications`
     - `id` (uuid, primary key)
     - `type` (text) - Notification type (e.g., 'low_balance')
     - `message` (text) - Notification message
     - `threshold` (integer) - Balance threshold that triggered notification
     - `current_balance` (integer) - Balance at time of notification
     - `is_read` (boolean) - Whether admin has seen it
     - `created_at` (timestamptz)
  
  ## Security
  
  - Enable RLS on all tables
  - Only admins can read/write these tables
  - Service role can insert balance logs
*/

-- Create meshy_balance_log table
CREATE TABLE IF NOT EXISTS meshy_balance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance integer NOT NULL,
  last_checked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create credit_pricing table
CREATE TABLE IF NOT EXISTS credit_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meshy_cost decimal(10,4) NOT NULL DEFAULT 0.0050,
  user_price decimal(10,4) NOT NULL DEFAULT 0.0100,
  margin_percent decimal(5,2) NOT NULL DEFAULT 50.00,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  message text NOT NULL,
  threshold integer,
  current_balance integer,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meshy_balance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meshy_balance_log
CREATE POLICY "Only admins can view balance logs"
  ON meshy_balance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert balance logs"
  ON meshy_balance_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for credit_pricing
CREATE POLICY "Only admins can view pricing"
  ON credit_pricing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can manage pricing"
  ON credit_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- RLS Policies for admin_notifications
CREATE POLICY "Only admins can view notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can create notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default pricing
INSERT INTO credit_pricing (meshy_cost, user_price, margin_percent, active)
VALUES (0.0050, 0.0100, 50.00, true)
ON CONFLICT DO NOTHING;

-- Create function to get latest balance
CREATE OR REPLACE FUNCTION get_latest_meshy_balance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_balance integer;
BEGIN
  SELECT balance INTO latest_balance
  FROM meshy_balance_log
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(latest_balance, 0);
END;
$$;

-- Create function to check if balance is low and create notification
CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal integer;
  threshold_val integer := 1000; -- Default threshold
BEGIN
  -- Get latest balance
  current_bal := get_latest_meshy_balance();
  
  -- Check if balance is below threshold
  IF current_bal < threshold_val THEN
    -- Check if we already have an unread notification for this level
    IF NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'low_balance'
      AND is_read = false
      AND current_balance <= threshold_val
      AND created_at > now() - interval '1 hour'
    ) THEN
      -- Create notification
      INSERT INTO admin_notifications (type, message, threshold, current_balance)
      VALUES (
        'low_balance',
        'Meshy.ai balance is low! Current: ' || current_bal || ' credits. Please top up your Meshy account.',
        threshold_val,
        current_bal
      );
    END IF;
  END IF;
END;
$$;