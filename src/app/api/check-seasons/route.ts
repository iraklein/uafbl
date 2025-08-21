import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: true })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const season16 = seasons?.find(s => s.id === 16)
    
    return NextResponse.json({
      season_16: season16,
      all_seasons: seasons
    })
    
  } catch (error) {
    console.error('Error checking seasons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}