/**
 * Auth helpers re-export file
 * 
 * ⚠️ WARNING:
 * This file re-exports from both client and server modules.
 * It uses `next/headers` (via server imports) and should only be used in Server Components.
 * 
 * For client components, import from: '@/lib/auth-helpers.client'
 * For server components, import from: '@/lib/auth-helpers.server'
 */

// Re-export client-side helpers
export {
  useSession,
  signIn,
  signOut,
  initializeAuth,
  getSupabaseClient,
} from './auth-helpers.client';

// Re-export server-side helpers
export {
  getCurrentSession,
  getCurrentUser,
  requireAuth,
  isAuthenticated,
  getServerSession,
  ensureUserRecord,
} from './auth-helpers.server';
