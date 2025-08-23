import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('yahoo_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Yahoo' }, { status: 401 })
  }

  try {
    const gameKey = '466' // NBA 2024-25 season
    
    console.log('Fetching Yahoo player data...')

    // Try different player endpoints
    
    // 1. Get all players in the game (might be limited)
    const allPlayersResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/game/${gameKey}/players?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('All players response:', allPlayersResponse.status, allPlayersResponse.statusText)

    // 2. Try getting players by position or other filters
    const topPlayersResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/game/${gameKey}/players;sort=AR?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('Top players response:', topPlayersResponse.status, topPlayersResponse.statusText)

    // 3. Try getting players with stats
    const playersWithStatsResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/game/${gameKey}/players;player_keys=${gameKey}.p.3704,${gameKey}.p.4725?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('Players with stats response:', playersWithStatsResponse.status, playersWithStatsResponse.statusText)

    let allPlayersData = null
    let topPlayersData = null
    let playersWithStatsData = null

    if (allPlayersResponse.ok) {
      allPlayersData = await allPlayersResponse.json()
      console.log('All players data sample:', JSON.stringify(allPlayersData, null, 2).substring(0, 1000))
    } else {
      const errorText = await allPlayersResponse.text()
      console.log('All players error:', errorText)
    }

    if (topPlayersResponse.ok) {
      topPlayersData = await topPlayersResponse.json()
      console.log('Top players data sample:', JSON.stringify(topPlayersData, null, 2).substring(0, 1000))
    } else {
      const errorText = await topPlayersResponse.text()
      console.log('Top players error:', errorText)
    }

    if (playersWithStatsResponse.ok) {
      playersWithStatsData = await playersWithStatsResponse.json()
      console.log('Players with stats data sample:', JSON.stringify(playersWithStatsData, null, 2).substring(0, 1000))
    } else {
      const errorText = await playersWithStatsResponse.text()
      console.log('Players with stats error:', errorText)
    }

    return NextResponse.json({
      allPlayers: allPlayersData,
      topPlayers: topPlayersData,
      playersWithStats: playersWithStatsData,
      message: 'Player data exploration complete!'
    })

  } catch (error) {
    console.error('Player data error:', error)
    return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 })
  }
}