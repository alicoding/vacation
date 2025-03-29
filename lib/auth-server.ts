import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { convertSupabaseSession } from '@/types/auth';
import { createDirectClient } from '@/utils/supabase';

/**
 * Get the current server session for App Router (works with Edge runtime)
 * This version uses cookies() and should only be used in app/ directory components
 */
export async function getServerSession() {
  try {
    // Create two versions of the client - try cookie-based first for app dir
    // then fall back to direct client as backup
    let session = null;
    
    try {
      // Only import cookies() when needed to avoid static import errors
      // This makes the file compatible with both app/ and pages/ directories
      const headersModule = await import('next/headers').catch(() => {
        // This will throw in pages/ directory, which is expected
        throw new Error('next/headers is not available in this context');
      });
      
      // Get cookies function and call it - cookies() is not async
      const cookiesFunc = headersModule.cookies;
      const cookieStore = await cookiesFunc(); // Don't await this - it's synchronous
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              try {
                return cookieStore.get(name)?.value;
              } catch (e) {
                console.warn('Error getting cookie in server context:', e);
                return undefined;
              }
            },
            set(name, value, options) {
              try {
                // Ensure sameSite is a string value as required by Cookie API
                if (options?.sameSite === true) options.sameSite = 'strict';
                if (options?.sameSite === false) options.sameSite = 'lax';
                
                cookieStore.set(name, value, options);
              } catch (e) {
                console.warn('Error setting cookie in server context:', e);
              }
            },
            remove(name, options) {
              try {
                cookieStore.set(name, '', { ...options, maxAge: 0 });
              } catch (e) {
                console.warn('Error removing cookie in server context:', e);
              }
            },
          },
        },
      );
      
      // First, try to get session which is cookie-based
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('Error getting session:', sessionError);
      }
      
      session = sessionData.session;
      
      // Then get the user if we have a session
      if (session) {
        await supabase.auth.getUser();
      }
    } catch (e) {
      // If cookies() fails, fall back to direct client as backup
      // This would happen in pages/ directory or environments without headers API
      console.warn('Cookie-based auth failed, falling back to direct client:', e);
      
      // Use direct client as backup
      const directSupabase = createDirectClient();
      const { data: directSession } = await directSupabase.auth.getSession();
      session = directSession.session;
      
      if (session) {
        await directSupabase.auth.getUser();
      }
    }
    
    // If we have a session, convert it to our app's format
    if (session) {
      console.log('Server session found for user:', session.user.email);
      return convertSupabaseSession(session);
    }
    
    console.log('No session found in getServerSession');
    return null;
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}
