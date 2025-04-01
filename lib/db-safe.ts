/**
 * This file provides a safe way to access Supabase client in both Pages and App router
 * It dynamically imports the Supabase client only on the server side
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// This approach prevents client-side imports from failing
export async function getSupabaseClient(): Promise<SupabaseClient<Database, 'public', any>> {
  // Check if we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('Cannot use Supabase client directly in the browser');
  }
  
  // Dynamic import only happens on the server
  const { supabase } = await import('./supabase');
  return supabase as SupabaseClient<Database, 'public', any>;
}

// Helper for server components/actions to safely get the Supabase client
export async function withSupabase<T>(fn: (supabase: SupabaseClient<Database, 'public', any>) => Promise<T>): Promise<T> {
  const supabase = await getSupabaseClient();
  return fn(supabase);
}
