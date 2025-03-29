export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/utils/googleCalendar/tokenManager';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
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
    const redirectPath = request.cookies.get('calendar_auth_redirect')?.value || '/dashboard/calendar';
    
    // If Google returned an error, redirect back with the error
    if (error) {
      const redirectUrl = new URL(redirectPath, process.env.NEXTAUTH_URL);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }
    
    // If no code was returned, we can't proceed
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }
    
    // Use cookies() with await as per Next.js 15 recommended pattern
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
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
    
    // Get the current user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error in callback:', authError);
      return NextResponse.json({ error: 'Not authenticated', details: authError?.message }, { status: 401 });
    }
    
    // Exchange the code for Google OAuth tokens
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/auth/callback`;
    
    try {
      // Log the values we're using for debugging
      console.log('OAuth Exchange Values:', {
        codeExists: !!code,
        clientIdFirstChars: process.env.GOOGLE_CLIENT_ID?.substring(0, 5) + '...',
        clientSecretExists: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUri,
        userId: user.id,
      });
      
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      
      // Create a service role client to bypass RLS
      const adminClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { 
          auth: { 
            persistSession: false, 
          }, 
        },
      );
      
      // Calculate when the token will expire
      // Using Luxon for date handling as per project standards
      const expiresAt = DateTime.now().plus({ seconds: tokens.expires_in }).toISO();
      
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
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt, // ISO string compatible with timestamp type
          token_type: tokens.token_type,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

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
      const redirectUrl = new URL(redirectPath, request.url);
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
      const redirectUrl = new URL(redirectPath, request.url);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set('details', encodeURIComponent(tokenError instanceof Error ? tokenError.message : String(tokenError)));
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error);
    return NextResponse.json({ 
      error: 'Failed to complete Google Calendar authorization',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}