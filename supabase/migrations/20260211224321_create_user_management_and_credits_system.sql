/*
  # User Management and Credits System

  ## Overview
  Complete user authentication and token (credits) management system for GENZEO platform.
  
  ## New Tables
  
  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique, nullable)
  - `full_name` (text, nullable)
  - `avatar_url` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `user_credits`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, unique)
  - `balance` (integer, default 0)
  - `total_purchased` (integer, default 0)
  - `total_earned` (integer, default 0)
  - `total_spent` (integer, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `credit_transactions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `type` (text: 'purchase', 'usage', 'refund', 'bonus')
  - `amount` (integer)
  - `balance_after` (integer)
  - `description` (text)
  - `operation_type` (text, nullable: 'text_to_3d', 'image_to_3d', etc.)
  - `metadata` (jsonb, nullable)
  - `created_at` (timestamptz)
  
  ### `pricing_tiers`
  - `id` (uuid, primary key)
  - `name` (text)
  - `credits` (integer)
  - `price_usd` (numeric)
  - `bonus_credits` (integer, default 0)
  - `popular` (boolean, default false)
  - `sort_order` (integer)
  - `active` (boolean, default true)
  - `created_at` (timestamptz)
  
  ### `purchase_history`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `tier_id` (uuid, references pricing_tiers)
  - `credits_purchased` (integer)
  - `amount_paid` (numeric)
  - `payment_method` (text)
  - `payment_status` (text: 'pending', 'completed', 'failed', 'refunded')
  - `payment_provider_id` (text, nullable)
  - `created_at` (timestamptz)
  
  ## Security
  - Row Level Security enabled on all tables
  - Users can only access their own data
  - Credit operations are protected
  
  ## Functions
  - Automatic profile creation on user signup
  - Credit balance initialization
  - Credit deduction with transaction logging
*/

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 50,
  total_purchased integer DEFAULT 0,
  total_earned integer DEFAULT 50,
  total_spent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text NOT NULL,
  operation_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  bonus_credits integer DEFAULT 0,
  popular boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create purchase_history table
CREATE TABLE IF NOT EXISTS purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES pricing_tiers(id),
  credits_purchased integer NOT NULL,
  amount_paid numeric(10,2) NOT NULL,
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_provider_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User credits policies
CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits"
  ON user_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Credit transactions policies
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Pricing tiers policies (public read for active tiers)
CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (active = true);

-- Purchase history policies
CREATE POLICY "Users can view own purchases"
  ON purchase_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchases"
  ON purchase_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function: Create profile and credits on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create credits account with 50 free credits
  INSERT INTO user_credits (user_id, balance, total_earned)
  VALUES (NEW.id, 50, 50);
  
  -- Log welcome bonus transaction
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (NEW.id, 'bonus', 50, 50, 'Welcome bonus - 50 free credits');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile and credits on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function: Deduct credits with transaction logging
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_operation_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user has sufficient credits
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User credits account not found'
    );
  END IF;
  
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', p_amount,
      'available', v_current_balance
    );
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;
  
  -- Update user credits
  UPDATE user_credits
  SET 
    balance = v_new_balance,
    total_spent = total_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description, operation_type, metadata
  )
  VALUES (
    p_user_id, 'usage', -p_amount, v_new_balance, p_description, p_operation_type, p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add credits (for purchases/bonuses)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User credits account not found'
    );
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Update user credits
  UPDATE user_credits
  SET 
    balance = v_new_balance,
    total_purchased = CASE WHEN p_type = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
    total_earned = CASE WHEN p_type = 'bonus' THEN total_earned + p_amount ELSE total_earned END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description, metadata
  )
  VALUES (
    p_user_id, p_type, p_amount, v_new_balance, p_description, p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default pricing tiers
INSERT INTO pricing_tiers (name, credits, price_usd, bonus_credits, popular, sort_order)
VALUES
  ('Starter', 100, 9.99, 0, false, 1),
  ('Basic', 250, 19.99, 25, false, 2),
  ('Popular', 500, 34.99, 100, true, 3),
  ('Pro', 1000, 59.99, 250, false, 4),
  ('Premium', 2500, 129.99, 750, false, 5)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON purchase_history(created_at DESC);
