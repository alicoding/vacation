// filepath: /Users/ali/Documents/projects/vacation/app/api/calendar/auth/check/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleToken } from '@/utils/googleCalendar';
// Removed createServerClient from @supabase/ssr
// Removed cookies from next/headers
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility

/**
 * Check if the current user has authorized Google Calendar access
 */
export async function GET(_request: NextRequest) {
  // Prefix unused arg
  try {
    // Use the new utility function to create the Supabase client
    const supabase = await createSupabaseServerClient(); // Await the async function

    // Get the authenticated user using the same pattern as main auth callback
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in check:', authError);
      return NextResponse.json(
        { authorized: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Check if we have a valid Google token for this user
    const token = await getGoogleToken(user.id);

    // Return authorization status
    return NextResponse.json({
      authorized: token !== null,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error checking Google Calendar authorization:', error);
    return NextResponse.json(
      {
        authorized: false,
        error: 'Failed to check authorization status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
