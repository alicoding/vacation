import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase client for use in API routes with proper cookie handling
 * for Edge runtime compatibility
 */
export async function createApiClient() {
    const cookieStore = await cookies();
    
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: async () => {
                    return cookieStore.getAll().map(cookie => ({
                        name: cookie.name,
                        value: cookie.value,
                    }));
                },
                setAll: async (cookieStrings) => {
                    cookieStrings.forEach(cookie => {
                        cookieStore.set(cookie.name, cookie.value, cookie.options);
                    });
                }
            },
        }
    );
}

/**
 * Utility function to check if a user is authenticated in API routes
 * Returns the authenticated user if present, or throws an error if not
 */
export async function requireAuth() {
    const supabase = await createApiClient();
    
    // Use getUser() instead of getSession() for better security
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        throw new Error('Not authenticated');
    }
    
    return { supabase, user };
}
