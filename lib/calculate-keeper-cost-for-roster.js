const { createClient } = require('@supabase/supabase-js')

// Keeper escalation rules (copied from keeper-utils.ts)
const KEEPER_ESCALATION = {
  0: 10,  // First time kept
  1: 15,  // Second consecutive year
  2: 15,  // Third consecutive year
  3: 25,  // Fourth consecutive year
  4: 30,  // Fifth consecutive year
  5: 35,  // Sixth consecutive year
  6: 40,  // Seventh consecutive year
  7: 45,  // Eighth consecutive year
  8: 50,  // Ninth consecutive year
  9: 55,  // Tenth consecutive year
  10: 60  // Eleventh+ consecutive year (cap)
}

function calculateKeeperCost(draftPrice, consecutiveKeeps = 0, tradeCount = 0) {
  const price = draftPrice || 0
  const escalationYears = Math.min(consecutiveKeeps, 10)
  const escalation = KEEPER_ESCALATION[escalationYears]
  const keeperCost = price + escalation + (tradeCount * 5)
  return keeperCost
}

/**
 * Calculate keeper costs for multiple players being added to rosters
 * This is the JavaScript version for use in extraction scripts
 */
async function calculateKeeperCostsForRosters(supabase, playerIds, seasonId) {
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
    const draftPriceMap = {}
    playerIds.forEach(playerId => {
      draftPriceMap[playerId] = null // Default to null if no draft result
    })
    if (draftResults) {
      draftResults.forEach(result => {
        draftPriceMap[result.player_id] = result.draft_price
      })
    }
    
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
    const tradeCountMap = {}
    playerIds.forEach(playerId => {
      tradeCountMap[playerId] = 0
    })
    
    if (trades) {
      trades.forEach(trade => {
        // Count proposer players
        if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
          trade.proposer_players.forEach(playerId => {
            const id = parseInt(playerId)
            if (playerIds.includes(id)) {
              tradeCountMap[id]++
            }
          })
        }
        // Count receiver players
        if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
          trade.receiver_players.forEach(playerId => {
            const id = parseInt(playerId)
            if (playerIds.includes(id)) {
              tradeCountMap[id]++
            }
          })
        }
      })
    }
    
    // Calculate keeper costs for all players
    const keeperCostMap = {}
    
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
    const emptyMap = {}
    playerIds.forEach(playerId => {
      emptyMap[playerId] = null
    })
    return emptyMap
  }
}

module.exports = {
  calculateKeeperCostsForRosters,
  calculateKeeperCost
}