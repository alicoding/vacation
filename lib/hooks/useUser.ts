/**
 * Universal hook for accessing the authenticated user
 * This hook provides a consistent way to access user state across all client components
 */
import { useEffect, useState, useContext } from 'react'; // Import useContext
import { User as SupabaseUser } from '@supabase/supabase-js'; // Rename Supabase User
import { User as CustomUser } from '@/types/auth'; // Import custom User type
import { createSupabaseClient } from '@/lib/supabase.client';
import { AuthContext } from '@/components/auth/AuthProvider'; // Import AuthContext directly

/**
 * Hook to access the currently authenticated user
 * Uses AuthProvider context first for efficiency, falling back to direct Supabase query
 * when needed
 *
 * @returns The authenticated user or null if not authenticated
 */
export const useUser = (): {
  user: CustomUser | null; // Use CustomUser type
  isLoading: boolean;
  error: Error | null;
} => {
  // Call hooks unconditionally at the top level
  const authContext = useContext(AuthContext);
  const [localUser, setLocalUser] = useState<CustomUser | null>(null); // Use CustomUser type
  const [localIsLoading, setLocalIsLoading] = useState<boolean>(
    !authContext.isAuthProvider,
  ); // Only load if no provider
  const [localError, setLocalError] = useState<Error | null>(null);

  useEffect(() => {
    // Only run fetch logic if AuthProvider is NOT present
    if (!authContext.isAuthProvider) {
      const fetchUser = async () => {
        try {
          setLocalIsLoading(true);
          const supabase = createSupabaseClient();
          const { data, error: supabaseError } = await supabase.auth.getUser();

          if (supabaseError) {
            throw supabaseError;
          }

          // Convert SupabaseUser to CustomUser before setting state
          const supabaseUser = data.user;
          const customUser: CustomUser | null = supabaseUser
            ? {
                id: supabaseUser.id,
                name:
                  supabaseUser.user_metadata?.full_name ||
                  supabaseUser.user_metadata?.name ||
                  supabaseUser.email?.split('@')[0] ||
                  null,
                email: supabaseUser.email || null,
                image: supabaseUser.user_metadata?.avatar_url || null,
                total_vacation_days:
                  supabaseUser.user_metadata?.total_vacation_days,
                province: supabaseUser.user_metadata?.province,
                employment_type: supabaseUser.user_metadata?.employment_type,
                week_starts_on: supabaseUser.user_metadata?.week_starts_on,
              }
            : null;
          setLocalUser(customUser);
        } catch (err) {
          console.error('Error fetching user (useUser fallback):', err);
          setLocalError(
            err instanceof Error ? err : new Error('Failed to fetch user'),
          );
        } finally {
          setLocalIsLoading(false);
        }
      };

      void fetchUser();
    }
    // No dependencies needed if we only run once when provider is absent
  }, [authContext.isAuthProvider]); // Re-run if provider presence changes (unlikely but correct)

  // Return context state if provider is available, otherwise local state
  if (authContext.isAuthProvider) {
    return {
      user: authContext.user,
      isLoading: authContext.isLoading,
      error: null, // Assume context handles its own errors
    };
  } else {
    return {
      user: localUser,
      isLoading: localIsLoading,
      error: localError,
    };
  }
};

/**
 * Hook to check if a user is authenticated
 * Simpler version that just returns a boolean value
 *
 * @returns True if a user is authenticated, false otherwise
 */
export const useIsAuthenticated = (): {
  isAuthenticated: boolean;
  isLoading: boolean;
} => {
  const { user, isLoading } = useUser();
  return {
    isAuthenticated: !!user,
    isLoading, // Add trailing comma
  };
};
