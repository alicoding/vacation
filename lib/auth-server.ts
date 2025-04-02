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
    let user = null;
    
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
      
      // First, get the user directly which is more secure
      // This follows Supabase's recommendation for better security
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.warn('Error getting user:', userError);
      } else if (userData.user) {
        user = userData.user;
        
        // After verifying the user, get the session for access tokens
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
      }
    } catch (e) {
      // If cookies() fails, fall back to direct client as backup
      // This would happen in pages/ directory or environments without headers API
      console.warn('Cookie-based auth failed, falling back to direct client:', e);
      
      // Use direct client as backup
      const directSupabase = createDirectClient();
      
      // First, get the user directly which is more secure
      const { data: userData } = await directSupabase.auth.getUser();
      
      if (userData.user) {
        user = userData.user;
        // Get session after verifying user
        const { data: sessionData } = await directSupabase.auth.getSession();
        session = sessionData.session;
      }
    }
    
    // If we have a verified user and session, convert it to our app's format
    if (user && session) {
      console.log('Server session found for user:', user.email);
      return convertSupabaseSession(session);
    }
    
    console.log('No session found in getServerSession');
    return null;
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}
