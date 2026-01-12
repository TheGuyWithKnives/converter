/*
  # Create Storage Bucket for 3D Models

  1. Storage Setup
    - Create public bucket `3d-models` for storing generated GLB files
    - Allow public access for reading
    - Restrict uploads to service role only

  2. Security
    - Public read access to allow viewing models
    - Service role only for uploads (through edge function)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('3d-models', '3d-models', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for 3d-models'
  ) THEN
    CREATE POLICY "Public read access for 3d-models"
    ON storage.objects FOR SELECT
    USING (bucket_id = '3d-models');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role upload for 3d-models'
  ) THEN
    CREATE POLICY "Service role upload for 3d-models"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = '3d-models' AND auth.role() = 'service_role');
  END IF;
END $$;