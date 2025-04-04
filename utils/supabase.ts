import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Hardcoded fallback values for client-side use
 * These are used only when environment variables are not available in the browser
 * and help prevent runtime errors without compromising edge compatibility
 */
const SUPABASE_DEFAULTS = {
  url: 'https://ncgjvozaempugyiqbfxo.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ2p2b3phZW1wdWd5aXFiZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NTg3MDcsImV4cCI6MjA1ODUzNDcwN30.cNs2cD2iCZGzzYngBW3MrDAVF-p5nJz4ngyytzmFbUg'
};

// Global browser client singleton to prevent multiple instances
let browserClientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Safely retrieves environment variables with fallbacks for browser contexts
 * This approach ensures type safety and edge compatibility
 */
const getRequiredEnvVar = (name: string): string => {
  // Check for browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // For client-side Next.js, we need to use NEXT_PUBLIC_ prefixed variables
  const value = isBrowser 
    ? (window as any).__ENV__?.[name] || process.env[name]
    : process.env[name];
  
  // In browser context with missing env var, use fallbacks for known variables
  if (!value && isBrowser) {
    if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
      return SUPABASE_DEFAULTS.url;
    }
    if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      return SUPABASE_DEFAULTS.anonKey;
    }
  }
  
  // Still throw error if no value found (important for server context)
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  
  return value;
};

/**
 * Creates a Supabase client for browser environments
 * Used in client components within the App Router
 * Returns a singleton instance to prevent multiple GoTrueClient warnings
 * 
 * Important: This function is intended for client components only.
 * It will return a safe placeholder in SSR context to prevent errors.
 */
export const createBrowserSupabaseClient = () => {
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
  // This helps with SSR and hydration without disrupting the component lifecycle
  console.warn('createBrowserSupabaseClient() called during server rendering - returning safe placeholder');
  
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

// Global direct client singleton to prevent multiple instances
let directClientSingleton: ReturnType<typeof createClient<Database>> | null = null;

/**
 * For direct API access with proper cookie handling
 * Works in both client and server environments
 * Returns a singleton instance in browser contexts
 */
export const createDirectClient = (cookies?: RequestInit['headers'] | { cookie?: string }) => {
  // In browser context without cookies, return the singleton if it exists
  if (typeof window !== 'undefined' && !cookies && directClientSingleton) {
    return directClientSingleton;
  }
  
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
  
  try {
    const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    const client = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers
        },
      },
    );
    
    // Store singleton in browser context if no custom cookies
    if (typeof window !== 'undefined' && !cookies) {
      directClientSingleton = client;
    }
    
    return client;
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error('Error creating direct Supabase client:', error);
      throw error;
    }
    
    // Re-throw in server context
    throw error;
  }
};
