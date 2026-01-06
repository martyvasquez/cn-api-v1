-- CN Database API - Initial Schema Migration
-- This migration creates all the necessary tables for the CN Database API

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create billing_tiers table
CREATE TABLE billing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT UNIQUE NOT NULL,
  monthly_call_limit INTEGER NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL, -- This will store the hashed API key
  client_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_tier FOREIGN KEY (tier) REFERENCES billing_tiers(tier_name)
);

-- 3. Create cn_products table
CREATE TABLE cn_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cn_number TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  serving_size TEXT,
  nutrition_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create api_usage table for tracking API calls
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_status INTEGER,
  billing_month TEXT NOT NULL, -- Format: 'YYYY-MM'
  CONSTRAINT fk_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- 5. Create monthly_usage_summary table for fast usage lookups
CREATE TABLE monthly_usage_summary (
  api_key_id UUID NOT NULL,
  billing_month TEXT NOT NULL,
  total_calls INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (api_key_id, billing_month),
  CONSTRAINT fk_api_key_summary FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_cn_products_cn_number ON cn_products(cn_number);
CREATE INDEX idx_cn_products_product_name ON cn_products USING gin(to_tsvector('english', product_name));
CREATE INDEX idx_cn_products_category ON cn_products(category);
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_billing_month ON api_usage(billing_month);
CREATE INDEX idx_api_usage_composite ON api_usage(api_key_id, billing_month);
CREATE INDEX idx_monthly_usage_summary_billing_month ON monthly_usage_summary(billing_month);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on cn_products
CREATE TRIGGER update_cn_products_updated_at
BEFORE UPDATE ON cn_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE billing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE cn_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage_summary ENABLE ROW LEVEL SECURITY;

-- Policies for billing_tiers (read-only for service role)
CREATE POLICY "Allow service role to read billing_tiers"
ON billing_tiers FOR SELECT
USING (auth.role() = 'service_role');

-- Policies for api_keys (managed by service role only)
CREATE POLICY "Allow service role full access to api_keys"
ON api_keys FOR ALL
USING (auth.role() = 'service_role');

-- Policies for cn_products (read-only for service role)
CREATE POLICY "Allow service role to read cn_products"
ON cn_products FOR SELECT
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to insert cn_products"
ON cn_products FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role to update cn_products"
ON cn_products FOR UPDATE
USING (auth.role() = 'service_role');

-- Policies for api_usage (service role only)
CREATE POLICY "Allow service role full access to api_usage"
ON api_usage FOR ALL
USING (auth.role() = 'service_role');

-- Policies for monthly_usage_summary (service role only)
CREATE POLICY "Allow service role full access to monthly_usage_summary"
ON monthly_usage_summary FOR ALL
USING (auth.role() = 'service_role');

-- Insert initial billing tiers (placeholder values)
INSERT INTO billing_tiers (tier_name, monthly_call_limit, price_monthly, description) VALUES
  ('basic', 1000, 0.00, 'Basic tier - 1,000 API calls per month (Free)'),
  ('professional', 10000, 29.00, 'Professional tier - 10,000 API calls per month'),
  ('enterprise', 100000, 149.00, 'Enterprise tier - 100,000 API calls per month');
