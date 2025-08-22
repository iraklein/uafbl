import { createServerSupabaseClient } from './supabase'
import { calculateKeeperCost } from './keeper-utils'

/**
 * Recalculates and updates keeper costs for specific players in a given season
 * This should be called when trades are accepted to update trade kicker costs
 */
export async function recalculateKeeperCosts(playerIds: number[], seasonId: number) {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log(`Recalculating keeper costs for players ${playerIds.join(', ')} in season ${seasonId}`)
    
    // Get roster data for these players in this season
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select('id, player_id, consecutive_keeps')
      .in('player_id', playerIds)
      .eq('season_id', seasonId)
    
    if (rostersError) {
      console.error('Error fetching rosters for keeper cost update:', rostersError)
      throw new Error(`Failed to fetch rosters: ${rostersError.message}`)
    }
    
    if (!rosters || rosters.length === 0) {
      console.log('No rosters found for the specified players in this season')
      return { updated: 0 }
    }
    
    // Get draft prices for these players in this season
    const { data: draftPrices, error: draftError } = await supabase
      .from('draft_results')
      .select('player_id, draft_price')
      .in('player_id', playerIds)
      .eq('season_id', seasonId)
    
    if (draftError) {
      console.error('Error fetching draft prices:', draftError)
      throw new Error(`Failed to fetch draft prices: ${draftError.message}`)
    }
    
    // Get current trade counts for these players in this season (in-season trades only)
    const { data: tradesData, error: tradesError } = await supabase
      .from('trades')
      .select('proposer_players, receiver_players')
      .eq('season_id', seasonId)
      .eq('status', 'accepted')
      .eq('was_offseason', false)
    
    if (tradesError) {
      console.error('Error fetching trades for keeper cost update:', tradesError)
      throw new Error(`Failed to fetch trades: ${tradesError.message}`)
    }
    
    // Create maps for quick lookup
    const draftPriceMap: Record<number, number | null> = {}
    draftPrices?.forEach((dp: any) => {
      draftPriceMap[dp.player_id] = dp.draft_price
    })
    
    // Count trades for each player
    const tradeCountMap: Record<number, number> = {}
    playerIds.forEach(playerId => {
      tradeCountMap[playerId] = 0
    })
    
    tradesData?.forEach((trade: any) => {
      // Count players from proposer_players array
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        trade.proposer_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          if (playerIds.includes(id)) {
            tradeCountMap[id] = (tradeCountMap[id] || 0) + 1
          }
        })
      }
      
      // Count players from receiver_players array
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        trade.receiver_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          if (playerIds.includes(id)) {
            tradeCountMap[id] = (tradeCountMap[id] || 0) + 1
          }
        })
      }
    })
    
    let updatedCount = 0
    
    // Update keeper cost for each roster
    for (const roster of rosters) {
      const rosterData = roster as { id: number; player_id: number; consecutive_keeps: number | null }
      const draftPrice = draftPriceMap[rosterData.player_id] || null
      const tradeCount = tradeCountMap[rosterData.player_id] || 0
      
      // Calculate the keeper cost using the utility function
      let keeperEscalationYear = 0 // Default for non-keepers (first time keep = +$10)
      
      if (rosterData.consecutive_keeps !== null && rosterData.consecutive_keeps !== undefined) {
        // For players who were kept, calculate cost for the NEXT keep
        keeperEscalationYear = rosterData.consecutive_keeps + 1
      }
      
      const newKeeperCost = calculateKeeperCost(
        draftPrice,
        keeperEscalationYear,
        tradeCount
      )
      
      // Update the roster record with the new keeper cost
      const { error: updateError } = await supabase
        .from('rosters')
        .update({ keeper_cost: newKeeperCost })
        .eq('id', rosterData.id)
      
      if (updateError) {
        console.error(`Error updating keeper cost for roster ${rosterData.id}:`, updateError)
        throw new Error(`Failed to update keeper cost: ${updateError.message}`)
      } else {
        console.log(`Updated keeper cost for player ${rosterData.player_id}: $${newKeeperCost} (${tradeCount} trades)`)
        updatedCount++
      }
    }
    
    console.log(`Successfully recalculated keeper costs for ${updatedCount} players`)
    return { updated: updatedCount }
    
  } catch (error) {
    console.error('Error in recalculateKeeperCosts:', error)
    throw error
  }
}