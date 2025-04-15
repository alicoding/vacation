import { createServiceClient, createDirectClient } from '@/lib/supabase.shared';
import { TokenRefreshResponse, GoogleTokenData } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { DateTime } from 'luxon';

function extractErrorDescription(data: unknown, fallback: string): string {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error_description' in data &&
    typeof (data as Record<string, unknown>).error_description === 'string'
  ) {
    return (data as Record<string, string>).error_description;
  }

  return fallback;
}
export async function getGoogleToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient();

  try {
    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId as any)
      .single();

    if (error) {
      if (
        error.code === 'PGRST116' ||
        error.message?.includes('contains 0 rows')
      ) {
        console.log(`No token found for user ${userId}`);
        return null;
      }
      console.error('Error fetching Google token:', error);
      return null;
    }

    if (!tokenData) {
      console.log(
        `No token data for user ${userId} even though query succeeded`,
      );
      return null;
    }

    const isValidTokenData = (data: unknown): data is GoogleTokenData => {
      return (
        data !== null &&
        typeof data === 'object' &&
        'user_id' in data &&
        'access_token' in data &&
        'refresh_token' in data &&
        'expires_at' in data
      );
    };

    if (!isValidTokenData(tokenData)) {
      console.error(
        'Invalid token data structure:',
        Object.keys(tokenData as object),
      );
      return null;
    }

    const expiresAt = DateTime.fromISO(String(tokenData.expires_at));
    const now = DateTime.now();

    if (now > expiresAt) {
      console.log(
        `[Token Manager] Token expired at ${expiresAt.toISO()}, refreshing...`,
      );

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refresh_token: tokenData.refresh_token,
            user_id: userId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const newTokenData: unknown = await response.json().catch(() => null);

        if (
          !response.ok ||
          typeof newTokenData !== 'object' ||
          newTokenData === null ||
          !('access_token' in newTokenData) ||
          typeof (newTokenData as any).access_token !== 'string'
        ) {
          throw new Error('Refresh API response missing access_token');
        }

        return (newTokenData as { access_token: string }).access_token;
      } catch (refreshError) {
        console.error(
          '[Token Manager] Error during token refresh:',
          refreshError,
        );
        return null;
      }
    }

    return String(tokenData.access_token);
  } catch (e) {
    console.error('Unexpected error in getGoogleToken:', e);
    return null;
  }
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenRefreshResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    typeof data !== 'object' ||
    data === null ||
    !(
      'access_token' in data &&
      'expires_in' in data &&
      'token_type' in data &&
      'refresh_token' in data
    )
  ) {
    const errorMsg = extractErrorDescription(data, response.statusText);

    throw new Error(`Token refresh error: ${errorMsg}`);
  }

  return data as TokenRefreshResponse;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    clientId.trim() === '' ||
    clientSecret.trim() === ''
  ) {
    throw new Error('Missing Google OAuth credentials');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    typeof data !== 'object' ||
    data === null ||
    !(
      'access_token' in data &&
      'expires_in' in data &&
      'token_type' in data &&
      'refresh_token' in data
    )
  ) {
    const errorMsg = extractErrorDescription(data, response.statusText);

    throw new Error(`Token exchange error: ${errorMsg}`);
  }

  return data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export async function saveTokensToSupabase(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  },
  supabaseClient?: SupabaseClient<Database>,
): Promise<void> {
  const supabase = supabaseClient || createDirectClient();
  const expiresAt = DateTime.now().plus({ seconds: tokens.expires_in }).toISO();

  const { data: existingRecord, error: queryError } = await (supabase as any)
    .from('google_tokens')
    .select('id')
    .eq('user_id', userId as any)
    .maybeSingle();

  if (queryError && queryError.code !== 'PGRST116') {
    throw new Error('Failed to save tokens: database error');
  }

  const tokenRecord = {
    user_id: userId as any,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    token_type: tokens.token_type,
  };

  const { error } = await (supabase as any)
    .from('google_tokens')
    .upsert(tokenRecord, {
      onConflict: 'user_id',
    });

  if (error) {
    throw new Error(
      `Failed to save Google tokens to database: ${error.message}`,
    );
  }
}

export async function hasCalendarAuthorization(
  userId: string,
): Promise<boolean> {
  const token = await getGoogleToken(userId);
  return token !== null;
}

export function getAuthorizationUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return `/api/calendar/auth/error?message=${encodeURIComponent('Google Client ID not configured')}`;
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
