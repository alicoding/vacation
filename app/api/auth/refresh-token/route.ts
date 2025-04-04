import { createDirectClient } from '@/lib/supabase.server';
import { NextResponse, type NextRequest } from 'next/server';
import { DateTime } from 'luxon';

export const runtime = 'edge';

export async function POST(_request: NextRequest) {
  const supabase = createDirectClient();

  // Get the authenticated user using getUser() for better security
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get the refresh token from the database
    interface TokenData {
      refresh_token: string;
      expires_at: string;
    }

    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('refresh_token, expires_at')
      .filter('user_id', 'eq', user.id)
      .single();

    if (error || !tokenData) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 404 },
      );
    }

    // Safe type assertion after checking for null
    const typedTokenData = tokenData as TokenData;

    if (!typedTokenData.refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is missing' },
        { status: 404 },
      );
    }

    // Use the refresh token to get a new access token
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: typedTokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const tokens = await response.json();

      if (!response.ok) {
        console.error('Token refresh failed:', tokens);
        return NextResponse.json(
          { error: 'Failed to refresh token', details: tokens },
          { status: 500 },
        );
      }

      // Calculate new expiry time using Luxon for timestamp compatibility
      const expiresAt = DateTime.now()
        .plus({ seconds: tokens.expires_in })
        .toISO();

      // Update the token in the database
      const { error: updateError } = await supabase
        .from('google_tokens')
        .update({
          access_token: String(tokens.access_token),
          expires_at: expiresAt,
        } as any) // Use type assertion to avoid type error temporarily
        .filter('user_id', 'eq', user.id);

      if (updateError) {
        console.error('Failed to update token in database:', updateError);
        return NextResponse.json(
          { error: 'Database update failed' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        access_token: tokens.access_token,
        expires_at: expiresAt,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const abortError = fetchError as { name?: string };
      if (abortError.name === 'AbortError') {
        console.error('Token refresh request timed out');
        return NextResponse.json(
          { error: 'Token refresh timed out' },
          { status: 504 },
        );
      }
      throw fetchError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        message: err.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
