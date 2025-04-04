export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
// Import createServerClient and CookieOptions
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // Import cookies to read from request

// Assuming getRequiredEnvVar is correctly defined elsewhere (e.g., in supabase.shared)
import { getRequiredEnvVar } from '@/lib/supabase.shared';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  // Await the cookie store here
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          // Now using the resolved cookieStore
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Now using the resolved cookieStore
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get user settings from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching user settings (GET):', error);
      if (error.code === 'PGRST116') {
         return NextResponse.json({ error: 'User settings not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user settings (GET Catch):', error);
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const response = new NextResponse();
  // Await the cookie store here
  const cookieStore = await cookies();

  // Create authenticated Supabase client for Route Handlers
  const supabase = createServerClient<Database>(
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          // Now using the resolved cookieStore
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Now using the resolved cookieStore
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  // Now getSession should work correctly
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate body content here if necessary

    // Update Supabase user metadata (using the authenticated client)
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: body, // Assuming body contains only valid user metadata fields
    });

    if (updateAuthError) {
      console.error('Error updating Supabase auth user:', updateAuthError);
      return NextResponse.json({ error: `Failed to update auth user: ${updateAuthError.message}` }, { status: 500 });
    }

    // Also update in our application database
    const { error: updateDbError } = await supabase
      .from('users')
      .update(body) // Ensure body only contains columns present in 'users' table
      .eq('id', session.user.id);

    if (updateDbError) {
       console.error('Error updating user table:', updateDbError);
       return NextResponse.json({ error: `Failed to update user settings in DB: ${updateDbError.message}` }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({ message: 'Settings updated successfully' });

  } catch (error: any) {
    console.error('Error updating user settings (PUT Catch):', error);
     if (error instanceof SyntaxError) {
       return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
     }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}