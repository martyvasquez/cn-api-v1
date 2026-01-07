/**
 * MCP Server Types
 * TypeScript types and interfaces for the MCP server
 */

// API Response Types (matching the existing API)
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    usage: {
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

// Product Types
export interface Product {
  id: string;
  cn_number: string;
  product_name: string;
  category: string;
  manufacturer: string | null;
  serving_size: string;
  nutrition_data: Record<string, number>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  gpc_code: string | null;
  gpc_description: string | null;
}

export interface ServingConversion {
  sequence: number;
  amount: number;
  measure: string;
  grams: number;
  unit: string;
}

export interface ProductWithServings {
  cn_number: string;
  product_name: string;
  category: string;
  base_serving: string;
  servings_count: number;
  servings: ServingConversion[];
}

// Tool Handler Types
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface ToolHandler<T = any> {
  (params: T): Promise<ToolResult>;
}
