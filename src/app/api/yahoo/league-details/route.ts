import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('yahoo_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Yahoo' }, { status: 401 })
  }

  try {
    const leagueKey = '466.l.5701' // Urban Achievers league key
    
    console.log('Exploring league details for:', leagueKey)

    // Get current league settings and info
    const leagueResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('League response status:', leagueResponse.status, leagueResponse.statusText)

    if (!leagueResponse.ok) {
      const errorText = await leagueResponse.text()
      console.error('League request failed:', {
        status: leagueResponse.status,
        statusText: leagueResponse.statusText,
        response: errorText
      })
      return NextResponse.json({ 
        error: 'Failed to get league details',
        details: errorText,
        status: leagueResponse.status
      }, { status: 500 })
    }

    // Get teams in the league
    const teamsResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('Teams response status:', teamsResponse.status, teamsResponse.statusText)

    // Get the league data (already checked that response is ok)
    const leagueData = await leagueResponse.json()
    console.log('Current league data:', JSON.stringify(leagueData, null, 2))
    
    const renewInfo = leagueData?.fantasy_content?.league?.[0]?.renew
    console.log('Renew info (previous season):', renewInfo)

    let historicalData = null
    if (renewInfo) {
      // Try to get last season's league
      const previousLeagueKey = renewInfo // Should be format like "454_3674"
      console.log('Attempting to fetch historical league:', previousLeagueKey)
      
      const historicalResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${previousLeagueKey}?format=json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'UAFBL Fantasy Tracker'
        }
      })
      
      if (historicalResponse.ok) {
        historicalData = await historicalResponse.json()
        console.log('Historical league data:', JSON.stringify(historicalData, null, 2))
      } else {
        const histErrorText = await historicalResponse.text()
        console.log('Historical league request failed:', historicalResponse.status, historicalResponse.statusText, histErrorText)
      }
    }

    // Try to get all games/seasons this user has participated in
    const allGamesResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    const teamsData = teamsResponse.ok ? await teamsResponse.json() : null
    const allGamesData = allGamesResponse.ok ? await allGamesResponse.json() : null

    console.log('Teams data:', JSON.stringify(teamsData, null, 2))
    console.log('All games data:', JSON.stringify(allGamesData, null, 2))

    return NextResponse.json({
      currentLeague: leagueData,
      teams: teamsData,
      historicalLeague: historicalData,
      allGames: allGamesData,
      message: 'Urban Achievers league exploration complete!'
    })

  } catch (error) {
    console.error('League details error:', error)
    return NextResponse.json({ error: 'Failed to fetch league details' }, { status: 500 })
  }
}