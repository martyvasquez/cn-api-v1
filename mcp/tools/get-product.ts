/**
 * Get Product Tool
 * Get detailed information for a specific CN product
 */

import { CNAPIClient } from '../client/cn-api-client';
import { getProductSchema, type GetProductParams } from '../schemas/tool-schemas';
import type { ToolResult } from '../types';

export const getProductTool = {
  name: 'cn_get_product',
  description: 'Get detailed information for a specific Child Nutrition product by its CN number. Returns complete product details including nutrition data, metadata, and GPC classification.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      cn_number: {
        type: 'string',
        description: 'The CN number of the product (e.g., "1001", "2534")',
      },
    },
    required: ['cn_number'],
  },
};

export async function handleGetProduct(args: any, apiKey?: string): Promise<ToolResult> {
  try {
    // Validate parameters
    const params = getProductSchema.parse(args);

    // Call API
    const baseUrl = apiKey
      ? (process.env.VERCEL_ENV === 'production'
          ? 'https://cn-api-v1.vercel.app'
          : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      : undefined;
    const client = apiKey ? new CNAPIClient(apiKey, baseUrl) : new CNAPIClient();
    const result = await client.getProduct(params.cn_number);

    if (!result.success || !result.data) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${result.error || `Product with CN number "${params.cn_number}" not found`}`,
        }],
        isError: true,
      };
    }

    // Format response
    const product = result.data;
    let output = `## ${product.product_name}\n\n`;

    output += `### Basic Information\n`;
    output += `- **CN Number**: ${product.cn_number}\n`;
    output += `- **Category**: ${product.category}\n`;
    if (product.manufacturer) {
      output += `- **Manufacturer**: ${product.manufacturer}\n`;
    }
    output += `- **Serving Size**: ${product.serving_size}\n`;

    if (product.gpc_code) {
      output += `\n### GPC Classification\n`;
      output += `- **Code**: ${product.gpc_code}\n`;
      output += `- **Description**: ${product.gpc_description}\n`;
    }

    if (product.nutrition_data && Object.keys(product.nutrition_data).length > 0) {
      output += `\n### Nutrition Data (per ${product.serving_size})\n`;
      const nutrition = product.nutrition_data;

      // Group common nutrients
      if (nutrition.energy_kcal || nutrition.kcal) {
        output += `- **Calories**: ${nutrition.energy_kcal || nutrition.kcal} kcal\n`;
      }
      if (nutrition.pro || nutrition.protein) {
        output += `- **Protein**: ${nutrition.pro || nutrition.protein}g\n`;
      }
      if (nutrition.fat || nutrition.total_fat) {
        output += `- **Total Fat**: ${nutrition.fat || nutrition.total_fat}g\n`;
      }
      if (nutrition.sfat || nutrition.saturated_fat) {
        output += `  - Saturated Fat: ${nutrition.sfat || nutrition.saturated_fat}g\n`;
      }
      if (nutrition.trans || nutrition.trans_fat) {
        output += `  - Trans Fat: ${nutrition.trans || nutrition.trans_fat}g\n`;
      }
      if (nutrition.carb || nutrition.carbohydrate) {
        output += `- **Carbohydrates**: ${nutrition.carb || nutrition.carbohydrate}g\n`;
      }
      if (nutrition.tdf || nutrition.fiber) {
        output += `  - Dietary Fiber: ${nutrition.tdf || nutrition.fiber}g\n`;
      }
      if (nutrition.sug || nutrition.sugars) {
        output += `  - Sugars: ${nutrition.sug || nutrition.sugars}g\n`;
      }
      if (nutrition.chol || nutrition.cholesterol) {
        output += `- **Cholesterol**: ${nutrition.chol || nutrition.cholesterol}mg\n`;
      }
      if (nutrition.na || nutrition.sodium) {
        output += `- **Sodium**: ${nutrition.na || nutrition.sodium}mg\n`;
      }

      // Add other nutrients
      output += `\n**Other Nutrients**:\n`;
      Object.entries(nutrition).forEach(([key, value]) => {
        if (!['energy_kcal', 'kcal', 'pro', 'protein', 'fat', 'total_fat', 'sfat', 'saturated_fat',
              'trans', 'trans_fat', 'carb', 'carbohydrate', 'tdf', 'fiber', 'sug', 'sugars',
              'chol', 'cholesterol', 'na', 'sodium'].includes(key)) {
          output += `- ${key}: ${value}\n`;
        }
      });
    }

    if (product.metadata && Object.keys(product.metadata).length > 0) {
      const meta = product.metadata;
      output += `\n### Additional Information\n`;
      if (meta.brand_name) {
        output += `- **Brand**: ${meta.brand_name}\n`;
      }
      if (meta.gtin) {
        output += `- **GTIN**: ${meta.gtin}\n`;
      }
      if (meta.form_of_food) {
        output += `- **Form**: ${meta.form_of_food}\n`;
      }
      if (meta.date_added) {
        output += `- **Added**: ${meta.date_added}\n`;
      }
      if (meta.last_modified) {
        output += `- **Modified**: ${meta.last_modified}\n`;
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
