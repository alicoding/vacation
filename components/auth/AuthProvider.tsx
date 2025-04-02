'use client';

import { createBrowserSupabaseClient } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { Database } from '@/types/supabase';

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: (callbackUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maintain a global reference to the auth context for non-React access
let globalAuthContext: AuthContextType | null = null;

/**
 * Get the auth instance outside of React components
 * Used by auth-helpers.ts for backward compatibility
 */
export function getAuthInstance(): AuthContextType {
  if (!globalAuthContext) {
    throw new Error('Auth context not initialized. Make sure AuthProvider is rendered.');
  }
  return globalAuthContext;
}

interface AuthProviderProps {
  children: React.ReactNode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function AuthProvider({ 
  children, 
  supabaseUrl,
  supabaseAnonKey
}: AuthProviderProps) {
  // Use createBrowserSupabaseClient which now implements singleton pattern
  // This prevents multiple GoTrueClient instances
  const [supabase] = useState(() => createBrowserSupabaseClient());
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const refreshing = useRef(false);
  const lastAuthEvent = useRef<string | null>(null);
  const lastAuthTime = useRef<number>(0);
  const authInitialized = useRef(false);
  
  // Initialize auth state - use a consistent approach with getUser
  const initializeAuth = useCallback(async () => {
    if (authInitialized.current) return;
    
    try {
      setIsLoading(true);
      
      // Always use getUser() first for security as recommended by Supabase
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && userData) {
        setUser(userData);
        setIsAuthenticated(true);
        
        // Then get session for access tokens
        const { data: { session: sessionData } } = await supabase.auth.getSession();
        setSession(sessionData);
        
        console.log('Initial session found for user:', userData?.email);
      } else {
        console.log('No authenticated user found');
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      }
      
      authInitialized.current = true;
    } catch (error) {
      console.error('Error initializing auth state:', error);
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  
  useEffect(() => {
    // Initialize auth state on mount
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const now = Date.now();
        
        // Prevent handling duplicate events (Supabase sometimes sends multiple events)
        if (
          lastAuthEvent.current === event && 
          lastAuthTime.current > 0 && 
          now - lastAuthTime.current < 2000
        ) {
          console.log('Ignoring duplicate auth event:', event);
          return;
        }
        
        // Update the last event tracking
        lastAuthEvent.current = event;
        lastAuthTime.current = now;
        
        console.log('Auth state changed:', event, newSession?.user?.email || 'No user');
        
        if (event === 'SIGNED_OUT') {
          // Handle sign out specifically
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // For significant auth events with a session, verify with getUser
          try {
            const { data: { user: verifiedUser } } = await supabase.auth.getUser();
            if (verifiedUser) {
              setUser(verifiedUser);
              setSession(newSession);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Error getting verified user:', error);
            setUser(null);
            setSession(null);
            setIsAuthenticated(false);
          } finally {
            setIsLoading(false);
          }
        } else if (newSession) {
          // For any other event with a session, just update the session
          setSession(newSession);
        }
        
        // Only refresh the router for significant auth state changes
        // that require UI updates
        if (
          ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event) && 
          !refreshing.current
        ) {
          refreshing.current = true;
          setTimeout(() => {
            try {
              // Only refresh the router for actual auth state changes
              router.refresh();
            } catch (error) {
              console.warn('Error refreshing router:', error);
            } finally {
              // Reset after a longer delay to prevent cascading refreshes
              setTimeout(() => {
                refreshing.current = false;
              }, 2000);
            }
          }, 100);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, initializeAuth]);

  const signInWithGoogle = async (callbackUrl?: string) => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/calendar',
          redirectTo: `${window.location.origin}/auth/callback${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`,
        },
      });
    } catch (error) {
      console.error('Error during Google sign in:', error);
      // Fallback to basic redirect if the OAuth flow fails
      window.location.href = '/auth/signin';
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Force a hard navigation to clear any stale state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      router.push('/');
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signInWithGoogle,
    signOut,
  };
  
  // Update the global context reference whenever the value changes
  // This allows non-React code to access the current auth state
  useEffect(() => {
    globalAuthContext = value;
    return () => {
      // Clear the global reference when the component unmounts
      // This prevents stale references
      if (globalAuthContext === value) {
        globalAuthContext = null;
      }
    };
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
