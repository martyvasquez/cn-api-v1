import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs on the Edge Runtime
// Note: We cannot use Node.js-specific modules here (like crypto)
// So we'll validate the API key in the route handlers instead
// This middleware will only check for the presence of an API key

export function middleware(request: NextRequest) {
  // Only apply middleware to /api/products routes (not /api/admin)
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/products')) {
    let apiKey: string | null = null;
    let authMethod: 'bearer' | 'url' | null = null;

    // Check for Authorization header first (preferred method)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      authMethod = 'bearer';
    }

    // Fallback to URL parameter if no Bearer token
    if (!apiKey) {
      const urlApiKey = request.nextUrl.searchParams.get('api_key');
      if (urlApiKey && urlApiKey.trim().length > 0) {
        apiKey = urlApiKey.trim();
        authMethod = 'url';
      }
    }

    // No API key found via any method
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing API key. Provide via Authorization: Bearer <key> header or ?api_key=<key> parameter',
        },
        { status: 401 }
      );
    }

    // Validate API key format
    if (apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key is empty',
        },
        { status: 401 }
      );
    }

    // Add the API key to the request headers so route handlers can access it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-api-key', apiKey);
    requestHeaders.set('x-auth-method', authMethod); // For analytics/logging

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For all other routes, continue without modification
  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: '/api/products/:path*',
};
