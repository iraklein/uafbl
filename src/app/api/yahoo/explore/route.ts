import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('yahoo_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Yahoo' }, { status: 401 })
  }

  try {
    console.log('Starting Yahoo Fantasy API exploration with token:', accessToken?.substring(0, 10) + '...')

    // Skip user info for now, go straight to Fantasy Sports
    // Try to get user's leagues
    const leaguesResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nba/leagues?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    console.log('Leagues response status:', leaguesResponse.status, leaguesResponse.statusText)

    if (!leaguesResponse.ok) {
      const errorText = await leaguesResponse.text()
      console.error('Leagues request failed:', {
        status: leaguesResponse.status,
        statusText: leaguesResponse.statusText,
        response: errorText
      })
      return NextResponse.json({ 
        error: 'Failed to get leagues',
        details: errorText,
        status: leaguesResponse.status,
        token: accessToken?.substring(0, 10) + '...'
      }, { status: 500 })
    }

    const leaguesData = await leaguesResponse.json()
    console.log('Leagues data:', JSON.stringify(leaguesData, null, 2))

    return NextResponse.json({
      leaguesData,
      message: 'Yahoo Fantasy API connection successful!',
      accessTokenPreview: accessToken?.substring(0, 10) + '...'
    })

  } catch (error) {
    console.error('Yahoo API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Yahoo data' }, { status: 500 })
  }
}