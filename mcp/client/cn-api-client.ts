/**
 * CN Database API Client
 * HTTP client for making requests to the Next.js API with URL-based authentication
 */

import { request } from 'undici';
import { config } from '../config';
import type { APIResponse, Product, ProductWithServings } from '../types';

export class CNAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || config.apiBaseUrl;
    this.apiKey = apiKey || config.apiKey;
  }

  /**
   * Build API URL with API key parameter
   */
  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);

    // Add API key as URL parameter
    url.searchParams.set('api_key', this.apiKey);

    // Add additional parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(url: string): Promise<APIResponse<T>> {
    try {
      const response = await request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'CN-MCP-Server/1.0',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        let errorMessage: string;

        try {
          const errorData = JSON.parse(body);
          errorMessage = errorData.error || `HTTP ${response.statusCode}`;
        } catch {
          errorMessage = `HTTP ${response.statusCode}: ${body}`;
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const body = await response.body.json() as APIResponse<T>;
      return body;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * List products with pagination and filtering
   */
  async listProducts(params: {
    limit?: number;
    offset?: number;
    category?: string;
    manufacturer?: string;
  }): Promise<APIResponse<Product[]>> {
    const url = this.buildUrl('/api/products', params);
    return this.makeRequest<Product[]>(url);
  }

  /**
   * Search products by query
   */
  async searchProducts(params: {
    q: string;
    category?: string;
    manufacturer?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<Product[]>> {
    const url = this.buildUrl('/api/products/search', params);
    return this.makeRequest<Product[]>(url);
  }

  /**
   * Get product by CN number
   */
  async getProduct(cnNumber: string): Promise<APIResponse<Product>> {
    const url = this.buildUrl(`/api/products/${cnNumber}`);
    return this.makeRequest<Product>(url);
  }

  /**
   * Get nutrition information for a product
   */
  async getNutrition(cnNumber: string): Promise<APIResponse<{
    cn_number: string;
    product_name: string;
    nutrition_data: Record<string, number>;
  }>> {
    const url = this.buildUrl(`/api/products/${cnNumber}/nutrition`);
    return this.makeRequest(url);
  }

  /**
   * Get serving conversions for a product
   */
  async getServings(cnNumber: string): Promise<APIResponse<ProductWithServings>> {
    const url = this.buildUrl(`/api/products/${cnNumber}/servings`);
    return this.makeRequest<ProductWithServings>(url);
  }
}
