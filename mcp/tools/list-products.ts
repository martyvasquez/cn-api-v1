/**
 * List Products Tool
 * Lists CN products with pagination and filtering
 */

import { CNAPIClient } from '../client/cn-api-client';
import { listProductsSchema, type ListProductsParams } from '../schemas/tool-schemas';
import type { ToolResult, Product } from '../types';

export const listProductsTool = {
  name: 'cn_list_products',
  description: 'List Child Nutrition products with optional filtering by category or manufacturer. Returns paginated results with product details including nutrition data.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Number of items to return (1-100, default: 20)',
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of items to skip for pagination (default: 0)',
        minimum: 0,
      },
      category: {
        type: 'string',
        description: 'Filter by category (e.g., "Dairy and Egg Products", "Meat Products")',
      },
      manufacturer: {
        type: 'string',
        description: 'Filter by manufacturer name (partial match supported)',
      },
    },
  },
};

export async function handleListProducts(args: any, apiKey?: string): Promise<ToolResult> {
  try {
    // Validate parameters
    const params = listProductsSchema.parse(args);

    // Call API
    // Determine base URL: use VERCEL_URL in production, localhost in development
    const baseUrl = apiKey
      ? (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      : undefined;
    const client = apiKey ? new CNAPIClient(apiKey, baseUrl) : new CNAPIClient();
    const result = await client.listProducts(params);

    if (!result.success || !result.data) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${result.error || 'Failed to list products'}`,
        }],
        isError: true,
      };
    }

    // Format response
    const products = result.data;
    let output = `## CN Products\n\n`;

    if (result.meta?.pagination) {
      output += `Found ${result.meta.pagination.total} total products. Showing ${products.length} results.\n\n`;
    }

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
      output += `- **Serving Size**: ${product.serving_size}\n\n`;
    });

    if (result.meta?.pagination?.hasMore) {
      const nextOffset = (params.offset || 0) + (params.limit || 20);
      output += `\n*More results available. Use offset: ${nextOffset} to see next page.*\n`;
    }

    if (result.meta?.usage) {
      output += `\n---\n**API Usage**: ${result.meta.usage.current}/${result.meta.usage.limit} calls this month (${result.meta.usage.remaining} remaining)\n`;
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
