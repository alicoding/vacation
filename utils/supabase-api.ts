// Removed createServerClient from @supabase/ssr
// Removed cookies from next/headers
import type { Database } from '@/types/supabase';
// Removed CookieOptions from @supabase/ssr
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility

/**
 * Creates a Supabase client for use in API routes with proper cookie handling
 * for Edge runtime compatibility
 */
export async function createApiClient() {
  // Use the new utility function to create the Supabase client
  return await createSupabaseServerClient(); // Await the async function
}

/**
 * Utility function to check if a user is authenticated in API routes
 * Returns the authenticated user if present, or throws an error if not
 */
export async function requireAuth() {
  const supabase = await createApiClient();

  // Use getUser() instead of getSession() for better security as recommended by Supabase
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error getting authenticated user:', userError);
    throw new Error('Authentication error');
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  return { supabase, user };
}
