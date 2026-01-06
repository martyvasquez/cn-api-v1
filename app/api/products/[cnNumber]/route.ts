import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logRequest,
} from '@/lib/auth-helpers';

/**
 * GET /api/products/:cnNumber
 * Get detailed information for a specific CN product
 *
 * Path Parameters:
 * - cnNumber: The CN number of the product
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

    // Query the database for the product
    const { data, error } = await supabaseAdmin
      .from('cn_products')
      .select('*')
      .eq('cn_number', cnNumber)
      .single();

    if (error || !data) {
      console.error('Database error or product not found:', error);
      await logRequest(apiKeyId!, request.nextUrl.pathname, 404);
      return createErrorResponse(
        `Product with CN number "${cnNumber}" not found`,
        404,
        usageInfo
      );
    }

    // Log the successful request
    await logRequest(apiKeyId!, request.nextUrl.pathname, 200);

    // Return the product details
    return createSuccessResponse(data, usageInfo);
  } catch (error) {
    console.error('Error in GET /api/products/[cnNumber]:', error);
    await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
    return createErrorResponse(
      'Internal server error',
      500,
      usageInfo
    );
  }
}
