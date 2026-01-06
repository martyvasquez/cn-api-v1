import { NextRequest } from 'next/server';
import { validateAPIKey } from './api-key';
import { checkRateLimit, logAPICall } from './usage-tracker';
import type { APIResponse, UsageInfo } from './types';

export interface AuthResult {
  authenticated: boolean;
  apiKeyId?: string;
  tier?: string;
  usageInfo?: UsageInfo;
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate and validate an API request
 * This should be called at the start of each protected route handler
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // Get the API key from the header (set by middleware)
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing API key',
      statusCode: 401,
    };
  }

  // Validate the API key
  const keyData = await validateAPIKey(apiKey);

  if (!keyData) {
    return {
      authenticated: false,
      error: 'Invalid or inactive API key',
      statusCode: 401,
    };
  }

  // Check rate limits
  const { allowed, usageInfo } = await checkRateLimit(keyData.id, keyData.tier);

  if (!allowed) {
    return {
      authenticated: false,
      apiKeyId: keyData.id,
      tier: keyData.tier,
      usageInfo,
      error: `Rate limit exceeded. You have used ${usageInfo.current} of ${usageInfo.limit} calls this month.`,
      statusCode: 429,
    };
  }

  return {
    authenticated: true,
    apiKeyId: keyData.id,
    tier: keyData.tier,
    usageInfo,
  };
}

/**
 * Log the API call after the request is processed
 * This should be called after the response is generated
 */
export async function logRequest(
  apiKeyId: string,
  endpoint: string,
  statusCode: number
): Promise<void> {
  // Run logging asynchronously (don't await)
  logAPICall(apiKeyId, endpoint, statusCode).catch((error) => {
    console.error('Error logging API call:', error);
  });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  usageInfo?: UsageInfo
): Response {
  const response: APIResponse = {
    success: false,
    error,
  };

  if (usageInfo) {
    response.meta = {
      usage: {
        current: usageInfo.current,
        limit: usageInfo.limit,
        tier: usageInfo.tier,
        remaining: usageInfo.remaining,
      },
    };
  }

  return Response.json(response, { status: statusCode });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  usageInfo?: UsageInfo,
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }
): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
  };

  if (usageInfo || pagination) {
    response.meta = {};

    if (usageInfo) {
      response.meta.usage = {
        current: usageInfo.current,
        limit: usageInfo.limit,
        tier: usageInfo.tier,
        remaining: usageInfo.remaining,
      };
    }

    if (pagination) {
      response.meta.pagination = pagination;
    }
  }

  return Response.json(response);
}
