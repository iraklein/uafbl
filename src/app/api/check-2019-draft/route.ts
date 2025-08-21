import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  
  try {
    const { playerNames } = await request.json()
    
    if (!playerNames || !Array.isArray(playerNames)) {
      return NextResponse.json({ error: 'playerNames array is required' }, { status: 400 })
    }
    
    console.log(`Checking ${playerNames.length} players for 2019 draft records...`)
    
    // Get all players
    let allPlayers: any[] = []
    let hasMore = true
    let offset = 0
    const pageSize = 1000

    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('players')
        .select('id, name')
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (pageError) {
        return NextResponse.json({ error: pageError.message }, { status: 500 })
      }

      if (pageData && pageData.length > 0) {
        allPlayers = allPlayers.concat(pageData)
        offset += pageSize
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    // Get all 2019 draft records (season_id = 14)
    const { data: draftRecords, error: draftError } = await supabase
      .from('draft_results')
      .select('player_id')
      .eq('season_id', 14)
    
    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    const draftedPlayerIds = new Set(draftRecords?.map(record => record.player_id) || [])
    
    // Find players from the list
    const results = []
    const notFound = []
    
    for (const playerName of playerNames) {
      const normalizedSearchName = playerName.toLowerCase().trim()
      
      // Find player in database (fuzzy matching)
      const foundPlayer = allPlayers.find(player => {
        const normalizedPlayerName = player.name.toLowerCase()
        return normalizedPlayerName === normalizedSearchName ||
               normalizedPlayerName.includes(normalizedSearchName) ||
               normalizedSearchName.includes(normalizedPlayerName)
      })
      
      if (foundPlayer) {
        const hasDraftRecord = draftedPlayerIds.has(foundPlayer.id)
        results.push({
          searchName: playerName,
          foundPlayer: foundPlayer,
          hasDraftRecord: hasDraftRecord
        })
      } else {
        notFound.push(playerName)
      }
    }
    
    // Separate into drafted and not drafted
    const drafted = results.filter(r => r.hasDraftRecord)
    const notDrafted = results.filter(r => !r.hasDraftRecord)
    
    return NextResponse.json({
      summary: {
        totalSearched: playerNames.length,
        found: results.length,
        notFound: notFound.length,
        drafted: drafted.length,
        notDrafted: notDrafted.length
      },
      playersNotDraftedIn2019: notDrafted.map(r => ({
        searchName: r.searchName,
        playerId: r.foundPlayer.id,
        playerName: r.foundPlayer.name
      })),
      playersNotFoundInDatabase: notFound,
      allResults: results
    })
    
  } catch (error) {
    console.error('Error checking 2019 draft records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}