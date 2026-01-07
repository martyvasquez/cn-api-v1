/**
 * Get Nutrition Tool
 * Get nutrition information for a specific CN product
 */

import { CNAPIClient } from '../client/cn-api-client';
import { getNutritionSchema, type GetNutritionParams } from '../schemas/tool-schemas';
import type { ToolResult } from '../types';

export const getNutritionTool = {
  name: 'cn_get_nutrition',
  description: 'Get detailed nutrition information for a Child Nutrition product, including calories, protein, fat, carbohydrates, fiber, sodium, vitamins, and minerals.',
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

export async function handleGetNutrition(args: any, apiKey?: string): Promise<ToolResult> {
  try {
    // Validate parameters
    const params = getNutritionSchema.parse(args);

    // Call API
    const baseUrl = apiKey
      ? (process.env.VERCEL_ENV === 'production'
          ? 'https://cn-api-v1.vercel.app'
          : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      : undefined;
    const client = apiKey ? new CNAPIClient(apiKey, baseUrl) : new CNAPIClient();
    const result = await client.getNutrition(params.cn_number);

    if (!result.success || !result.data) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${result.error || `Nutrition data for CN number "${params.cn_number}" not found`}`,
        }],
        isError: true,
      };
    }

    // Format response
    const data = result.data;
    let output = `## Nutrition Information: ${data.product_name}\n\n`;
    output += `**CN Number**: ${data.cn_number}\n\n`;

    if (!data.nutrition || Object.keys(data.nutrition).length === 0) {
      output += `No nutrition data available for this product.\n`;
    } else {
      const nutrition = data.nutrition;

      output += `### Macronutrients\n`;
      if (nutrition.energy_kcal || nutrition.kcal) {
        output += `- **Calories**: ${nutrition.energy_kcal || nutrition.kcal} kcal\n`;
      }
      if (nutrition.pro || nutrition.protein) {
        output += `- **Protein**: ${nutrition.pro || nutrition.protein}g\n`;
      }
      if (nutrition.fat || nutrition.total_fat) {
        output += `- **Total Fat**: ${nutrition.fat || nutrition.total_fat}g\n`;
        if (nutrition.sfat || nutrition.saturated_fat) {
          output += `  - Saturated Fat: ${nutrition.sfat || nutrition.saturated_fat}g\n`;
        }
        if (nutrition.trans || nutrition.trans_fat) {
          output += `  - Trans Fat: ${nutrition.trans || nutrition.trans_fat}g\n`;
        }
      }
      if (nutrition.carb || nutrition.carbohydrate) {
        output += `- **Carbohydrates**: ${nutrition.carb || nutrition.carbohydrate}g\n`;
        if (nutrition.tdf || nutrition.fiber) {
          output += `  - Dietary Fiber: ${nutrition.tdf || nutrition.fiber}g\n`;
        }
        if (nutrition.sug || nutrition.sugars) {
          output += `  - Sugars: ${nutrition.sug || nutrition.sugars}g\n`;
        }
      }

      output += `\n### Other Nutrients\n`;
      if (nutrition.chol || nutrition.cholesterol) {
        output += `- **Cholesterol**: ${nutrition.chol || nutrition.cholesterol}mg\n`;
      }
      if (nutrition.na || nutrition.sodium) {
        output += `- **Sodium**: ${nutrition.na || nutrition.sodium}mg\n`;
      }
      if (nutrition.k || nutrition.potassium) {
        output += `- **Potassium**: ${nutrition.k || nutrition.potassium}mg\n`;
      }

      // Vitamins and minerals
      const vitaminsMinerals: Record<string, string> = {
        'vita,_rae': 'Vitamin A',
        'vitamin_a': 'Vitamin A',
        'vitc': 'Vitamin C',
        'vitamin_c': 'Vitamin C',
        'vitd': 'Vitamin D',
        'vitamin_d': 'Vitamin D',
        'ca': 'Calcium',
        'calcium': 'Calcium',
        'fe': 'Iron',
        'iron': 'Iron',
      };

      const vitaminsPresent = Object.entries(nutrition).filter(([key]) =>
        vitaminsMinerals[key.toLowerCase()]
      );

      if (vitaminsPresent.length > 0) {
        output += `\n### Vitamins & Minerals\n`;
        vitaminsPresent.forEach(([key, value]) => {
          const name = vitaminsMinerals[key.toLowerCase()];
          output += `- **${name}**: ${value}${key.includes('vit') ? 'IU' : 'mg'}\n`;
        });
      }

      // All other nutrients
      const displayedKeys = [
        'energy_kcal', 'kcal', 'pro', 'protein', 'fat', 'total_fat', 'sfat', 'saturated_fat',
        'trans', 'trans_fat', 'carb', 'carbohydrate', 'tdf', 'fiber', 'sug', 'sugars',
        'chol', 'cholesterol', 'na', 'sodium', 'k', 'potassium',
        'vita,_rae', 'vitamin_a', 'vitc', 'vitamin_c', 'vitd', 'vitamin_d',
        'ca', 'calcium', 'fe', 'iron'
      ];

      const otherNutrients = Object.entries(nutrition).filter(([key]) =>
        !displayedKeys.includes(key.toLowerCase())
      );

      if (otherNutrients.length > 0) {
        output += `\n### Additional Nutrients\n`;
        otherNutrients.forEach(([key, value]) => {
          output += `- ${key}: ${value}\n`;
        });
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
