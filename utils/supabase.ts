import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Types for better TypeScript support
export type Database = {
  public: {
    tables: {
      vacations: {
        Row: {
          id: string
          user_id: string
          title: string
          start_date: string
          end_date: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_date: string
          end_date: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_date?: string
          end_date?: string
          description?: string | null
          created_at?: string
        }
      }
      google_tokens: {
        Row: {
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: number
        }
        Insert: {
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: number
        }
        Update: {
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: number
        }
      }
    }
  }
}

// For client components - works in both App Router and Pages Router
export const createBrowserSupabaseClient = () => 
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// For direct API access when cookies aren't needed (works everywhere)
export const createDirectClient = () => 
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
