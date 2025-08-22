import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    // Find the current active season
    const { data: activeSeason, error: activeSeasonError } = await supabase
      .from('seasons')
      .select('id, year, name, is_offseason')
      .eq('is_active', true)
      .single()

    if (activeSeasonError || !activeSeason) {
      console.error('Error finding active season:', activeSeasonError)
      return NextResponse.json({ error: 'No active season found' }, { status: 404 })
    }

    // Type the season data for use throughout the function
    const seasonData = activeSeason as { id: number; year: number; name: string; is_offseason: boolean }
    
    // Check if already in offseason
    if (seasonData.is_offseason) {
      return NextResponse.json({ 
        error: `Season ${seasonData.name} (${seasonData.year}) is already in offseason mode` 
      }, { status: 400 })
    }

    // Update the active season to set is_offseason = true
    const { error: updateError } = await supabase
      .from('seasons')
      .update({ is_offseason: true })
      .eq('id', seasonData.id)

    if (updateError) {
      console.error('Error updating season to offseason:', updateError)
      return NextResponse.json({ error: 'Failed to start offseason' }, { status: 500 })
    }

    console.log(`Successfully started offseason for season ${seasonData.name} (${seasonData.year})`)

    return NextResponse.json({
      success: true,
      message: `Offseason started for ${seasonData.name} (${seasonData.year})`
    })

  } catch (error) {
    console.error('Error in start-offseason operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}