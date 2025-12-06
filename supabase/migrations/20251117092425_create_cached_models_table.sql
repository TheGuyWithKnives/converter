/*
  # Create cached_models table for 3D model caching

  1. New Tables
    - `cached_models`
      - `id` (uuid, primary key) - Unique identifier for each cached model
      - `image_hash` (text, indexed) - SHA-256 hash of the source image for quick lookup
      - `model_url` (text) - URL to the generated 3D model (GLB file)
      - `instructions` (text, nullable) - User instructions used during generation
      - `created_at` (timestamptz) - Timestamp when the cache entry was created
      - `accessed_at` (timestamptz) - Last time this cached model was accessed
      - `access_count` (integer) - Number of times this cache has been hit

  2. Indexes
    - Index on `image_hash` for fast lookups
    - Composite index on `image_hash` and `instructions` for exact matching
    - Index on `created_at` for cleanup operations

  3. Security
    - Enable RLS on `cached_models` table
    - Allow anyone to read cached models (public cache)
    - Only allow inserts (automatic caching)
    - No updates or deletes from clients (managed by cleanup functions)

  4. Notes
    - Cache entries older than 7 days can be automatically cleaned
    - This reduces API costs by reusing previously generated models
    - Hash-based lookup ensures identical inputs return cached results
*/

CREATE TABLE IF NOT EXISTS cached_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash text NOT NULL,
  model_url text NOT NULL,
  instructions text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  accessed_at timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cached_models_image_hash ON cached_models(image_hash);
CREATE INDEX IF NOT EXISTS idx_cached_models_hash_instructions ON cached_models(image_hash, instructions);
CREATE INDEX IF NOT EXISTS idx_cached_models_created_at ON cached_models(created_at);

ALTER TABLE cached_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached models"
  ON cached_models
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cached models"
  ON cached_models
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No one can update cached models"
  ON cached_models
  FOR UPDATE
  USING (false);

CREATE POLICY "No one can delete cached models"
  ON cached_models
  FOR DELETE
  USING (false);
