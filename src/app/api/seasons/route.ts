import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

// Cache seasons data for 5 minutes
let seasonsCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    // Check cache first
    if (seasonsCache && Date.now() - seasonsCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached seasons data')
      return NextResponse.json(seasonsCache.data, {
        headers: { 'Cache-Control': 'public, max-age=300' } // Browser cache for 5 minutes
      })
    }

    console.log('Fetching fresh seasons data from database')
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('seasons')
      .select('id, year, name')
      .order('year', { ascending: false })

    if (error) {
      console.error('Database error fetching seasons:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update cache
    seasonsCache = { data, timestamp: Date.now() }
    
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' } // Browser cache for 5 minutes
    })
  } catch (error) {
    console.error('Seasons API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}