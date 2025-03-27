import { createDirectClient } from '@/utils/supabase';
import { convertSupabaseSession } from '@/types/auth';

/**
 * Get the current server session
 * @returns The user session or null if not authenticated
 */
export async function getServerSession() {
  const supabase = createDirectClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return convertSupabaseSession(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}
