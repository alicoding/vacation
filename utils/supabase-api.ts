import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in API routes with proper cookie handling
 * for Edge runtime compatibility
 */
export async function createApiClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          try {
            return cookieStore.get(name)?.value;
          } catch (e) {
            console.warn('Error getting cookie in API context:', e);
            return undefined;
          }
        },
        set(name, value, options) {
          try {
            // Ensure sameSite is a string value as required by Cookie API
            if (options?.sameSite === true) options.sameSite = 'strict';
            if (options?.sameSite === false) options.sameSite = 'lax';
            
            cookieStore.set(name, value, options as CookieOptions);
          } catch (e) {
            console.warn('Error setting cookie in API context:', e);
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 } as CookieOptions);
          } catch (e) {
            console.warn('Error removing cookie in API context:', e);
          }
        },
      },
    },
  );
}

/**
 * Utility function to check if a user is authenticated in API routes
 * Returns the authenticated user if present, or throws an error if not
 */
export async function requireAuth() {
  const supabase = await createApiClient();
  
  // Use getUser() instead of getSession() for better security as recommended by Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('Error getting authenticated user:', userError);
    throw new Error('Authentication error');
  }
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  return { supabase, user };
}
