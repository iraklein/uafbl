import { createServerSupabaseClient } from './supabase'
import { calculateKeeperCost } from './keeper-utils'

/**
 * Calculate keeper cost for a player being added to a roster
 * This should be called whenever a player is added to a roster (draft, trade, etc.)
 */
export async function calculateKeeperCostForRoster(
  playerId: number,
  seasonId: number
): Promise<number | null> {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log(`Calculating keeper cost for player ${playerId} in season ${seasonId}`)
    
    // Get the player's draft price for this season
    const { data: draftResult, error: draftError } = await supabase
      .from('draft_results')
      .select('draft_price')
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .single()
    
    if (draftError && draftError.code !== 'PGRST116') {
      console.error('Error fetching draft price:', draftError)
      throw new Error(`Failed to fetch draft price: ${draftError.message}`)
    }
    
    // If no draft result, this player wasn't drafted this season - they might be a keeper or free agent
    const draftPrice = draftResult?.draft_price || null
    
    // Get current trade count for this player this season (in-season trades only)
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('proposer_players, receiver_players')
      .eq('season_id', seasonId)
      .eq('status', 'accepted')
      .eq('was_offseason', false)
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      throw new Error(`Failed to fetch trades: ${tradesError.message}`)
    }
    
    // Count trades for this player
    let tradeCount = 0
    trades?.forEach(trade => {
      // Check proposer players
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        if (trade.proposer_players.some((id: string) => parseInt(id) === playerId)) {
          tradeCount++
        }
      }
      // Check receiver players
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        if (trade.receiver_players.some((id: string) => parseInt(id) === playerId)) {
          tradeCount++
        }
      }
    })
    
    // For new roster additions, consecutive_keeps = 0 (first time being kept)
    // Note: This assumes the player is being added fresh to a roster
    // If this is a keeper from previous season, the consecutive_keeps should be passed in
    const consecutiveKeeps = 0
    
    // Calculate the keeper cost
    const keeperCost = calculateKeeperCost(draftPrice, consecutiveKeeps, tradeCount)
    
    console.log(`Player ${playerId} keeper cost calculation:`)
    console.log(`- Draft Price: $${draftPrice || 0}`)
    console.log(`- Consecutive Keeps: ${consecutiveKeeps}`)
    console.log(`- Trade Count: ${tradeCount}`)
    console.log(`- Final Keeper Cost: $${keeperCost}`)
    
    return keeperCost
    
  } catch (error) {
    console.error('Error calculating keeper cost for roster:', error)
    return null // Return null if calculation fails, roster insertion can continue
  }
}

/**
 * Calculate keeper cost for multiple players being added to rosters
 * More efficient than calling calculateKeeperCostForRoster individually
 */
export async function calculateKeeperCostsForRosters(
  playerIds: number[],
  seasonId: number
): Promise<Record<number, number | null>> {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log(`Calculating keeper costs for ${playerIds.length} players in season ${seasonId}`)
    
    // Get draft prices for all players in this season
    const { data: draftResults, error: draftError } = await supabase
      .from('draft_results')
      .select('player_id, draft_price')
      .in('player_id', playerIds)
      .eq('season_id', seasonId)
    
    if (draftError) {
      console.error('Error fetching draft prices:', draftError)
      throw new Error(`Failed to fetch draft prices: ${draftError.message}`)
    }
    
    // Create map of draft prices
    const draftPriceMap: Record<number, number | null> = {}
    playerIds.forEach(playerId => {
      draftPriceMap[playerId] = null // Default to null if no draft result
    })
    draftResults?.forEach(result => {
      draftPriceMap[result.player_id] = result.draft_price
    })
    
    // Get current trade counts for all players this season
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('proposer_players, receiver_players')
      .eq('season_id', seasonId)
      .eq('status', 'accepted')
      .eq('was_offseason', false)
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      throw new Error(`Failed to fetch trades: ${tradesError.message}`)
    }
    
    // Count trades for each player
    const tradeCountMap: Record<number, number> = {}
    playerIds.forEach(playerId => {
      tradeCountMap[playerId] = 0
    })
    
    trades?.forEach(trade => {
      // Count proposer players
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        trade.proposer_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          if (playerIds.includes(id)) {
            tradeCountMap[id]++
          }
        })
      }
      // Count receiver players
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        trade.receiver_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          if (playerIds.includes(id)) {
            tradeCountMap[id]++
          }
        })
      }
    })
    
    // Calculate keeper costs for all players
    const keeperCostMap: Record<number, number | null> = {}
    
    for (const playerId of playerIds) {
      const draftPrice = draftPriceMap[playerId]
      const tradeCount = tradeCountMap[playerId] || 0
      const consecutiveKeeps = 0 // Default for new roster additions
      
      const keeperCost = calculateKeeperCost(draftPrice, consecutiveKeeps, tradeCount)
      keeperCostMap[playerId] = keeperCost
      
      console.log(`Player ${playerId}: draft=$${draftPrice || 0}, trades=${tradeCount}, keeper=$${keeperCost}`)
    }
    
    return keeperCostMap
    
  } catch (error) {
    console.error('Error calculating keeper costs for rosters:', error)
    // Return empty object if calculation fails
    const emptyMap: Record<number, number | null> = {}
    playerIds.forEach(playerId => {
      emptyMap[playerId] = null
    })
    return emptyMap
  }
}