import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logRequest,
} from '@/lib/auth-helpers';

/**
 * GET /api/products
 * List all CN products with pagination and filtering
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - category: string (optional filter)
 * - manufacturer: string (optional filter)
 */
export async function GET(request: NextRequest) {
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
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const category = searchParams.get('category');
    const manufacturer = searchParams.get('manufacturer');

    // Validate and sanitize parameters
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '20', 10)),
      100
    );
    const offset = Math.max(0, parseInt(offsetParam || '0', 10));

    // Build the query
    let query = supabaseAdmin
      .from('cn_products')
      .select('*', { count: 'exact' });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Order by product name
    query = query.order('product_name', { ascending: true });

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
      return createErrorResponse(
        'Failed to fetch products',
        500,
        usageInfo
      );
    }

    // Log the successful request
    await logRequest(apiKeyId!, request.nextUrl.pathname, 200);

    // Return paginated results
    return createSuccessResponse(
      data || [],
      usageInfo,
      {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      }
    );
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
    return createErrorResponse(
      'Internal server error',
      500,
      usageInfo
    );
  }
}
