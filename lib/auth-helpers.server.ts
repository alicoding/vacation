/**
 * Server-side authentication helpers
 * 
 * ⚠️ WARNING:
 * This file uses `cookies` from 'next/headers', which is only supported in Server Components (App Router).
 * Do NOT import or use this file inside Client Components or `pages/` directory files.
 * Intended for server-only logic in the App Router.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { createDirectClient } from '@/lib/supabase.shared';
import type { Database } from '@/types/supabase';
import type { User } from '@/types/auth';
import { getServerSession as originalGetServerSession } from './auth-server';

/**
 * Retrieves the current session from cookies.
 * ❗ Server-only function. Do not use in Client Components or `pages/` directory.
 */
export async function getCurrentSession() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Retrieves the current authenticated user from session.
 * ❗ Server-only function. Do not use in Client Components or `pages/` directory.
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user || null;
}

/**
 * Requires the user to be authenticated.
 * ❗ Server-only function. Do not use in Client Components or `pages/` directory.
 * @param redirectTo The path to redirect to if not authenticated (defaults to /auth/signin)
 * @returns The authenticated user
 */
export async function requireAuth(redirectTo = '/auth/signin') {
  const session = await getCurrentSession();
  
  if (!session) {
    redirect(redirectTo);
  }
  
  return session.user;
}

/**
 * Checks whether the user is authenticated.
 * ❗ Server-only function. Do not use in Client Components or `pages/` directory.
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Re-export with a more descriptive name for consistency
 */
export const getServerSession = originalGetServerSession;

/**
 * Ensures a user record exists in our users table for an authenticated user
 * Creates the record if it doesn't exist yet
 * @param userId The user's ID from Supabase
 * @param userEmail The user's email
 * @param metadata Optional additional metadata for the user
 */
export async function ensureUserRecord(userId: string, userEmail: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createDirectClient();
    // Check if the user already exists in our users table
    const { data: _existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId as any)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist, create a new record
      console.warn(`Creating new user record for ${userEmail}`);
      
      // Extract province from metadata if available or use default
      // Ensure province is a string
      const province = typeof metadata?.province === 'string' 
        ? metadata.province 
        : 'ON';
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          province: province,
          created_at: new Date().toISOString(),
        } as any);
      
      if (insertError) {
        console.error('Error creating user record:', insertError);
      }
    } else if (checkError) {
      console.error('Error checking for existing user:', checkError);
    }
  } catch (error) {
    console.error('Error in ensureUserRecord:', error);
  }
}