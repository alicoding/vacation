import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { ensureUserRecord } from '@/lib/auth-helpers.server';

export async function getSession() {
  try {
    // Use the centralized client creation utility with cookie store
    const supabase = createSupabaseServerClient(cookies());
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}

export default async function InitialAuthHydration() {
  const session = await getSession();
  
  // Serialize session to avoid prototype errors when passing to client
  const serializedSession = session ? JSON.parse(JSON.stringify(session)) : null;
  
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined') {
            window.__INITIAL_AUTH_SESSION__ = ${JSON.stringify(serializedSession)};
          }
        `,
      }}
    />
  );
}