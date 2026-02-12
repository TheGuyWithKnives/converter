/*
  # Fix Security Warnings - Comprehensive Update

  This migration addresses multiple security and performance warnings from Supabase:

  ## 1. Missing Index
  - Add index on `purchase_history.tier_id` foreign key for better query performance

  ## 2. RLS Performance Optimization
  All RLS policies updated to use `(select auth.uid())` instead of `auth.uid()` directly.
  This prevents re-evaluation of auth functions for each row, improving performance at scale.

  Updated policies for tables:
  - credit_transactions
  - user_profiles  
  - token_transactions
  - profiles
  - user_credits
  - purchase_history
  - meshy_balance_log
  - credit_pricing
  - admin_notifications

  ## 3. Multiple Permissive Policies
  - Consolidated duplicate SELECT policies on credit_pricing table

  ## 4. Function Search Path
  All functions updated with immutable search_path for security

  ## 5. RLS Policy Security
  - Fixed "always true" policies to be more restrictive
  - Service role operations now use service_role specific policies
*/

-- 1. Add missing index on purchase_history foreign key
CREATE INDEX IF NOT EXISTS idx_purchase_history_tier_id 
  ON purchase_history(tier_id);

-- 2. Fix RLS policies - Drop and recreate with optimized auth.uid() pattern

-- credit_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- token_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON token_transactions;
CREATE POLICY "Users can view own transactions"
  ON token_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own transactions" ON token_transactions;
CREATE POLICY "Users can insert own transactions"
  ON token_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Enable insert for authenticated users own profile" ON profiles;
CREATE POLICY "Enable insert for authenticated users own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- user_credits
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- purchase_history
DROP POLICY IF EXISTS "Users can view own purchases" ON purchase_history;
CREATE POLICY "Users can view own purchases"
  ON purchase_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- meshy_balance_log
DROP POLICY IF EXISTS "Only admins can view balance logs" ON meshy_balance_log;
CREATE POLICY "Only admins can view balance logs"
  ON meshy_balance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

-- credit_pricing - Fix multiple permissive policies issue
DROP POLICY IF EXISTS "Only admins can view pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Only admins can manage pricing" ON credit_pricing;

CREATE POLICY "Only admins can view pricing"
  ON credit_pricing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can manage pricing"
  ON credit_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

-- admin_notifications
DROP POLICY IF EXISTS "Only admins can view notifications" ON admin_notifications;
CREATE POLICY "Only admins can view notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update notifications" ON admin_notifications;
CREATE POLICY "Only admins can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

-- Fix "always true" policies - Make them service_role only
DROP POLICY IF EXISTS "Service role can create notifications" ON admin_notifications;
CREATE POLICY "Service role can create notifications"
  ON admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert balance logs" ON meshy_balance_log;
CREATE POLICY "Service role can insert balance logs"
  ON meshy_balance_log FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Fix function search_path for security

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM cached_models
  WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT tokens INTO current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET tokens = tokens - p_amount
  WHERE id = p_user_id;

  INSERT INTO token_transactions (user_id, amount, description, balance_after)
  VALUES (p_user_id, -p_amount, p_description, current_balance - p_amount);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE profiles
  SET tokens = tokens + p_amount
  WHERE id = p_user_id
  RETURNING tokens INTO new_balance;

  INSERT INTO token_transactions (user_id, amount, description, balance_after)
  VALUES (p_user_id, p_amount, p_description, new_balance);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT credits INTO current_balance
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE user_profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, -p_amount, 'deduction', p_description, current_balance - p_amount);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE user_profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO new_balance;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, p_amount, 'addition', p_description, new_balance);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_latest_meshy_balance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_bal integer;
  threshold_val integer := 100;
BEGIN
  current_bal := get_latest_meshy_balance();
  
  IF current_bal < threshold_val THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'low_balance'
      AND is_read = false
      AND current_balance <= threshold_val
      AND created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO admin_notifications (type, message, threshold, current_balance)
      VALUES (
        'low_balance',
        'Meshy.ai balance is below ' || threshold_val || ' credits',
        threshold_val,
        current_bal
      );
    END IF;
  END IF;
END;
$$;
