import { createDirectClient } from '@/utils/supabase';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const supabase = createDirectClient();
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Get the refresh token from the database
    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('refresh_token, expires_at')
      .eq('user_id', session.user.id)
      .single();
      
    if (error || !tokenData?.refresh_token) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 404 });
    }

    // Use the refresh token to get a new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to refresh token', details: tokens }, { status: 500 });
    }
    
    // Calculate new expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
    
    // Update the token in the database
    await supabase
      .from('google_tokens')
      .update({
        access_token: tokens.access_token,
        expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', session.user.id);
      
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_at: expiresAt.toISOString(),
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
