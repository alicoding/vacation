import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase.server';

export const config = {
  matcher: [
    // Only match dashboard and other protected routes
    '/dashboard/:path*',
    '/api/user/:path*',
    '/api/vacations/:path*',
    // Exclude auth routes and public resources
    '/((?!_next/static|_next/image|favicon.ico|images|public|api/auth|auth).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies using our centralized utility
  const supabase = createSupabaseMiddlewareClient(req, res);

  try {
    // Get the current path - we'll use this to prevent unnecessary redirects
    const path = req.nextUrl.pathname;

    // Check if this is a post-authentication redirect from the callback
    if (req.nextUrl.searchParams.has('auth_success')) {
      // Remove the parameter and proceed to prevent redirect loops
      req.nextUrl.searchParams.delete('auth_success');
      return NextResponse.redirect(req.nextUrl);
    }

    // Get redirect count from cookies to prevent infinite loops
    const redirectCount = parseInt(
      req.cookies.get('auth_redirect_count')?.value || '0',
    );

    // Safety check: if we're redirecting too many times, reset and allow the user through
    if (redirectCount > 3) {
      console.warn(
        'Too many auth redirects detected, resetting count and allowing access',
      );
      res.cookies.set('auth_redirect_count', '0', { path: '/', maxAge: 0 });
      return res;
    }

    // Use getUser() for better security as recommended by Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Handle public routes for authenticated users
    if (user && !authError) {
      // If user is authenticated and visiting home page or signin page, redirect to dashboard
      if (path === '/' || path === '/auth/signin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Reset redirect count when a valid user is found
      res.cookies.set('auth_redirect_count', '0', { path: '/', maxAge: 0 });
      return res;
    }

    // If there's no authenticated user and the user is trying to access a protected route,
    // redirect to the sign-in page
    if ((!user || authError) && path !== '/' && !path.startsWith('/auth/')) {
      console.log('No authenticated user detected, redirecting to sign-in', {
        path,
      });

      // Increment the redirect count and store it in a cookie
      res.cookies.set('auth_redirect_count', (redirectCount + 1).toString(), {
        path: '/',
        maxAge: 30, // Short expiry to avoid persistent issues
      });

      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return res;
  } catch (error) {
    console.error('Error in auth middleware:', error);
    return res;
  }
}
