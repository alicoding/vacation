/**
 * Supabase Client for Server Environments
 * 
 * ⚠️ WARNING:
 * This file uses `import { cookies } from 'next/headers'` which is only supported in Server Components.
 * Do NOT import this file in Client Components or files under the `pages/` directory.
 * See: https://nextjs.org/docs/app/building-your-application/rendering/server-components
 */
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  getRequiredEnvVar, 
  createDirectClient,
  SupabaseClientType 
} from './supabase.shared';

/**
 * Creates a Supabase client for server components (App Router only).
 * ❗ Do not use this in the `pages/` directory or client components.
 * @param cookieStore - The Next.js cookies object from `next/headers`
 * @returns A Supabase client configured with cookie handling
 */
export const createSupabaseServerClient = (cookieStore = cookies()) => {
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: async (name: string) => {
          return (await cookieStore).get(name)?.value;
        },
        set: async (name: string, value: string, options?: CookieOptions) => {
          (await cookieStore).set(name, value, options as any);
        },
        remove: async (name: string, options?: CookieOptions) => {
          (await cookieStore).set(name, '', { ...options, maxAge: 0 } as any);
        },
      },
    },
  );
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
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    },
  );
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

// Re-export createDirectClient for convenience
export { createDirectClient };