/**
 * This file should only be imported from server components, API routes,
 * or server actions. Never import this directly in client components.
 * It provides a unified interface for database operations with Supabase.
 */

import { supabase } from './supabase';
import * as supabaseUtils from './supabase-utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Type for consistent Supabase client usage
type SupabaseClientType = SupabaseClient<Database, 'public', any>;

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(asyncFn: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Database queries must be run on the server. ' +
      'Use server components, server actions, or API routes.',
    );
  }
  
  return asyncFn();
}

// Re-export Supabase utility functions
export const db = {
  findFirst: <T>(table: string, where?: Record<string, any>) => 
    supabaseUtils.findFirst<T>(supabase as SupabaseClientType, table, where),
  
  findMany: <T>(table: string, options?: Parameters<typeof supabaseUtils.findMany>[2]) => 
    supabaseUtils.findMany<T>(supabase as SupabaseClientType, table, options),
  
  create: <T>(table: string, data: Record<string, any>) => 
    supabaseUtils.create<T>(supabase as SupabaseClientType, table, data),
  
  update: <T>(table: string, options: Parameters<typeof supabaseUtils.update>[2]) => 
    supabaseUtils.update<T>(supabase as SupabaseClientType, table, options),
  
  delete: <T>(table: string, where: Record<string, any>) => 
    supabaseUtils.remove<T>(supabase as SupabaseClientType, table, where),
  
  // Direct access to Supabase client if needed
  supabase: supabase as SupabaseClientType,
};
