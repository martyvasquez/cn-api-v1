/**
 * Tool Registry
 * Exports all MCP tools and their handlers
 */

import { listProductsTool, handleListProducts } from './list-products.js';
import { searchProductsTool, handleSearchProducts } from './search-products.js';
import { getProductTool, handleGetProduct } from './get-product.js';
import { getNutritionTool, handleGetNutrition } from './get-nutrition.js';
import { getServingsTool, handleGetServings } from './get-servings.js';

// Export tool definitions
export const tools = [
  listProductsTool,
  searchProductsTool,
  getProductTool,
  getNutritionTool,
  getServingsTool,
];

// Export tool handlers
export const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  [listProductsTool.name]: handleListProducts,
  [searchProductsTool.name]: handleSearchProducts,
  [getProductTool.name]: handleGetProduct,
  [getNutritionTool.name]: handleGetNutrition,
  [getServingsTool.name]: handleGetServings,
};
