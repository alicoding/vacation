import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  try {
    // Use the newer createServerClient with proper cookie handling
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: async (name) => {
            const cookie = (await cookieStore).get(name);
            return cookie?.value;
          },
          set: async (name, value, options) => {
            // Await the cookie operation to fix the error
            (await cookieStore).set(name, value, options);
          },
          remove: async (name, options) => {
            // Await the cookie operation to fix the error
            (await cookieStore).set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', request.url));
    }
    
    // Verify that the session was actually established
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('Session not established after code exchange');
      return NextResponse.redirect(new URL('/auth/signin?error=session_not_established', request.url));
    }
    
    console.log('Auth successful, session established');
    
    // Get the callback URL or default to dashboard
    const callbackUrl = requestUrl.searchParams.get('callbackUrl') || '/dashboard';
    
    // Add a flag in the URL to indicate this is a post-authentication redirect
    // This will help the middleware avoid redirect loops
    const redirectUrl = new URL(callbackUrl, request.url);
    redirectUrl.searchParams.set('auth_success', 'true');
    
    // URL to redirect to after sign in process completes
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unknown', request.url));
  }
}
