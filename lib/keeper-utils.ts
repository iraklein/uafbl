// Utility functions for calculating keeper costs

// Escalation table for consecutive keeps
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

/**
 * Calculate the keeper cost for a player
 * @param draftPrice - The player's original draft price
 * @param consecutiveKeeps - Number of consecutive years kept (0 = first time)
 * @param tradeCount - Number of trades during the season
 * @returns The calculated keeper cost
 */
export function calculateKeeperCost(
  draftPrice: number | null,
  consecutiveKeeps: number = 0,
  tradeCount: number = 0
): number | null {
  // If no draft price, treat as $0 for keeper cost calculation
  const price = draftPrice || 0

  // Get the escalation amount based on consecutive keeps
  // Cap at 10 for any value higher than 10
  const escalationYears = Math.min(consecutiveKeeps, 10)
  const escalation = KEEPER_ESCALATION[escalationYears]

  // Calculate: original draft price + escalation + (trades * $5)
  const keeperCost = price + escalation + (tradeCount * 5)

  return keeperCost
}

/**
 * Format keeper cost for display
 * @param keeperCost - The calculated keeper cost
 * @returns Formatted string for display
 */
export function formatKeeperCost(keeperCost: number | null): string {
  if (keeperCost === null || keeperCost === undefined) {
    return '-'
  }
  return `$${keeperCost}`
}