-- CN Database API - Add Servings and GPC Classifications
-- This migration adds:
-- 1. cn_servings table for weight/serving conversions
-- 2. GPC classification columns to cn_products

-- 1. Create cn_servings table for weight/serving conversions
CREATE TABLE cn_servings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cn_number TEXT NOT NULL,
  sequence_num INTEGER,
  amount DECIMAL,
  measure_description TEXT,
  unit_amount DECIMAL,
  type_of_unit TEXT,
  source_code TEXT,
  date_added TEXT,
  last_modified TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_cn_product FOREIGN KEY (cn_number)
    REFERENCES cn_products(cn_number) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_cn_servings_cn_number ON cn_servings(cn_number);
CREATE INDEX idx_cn_servings_measure ON cn_servings(measure_description);

-- 2. Add GPC classification columns to cn_products
ALTER TABLE cn_products
  ADD COLUMN IF NOT EXISTS gpc_code TEXT,
  ADD COLUMN IF NOT EXISTS gpc_description TEXT;

-- Create index on GPC code
CREATE INDEX IF NOT EXISTS idx_cn_products_gpc_code ON cn_products(gpc_code);

-- 3. Enable RLS on cn_servings table
ALTER TABLE cn_servings ENABLE ROW LEVEL SECURITY;

-- Policy for cn_servings (service role only)
CREATE POLICY "Allow service role to read cn_servings"
ON cn_servings FOR SELECT
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to insert cn_servings"
ON cn_servings FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE cn_servings IS 'Weight and serving size conversions for CN products';
COMMENT ON COLUMN cn_servings.measure_description IS 'Serving description (e.g., "1 TBSP", "1 cup")';
COMMENT ON COLUMN cn_servings.unit_amount IS 'Amount in specified unit (grams, ml, etc.)';
