import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// For client components - works in both App Router and Pages Router
export const createBrowserSupabaseClient = () => 
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );

// For direct API access with proper cookie handling
export const createDirectClient = (cookies?: RequestInit['headers'] | { cookie?: string }) => {
  // Extract cookie string from various possible formats
  let cookieString = '';
  
  if (cookies) {
    if (typeof cookies === 'object' && 'cookie' in cookies && cookies.cookie) {
      cookieString = cookies.cookie;
    } else if (typeof cookies === 'object' && cookies.hasOwnProperty('Cookie')) {
      cookieString = (cookies as Record<string, string>)['Cookie'];
    }
  }
  
  // Only include Cookie header if we have a value
  const headers: Record<string, string> = {};
  if (cookieString) {
    headers['Cookie'] = cookieString;
  }
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers
      },
    },
  );
};
