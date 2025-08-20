import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

console.log('Supabase config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey })

// Client-side Supabase client (safe to use in client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'uafbl-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

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