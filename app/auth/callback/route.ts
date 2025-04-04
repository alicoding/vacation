// Removed createServerClient from @supabase/ssr
// Removed cookies from next/headers
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility
import { NextResponse, type NextRequest } from 'next/server';
import { ensureUserRecord } from '@/lib/auth-helpers.server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  try {
    // Use cookies() with await as per Next.js 15 recommended pattern
    // Use the new utility function to create the Supabase client
    const supabase = await createSupabaseServerClient(); // Await the async function
    
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
    
    // Ensure user record exists in our database
    await ensureUserRecord(
      session.user.id,
      session.user.email!,
      session.user.user_metadata,
    );
    
    console.log('Auth successful, session established for user:', session.user.email);
    
    // Get the callback URL or default to dashboard
    const callbackUrl = requestUrl.searchParams.get('callbackUrl') || '/dashboard';
    
    // Add a flag in the URL to indicate this is a post-authentication redirect
    // This will help the middleware avoid redirect loops
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      console.error('NEXT_PUBLIC_SITE_URL is not set in the environment for the auth callback.');
      // Fallback or throw error - using request.url as a less ideal fallback
      const redirectUrl = new URL(callbackUrl, request.url);
    }
    const redirectUrl = new URL(callbackUrl, siteUrl); // Use environment variable as base
    redirectUrl.searchParams.set('auth_success', 'true');
    
    // URL to redirect to after sign in process completes
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unexpected', request.url));
  }
}
