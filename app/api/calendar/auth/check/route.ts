// filepath: /Users/ali/Documents/projects/vacation/app/api/calendar/auth/check/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleToken } from '@/utils/googleCalendar';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Check if the current user has authorized Google Calendar access
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
      console.error('Authentication error in check:', authError);
      return NextResponse.json({ authorized: false, error: 'Not authenticated' }, { status: 401 });
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
    return NextResponse.json({ 
      authorized: false,
      error: 'Failed to check authorization status',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}