import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

console.log('Supabase config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey })

// Client-side Supabase client (safe to use in client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'uafbl-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Singleton server-side Supabase client for better connection pooling
let serverSupabaseClient: ReturnType<typeof createClient> | null = null

export const createServerSupabaseClient = () => {
  // Reuse existing client to improve connection pooling
  if (!serverSupabaseClient) {
    console.log('Creating new server Supabase client')
    serverSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Server-side should not persist sessions
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  }
  return serverSupabaseClient
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