/*
  # Model History System

  1. New Tables
    - `model_history`
      - `id` (uuid, primary key) - Unique identifier for each history entry
      - `user_id` (uuid, foreign key) - References auth.users
      - `model_name` (text) - Name/description of the model
      - `model_type` (text) - Type of generation (text-to-3d, image-to-3d, retexture, etc.)
      - `status` (text) - Status of model (completed, failed, processing)
      - `model_url` (text, nullable) - URL to the generated GLB file in storage
      - `thumbnail_url` (text, nullable) - URL to preview/thumbnail image
      - `parameters` (jsonb) - Generation parameters used
      - `credits_used` (integer) - Number of credits consumed
      - `task_id` (text, nullable) - External API task ID for tracking
      - `error_message` (text, nullable) - Error details if generation failed
      - `metadata` (jsonb, nullable) - Additional metadata
      - `created_at` (timestamptz) - When the model was created
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `model_history` table
    - Users can only view their own model history
    - Users can insert their own history entries
    - Users can delete their own history entries
    - Users can update their own history entries

  3. Indexes
    - Index on user_id for fast user queries
    - Index on created_at for chronological sorting
    - Index on status for filtering by completion status
    - Composite index on (user_id, created_at) for optimized user history queries
*/

-- Create model_history table
CREATE TABLE IF NOT EXISTS model_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  model_url text,
  thumbnail_url text,
  parameters jsonb DEFAULT '{}'::jsonb,
  credits_used integer DEFAULT 0,
  task_id text,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE model_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own model history"
  ON model_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own model history"
  ON model_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own model history"
  ON model_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own model history"
  ON model_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_history_user_id 
  ON model_history(user_id);

CREATE INDEX IF NOT EXISTS idx_model_history_created_at 
  ON model_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_history_status 
  ON model_history(status);

CREATE INDEX IF NOT EXISTS idx_model_history_user_created 
  ON model_history(user_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_model_history_updated_at ON model_history;
CREATE TRIGGER trigger_update_model_history_updated_at
  BEFORE UPDATE ON model_history
  FOR EACH ROW
  EXECUTE FUNCTION update_model_history_updated_at();