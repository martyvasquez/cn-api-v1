/**
 * Tool Parameter Schemas
 * Zod schemas for validating MCP tool parameters
 */

import { z } from 'zod';

// List Products Schema
export const listProductsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
});

export type ListProductsParams = z.infer<typeof listProductsSchema>;

// Search Products Schema
export const searchProductsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export type SearchProductsParams = z.infer<typeof searchProductsSchema>;

// Get Product Schema
export const getProductSchema = z.object({
  cn_number: z.string().min(1, 'CN number is required'),
});

export type GetProductParams = z.infer<typeof getProductSchema>;

// Get Nutrition Schema
export const getNutritionSchema = z.object({
  cn_number: z.string().min(1, 'CN number is required'),
});

export type GetNutritionParams = z.infer<typeof getNutritionSchema>;

// Get Servings Schema
export const getServingsSchema = z.object({
  cn_number: z.string().min(1, 'CN number is required'),
});

export type GetServingsParams = z.infer<typeof getServingsSchema>;
