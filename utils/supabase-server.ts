import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// For server components in App Router only
export const createServerClient = (cookieStore = cookies()) => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return (await cookieStore).get(name)?.value;
        },
        set: async (name, value, options) => {
          (await cookieStore).set(name, value, options);
        },
        remove: async (name, options) => {
          (await cookieStore).set(name, '', { ...options, maxAge: 0 });
        },
      },
    },
  );
};

// Create a service role client for admin operations (bypasses RLS)
export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    console.error('Service role key is not defined!');
    // Fallback to regular client if service key is not available
    return createSupabaseClient<Database>(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
  );
};
