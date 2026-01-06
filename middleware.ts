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
    // Check for Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Authorization header. Please provide an API key using: Authorization: Bearer YOUR_API_KEY',
        },
        { status: 401 }
      );
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Authorization header format. Use: Authorization: Bearer YOUR_API_KEY',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key is empty. Please provide a valid API key.',
        },
        { status: 401 }
      );
    }

    // Add the API key to the request headers so route handlers can access it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-api-key', apiKey);

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
