import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createClientClient = () => createClientComponentClient()

export const createServerClient = async () => createServerComponentClient({ cookies: await cookies() })

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