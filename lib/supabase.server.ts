/**
 * Supabase Client for Server Environments
 *
 * ⚠️ WARNING:
 * This file uses `import { cookies } from 'next/headers'` which is only supported in Server Components.
 * Do NOT import this file in Client Components or files under the `pages/` directory.
 * See: https://nextjs.org/docs/app/building-your-application/rendering/server-components
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Removed SupabaseClient import from here
import { type SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient from the correct package
import type { Database } from '@/types/supabase';
import { cookies } from 'next/headers'; // Keep cookies import, remove ReadonlyRequestCookies

// Define the resolved type using Awaited
type ResolvedCookieStore = Awaited<ReturnType<typeof cookies>>;
import {
  getRequiredEnvVar,
  createDirectClient,
  SupabaseClientType, // Add trailing comma
} from './supabase.shared';

/**
 * Creates a Supabase client for server components (App Router only).
 * Requires an *already resolved* cookie store.
 * ❗ Do not use this directly in most cases, prefer `createAuthedServerClient`.
 * @param cookieStore - The resolved Next.js cookies object from `await cookies()`
 * @returns A Supabase client configured with cookie handling
 */
// Use the derived resolved type
export const createSupabaseServerClient = (
  cookieStore: ResolvedCookieStore,
): SupabaseClient<Database> => {
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Use the passed-in cookieStore (already resolved)
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure path is always set
            const cookieOptions = { ...options, path: '/' };
            // Handle sameSite boolean conversion if necessary
            if (cookieOptions.sameSite === true)
              cookieOptions.sameSite = 'strict';
            if (cookieOptions.sameSite === false)
              cookieOptions.sameSite = 'lax';
            // Use the passed-in cookieStore's set method
            cookieStore.set(name, value, cookieOptions);
          });
        } catch (error) {
          // The `setAll` method may fail in Server Components.
          // This can be ignored if you have middleware refreshing sessions.
          console.warn(
            'Error setting cookies via Supabase server client (setAll):',
            error,
          );
        }
      },
    },
  });
};

/**
 * Creates a Supabase client for middleware
 * @param req - NextRequest object
 * @param res - NextResponse object
 * @returns A Supabase client configured for middleware
 */
export const createSupabaseMiddlewareClient = (req: any, res: any) => {
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Read cookies from the request object
        return req.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        // Set cookies on the response object
        cookiesToSet.forEach(({ name, value, options }) => {
          // Ensure path is always set for middleware cookies
          const cookieOptions = { ...options, path: '/' };
          // Handle sameSite boolean conversion if necessary
          if (cookieOptions.sameSite === true)
            cookieOptions.sameSite = 'strict';
          if (cookieOptions.sameSite === false) cookieOptions.sameSite = 'lax';
          res.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });
};

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(
  asyncFn: (client: SupabaseClientType) => Promise<T>,
): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Database queries must be run on the server. ' +
        'Use server components, server actions, or API routes.',
    );
  }

  return asyncFn(createDirectClient());
}

/**
 * Creates an authenticated Supabase client for server-side usage (Server Components, Route Handlers, Server Actions)
 * by automatically handling async cookies.
 * This is the preferred way to get a server client in the App Router.
 */
export const createAuthedServerClient = async (): Promise<
  SupabaseClient<Database>
> => {
  const cookieStore = await cookies(); // Await cookies here
  return createSupabaseServerClient(cookieStore); // Pass resolved store
};

// Re-export createDirectClient for convenience
export { createDirectClient };
