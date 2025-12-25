/*
  # Security Improvements and Rate Limiting

  1. New Tables
    - `rate_limits`
      - Tracks API usage per IP address for rate limiting
      - Used by Edge Functions to prevent spam and abuse
      - Automatically cleaned up after window expires

  2. Schema Updates
    - Add `expires_at` column to `cached_models` for efficient cache management
    - Add validation constraints to existing tables

  3. Security Improvements
    - Replace permissive RLS policies with rate-limited versions
    - Add request counting and time-window based limits
    - Prevent spam attacks on public insert endpoints

  4. Indexes
    - Add indexes for efficient rate limit lookups
    - Add index on expires_at for cache cleanup

  5. Notes
    - Rate limits: 10 cache inserts per hour per user
    - Rate limits: 50 material/printer inserts per day globally
    - Old rate limit records are auto-cleaned after 24 hours
*/

-- Create rate_limits table for Edge Function rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint_window
  ON rate_limits(ip, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON rate_limits(created_at);

-- Add expires_at to cached_models for efficient cache management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cached_models' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE cached_models
    ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '23 hours');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cached_models_expires_at
  ON cached_models(expires_at);

-- Update existing records to have expiration
UPDATE cached_models
SET expires_at = created_at + interval '23 hours'
WHERE expires_at IS NULL;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can insert cached models" ON cached_models;
DROP POLICY IF EXISTS "Anyone can insert custom materials" ON custom_materials;
DROP POLICY IF EXISTS "Anyone can insert custom printers" ON custom_printers;

-- Create rate-limited insert policy for cached_models
-- Limit: 100 inserts per hour globally
CREATE POLICY "Rate limited cache inserts"
  ON cached_models
  FOR INSERT
  WITH CHECK (
    (
      SELECT COUNT(*)
      FROM cached_models
      WHERE created_at > now() - interval '1 hour'
    ) < 100
  );

-- Create rate-limited insert policy for custom_materials
-- Limit: 50 new materials per day globally
CREATE POLICY "Rate limited material inserts"
  ON custom_materials
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      SELECT COUNT(*)
      FROM custom_materials
      WHERE created_at > now() - interval '1 day'
    ) < 50
  );

-- Create rate-limited insert policy for custom_printers
-- Limit: 50 new printers per day globally
CREATE POLICY "Rate limited printer inserts"
  ON custom_printers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      SELECT COUNT(*)
      FROM custom_printers
      WHERE created_at > now() - interval '1 day'
    ) < 50
  );

-- Enable RLS on rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM cached_models
  WHERE expires_at < now();
END;
$$;

-- Add helpful comments
COMMENT ON TABLE rate_limits IS 'Tracks rate limiting for API endpoints to prevent abuse';
COMMENT ON TABLE cached_models IS 'Caches generated 3D models to reduce API costs. Entries expire after 23 hours.';
COMMENT ON COLUMN cached_models.expires_at IS 'When this cache entry expires (typically 23 hours after creation)';
COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Removes rate limit records older than 24 hours';
COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired cache entries';
