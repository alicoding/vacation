/**
 * Supabase Client for Browser Environments
 * 
 * ⚠️ This file is specifically for client components (browser only).
 * This file does NOT use `next/headers` and is safe to import in client components.
 */
import { createBrowserClient } from '@supabase/ssr'; // Restore ssr import
// import { createClient } from '@supabase/supabase-js'; // Remove base client import
import type { Database } from '@/types/supabase';
import { getRequiredEnvVar } from './supabase.shared';

// Global browser client singleton to prevent multiple instances
let browserClientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null; // Restore type

/**
 * Creates a Supabase client for browser environments
 * For client components only
 * @returns A singleton Supabase client for browser use
 */
export const createSupabaseClient = () => {
  // Check if we're running in a browser environment
  const isBrowser = typeof window !== 'undefined';
  console.log('[createSupabaseClient] Environment check:', { isBrowser }); // Add log
  
  // Always use the singleton in browser context
  if (isBrowser) {
    if (browserClientSingleton) {
      console.log('[createSupabaseClient] Returning existing browser singleton'); // Add log
      return browserClientSingleton;
    }
    
    try {
      const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
      const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      // Restore createBrowserClient
      browserClientSingleton = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
      console.log('[createSupabaseClient] Created NEW browser singleton'); // Restore log
      return browserClientSingleton;
    } catch (error) {
      console.error('Error creating browser Supabase client:', error);
      throw error;
    }
  }
  
  // If we're in a server context, return a placeholder client that will
  // safely error when used, but won't throw during initialization
  console.warn('createSupabaseClient() called during server rendering - returning safe placeholder');
  // console.log('[createSupabaseClient] Returning SSR placeholder proxy'); // Keep this log commented/removed if desired
  
  // Create a proxy object that looks like a Supabase client but safely errors when methods are called
  // When using createClient directly, the SSR proxy logic might need adjustment or removal
  // For now, let's keep it but adjust the return type
  // NOTE: This proxy might not perfectly mimic the base client's behavior in SSR
  const safeErrorProxy = new Proxy({}, {
    get: (target, prop) => {
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
  
  return safeErrorProxy as ReturnType<typeof createBrowserClient<Database>>; // Restore return type
};