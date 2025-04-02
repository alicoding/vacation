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

/**
 * Safely retrieves environment variables with fallbacks for browser contexts
 * This approach ensures type safety and edge compatibility
 */
const getRequiredEnvVar = (name: string): string => {
  // Check for browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Handle environment variables differently in browser vs server
  let value: string | undefined = process.env[name];
  
  // In browser context with missing env var, use fallbacks for known variables
  if (!value && isBrowser) {
    if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
      console.warn(`Using fallback for ${name} - ensure environment variable is properly set`);
      return SUPABASE_DEFAULTS.url;
    }
    if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      console.warn(`Using fallback for ${name} - ensure environment variable is properly set`);
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
 */
export const createBrowserSupabaseClient = () => {
  try {
    const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error creating browser Supabase client:', error);
    
    // In development, this helps debug environment variable issues
    console.warn('Ensure .env.local contains the required Supabase environment variables:');
    console.warn('- NEXT_PUBLIC_SUPABASE_URL');
    console.warn('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // Re-throw so the error is visible
    throw error;
  }
};

/**
 * For direct API access with proper cookie handling
 * Works in both client and server environments
 */
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
  
  try {
    const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    return createClient<Database>(
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
  } catch (error) {
    if (typeof window !== 'undefined') {
      // In client-side context, log the error but continue with fallbacks
      console.error('Error creating direct Supabase client:', error);
      
      // Create client with fallback values
      return createClient<Database>(
        SUPABASE_DEFAULTS.url,
        SUPABASE_DEFAULTS.anonKey,
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers
          },
        }
      );
    }
    
    // Re-throw in server context
    throw error;
  }
};
