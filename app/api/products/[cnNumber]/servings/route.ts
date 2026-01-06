import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logRequest,
} from '@/lib/auth-helpers';

/**
 * GET /api/products/:cnNumber/servings
 * Get serving size conversions for a specific CN product
 *
 * Path Parameters:
 * - cnNumber: The CN number of the product
 *
 * Returns:
 * - Product info with all serving size conversions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { cnNumber: string } }
) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);

  if (!authResult.authenticated) {
    return createErrorResponse(
      authResult.error!,
      authResult.statusCode!,
      authResult.usageInfo
    );
  }

  const { apiKeyId, usageInfo } = authResult;

  try {
    const { cnNumber } = params;

    // Validate CN number
    if (!cnNumber || cnNumber.trim().length === 0) {
      await logRequest(apiKeyId!, request.nextUrl.pathname, 400);
      return createErrorResponse(
        'CN number is required',
        400,
        usageInfo
      );
    }

    // Get product info
    const { data: product, error: productError } = await (supabaseAdmin as any)
      .from('cn_products')
      .select('cn_number, product_name, category, serving_size')
      .eq('cn_number', cnNumber)
      .single();

    if (productError || !product) {
      await logRequest(apiKeyId!, request.nextUrl.pathname, 404);
      return createErrorResponse(
        `Product with CN number "${cnNumber}" not found`,
        404,
        usageInfo
      );
    }

    // Get serving conversions
    const { data: servings, error: servingsError } = await (supabaseAdmin as any)
      .from('cn_servings')
      .select('*')
      .eq('cn_number', cnNumber)
      .order('sequence_num', { ascending: true });

    if (servingsError) {
      console.error('Database error:', servingsError);
      await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
      return createErrorResponse(
        'Failed to fetch serving conversions',
        500,
        usageInfo
      );
    }

    // Format servings data
    const formattedServings = (servings || []).map((serving: any) => ({
      sequence: serving.sequence_num,
      amount: serving.amount,
      measure: serving.measure_description,
      grams: serving.unit_amount,
      unit: serving.type_of_unit,
    }));

    // Log the successful request
    await logRequest(apiKeyId!, request.nextUrl.pathname, 200);

    // Return product with servings
    return createSuccessResponse(
      {
        cn_number: product.cn_number,
        product_name: product.product_name,
        category: product.category,
        base_serving: product.serving_size,
        servings_count: formattedServings.length,
        servings: formattedServings,
      },
      usageInfo
    );
  } catch (error) {
    console.error('Error in GET /api/products/[cnNumber]/servings:', error);
    await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
    return createErrorResponse(
      'Internal server error',
      500,
      usageInfo
    );
  }
}
