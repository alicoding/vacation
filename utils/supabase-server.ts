import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './supabase'

// For server components in App Router only
export const createServerClient = async () => {
  const cookieStore = await cookies()
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return cookieStore.get(name)?.value
        },
        set: async (name, value, options) => {
          cookieStore.set(name, value, options)
        },
        remove: async (name, options) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )
}
