import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Clear cache if refresh is requested
    if (forceRefresh) {
      assetsCache = null
      console.log('Cache cleared due to refresh request')
    }
    
    // Check cache first
    if (assetsCache && Date.now() - assetsCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached manager assets data')
      return NextResponse.json(assetsCache.data, {
        headers: { 'Cache-Control': 'public, max-age=120' } // Browser cache for 2 minutes
      })
    }

    console.log('Fetching fresh manager assets data from database')
    const supabase = createServerSupabaseClient()
    
    // If this is a forced refresh, add a small delay to ensure any recent DB writes are committed
    if (forceRefresh) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Get season first, then use it for draft data
    const seasonResult = await supabase
      .from('seasons')
      .select('id, year, name, is_active')
      .eq('is_active', true)
      .single()

    // Parallel queries for better performance  
    const [assetsResult, draftSpendingResult] = await Promise.all([
      supabase
        .from('managers_assets')
        .select('*, managers(manager_name)'),
      // Get draft spending and keeper data for current season
      seasonResult.data && seasonResult.data.id ? supabase
        .from('draft_results')
        .select(`
          manager_id,
          draft_price,
          is_keeper,
          seasons!inner (id)
        `)
        .eq('seasons.id', seasonResult.data.id) : Promise.resolve({ data: [], error: null })
    ])

    if (seasonResult.error) {
      console.error('Active Season Query Error:', seasonResult.error)
    }

    if (assetsResult.error) {
      console.error('Manager Assets Query Error:', assetsResult.error)
      return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    }

    // Calculate spending and keeper data per manager
    const managerStats = new Map<number, { cashSpent: number; slotsUsed: number; draftedPlayers: number }>()
    if (draftSpendingResult.data) {
      draftSpendingResult.data.forEach((pick: any) => {
        const managerId = pick.manager_id
        if (!managerStats.has(managerId)) {
          managerStats.set(managerId, {
            cashSpent: 0,
            slotsUsed: 0,
            draftedPlayers: 0
          })
        }
        
        const stats = managerStats.get(managerId)!
        stats.cashSpent += pick.draft_price || 0
        stats.draftedPlayers += 1 // Count all draft picks (keepers, toppers, regular drafts)
        if (pick.is_keeper) {
          stats.slotsUsed += 1
        }
      })
    }

    // Enhance assets data with calculated fields
    const enhancedAssets = (assetsResult.data || []).map((asset: any) => {
      const stats = managerStats.get(asset.manager_id) || { cashSpent: 0, slotsUsed: 0, draftedPlayers: 0 }
      const cashLeft = (asset.available_cash || 0) - stats.cashSpent
      const slotsLeft = (asset.available_slots || 0) - stats.slotsUsed
      
      
      return {
        ...asset,
        cash_spent: stats.cashSpent,
        slots_used: stats.slotsUsed,
        cash_left: cashLeft,
        slots_left: slotsLeft,
        drafted_players: stats.draftedPlayers
      }
    })

    const responseData = {
      assets: enhancedAssets,
      activeSeason: seasonResult.data || null
    }

    // Update cache
    assetsCache = { data: responseData, timestamp: Date.now() }
    
    const headers = forceRefresh 
      ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      : { 'Cache-Control': 'public, max-age=120' } // Browser cache for 2 minutes
    
    return NextResponse.json(responseData, { headers })
  } catch (error) {
    console.error('Manager Assets API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}