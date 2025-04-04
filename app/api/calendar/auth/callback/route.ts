export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/utils/googleCalendar/tokenManager';
import { createServiceClient } from '@/lib/supabase.shared'; // Import service client creator
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility
import type { Database as _Database } from '@/types/supabase'; // Prefix unused import
import { DateTime } from 'luxon';

/**
 * Handle the callback from Google OAuth with the auth code
 * Exchange the code for tokens and store them in Supabase
 */
export async function GET(request: NextRequest) {
  try {
    // Get the auth code from the URL
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');

    // Get the redirect path from the cookie
    const redirectPath =
      request.cookies.get('calendar_auth_redirect')?.value ||
      '/dashboard/calendar';

    // If Google returned an error, redirect back with the error
    if (error) {
      const redirectUrl = new URL(redirectPath, process.env.NEXTAUTH_URL);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    // If no code was returned, we can't proceed
    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 },
      );
    }

    // Use cookies() with await as per Next.js 15 recommended pattern
    // Use the new utility function to create the Supabase client
    const supabase = await createSupabaseServerClient(); // Await the async function

    // Get the current user from Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in callback:', authError);
      return NextResponse.json(
        { error: 'Not authenticated', details: authError?.message },
        { status: 401 },
      );
    }

    // Exchange the code for Google OAuth tokens
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/auth/callback`;

    try {
      // Log the values we're using for debugging
      console.log('OAuth Exchange Values:', {
        codeExists: !!code,
        clientIdFirstChars:
          process.env.GOOGLE_CLIENT_ID?.substring(0, 5) + '...',
        clientSecretExists: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUri,
        userId: user.id,
      });

      const tokens = await exchangeCodeForTokens(code, redirectUri);

      // Use the shared service client creator which includes checks
      const adminClient = createServiceClient();

      // Calculate when the token will expire
      // Using Luxon for date handling as per project standards
      const expiresAt = DateTime.now()
        .plus({ seconds: tokens.expires_in })
        .toISO();

      // Check if a record already exists
      const { data: existingToken } = await adminClient
        .from('google_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Saving tokens with service role client', {
        userHasExistingToken: !!existingToken,
        userId: user.id,
      });

      // Use upsert directly with the correct field types
      // expires_at is a timestamp with time zone, so we use an ISO string
      const { error: tokenError } = await adminClient
        .from('google_tokens')
        .upsert(
          {
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt, // ISO string compatible with timestamp type
            token_type: tokens.token_type,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (tokenError) {
        console.error('Error saving tokens to database:', tokenError);
        throw new Error(`Failed to save tokens: ${tokenError.message}`);
      }

      console.log('Successfully saved Google tokens for user', user.id);

      // Update user's calendar_sync_enabled setting
      const { error: userUpdateError } = await adminClient
        .from('users')
        .update({
          calendar_sync_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.warn('Error updating user calendar settings:', userUpdateError);
        // Non-critical error, don't throw
      }

      // Redirect back to the app
      const redirectUrl = new URL(
        redirectPath,
        process.env.NEXT_PUBLIC_SITE_URL || request.url,
      ); // Use SITE_URL as base
      redirectUrl.searchParams.set('success', 'true');

      const response = NextResponse.redirect(redirectUrl);

      // Clear the redirect cookie
      response.cookies.set('calendar_auth_redirect', '', {
        maxAge: 0,
        path: '/',
      });

      return response;
    } catch (tokenError) {
      console.error('Error in Google Calendar auth flow:', tokenError);

      // Add more detailed error information to help debugging
      const redirectUrl = new URL(
        redirectPath,
        process.env.NEXT_PUBLIC_SITE_URL || request.url,
      ); // Use SITE_URL as base
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set(
        'details',
        encodeURIComponent(
          tokenError instanceof Error ? tokenError.message : String(tokenError),
        ),
      );
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete Google Calendar authorization',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
