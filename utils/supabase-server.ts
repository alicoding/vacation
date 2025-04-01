import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Validate required environment variables
const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
};

// For server components in App Router only
export const createServerClient = (cookieStore = cookies()) => {
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('Service role key is not defined!');
    // Fallback to regular client if service key is not available
    const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }
  
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
  );
};
