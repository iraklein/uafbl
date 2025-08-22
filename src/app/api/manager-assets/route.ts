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
  is_active_assets: boolean
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
    
    // Get current active assets season first, then use it for draft data
    const [assetsSeason, playingSeason] = await Promise.all([
      supabase
        .from('seasons')
        .select('id, year, name, is_active_assets')
        .eq('is_active_assets', true)
        .single(),
      supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()
    ])

    // Parallel queries for better performance  
    const [assetsResult, draftSpendingResult, tradesResult] = await Promise.all([
      supabase
        .from('managers_assets')
        .select('*, managers(manager_name)'),
      // Get draft spending and keeper data for current assets season
      assetsSeason.data && assetsSeason.data.id ? supabase
        .from('draft_results')
        .select(`
          manager_id,
          draft_price,
          is_keeper,
          seasons!inner (id)
        `)
        .eq('seasons.id', assetsSeason.data.id) : Promise.resolve({ data: [], error: null }),
      // Get trade data (currently stored in playing season, affects assets season budget)
      playingSeason.data && playingSeason.data.id ? supabase
        .from('trades')
        .select(`
          proposer_manager_id,
          receiver_manager_id,
          proposer_cash,
          proposer_slots,
          receiver_cash,
          receiver_slots,
          status
        `)
        .eq('season_id', playingSeason.data.id)
        .eq('status', 'accepted') : Promise.resolve({ data: [], error: null })
    ])

    if (assetsSeason.error) {
      console.error('Assets Season Query Error:', assetsSeason.error)
    }
    
    if (playingSeason.error) {
      console.error('Playing Season Query Error:', playingSeason.error)
    }

    if (assetsResult.error) {
      console.error('Manager Assets Query Error:', assetsResult.error)
      return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    }

    // Calculate spending and keeper data per manager
    const managerStats = new Map<number, { cashSpent: number; slotsUsed: number; draftedPlayers: number; netTradeCash: number; netTradeSlots: number }>()
    if (draftSpendingResult.data) {
      draftSpendingResult.data.forEach((pick: any) => {
        const managerId = pick.manager_id
        if (!managerStats.has(managerId)) {
          managerStats.set(managerId, {
            cashSpent: 0,
            slotsUsed: 0,
            draftedPlayers: 0,
            netTradeCash: 0,
            netTradeSlots: 0
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

    // Calculate net trade values per manager (received - sent)
    if (tradesResult.data) {
      tradesResult.data.forEach((trade: any) => {
        // Initialize manager stats if they don't exist
        if (!managerStats.has(trade.proposer_manager_id)) {
          managerStats.set(trade.proposer_manager_id, {
            cashSpent: 0,
            slotsUsed: 0,
            draftedPlayers: 0,
            netTradeCash: 0,
            netTradeSlots: 0
          })
        }
        if (!managerStats.has(trade.receiver_manager_id)) {
          managerStats.set(trade.receiver_manager_id, {
            cashSpent: 0,
            slotsUsed: 0,
            draftedPlayers: 0,
            netTradeCash: 0,
            netTradeSlots: 0
          })
        }

        const proposerStats = managerStats.get(trade.proposer_manager_id)!
        const receiverStats = managerStats.get(trade.receiver_manager_id)!

        // For proposer: subtract what they sent, add what they received
        proposerStats.netTradeCash += (trade.receiver_cash || 0) - (trade.proposer_cash || 0)
        proposerStats.netTradeSlots += (trade.receiver_slots || 0) - (trade.proposer_slots || 0)

        // For receiver: subtract what they sent, add what they received  
        receiverStats.netTradeCash += (trade.proposer_cash || 0) - (trade.receiver_cash || 0)
        receiverStats.netTradeSlots += (trade.proposer_slots || 0) - (trade.receiver_slots || 0)
      })
    }

    // Enhance assets data with calculated fields
    const enhancedAssets = (assetsResult.data || []).map((asset: any) => {
      const stats = managerStats.get(asset.manager_id) || { cashSpent: 0, slotsUsed: 0, draftedPlayers: 0, netTradeCash: 0, netTradeSlots: 0 }
      
      // Pre-draft amounts = stored admin values + net trade impacts
      const preDraftCash = (asset.available_cash || 400) + stats.netTradeCash
      const preDraftSlots = (asset.available_slots || 3) + stats.netTradeSlots
      
      const cashLeft = preDraftCash - stats.cashSpent
      const slotsLeft = preDraftSlots - stats.slotsUsed
      
      
      return {
        ...asset,
        available_cash: preDraftCash,
        available_slots: preDraftSlots,
        cash_spent: stats.cashSpent,
        slots_used: stats.slotsUsed,
        cash_left: cashLeft,
        slots_left: slotsLeft,
        drafted_players: stats.draftedPlayers,
        trades_cash: stats.netTradeCash,
        trades_slots: stats.netTradeSlots
      }
    })

    // Sort the enhanced assets alphabetically by manager name
    const sortedEnhancedAssets = enhancedAssets.sort((a: any, b: any) => 
      a.managers.manager_name.localeCompare(b.managers.manager_name)
    )

    const responseData = {
      assets: sortedEnhancedAssets,
      activeSeason: assetsSeason.data || null
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