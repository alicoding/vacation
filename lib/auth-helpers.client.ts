/**
 * Client-side authentication helpers
 * 
 * This file contains authentication utilities for client components only.
 * Safe to use in both client components and pages directory.
 */
import { createSessionHook } from '@/types/auth';
import { createDirectClient } from '@/lib/supabase.shared';

// Auth store for client-side state
let _authStore: { 
  authInstance: any | null;
  initialized: boolean;
} = {
  authInstance: null,
  initialized: false,
};

/**
 * Safely initialize the auth module for client-side use
 * Provides a non-hook way to access auth state
 */
export const initializeAuth = () => {
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

/**
 * Create a safe version of the Supabase client for browser environments
 * This is a utility function for direct client access when needed
 */
export const getSupabaseClient = () => {
  return createDirectClient();
};