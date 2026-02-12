/*
  # Cleanup Unused Indexes and Fix Remaining Security Issues

  This migration addresses the remaining security and performance warnings:

  ## 1. Drop Unused Indexes
  Removes 18 unused indexes that are consuming storage and maintenance overhead.
  These indexes were created proactively but are not currently being used by queries.
  
  Dropped indexes:
  - rate_limits: ip_endpoint_window, created_at
  - cached_models: image_hash, created_at, expires_at
  - profiles: username
  - token_transactions: user_id, created_at
  - token_packages: active
  - credit_transactions: user_id, created_at
  - purchase_history: user_id, created_at, tier_id
  - custom_materials: created_at, type
  - custom_printers: created_at, type

  ## 2. Fix Multiple Permissive Policies
  Resolved duplicate SELECT policies on credit_pricing by ensuring only one policy handles SELECT.
  The "manage" policy now only handles INSERT, UPDATE, DELETE operations.

  ## 3. Verify Function Search Path
  Re-creates functions with explicit search_path to ensure security.

  ## Important Notes
  - Indexes can be recreated if needed in the future when usage patterns change
  - This improves database maintenance performance and reduces storage overhead
  - All critical foreign key indexes are preserved
*/

-- 1. Drop unused indexes

-- rate_limits table
DROP INDEX IF EXISTS idx_rate_limits_ip_endpoint_window;
DROP INDEX IF EXISTS idx_rate_limits_created_at;

-- cached_models table
DROP INDEX IF EXISTS idx_cached_models_image_hash;
DROP INDEX IF EXISTS idx_cached_models_created_at;
DROP INDEX IF EXISTS idx_cached_models_expires_at;

-- profiles table
DROP INDEX IF EXISTS idx_profiles_username;

-- token_transactions table
DROP INDEX IF EXISTS idx_token_transactions_user_id;
DROP INDEX IF EXISTS idx_token_transactions_created_at;

-- token_packages table
DROP INDEX IF EXISTS idx_token_packages_active;

-- credit_transactions table
DROP INDEX IF EXISTS idx_credit_transactions_user_id;
DROP INDEX IF EXISTS idx_credit_transactions_created_at;

-- purchase_history table
DROP INDEX IF EXISTS idx_purchase_history_user_id;
DROP INDEX IF EXISTS idx_purchase_history_created_at;
DROP INDEX IF EXISTS idx_purchase_history_tier_id;

-- custom_materials table
DROP INDEX IF EXISTS idx_custom_materials_created_at;
DROP INDEX IF EXISTS idx_custom_materials_type;

-- custom_printers table
DROP INDEX IF EXISTS idx_custom_printers_created_at;
DROP INDEX IF EXISTS idx_custom_printers_type;

-- 2. Fix multiple permissive policies on credit_pricing
-- Drop both policies and recreate them properly

DROP POLICY IF EXISTS "Only admins can view pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Only admins can manage pricing" ON credit_pricing;

-- Only one policy for SELECT
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

-- Separate policies for INSERT, UPDATE, DELETE (not ALL)
CREATE POLICY "Only admins can insert pricing"
  ON credit_pricing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update pricing"
  ON credit_pricing FOR UPDATE
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

CREATE POLICY "Only admins can delete pricing"
  ON credit_pricing FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    )
  );

-- 3. Recreate functions with proper search_path
-- These functions need to be recreated to ensure the search_path is properly set

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
