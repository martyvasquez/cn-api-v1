import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAPIKeyById } from '@/lib/api-key';
import { getUsageStats, getCurrentUsage, getBillingTier } from '@/lib/usage-tracker';

/**
 * GET /api/admin/usage/:apiKeyId
 * Get usage statistics for a specific API key
 *
 * NOTE: This is an admin endpoint. In production, you should add
 * authentication/authorization to protect this endpoint.
 *
 * Path Parameters:
 * - apiKeyId: The UUID of the API key
 *
 * Query Parameters:
 * - months: number (default: 3) - Number of months of history to return
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { apiKeyId: string } }
) {
  try {
    const { apiKeyId } = params;
    const searchParams = request.nextUrl.searchParams;
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 3;

    // Validate API key ID
    if (!apiKeyId || apiKeyId.trim().length === 0) {
      return Response.json(
        {
          success: false,
          error: 'API key ID is required',
        },
        { status: 400 }
      );
    }

    // Get the API key information
    const apiKey = await getAPIKeyById(apiKeyId);

    if (!apiKey) {
      return Response.json(
        {
          success: false,
          error: `API key with ID "${apiKeyId}" not found`,
        },
        { status: 404 }
      );
    }

    // Get usage statistics
    const [currentUsage, tierInfo, usageHistory] = await Promise.all([
      getCurrentUsage(apiKeyId),
      getBillingTier(apiKey.tier),
      getUsageStats(apiKeyId, months),
    ]);

    // Calculate additional metrics
    const limit = tierInfo?.monthly_call_limit || 0;
    const remaining = Math.max(0, limit - currentUsage);
    const percentUsed = limit > 0 ? (currentUsage / limit) * 100 : 0;

    return Response.json({
      success: true,
      data: {
        apiKey: {
          id: apiKey.id,
          client_name: apiKey.client_name,
          tier: apiKey.tier,
          is_active: apiKey.is_active,
          created_at: apiKey.created_at,
          expires_at: apiKey.expires_at,
        },
        currentMonth: {
          usage: currentUsage,
          limit,
          remaining,
          percentUsed: Math.round(percentUsed * 100) / 100,
        },
        tier: tierInfo
          ? {
              name: tierInfo.tier_name,
              monthly_call_limit: tierInfo.monthly_call_limit,
              price_monthly: tierInfo.price_monthly,
              description: tierInfo.description,
            }
          : null,
        history: usageHistory.map((month: any) => ({
          billing_month: month.billing_month,
          total_calls: month.total_calls,
          last_updated: month.last_updated,
        })),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/usage/[apiKeyId]:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
