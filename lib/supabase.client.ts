/**
 * Supabase Client for Browser Environments
 * 
 * ⚠️ This file is specifically for client components (browser only).
 * This file does NOT use `next/headers` and is safe to import in client components.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { getRequiredEnvVar } from './supabase.shared';

// Global browser client singleton to prevent multiple instances
let browserClientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a Supabase client for browser environments
 * For client components only
 * @returns A singleton Supabase client for browser use
 */
export const createSupabaseClient = () => {
  // Check if we're running in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Always use the singleton in browser context
  if (isBrowser) {
    if (browserClientSingleton) {
      return browserClientSingleton;
    }
    
    try {
      const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
      const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      browserClientSingleton = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
      return browserClientSingleton;
    } catch (error) {
      console.error('Error creating browser Supabase client:', error);
      throw error;
    }
  }
  
  // If we're in a server context, return a placeholder client that will
  // safely error when used, but won't throw during initialization
  console.warn('createSupabaseClient() called during server rendering - returning safe placeholder');
  
  // Create a proxy object that looks like a Supabase client but safely errors when methods are called
  const safeErrorProxy = new Proxy({}, {
    get: (target, prop) => {
      // Return auth object with safe methods
      if (prop === 'auth') {
        return {
          getUser: async () => ({ data: { user: null }, error: new Error('Client-side auth method called during SSR') }),
          getSession: async () => ({ data: { session: null }, error: new Error('Client-side auth method called during SSR') }),
          signInWithOAuth: async () => ({ data: null, error: new Error('Client-side auth method called during SSR') }),
          signOut: async () => ({ error: new Error('Client-side auth method called during SSR') }),
          onAuthStateChange: () => ({ 
            data: { subscription: { unsubscribe: () => {} } },
            error: null
          })
        };
      }
      
      // For other properties, return a function that safely errors
      if (typeof prop === 'string' || typeof prop === 'symbol') {
        return () => {
          const error = new Error(`Attempted to use Supabase client method '${String(prop)}' during server rendering`);
          console.error(error);
          return { data: null, error };
        };
      }
      return undefined;
    }
  });
  
  return safeErrorProxy as ReturnType<typeof createBrowserClient<Database>>;
};