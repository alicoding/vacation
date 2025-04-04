import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Type for consistent Supabase client usage with specific schema typing
export type SupabaseClientType = SupabaseClient<Database, 'public', Database['public']>;

/**
 * Safely retrieves environment variables with fallbacks for browser contexts
 */
export const getRequiredEnvVar = (name: string): string => {
  // Check for browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // For client-side Next.js, we need to use NEXT_PUBLIC_ prefixed variables
  const value = isBrowser 
    ? (window as any).__ENV__?.[name] || process.env[name]
    : process.env[name];
  
  // In browser context with missing env var, use fallbacks for known variables
  if (!value && isBrowser) {
    if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
      return 'https://ncgjvozaempugyiqbfxo.supabase.co';
    }
    if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ2p2b3phZW1wdWd5aXFiZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NTg3MDcsImV4cCI6MjA1ODUzNDcwN30.cNs2cD2iCZGzzYngBW3MrDAVF-p5nJz4ngyytzmFbUg';
    }
  }
  
  // Still throw error if no value found (important for server context)
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  
  return value;
};

// Global direct client singleton to prevent multiple instances
let directClientSingleton: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Creates a direct Supabase client for API routes and edge functions
 * @param cookies - Optional cookies to include in the request
 * @returns A Supabase client for direct API access
 */
export const createDirectClient = (cookies?: any) => {
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
    console.error('Error creating direct Supabase client:', error);
    throw error;
  }
};

/**
 * Create a service role client for admin operations (bypasses RLS)
 * @returns A Supabase client with service role privileges
 */
export const createServiceClient = () => {
  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('Service role key is not defined!');
    // Fallback to regular client if service key is not available
    const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
  );
};