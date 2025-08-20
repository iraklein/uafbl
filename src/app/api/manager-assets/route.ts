import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

// Cache manager assets data for 2 minutes (more dynamic than seasons)
interface _ManagerAsset {
  id: number
  season_id: number
  manager_id: number
  available_cash: number
  available_slots: number
  spent_budget: number
  players_drafted: number
  max_roster_size: number
  updated_at: string
  managers: { manager_name: string }
}

interface _Season {
  id: number
  year: number
  name: string
  is_active: boolean
}

let assetsCache: { 
  data: { 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assets: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeSeason: any | null 
  }
  timestamp: number 
} | null = null
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export async function GET() {
  try {
    // Check cache first
    if (assetsCache && Date.now() - assetsCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached manager assets data')
      return NextResponse.json(assetsCache.data, {
        headers: { 'Cache-Control': 'public, max-age=120' } // Browser cache for 2 minutes
      })
    }

    console.log('Fetching fresh manager assets data from database')
    const supabase = createServerSupabaseClient()
    
    // Parallel queries for better performance
    const [seasonResult, assetsResult] = await Promise.all([
      supabase
        .from('seasons')
        .select('id, year, name, is_active')
        .eq('is_active', true)
        .single(),
      supabase
        .from('managers_assets')
        .select('*, managers(manager_name)')
    ])

    if (seasonResult.error) {
      console.error('Active Season Query Error:', seasonResult.error)
    }

    if (assetsResult.error) {
      console.error('Manager Assets Query Error:', assetsResult.error)
      return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    }

    const responseData = {
      assets: assetsResult.data || [],
      activeSeason: seasonResult.data || null
    }

    // Update cache
    assetsCache = { data: responseData, timestamp: Date.now() }
    
    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'public, max-age=120' } // Browser cache for 2 minutes
    })
  } catch (error) {
    console.error('Manager Assets API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}