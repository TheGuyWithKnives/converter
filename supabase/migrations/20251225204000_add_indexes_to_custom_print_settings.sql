/*
  # Add Performance Indexes to Custom Print Settings Tables

  1. Performance Improvements
    - Add index on `custom_materials.created_at` for faster sorting
    - Add index on `custom_printers.created_at` for faster sorting
    - Add index on `custom_materials.type` for faster filtering
    - Add index on `custom_printers.type` for faster filtering

  2. Benefits
    - Faster queries when listing materials/printers
    - Optimized sorting by creation date
    - Improved filtering by printer/material type
*/

CREATE INDEX IF NOT EXISTS idx_custom_materials_created_at 
  ON custom_materials(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_materials_type 
  ON custom_materials(type);

CREATE INDEX IF NOT EXISTS idx_custom_printers_created_at 
  ON custom_printers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_printers_type 
  ON custom_printers(type);