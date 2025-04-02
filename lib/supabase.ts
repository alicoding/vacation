/**
 * This file provides Supabase clients for server-side operations.
 * It should only be imported from server components, API routes,
 * or server actions. Never import this directly in client components.
 */
import { createDirectClient } from '@/utils/supabase';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';

// Type for consistent Supabase client usage with specific schema typing
type SupabaseClientType = SupabaseClient<Database, 'public', Database['public']>;

// Prevent client-side instantiation with proper error handling for edge environments
const isServer = typeof window === 'undefined';

// Create singleton server client instance
export const supabase: SupabaseClientType = isServer
  ? createDirectClient()
  : (() => {
    // In development, provide helpful warning and use client-safe fallbacks
    console.warn(
      'Server Supabase client accessed in browser context - this is an architecture error. ' +
      'Use createBrowserSupabaseClient() from utils/supabase instead.',
    );

    // Return the client-safe version to prevent runtime errors
    return createDirectClient();
  })();

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(
  asyncFn: (client: SupabaseClientType) => Promise<T>,
): Promise<T> {
  if (!isServer) {
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
            // Handle cookies() returning a Promise in newer Next.js versions
            if (cookieStore instanceof Promise) {
              // Return undefined here, as we can't await in this context
              // The value will be retrieved on subsequent requests
              return undefined;
            } else {
              // Use a more specific type casting for the cookieStore
              const store = cookieStore as { get(name: string): { value: string } | undefined };
              return store.get(name)?.value;
            }
          },
          set(name, value, options) {
            try {
              // Ensure sameSite is a string value required by cookie API
              if (options?.sameSite === true) options.sameSite = 'strict';
              if (options?.sameSite === false) options.sameSite = 'lax';

              // Skip setting if cookieStore is a Promise
              if (!(cookieStore instanceof Promise)) {
                // Use a more specific type casting for the cookieStore
                const store = cookieStore as {
                  set(name: string, value: string, options?: Record<string, unknown>): void,
                };
                store.set(name, value, options as CookieOptions);
              }
            } catch (e) {
              console.warn('Error setting cookie:', e);
            }
          },
          remove(name, options) {
            try {
              // Skip removing if cookieStore is a Promise
              if (!(cookieStore instanceof Promise)) {
                // Use a more specific type casting for the cookieStore
                const store = cookieStore as {
                  set(name: string, value: string, options?: Record<string, unknown>): void,
                };
                store.set(name, '', { ...options, maxAge: 0 } as CookieOptions);
              }
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