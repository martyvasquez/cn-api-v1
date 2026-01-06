// Database Types
export interface CNProduct {
  id: string;
  cn_number: string;
  product_name: string;
  category: string | null;
  manufacturer: string | null;
  serving_size: string | null;
  nutrition_data: NutritionData | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  [key: string]: number | undefined; // Allow additional nutrition fields
}

export interface APIKey {
  id: string;
  key: string; // Hashed
  client_name: string;
  tier: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface BillingTier {
  id: string;
  tier_name: string;
  monthly_call_limit: number;
  price_monthly: number;
  description: string | null;
  created_at: string;
}

export interface APIUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  timestamp: string;
  response_status: number;
  billing_month: string;
}

export interface MonthlyUsageSummary {
  api_key_id: string;
  billing_month: string;
  total_calls: number;
  last_updated: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    usage?: {
      current: number;
      limit: number;
      tier: string;
      remaining: number;
    };
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// API Request Types
export interface ProductSearchParams {
  q?: string; // Search query
  category?: string;
  manufacturer?: string;
  limit?: number;
  offset?: number;
}

export interface ProductListParams {
  category?: string;
  manufacturer?: string;
  limit?: number;
  offset?: number;
}

// Middleware Types
export interface AuthenticatedRequest {
  apiKeyId: string;
  tier: string;
}

// Utility Types
export type TierName = 'basic' | 'professional' | 'enterprise';

export interface UsageInfo {
  current: number;
  limit: number;
  tier: string;
  remaining: number;
  percentUsed: number;
}

// CSV Import Types (for data import script)
export interface CNProductCSVRow {
  cn_number: string;
  product_name: string;
  category?: string;
  manufacturer?: string;
  serving_size?: string;
  [key: string]: string | undefined;
}

export interface NutritionValueCSVRow {
  cn_number: string;
  nutrient_name: string;
  nutrient_value: string;
  unit: string;
}
