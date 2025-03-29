/**
 * This file provides a Supabase client for server-side operations.
 * It should only be imported from server components, API routes,
 * or server actions. Never import this directly in client components.
 */
import { createDirectClient } from '@/utils/supabase';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';

// Export the client for easy access
export const supabase = createDirectClient();

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(
  asyncFn: (client: SupabaseClient<Database>) => Promise<T>,
): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Database queries must be run on the server. ' +
      'Use server components, server actions, or API routes.',
    );
  }
  
  return asyncFn(supabase);
}

/**
 * Creates a Supabase client for Edge API routes with proper cookie handling
 * This works in both App Router and Pages Router
 */
export async function createEdgeAuthClient(request?: Request) {
  let cookieHandler;
  
  if (request) {
    // If a request object is provided, use its cookies
    const cookieHeader = request.headers.get('cookie') || '';
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            if (!cookieHeader) return undefined;
            
            const match = cookieHeader
              .split(';')
              .find((c) => c.trim().startsWith(`${name}=`));
            
            if (match) {
              return match.split('=')[1];
            }
            
            return undefined;
          },
          set(name, value, options) {
            // In request mode we can't set cookies, this is just to satisfy the interface
            console.warn('Cannot set cookies in request mode');
          },
          remove(name, options) {
            // In request mode we can't remove cookies, this is just to satisfy the interface
            console.warn('Cannot remove cookies in request mode');
          },
        },
      },
    );
  }
  
  // Only import cookies() when needed to avoid static import errors
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    
    return createServerClient<Database>(
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
              
              cookieStore.set(name, value, options as CookieOptions);
            } catch (e) {
              console.warn('Error setting cookie:', e);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 } as CookieOptions);
            } catch (e) {
              console.warn('Error removing cookie:', e);
            }
          },
        },
      },
    );
  } catch (e) {
    // Fall back to direct client if cookies() is not available (e.g., in Pages Router)
    console.warn('Cookies API not available, falling back to direct client');
    return createDirectClient();
  }
}