'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'; // Import useMemo
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase.client';
import { getRequiredEnvVar } from '@/lib/supabase.shared'; // Import helper
import type { Session as SupabaseSession } from '@supabase/supabase-js'; // Import SupabaseSession
import type { User as CustomUser } from '@/types/auth'; // Rename imported User to avoid conflict
import type { User as SupabaseUser } from '@supabase/supabase-js'; // Import SupabaseUser explicitly

// Auth timeout in milliseconds (10 seconds)
const AUTH_DETECTION_TIMEOUT = 10000;

interface AuthContextType {
  session: SupabaseSession | null; // Use SupabaseSession type
  user: CustomUser | null; // Use the renamed CustomUser type
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: (callbackUrl?: string) => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create a context with a default value
const AuthContext = createContext<AuthContextType>({
  session: null, // Default remains null
  user: null, // Default remains null
  isLoading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => { throw new Error('Not implemented'); },
  signOut: async () => { throw new Error('Not implemented'); },
  refreshSession: async () => { throw new Error('Not implemented'); },
});

// Create a provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createSupabaseClient());
  const [user, setUser] = useState<CustomUser | null>(null); // Use CustomUser type for state
  const [session, setSession] = useState<SupabaseSession | null>(null); // Use SupabaseSession type for state
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Initialize auth state
  // Helper function to convert SupabaseUser to CustomUser
  const convertUser = (supabaseUser: SupabaseUser | null): CustomUser | null => {
    if (!supabaseUser) return null;
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
      email: supabaseUser.email || null,
      image: supabaseUser.user_metadata?.avatar_url || null,
      total_vacation_days: supabaseUser.user_metadata?.total_vacation_days, // Keep undefined if not set
      province: supabaseUser.user_metadata?.province,
      employment_type: supabaseUser.user_metadata?.employment_type,
      week_starts_on: supabaseUser.user_metadata?.week_starts_on,
    };
  };

  const initializeAuth = useCallback(async () => {
    try {
      // Start auth detection timeout
      const timeoutId = setTimeout(() => {
        // Only force state resolution if still loading after timeout
        if (isLoading) {
          console.warn('Auth detection timeout reached while still loading - forcing state resolution to unauthenticated.');
          setUser(null); // Ensure user is null if timeout forces state
          setSession(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        } else {
          console.log('[AuthProvider] Timeout reached, but loading already finished. No state change forced.');
        }
      }, AUTH_DETECTION_TIMEOUT);

      // First check for user - this is more secure for authentication verification
      console.log('[AuthProvider] Calling supabase.auth.getUser()...');
      // console.log('[AuthProvider] Current document.cookie:', document.cookie); // Removed debug log
      const { data: userData, error: userError } = await supabase.auth.getUser();
      // console.log('[AuthProvider] getUser returned:', { user: userData?.user, userError }); // Removed debug log
      // console.log('[AuthProvider] getUser result:', { user: userData?.user, userError }); // Removed debug log

      if (userError) {
        console.error('Error checking authentication:', userError);
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        clearTimeout(timeoutId); // Restore timeout clearing
        setIsLoading(false);
        return;
      }
      
      if (userData.user) {
        setUser(convertUser(userData.user)); // Convert before setting state
        setIsAuthenticated(true);
        
        // Optionally get session for token info if needed
        const { data, error } = await supabase.auth.getSession();
        // console.log('[AuthProvider] getSession result:', { session: data?.session, error }); // Removed debug log
        if (error) {
          console.error('Error getting session:', error);
        } else if (data.session) {
          setSession(data.session);
        }
      } else {
        setUser(null); // Set to null if no user data
        setSession(null);
        setIsAuthenticated(false);
      }

      // Clear timeout as we've resolved auth state
      // console.log('[AuthProvider] Resolved auth state before timeout:', { isAuthenticated: !!userData?.user, user: userData?.user }); // Removed debug log
      clearTimeout(timeoutId); // Restore timeout clearing
      setIsLoading(false);
    } catch (error) {
      console.error('Unhandled error in auth initialization:', error);
      setUser(null); // Set to null on error
      setSession(null);
      setIsAuthenticated(false);
      // Ensure loading is false even on error, clear timeout if it exists
      // clearTimeout(timeoutId); // Timeout should be cleared within try if successful, or here if error
      setIsLoading(false);
    }
    // No finally block needed as isLoading is set in try/catch
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      await initializeAuth();
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initializeAuth]);

  // Set up auth state listener
  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // console.log('Auth state change:', event, !!newSession); // Can keep this if desired, or remove
        
        if (['SIGNED_OUT', 'USER_DELETED'].includes(event)) {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        // Handle SIGNED_IN slightly differently to avoid race condition with initializeAuth
        } else if (event === 'SIGNED_IN' && newSession) {
            // console.log('[AuthProvider] onAuthStateChange: SIGNED_IN event detected. Assuming initializeAuth will handle user fetch.'); // Removed debug log
            // We might still want to set the session object from the event
            setSession(newSession);
            // Don't call getUser here, let initializeAuth handle it to avoid race condition.
            // We also don't set isAuthenticated or user here, trusting initializeAuth.
            // We might need to reconsider setting isLoading false here, maybe only initializeAuth should do it?
            // For now, let's keep it, but be aware.
            // setIsLoading(false); // Let initializeAuth handle final isLoading state? Let's keep for now.

        // Handle other events that require fetching/updating user data
        } else if (['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && newSession) {
            // console.log(`[AuthProvider] onAuthStateChange: ${event} event. Calling getUser...`); // Removed debug log
            // Get full user data
            const { data: userData, error: userError } = await supabase.auth.getUser(); // Capture error too
            // console.log(`[AuthProvider] onAuthStateChange (${event}) -> getUser result:`, { user: userData?.user, userError }); // Removed debug log
            if (userError) {
              console.error(`[AuthProvider] onAuthStateChange (${event}): Error calling getUser:`, userError);
              // If getUser fails after refresh/update, maybe sign out? Or just log?
              // Let's just log for now, maybe the session is still valid enough.
            } else if (userData.user) {
              // console.log(`[AuthProvider] onAuthStateChange (${event}): Successfully got user data. Updating state.`); // Removed debug log
              setUser(convertUser(userData.user)); // Update user state
              setSession(newSession); // Update session state
              setIsAuthenticated(true); // Ensure authenticated
            } else {
               // console.warn(`[AuthProvider] onAuthStateChange (${event}): getUser returned no user data.`); // Removed debug log
               // Should we sign out here? If user is gone after update/refresh?
               setUser(null);
               setSession(null);
               setIsAuthenticated(false);
            }
        }
        
        // Ensure loading is set to false after handling the event
        // Avoid setting loading false if initial check is still running? Maybe not necessary.
        setIsLoading(false);
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, initializeAuth]); // Restore dependencies

  // Sign in with Google
  const signInWithGoogle = useCallback(async (callbackUrl = '/dashboard') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getRequiredEnvVar('NEXT_PUBLIC_SITE_URL')}/auth/callback?callbackUrl=${callbackUrl}`, // Use env var
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async (callbackUrl = '/') => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Reset auth state
      setUser(null); // Reset on sign out
      setSession(null);
      setIsAuthenticated(false);
      
      // Redirect after signout
      router.push(callbackUrl);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  // Memoize the context value to prevent unnecessary re-renders in consumers
  const contextValue = useMemo(() => ({
    session,
    user,
    isLoading,
    isAuthenticated,
    signInWithGoogle,
    signOut,
    refreshSession,
  }), [session, user, isLoading, isAuthenticated, signInWithGoogle, signOut, refreshSession]);

  // Provide auth context
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
