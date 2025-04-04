/**
 * Universal hook for accessing the authenticated user
 * This hook provides a consistent way to access user state across all client components
 */
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase.client';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Hook to access the currently authenticated user
 * Uses AuthProvider context first for efficiency, falling back to direct Supabase query
 * when needed
 * 
 * @returns The authenticated user or null if not authenticated
 */
export const useUser = (): { 
  user: User | null;
  isLoading: boolean;
  error: Error | null;
} => {
  // First try to get user from AuthProvider context
  // This is more efficient as it prevents duplicate auth queries
  try {
    const { user, isLoading } = useAuth();
    return { user, isLoading, error: null };
  } catch (error) {
    // If AuthProvider isn't available (like in a standalone component),
    // continue with direct Supabase query logic below
  }

  // Fallback implementation when AuthProvider isn't available
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const supabase = createSupabaseClient();
        const { data, error: supabaseError } = await supabase.auth.getUser();
        
        if (supabaseError) {
          throw supabaseError;
        }
        
        setUser(data.user);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, isLoading, error };
};

/**
 * Hook to check if a user is authenticated
 * Simpler version that just returns a boolean value
 * 
 * @returns True if a user is authenticated, false otherwise
 */
export const useIsAuthenticated = (): { 
  isAuthenticated: boolean; 
  isLoading: boolean 
} => {
  const { user, isLoading } = useUser();
  return { 
    isAuthenticated: !!user, 
    isLoading 
  };
};