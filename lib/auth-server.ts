// Removed createServerClient from @supabase/ssr
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility
import type { Database } from '@/types/supabase';
import { convertSupabaseSession } from '@/types/auth';
import { createDirectClient } from '@/lib/supabase.server';
// Avoid direct import of next/headers since it's App Router only
// import { cookies } from 'next/headers';

/**
 * Get the current server session for App Router (works with Edge runtime)
 * This version uses cookies() and should only be used in app/ directory components
 */
export async function getServerSession() {
  try {
    // Create two versions of the client - try cookie-based first for app dir
    // then fall back to direct client as backup
    let session = null;
    let user = null;

    try {
      let cookieStore;

      try {
        // Using dynamic import with immediately invoked function to isolate next/headers import
        // This ensures it's only loaded in contexts where it's available (App Router)
        cookieStore = await (async () => {
          // This code path will only execute in App Router server components
          // It will throw in Pages Router or client components
          const { cookies } = await import('next/headers');
          return cookies();
        })();
      } catch (e) {
        // If import fails, we'll fall back to direct auth
        throw new Error('next/headers is not available in this context');
      }

      if (cookieStore) {
        // Use the new utility function to create the Supabase client
        // Note: createSupabaseServerClient handles cookies internally now
        const supabase = await createSupabaseServerClient();

        // First, get the user directly which is more secure
        // This follows Supabase's recommendation for better security
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError) {
          console.warn('Error getting user:', userError);
        } else if (userData.user) {
          user = userData.user;

          // After verifying the user, get the session for access tokens
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData.session;
        }
      }
    } catch (e) {
      // If cookies() fails, fall back to direct client as backup
      // This would happen in pages/ directory or environments without headers API
      console.warn(
        'Cookie-based auth failed, falling back to direct client:',
        e,
      );

      // Use direct client as backup
      const directSupabase = createDirectClient();

      // First, get the user directly which is more secure
      const { data: userData } = await directSupabase.auth.getUser();

      if (userData.user) {
        user = userData.user;
        // Get session after verifying user
        const { data: sessionData } = await directSupabase.auth.getSession();
        session = sessionData.session;
      }
    }

    // If we have a verified user and session, convert it to our app's format
    if (user && session) {
      console.log('Server session found for user:', user.email);
      return convertSupabaseSession(session);
    }

    console.log('No session found in getServerSession');
    return null;
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}
