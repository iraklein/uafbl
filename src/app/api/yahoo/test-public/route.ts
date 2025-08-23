import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test public Yahoo Fantasy API endpoints that don't require OAuth
    const gameResponse = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/game/nba?format=json', {
      headers: {
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    if (!gameResponse.ok) {
      const errorText = await gameResponse.text()
      return NextResponse.json({ 
        error: `Yahoo API returned ${gameResponse.status}`, 
        details: errorText,
        status: gameResponse.status
      }, { status: 500 })
    }

    const gameData = await gameResponse.json()
    
    return NextResponse.json({
      message: 'Yahoo Fantasy API connection successful!',
      publicData: gameData,
      note: 'This is public game data. To access your leagues, you need OAuth authentication.'
    })

  } catch (error) {
    console.error('Yahoo API test error:', error)
    return NextResponse.json({ 
      error: 'Failed to connect to Yahoo API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}