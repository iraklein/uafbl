import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const cookieStore = cookies()
  const accessToken = cookieStore.get('yahoo_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Yahoo authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { start = 0, count = 25 } = body

    console.log(`Fetching Yahoo players ${start + 1}-${start + count}...`)

    // Get top players sorted by average rank from Yahoo with start and count parameters
    const playersResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/game/466/players;sort=AR;start=${start};count=${count}?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    if (!playersResponse.ok) {
      const errorText = await playersResponse.text()
      console.error('Yahoo API error:', errorText)
      return NextResponse.json({ error: 'Failed to fetch players from Yahoo' }, { status: 500 })
    }

    const playersData = await playersResponse.json()
    const players = playersData?.fantasy_content?.game?.[1]?.players || {}

    const playersArray = Object.keys(players)
      .filter(key => key !== 'count')
      .map(key => players[key]?.player?.[0])
      .filter(player => player && player.length > 0)

    console.log(`Found ${playersArray.length} players from Yahoo API`)

    let importedCount = 0
    let skippedCount = 0

    for (const playerData of playersArray) {
      try {
        // Extract player info from the Yahoo API format
        const playerId = playerData.find(item => item.player_id)?.player_id
        const playerKey = playerData.find(item => item.player_key)?.player_key
        const nameObj = playerData.find(item => item.name)?.name
        const positions = playerData.find(item => item.eligible_positions)?.eligible_positions || []
        const teamAbbr = playerData.find(item => item.editorial_team_abbr)?.editorial_team_abbr
        const teamFull = playerData.find(item => item.editorial_team_full_name)?.editorial_team_full_name
        const uniformNumber = playerData.find(item => item.uniform_number)?.uniform_number
        const imageUrl = playerData.find(item => item.image_url)?.image_url

        if (!playerId || !playerKey || !nameObj) {
          console.log('Skipping player with missing data:', playerData)
          continue
        }

        // Convert positions array to string
        const positionsString = positions.map(p => p.position).join(', ')

        // Check if this player already exists
        const { data: existing, error: existingError } = await supabase
          .from('yahoo_player_mappings')
          .select('id')
          .eq('yahoo_player_id', playerId)
          .single()

        if (existing) {
          skippedCount++
          continue
        }

        // Insert new mapping
        const { error: insertError } = await supabase
          .from('yahoo_player_mappings')
          .insert({
            yahoo_player_id: playerId,
            yahoo_player_key: playerKey,
            yahoo_name_full: nameObj.full,
            yahoo_name_first: nameObj.first,
            yahoo_name_last: nameObj.last,
            yahoo_name_ascii_full: nameObj.ascii_first && nameObj.ascii_last 
              ? `${nameObj.ascii_first} ${nameObj.ascii_last}` 
              : nameObj.full,
            yahoo_positions: positionsString,
            yahoo_team_abbr: teamAbbr,
            yahoo_team_full: teamFull,
            yahoo_uniform_number: uniformNumber,
            yahoo_image_url: imageUrl,
            is_verified: false
          })

        if (insertError) {
          console.error('Error inserting player:', insertError)
        } else {
          importedCount++
          console.log(`Imported: ${nameObj.full}`)
        }

      } catch (playerError) {
        console.error('Error processing player:', playerError)
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${importedCount} players from range ${start + 1}-${start + count} (${skippedCount} already existed)`,
      imported: importedCount,
      skipped: skippedCount,
      range: `${start + 1}-${start + count}`
    })

  } catch (error) {
    console.error('Error importing top players:', error)
    return NextResponse.json({ error: 'Failed to import top players' }, { status: 500 })
  }
}