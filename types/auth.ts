import type {
  Session as SupabaseSession,
  User as SupabaseUser,
} from '@supabase/supabase-js';

/**
 * Session interface compatible with components that expect next-auth-like sessions
 */
export interface Session {
  user: User;
  expires: string;
}

/**
 * User interface compatible with components that expect next-auth-like users
 */
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  // Optional custom fields
  total_vacation_days?: number;
  province?: string;
  employment_type?: string;
  week_starts_on?: string;
}

/**
 * Converts a Supabase session to our application's Session format
 */
export function convertSupabaseSession(
  supabaseSession: SupabaseSession | null,
): Session | null {
  if (!supabaseSession) return null;

  // Ensure we have a valid user object
  if (!supabaseSession.user) {
    console.error('Session has no user object');
    return null;
  }

  // Extract expiry time safely
  const expiresAt = supabaseSession.expires_at
    ? new Date(supabaseSession.expires_at * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString(); // Default to 1 hour from now

  return {
    user: {
      id: supabaseSession.user.id,
      name:
        supabaseSession.user.user_metadata?.full_name ||
        supabaseSession.user.user_metadata?.name ||
        supabaseSession.user.email?.split('@')[0] ||
        null,
      email: supabaseSession.user.email || null,
      image: supabaseSession.user.user_metadata?.avatar_url || null,
      // Include any custom fields from user metadata, with fallbacks
      total_vacation_days:
        supabaseSession.user.user_metadata?.total_vacation_days || 20,
      province: supabaseSession.user.user_metadata?.province || 'ON',
      employment_type:
        supabaseSession.user.user_metadata?.employment_type || 'standard',
      week_starts_on:
        supabaseSession.user.user_metadata?.week_starts_on || 'sunday',
    },
    expires: expiresAt,
  };
}

/**
 * Type for the return value of useAuth hook
 */
interface UseAuthReturn {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  isLoading: boolean;
}

/**
 * Type for the return value of useSession hook
 */
interface UseSessionReturn {
  data: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

/**
 * Creates a useSession hook compatible with components expecting next-auth's useSession
 */
export function createSessionHook(
  useAuth: () => UseAuthReturn,
): () => UseSessionReturn {
  return function useSession() {
    const { session, isLoading } = useAuth();

    return {
      data: session ? convertSupabaseSession(session) : null,
      status: isLoading
        ? 'loading'
        : session
          ? 'authenticated'
          : 'unauthenticated',
    };
  };
}
