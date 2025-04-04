import { createServiceClient, createDirectClient } from '@/lib/supabase.shared'; // Import both clients
import { TokenRefreshResponse, GoogleTokenData } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { DateTime } from 'luxon';

/**
 * Gets the Google access token for a user, refreshing if necessary
 */
export async function getGoogleToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient(); // Use service client to bypass RLS for reading tokens
  
  try {
    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId as any) // Type assertion needed for Supabase parameter compatibility
      .single();
      
    // Handle "no rows returned" gracefully - this is expected for users who haven't authorized yet
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('contains 0 rows')) {
        // This is an expected case when user hasn't authorized yet
        console.log(`No token found for user ${userId}`);
        return null;
      }
      
      // Log other unexpected errors
      console.error('Error fetching Google token:', error);
      return null;
    }
    
    if (!tokenData) {
      console.log(`No token data for user ${userId} even though query succeeded`);
      return null;
    }
    
    // Type guard to ensure tokenData has the expected properties
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
      console.error('Invalid token data structure:', Object.keys(tokenData as object));
      return null;
    }
    
    // Now we can safely access the properties
    console.log('Found token data:', {
      userId: tokenData.user_id,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
      tokenType: tokenData.token_type ? tokenData.token_type : 'Not specified',
    });
    
    // Convert expires_at to string before passing to DateTime
    const expiresAtStr = String(tokenData.expires_at);
    const expiresAt = DateTime.fromISO(expiresAtStr);
    const now = DateTime.now();
    console.log(`[Token Manager] Checking token expiration: Now=${now.toISO()}, ExpiresAt=${expiresAt.toISO()}`);
    
    if (now > expiresAt) {
      console.log(`[Token Manager] Token expired at ${expiresAt.toISO()}, attempting refresh via /api/auth/refresh-token...`);
      try {
        // Set a timeout for the fetch request to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
        
        const response = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: tokenData.refresh_token,
            user_id: userId,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorBody = await response.text(); // Read body for more details
          console.error(`[Token Manager] Refresh API call failed: Status=${response.status}, Body=${errorBody}`);
          throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
        }
        
        const newTokenData = await response.json();
        console.log('[Token Manager] Refresh API call successful.');
        // Ensure the response actually contains an access_token
        if (newTokenData && newTokenData.access_token) {
          console.log('[Token Manager] New access token received from refresh API.');
          return String(newTokenData.access_token);
        } else {
          console.error('[Token Manager] Refresh API response did not contain access_token:', newTokenData);
          throw new Error('Refresh API response missing access_token');
        }
      } catch (refreshError) {
        console.error('[Token Manager] Error during token refresh process:', refreshError);
        if (refreshError instanceof Error && refreshError.name === 'AbortError') {
          console.error('[Token Manager] Token refresh fetch timed out after 10 seconds');
        }
        // Explicitly return null after failed refresh attempt
        console.log('[Token Manager] Returning null due to refresh failure.');
        return null;
      }
    }
    
    console.log(`[Token Manager] Token is still valid until ${expiresAt.toISO()}. Returning existing access token.`);
    return String(tokenData.access_token);
  } catch (e) {
    console.error('Unexpected error in getGoogleToken:', e);
    return null;
  }
}

/**
 * Refresh an access token using a refresh token
 * This is generally called by the API route /api/auth/refresh-token
 */
export async function refreshAccessToken(
  clientId: string, 
  clientSecret: string, 
  refreshToken: string,
): Promise<TokenRefreshResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token refresh error: ${errorData.error_description || response.statusText}`);
  }
  
  return response.json();
}

/**
 * Exchange an authorization code for Google OAuth tokens
 * This is called after a user authorizes Google Calendar access
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  // Read environment variables directly here instead of checking them
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Log the environment variable status
  console.log('Google OAuth Environment Check:', {
    clientIdExists: typeof clientId === 'string' && clientId.length > 0,
    clientSecretExists: typeof clientSecret === 'string' && clientSecret.length > 0,
    clientIdFirstChars: clientId ? clientId.substring(0, 5) + '...' : 'undefined',
  });
  
  // More robust check
  if (!clientId || !clientSecret || clientId.trim() === '' || clientSecret.trim() === '') {
    throw new Error('Google OAuth credentials missing or empty - please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google token exchange error:', {
        status: response.status,
        error: errorData.error,
        errorDescription: errorData.error_description,
      });
      throw new Error(`Token exchange error: ${errorData.error_description || response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Exception during token exchange:', error);
    throw error;
  }
}

/**
 * Save Google OAuth tokens to Supabase for a user
 */
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
  try {
    // Use provided client or create one
    const supabase = supabaseClient || createDirectClient(); // Use direct server client by default
    
    // Calculate when the token will expire as an ISO string using Luxon for timestamp compatibility
    const expiresAt = DateTime.now().plus({ seconds: tokens.expires_in }).toISO();
    
    // Check if a record already exists - use a more specific type with `from` directly
    const { data: existingRecord, error: queryError } = await (supabase as any)
      .from('google_tokens')
      .select('id')
      .eq('user_id', userId as any) // Type assertion needed for Supabase parameter compatibility
      .maybeSingle();
    
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error checking for existing token:', queryError);
      throw new Error('Failed to save tokens: database error');
    }
    
    // Log current table structure for debugging
    console.log('Attempting to save tokens with structure:', {
      user_id: userId,
      access_token: 'REDACTED',
      refresh_token: 'REDACTED',
      expires_at: expiresAt,
      token_type: tokens.token_type,
    });
    
    // Create a properly typed token record
    const tokenRecord = {
      user_id: userId as any, // Type assertion needed for Supabase parameter compatibility
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokens.token_type,
    };
    
    // Use upsert with the correct date format for expires_at
    const { error } = await (supabase as any)
      .from('google_tokens')
      .upsert(tokenRecord, {
        onConflict: 'user_id',
      });
      
    if (error) {
      console.error('Error saving tokens to Supabase:', error);
      throw new Error(`Failed to save Google tokens to database: ${error.message}`);
    }
  } catch (error) {
    console.error('Exception in saveTokensToSupabase:', error);
    throw error;
  }
}

/**
 * Checks if a user has authorized Google Calendar access
 */
export async function hasCalendarAuthorization(userId: string): Promise<boolean> {
  const token = await getGoogleToken(userId);
  return token !== null;
}

/**
 * Gets the URL for authorizing Google Calendar access
 */
export function getAuthorizationUrl(redirectUri: string): string {
  // Get client ID from environment, with explicit error for debugging
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not defined in environment variables');
    // Return a dummy URL that will show an obvious error rather than silently failing
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

  console.log('Google Auth URL generated with clientId:', clientId.substring(0, 5) + '...');
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}