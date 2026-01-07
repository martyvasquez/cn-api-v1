/**
 * Get Servings Tool
 * Get serving size conversions for a specific CN product
 */

import { CNAPIClient } from '../client/cn-api-client';
import { getServingsSchema, type GetServingsParams } from '../schemas/tool-schemas';
import type { ToolResult } from '../types';

export const getServingsTool = {
  name: 'cn_get_servings',
  description: 'Get serving size conversions for a Child Nutrition product, showing different measurement units (cups, tablespoons, pieces, etc.) and their gram equivalents.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      cn_number: {
        type: 'string',
        description: 'The CN number of the product',
      },
    },
    required: ['cn_number'],
  },
};

export async function handleGetServings(args: any, apiKey?: string): Promise<ToolResult> {
  try {
    // Validate parameters
    const params = getServingsSchema.parse(args);

    // Call API
    const baseUrl = apiKey
      ? (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      : undefined;
    const client = apiKey ? new CNAPIClient(apiKey, baseUrl) : new CNAPIClient();
    const result = await client.getServings(params.cn_number);

    if (!result.success || !result.data) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${result.error || `Serving data for CN number "${params.cn_number}" not found`}`,
        }],
        isError: true,
      };
    }

    // Format response
    const data = result.data;
    let output = `## Serving Conversions: ${data.product_name}\n\n`;
    output += `**CN Number**: ${data.cn_number}\n`;
    output += `**Category**: ${data.category}\n`;
    output += `**Base Serving**: ${data.base_serving}\n\n`;

    if (!data.servings || data.servings.length === 0) {
      output += `No serving conversions available for this product.\n`;
    } else {
      output += `### Available Serving Sizes (${data.servings_count} conversions)\n\n`;

      // Create table format
      output += `| Serving | Weight |\n`;
      output += `|---------|--------|\n`;

      data.servings.forEach((serving) => {
        const amount = serving.amount === 1 ? '' : `${serving.amount} `;
        output += `| ${amount}${serving.measure} | ${serving.grams}${serving.unit} |\n`;
      });

      output += `\n**Usage Examples:**\n`;
      const firstServing = data.servings[0];
      const secondServing = data.servings[1];

      if (firstServing) {
        const amount = firstServing.amount === 1 ? '' : `${firstServing.amount} `;
        output += `- ${amount}${firstServing.measure} = ${firstServing.grams}${firstServing.unit}\n`;
      }
      if (secondServing) {
        const amount = secondServing.amount === 1 ? '' : `${secondServing.amount} `;
        output += `- ${amount}${secondServing.measure} = ${secondServing.grams}${secondServing.unit}\n`;
      }

      output += `\nThese conversions help calculate portion sizes and nutritional values for different serving amounts.\n`;
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
