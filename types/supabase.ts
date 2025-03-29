export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          emailVerified: string | null
          image: string | null
          total_vacation_days: number
          province: string
          employment_type: string
          week_starts_on: string
          calendar_sync_enabled: boolean
          google_calendar_id: string | null
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          total_vacation_days?: number
          province?: string
          employment_type?: string
          week_starts_on?: string
          calendar_sync_enabled?: boolean
          google_calendar_id?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          total_vacation_days?: number
          province?: string
          employment_type?: string
          week_starts_on?: string
          calendar_sync_enabled?: boolean
          google_calendar_id?: string | null
        }
      }
      vacation_bookings: {
        Row: {
          id: string
          userId: string
          start_date: string
          end_date: string
          note: string | null
          created_at: string
          is_half_day: boolean
          half_day_portion: string | null
          googleEventId: string | null
        }
        Insert: {
          id?: string
          userId: string
          start_date: string
          end_date: string
          note?: string | null
          created_at?: string
          is_half_day?: boolean
          half_day_portion?: string | null
          googleEventId?: string | null
        }
        Update: {
          id?: string
          userId?: string
          start_date?: string
          end_date?: string
          note?: string | null
          created_at?: string
          is_half_day?: boolean
          half_day_portion?: string | null
          googleEventId?: string | null
        }
      }
      holidays: {
        Row: {
          id: string
          date: string
          name: string
          province: string | null
          type: string
        }
        Insert: {
          id?: string
          date: string
          name: string
          province?: string | null
          type: string
        }
        Update: {
          id?: string
          date?: string
          name?: string
          province?: string | null
          type?: string
        }
      }
      accounts: {
        Row: {
          id: string
          userId: string
          type: string
          provider: string
          providerAccountId: string
          refresh_token: string | null
          access_token: string | null
          expires_at: number | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
        }
        Insert: {
          id?: string
          userId: string
          type: string
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
        Update: {
          id?: string
          userId?: string
          type?: string
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          sessionToken: string
          userId: string
          expires: string
        }
        Insert: {
          id?: string
          sessionToken: string
          userId: string
          expires: string
        }
        Update: {
          id?: string
          sessionToken?: string
          userId?: string
          expires?: string
        }
      }
      verification_tokens: {
        Row: {
          identifier: string
          token: string
          expires: string
        }
        Insert: {
          identifier: string
          token: string
          expires: string
        }
        Update: {
          identifier?: string
          token?: string
          expires?: string
        }
      }
      google_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          token_type: string
          scope: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          token_type: string
          scope: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          token_type?: string
          scope?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}