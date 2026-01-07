/**
 * Search Products Tool
 * Full-text search across CN product names
 */

import { CNAPIClient } from '../client/cn-api-client';
import { searchProductsSchema, type SearchProductsParams } from '../schemas/tool-schemas';
import type { ToolResult, Product } from '../types';

export const searchProductsTool = {
  name: 'cn_search_products',
  description: 'Search Child Nutrition products by name using full-text search. Returns matching products with relevance ranking.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search term to find products (e.g., "butter", "whole wheat bread", "orange juice")',
      },
      category: {
        type: 'string',
        description: 'Optional: Filter results by category',
      },
      manufacturer: {
        type: 'string',
        description: 'Optional: Filter results by manufacturer',
      },
      limit: {
        type: 'number',
        description: 'Number of results to return (1-100, default: 20)',
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Pagination offset (default: 0)',
        minimum: 0,
      },
    },
    required: ['query'],
  },
};

export async function handleSearchProducts(args: any, apiKey?: string): Promise<ToolResult> {
  try {
    // Validate parameters
    const params = searchProductsSchema.parse(args);

    // Call API
    const baseUrl = apiKey
      ? (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      : undefined;
    const client = apiKey ? new CNAPIClient(apiKey, baseUrl) : new CNAPIClient();
    const result = await client.searchProducts({
      q: params.query,
      category: params.category,
      manufacturer: params.manufacturer,
      limit: params.limit,
      offset: params.offset,
    });

    if (!result.success || !result.data) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${result.error || 'Search failed'}`,
        }],
        isError: true,
      };
    }

    // Format response
    const products = result.data;
    let output = `## Search Results for "${params.query}"\n\n`;

    if (result.meta?.pagination) {
      output += `Found ${result.meta.pagination.total} matching products. Showing ${products.length} results.\n\n`;
    }

    if (products.length === 0) {
      output += `No products found matching "${params.query}".\n\n`;
      output += `Try:\n`;
      output += `- Using different search terms\n`;
      output += `- Removing category/manufacturer filters\n`;
      output += `- Using broader search terms\n`;
    } else {
      products.forEach((product: Product, index: number) => {
        output += `### ${index + 1}. ${product.product_name}\n`;
        output += `- **CN Number**: ${product.cn_number}\n`;
        output += `- **Category**: ${product.category}\n`;
        if (product.manufacturer) {
          output += `- **Manufacturer**: ${product.manufacturer}\n`;
        }
        if (product.gpc_description) {
          output += `- **GPC**: ${product.gpc_description}\n`;
        }
        output += `\n`;
      });

      if (result.meta?.pagination?.hasMore) {
        const nextOffset = (params.offset || 0) + (params.limit || 20);
        output += `\n*More results available. Use offset: ${nextOffset} to see next page.*\n`;
      }
    }

    if (result.meta?.usage) {
      output += `\n---\n**API Usage**: ${result.meta.usage.current}/${result.meta.usage.limit} calls this month\n`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}
