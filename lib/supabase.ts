import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (safe to use in client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client factory (use in API routes and server components)
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          team_name: string
          manager_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          team_name: string
          manager_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          team_name?: string
          manager_name?: string
          updated_at?: string
        }
      }
    }
  }
}