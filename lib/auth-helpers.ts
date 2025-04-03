import { createSessionHook } from '@/types/auth';
import { getServerSession } from './auth-server';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// Store for auth-related functions and state
let _authStore: { 
  authInstance: any | null;
  initialized: boolean;
} = {
  authInstance: null,
  initialized: false,
};

// Safely initialize the auth module for client-side use
const initializeAuth = () => {
  // Only initialize once
  if (!_authStore.initialized) {
    try {
      // Use dynamic import for client components
      const AuthProvider = require('@/components/auth/AuthProvider');
      _authStore.authInstance = AuthProvider.getAuthInstance ? 
        AuthProvider.getAuthInstance() : 
        { session: null, loading: false, signInWithGoogle: async () => {}, signOut: async () => {} };
      _authStore.initialized = true;
    } catch (error) {
      // Fallback for server-side rendering
      _authStore.authInstance = { 
        session: null, 
        loading: false, 
        signInWithGoogle: async () => {}, 
        signOut: async () => {}, 
      };
      _authStore.initialized = true;
    }
  }
  
  return _authStore.authInstance;
};

/**
 * Hook for accessing session data with a compatible interface
 * Only use this hook in client components
 */
export const useSession = createSessionHook(() => {
  const { useAuth } = require('@/components/auth/AuthProvider');
  return useAuth();
});

/**
 * Sign in function compatible with previous implementation
 * @param provider The auth provider to use (currently only supports 'google')
 */
export const signIn = async (provider: string) => {
  // Get the auth instance without using hooks
  const auth = initializeAuth();
  
  if (provider === 'google') {
    await auth.signInWithGoogle();
    return { ok: true, error: null };
  }
  
  return { ok: false, error: 'Provider not supported' };
};

/**
 * Sign out function compatible with previous implementation
 */
export const signOut = async () => {
  // Get the auth instance without using hooks
  const auth = initializeAuth();
  await auth.signOut();
  return { ok: true };
};

// Re-export the server-side function for convenience
export { getServerSession };

/**
 * Ensures a user record exists in our users table for an authenticated user
 * Creates the record if it doesn't exist yet
 * @param userId The user's ID from Supabase
 * @param userEmail The user's email
 * @param metadata Optional additional metadata for the user
 */
export async function ensureUserRecord(userId: string, userEmail: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
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
          // Remove the updated_at field as it doesn't exist in the users table
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
