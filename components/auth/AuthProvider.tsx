'use client';

import { createSupabaseClient } from '@/lib/supabase.client';
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
  supabaseAnonKey,
}: AuthProviderProps) {
  // Use createSupabaseClient which now implements singleton pattern
  // This prevents multiple GoTrueClient instances
  const [supabase] = useState(() => createSupabaseClient());
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const refreshing = useRef(false);
  const lastAuthEvent = useRef<string | null>(null);
  const lastAuthTime = useRef<number>(0);
  const authInitialized = useRef(false);
  
  // Initialize auth state using getUser first, then getSession
  const initializeAuth = useCallback(async () => {
    if (authInitialized.current) return;
    
    try {
      setIsLoading(true);
      console.log('Initializing auth state'); // Debugging
      
      // First check if we have a server-provided session
      const serverSession = (window as any).__INITIAL_AUTH_SESSION__;
      if (serverSession?.user) {
        console.log('Found server-provided session for:', serverSession.user.email);
      }
      
      // Get session first - this is safer for client components
      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && sessionData?.user) {
        // We have a session with user, set auth state
        console.log('Session found with user:', sessionData.user.email);
        setUser(sessionData.user);
        setSession(sessionData);
        setIsAuthenticated(true);
        
        // Still verify with getUser for security, but don't block UI
        try {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser();
          if (verifiedUser) {
            // Update with verified user data
            console.log('User verified with getUser:', verifiedUser.email);
            setUser(verifiedUser);
          }
        } catch (verifyError) {
          console.warn('Non-blocking verification error:', verifyError);
          // Continue with session user data
        }
      } else if (serverSession?.user) {
        // Fallback to server-provided session
        console.log('Using server session as fallback for:', serverSession.user.email);
        setUser(serverSession.user);
        setSession(serverSession);
        setIsAuthenticated(true);
      } else {
        console.log('No authenticated user found');
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      }
      
      authInitialized.current = true;
    } catch (error) {
      console.error('Error initializing auth state:', error);
      // Don't reset state if we already have a user (helps prevent flickering)
      if (!user) {
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);
  
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
          // For significant auth events with a session, verify the user first
          try {
            setIsLoading(true);
            
            // Always verify the user with getUser() first for security
            const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
            
            if (!userError && verifiedUser) {
              // Get session for access tokens after verifying user
              const { data: { session: verifiedSession } } = await supabase.auth.getSession();
              
              setUser(verifiedUser);
              setSession(verifiedSession || newSession);
              setIsAuthenticated(true);
              console.log('Auth event verified user:', verifiedUser.email);
            } else if (newSession?.user) {
              // Fall back to session from event only if verification fails
              console.warn('Using unverified session user as fallback');
              setUser(newSession.user);
              setSession(newSession);
              setIsAuthenticated(true);
            } else {
              console.warn('Auth event had no verifiable user');
              // Only reset if we don't already have a user
              if (!user) {
                setUser(null);
                setSession(null);
                setIsAuthenticated(false);
              }
            }
          } catch (error) {
            console.error('Error handling auth state change:', error);
            // Don't reset user state on error if we already have data
            if (!user && !session) {
              setUser(null);
              setSession(null);
              setIsAuthenticated(false);
            }
          } finally {
            setIsLoading(false);
          }
        } else if (newSession?.user) {
          // For any other event with a user, verify the user first
          try {
            // Always verify user credentials securely
            const { data: { user: verifiedUser } } = await supabase.auth.getUser();
            if (verifiedUser) {
              setUser(verifiedUser);
              setSession(newSession);
              setIsAuthenticated(true);
            } else {
              // Use session user as fallback
              setUser(newSession.user);
              setSession(newSession);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Error verifying user for event:', event, error);
            // Still use the session user as a fallback
            setUser(newSession.user);
            setSession(newSession);
            setIsAuthenticated(true);
          }
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
      // Get the current origin for more flexible redirect URLs
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
      
      console.log('Signing in with Google, redirect URL:', redirectUrl);
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/calendar',
          redirectTo: redirectUrl,
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
