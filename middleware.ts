import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  // Add the skip_zrok_interstitial header
  requestHeaders.set('skip_zrok_interstitial', 'true');
  
  // Check if the zrok_interstitial cookie already exists
  const hasInterstitialCookie = request.cookies.has('zrok_interstitial');
  
  // Return the response with the modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Apply this middleware to all routes
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}; 