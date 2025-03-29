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
export const createDirectClient = (cookies?: RequestInit['headers'] | { cookie?: string }) => 
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      auth: {
        persistSession: false,
      },
      cookies: {
        get(name: string) {
          if (!cookies) return '';
          
          // Handle different cookie formats
          let cookieString = '';
          
          if (typeof cookies === 'object' && 'cookie' in cookies) {
            // Handle format from request.headers.get('cookie')
            cookieString = cookies.cookie || '';
          } else if (typeof cookies === 'string') {
            // Handle direct string format (for when cookie header is passed directly)
            cookieString = cookies;
          } else if (typeof cookies === 'object') {
            // Handle standard headers object format
            cookieString = (cookies as Record<string, string>)['cookie'] || '';
          }
          
          if (!cookieString) return '';
          
          // Parse the cookie
          const match = cookieString
            .split(';')
            .find((c) => c.trim().startsWith(`${name}=`));
            
          if (match) {
            return match.split('=')[1];
          }
          
          return '';
        },
      },
    },
  );
