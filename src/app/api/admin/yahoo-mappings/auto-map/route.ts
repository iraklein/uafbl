import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'

// Simple string similarity function
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix = []
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[s2.length][s1.length]
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Starting auto-mapping process...')
    
    // Get all unmapped Yahoo players
    const { data: yahooPlayers, error: yahooError } = await supabase
      .from('yahoo_player_mappings')
      .select('id, yahoo_name_full, yahoo_name_first, yahoo_name_last')
      .is('uafbl_player_id', null)
      .limit(100)
    
    if (yahooError) {
      console.error('Error fetching Yahoo players:', yahooError)
      return NextResponse.json({ error: yahooError.message }, { status: 500 })
    }
    
    if (!yahooPlayers || yahooPlayers.length === 0) {
      return NextResponse.json({ message: 'No unmapped Yahoo players found' })
    }
    
    // Get all UAFBL players
    const { data: uafblPlayers, error: uafblError } = await supabase
      .from('players')
      .select('id, name')
      .limit(2000) // Use higher limit as per CLAUDE.md instructions
    
    if (uafblError) {
      console.error('Error fetching UAFBL players:', uafblError)
      return NextResponse.json({ error: uafblError.message }, { status: 500 })
    }
    
    if (!uafblPlayers || uafblPlayers.length === 0) {
      return NextResponse.json({ error: 'No UAFBL players found' }, { status: 404 })
    }
    
    console.log(`Found ${yahooPlayers.length} unmapped Yahoo players and ${uafblPlayers.length} UAFBL players`)
    
    const suggestions = []
    
    // For each Yahoo player, find the best UAFBL match
    for (const yahooPlayer of yahooPlayers) {
      const yahooName = yahooPlayer.yahoo_name_full.toLowerCase().trim()
      let bestMatch = null
      let bestScore = 0
      
      for (const uafblPlayer of uafblPlayers) {
        const uafblName = uafblPlayer.name.toLowerCase().trim()
        const score = similarity(yahooName, uafblName)
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = uafblPlayer
        }
      }
      
      // Only suggest matches with decent confidence (>= 0.8 similarity)
      if (bestMatch && bestScore >= 0.8) {
        suggestions.push({
          yahoo_mapping_id: yahooPlayer.id,
          yahoo_name: yahooPlayer.yahoo_name_full,
          uafbl_player_id: bestMatch.id,
          uafbl_name: bestMatch.name,
          confidence: Math.round(bestScore * 100)
        })
      }
    }
    
    console.log(`Generated ${suggestions.length} mapping suggestions`)
    
    return NextResponse.json({
      message: `Generated ${suggestions.length} mapping suggestions`,
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence) // Sort by confidence desc
    })
    
  } catch (error) {
    console.error('Error in auto-mapping:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}