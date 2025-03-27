import { useAuth } from '@/components/auth/AuthProvider';
import { createSessionHook } from '@/types/auth';
import { getServerSession } from './auth-server';

// Re-export useSession with compatible interface
export const useSession = createSessionHook(useAuth);

// Compatibility functions for components that used next-auth functions
export const signIn = async (provider: string) => {
  const { signInWithGoogle } = useAuth();
  if (provider === 'google') {
    await signInWithGoogle();
    return { ok: true, error: null };
  }
  return { ok: false, error: 'Provider not supported' };
};

export const signOut = async () => {
  const { signOut: supabaseSignOut } = useAuth();
  await supabaseSignOut();
  return { ok: true };
};

// Re-export the server-side function
export { getServerSession };
