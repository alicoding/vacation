/**
 * This file provides a Supabase client for server-side operations.
 * It should only be imported from server components, API routes,
 * or server actions. Never import this directly in client components.
 */
import { createDirectClient } from '@/utils/supabase';

// Export the client for easy access
export const supabase = createDirectClient();

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(asyncFn: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Database queries must be run on the server. ' +
      'Use server components, server actions, or API routes.'
    );
  }
  
  return asyncFn();
}