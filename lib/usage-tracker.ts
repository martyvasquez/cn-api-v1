import { supabaseAdmin, getCurrentBillingMonth } from './supabase';

// Helper to get typed supabase admin (workaround for build-time type issues)
const getAdmin = () => supabaseAdmin as any;
import type { BillingTier, UsageInfo } from './types';

/**
 * Log an API call to the usage tracking table
 */
export async function logAPICall(
  apiKeyId: string,
  endpoint: string,
  responseStatus: number
): Promise<void> {
  try {
    const billingMonth = getCurrentBillingMonth();

    // Insert the API usage record
    const { error: usageError } = await getAdmin()
      .from('api_usage')
      .insert({
        api_key_id: apiKeyId,
        endpoint,
        response_status: responseStatus,
        billing_month: billingMonth,
      });

    if (usageError) {
      console.error('Error logging API usage:', usageError);
    }

    // Update the monthly usage summary (upsert pattern)
    const { error: summaryError } = await getAdmin().rpc('upsert_monthly_usage', {
      p_api_key_id: apiKeyId,
      p_billing_month: billingMonth,
    });

    if (summaryError) {
      // If the RPC doesn't exist, fall back to manual upsert
      await manualUpsertMonthlySummary(apiKeyId, billingMonth);
    }
  } catch (error) {
    console.error('Error in logAPICall:', error);
  }
}

/**
 * Manual upsert for monthly usage summary (fallback)
 */
async function manualUpsertMonthlySummary(
  apiKeyId: string,
  billingMonth: string
): Promise<void> {
  try {
    // Check if record exists
    const { data: existing } = await getAdmin()
      .from('monthly_usage_summary')
      .select('*')
      .eq('api_key_id', apiKeyId)
      .eq('billing_month', billingMonth)
      .single();

    if (existing) {
      // Update existing record
      await getAdmin()
        .from('monthly_usage_summary')
        .update({
          total_calls: existing.total_calls + 1,
          last_updated: new Date().toISOString(),
        })
        .eq('api_key_id', apiKeyId)
        .eq('billing_month', billingMonth);
    } else {
      // Insert new record
      await getAdmin()
        .from('monthly_usage_summary')
        .insert({
          api_key_id: apiKeyId,
          billing_month: billingMonth,
          total_calls: 1,
          last_updated: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error in manualUpsertMonthlySummary:', error);
  }
}

/**
 * Get current usage for an API key
 */
export async function getCurrentUsage(apiKeyId: string): Promise<number> {
  try {
    const billingMonth = getCurrentBillingMonth();

    const { data, error } = await getAdmin()
      .from('monthly_usage_summary')
      .select('total_calls')
      .eq('api_key_id', apiKeyId)
      .eq('billing_month', billingMonth)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.total_calls || 0;
  } catch (error) {
    console.error('Error getting current usage:', error);
    return 0;
  }
}

/**
 * Get the billing tier information
 */
export async function getBillingTier(tierName: string): Promise<BillingTier | null> {
  try {
    const { data, error } = await getAdmin()
      .from('billing_tiers')
      .select('*')
      .eq('tier_name', tierName)
      .single();

    if (error || !data) {
      return null;
    }

    return data as BillingTier;
  } catch (error) {
    console.error('Error getting billing tier:', error);
    return null;
  }
}

/**
 * Check if an API key has exceeded its rate limit
 * Returns usage info including whether the limit is exceeded
 */
export async function checkRateLimit(
  apiKeyId: string,
  tier: string
): Promise<{ allowed: boolean; usageInfo: UsageInfo }> {
  try {
    const [currentUsage, tierInfo] = await Promise.all([
      getCurrentUsage(apiKeyId),
      getBillingTier(tier),
    ]);

    if (!tierInfo) {
      // Default to basic tier limits if tier not found
      const defaultLimit = 1000;
      return {
        allowed: currentUsage < defaultLimit,
        usageInfo: {
          current: currentUsage,
          limit: defaultLimit,
          tier: tier,
          remaining: Math.max(0, defaultLimit - currentUsage),
          percentUsed: (currentUsage / defaultLimit) * 100,
        },
      };
    }

    const allowed = currentUsage < tierInfo.monthly_call_limit;
    const remaining = Math.max(0, tierInfo.monthly_call_limit - currentUsage);
    const percentUsed = (currentUsage / tierInfo.monthly_call_limit) * 100;

    return {
      allowed,
      usageInfo: {
        current: currentUsage,
        limit: tierInfo.monthly_call_limit,
        tier: tier,
        remaining,
        percentUsed,
      },
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // In case of error, deny access to be safe
    return {
      allowed: false,
      usageInfo: {
        current: 0,
        limit: 0,
        tier: tier,
        remaining: 0,
        percentUsed: 100,
      },
    };
  }
}

/**
 * Get detailed usage statistics for an API key
 */
export async function getUsageStats(apiKeyId: string, months: number = 3) {
  try {
    // Get usage for the last N months
    const stats = await getAdmin()
      .from('monthly_usage_summary')
      .select('*')
      .eq('api_key_id', apiKeyId)
      .order('billing_month', { ascending: false })
      .limit(months);

    return stats.data || [];
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return [];
  }
}
