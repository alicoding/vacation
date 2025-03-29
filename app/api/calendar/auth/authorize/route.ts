export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/utils/googleCalendar/tokenManager';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Authorize Google Calendar access by redirecting to Google's authorization page
 */
export async function GET(request: NextRequest) {
  try {
    // Use cookies() with await as per Next.js 15 recommended pattern - same as main auth callback
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              // Ensure sameSite is a string value required by cookie API
              if (options?.sameSite === true) options.sameSite = 'strict';
              if (options?.sameSite === false) options.sameSite = 'lax';
              
              cookieStore.set(name, value, options);
            } catch (e) {
              console.warn('Error setting cookie:', e);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (e) {
              console.warn('Error removing cookie:', e);
            }
          },
        },
      },
    );
    
    // Get the authenticated user using the same pattern as main auth callback
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error in authorize:', authError);
      return NextResponse.json({ error: 'Not authenticated', details: authError?.message }, { status: 401 });
    }
    
    // Verify that Google OAuth credentials are available and construct the redirect URL
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/auth/callback`;
    
    // Use our enhanced getAuthorizationUrl function which includes better error handling
    const authUrl = getAuthorizationUrl(redirectUri);
    
    // If there's an error with the client ID, the function will return an error URL
    if (authUrl.startsWith('/api/calendar/auth/error')) {
      return NextResponse.redirect(new URL(authUrl, request.url));
    }
    
    // Get the redirect path from query parameters or use default
    const requestUrl = new URL(request.url);
    const redirectPath = requestUrl.searchParams.get('redirect') || '/dashboard/calendar';
    
    // Create a cookie to store the redirect path
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('calendar_auth_redirect', redirectPath, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error redirecting to Google Calendar authorization:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Redirect to our error handler with detailed message
    return NextResponse.redirect(
      new URL(`/api/calendar/auth/error?message=${encodeURIComponent(errorMessage)}`, request.url),
    );
  }
}