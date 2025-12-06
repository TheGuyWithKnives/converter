/*
  # Create Custom Print Settings Tables

  1. New Tables
    - `custom_materials`
      - `id` (uuid, primary key)
      - `name` (text) - Material name (e.g., "My Custom PLA")
      - `density` (numeric) - Material density in g/cm³
      - `price_per_kg` (numeric) - Price per kilogram in CZK
      - `type` (text) - Material type ('FDM' or 'SLA')
      - `created_at` (timestamptz) - Creation timestamp
    
    - `custom_printers`
      - `id` (uuid, primary key)
      - `name` (text) - Printer name
      - `type` (text) - Printer type ('FDM' or 'SLA')
      - `speed_multiplier` (numeric) - Speed multiplier
      - `layer_height` (numeric) - Layer height in cm
      - `nozzle_diameter` (numeric) - Nozzle diameter in cm (FDM only)
      - `volumetric_speed` (numeric) - Volumetric speed in cm³/h (FDM only)
      - `exposure_time` (numeric) - Exposure time per layer in seconds (SLA only)
      - `lift_time` (numeric) - Lift time per layer in seconds (SLA only)
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for public read and insert access
    - This allows anyone to add and view custom materials/printers
*/

CREATE TABLE IF NOT EXISTS custom_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  density numeric NOT NULL,
  price_per_kg numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('FDM', 'SLA')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('FDM', 'SLA')),
  speed_multiplier numeric NOT NULL DEFAULT 1.0,
  layer_height numeric NOT NULL,
  nozzle_diameter numeric,
  volumetric_speed numeric,
  exposure_time numeric,
  lift_time numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom materials"
  ON custom_materials FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert custom materials"
  ON custom_materials FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read custom printers"
  ON custom_printers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert custom printers"
  ON custom_printers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
