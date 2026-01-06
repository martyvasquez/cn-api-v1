import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logRequest,
} from '@/lib/auth-helpers';

/**
 * GET /api/products/search
 * Search CN products by name, category, or manufacturer
 *
 * Query Parameters:
 * - q: string (search term - required)
 * - category: string (optional filter)
 * - manufacturer: string (optional filter)
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
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
    const searchTerm = searchParams.get('q');
    const category = searchParams.get('category');
    const manufacturer = searchParams.get('manufacturer');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate search term
    if (!searchTerm || searchTerm.trim().length === 0) {
      await logRequest(apiKeyId!, request.nextUrl.pathname, 400);
      return createErrorResponse(
        'Search query parameter "q" is required',
        400,
        usageInfo
      );
    }

    // Validate and sanitize parameters
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '20', 10)),
      100
    );
    const offset = Math.max(0, parseInt(offsetParam || '0', 10));

    // Build the search query using PostgreSQL full-text search
    let query = supabaseAdmin
      .from('cn_products')
      .select('*', { count: 'exact' });

    // Full-text search on product_name
    query = query.textSearch('product_name', searchTerm, {
      type: 'websearch',
      config: 'english',
    });

    // Apply additional filters
    if (category) {
      query = query.eq('category', category);
    }

    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Order by relevance (best match first)
    query = query.order('product_name', { ascending: true });

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
      return createErrorResponse(
        'Failed to search products',
        500,
        usageInfo
      );
    }

    // Log the successful request
    await logRequest(apiKeyId!, request.nextUrl.pathname, 200);

    // Return search results
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
    console.error('Error in GET /api/products/search:', error);
    await logRequest(apiKeyId!, request.nextUrl.pathname, 500);
    return createErrorResponse(
      'Internal server error',
      500,
      usageInfo
    );
  }
}
