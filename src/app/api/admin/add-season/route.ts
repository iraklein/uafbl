import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { name, year, isActive } = await request.json()

    if (!name || !year) {
      return NextResponse.json({ error: 'Season name and year are required' }, { status: 400 })
    }

    // If this season should be active, deactivate all other seasons first
    if (isActive) {
      const { error: deactivateError } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', 0) // Update all seasons

      if (deactivateError) {
        console.error('Error deactivating existing seasons:', deactivateError)
        return NextResponse.json({ error: 'Failed to deactivate existing seasons' }, { status: 500 })
      }
    }

    // Check if season already exists
    const { data: existingSeason, error: checkError } = await supabase
      .from('seasons')
      .select('id, name, year')
      .eq('year', year)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing season:', checkError)
      return NextResponse.json({ error: 'Failed to check existing season' }, { status: 500 })
    }

    if (existingSeason) {
      return NextResponse.json({ 
        error: `Season ${existingSeason.name} already exists for year ${year}`,
        existingSeason 
      }, { status: 409 })
    }

    // Create new season
    const { data: newSeason, error: insertError } = await supabase
      .from('seasons')
      .insert({
        name: name,
        year: year,
        is_active: isActive || false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating new season:', insertError)
      return NextResponse.json({ error: 'Failed to create new season' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created season: ${name}`,
      season: newSeason
    })

  } catch (error) {
    console.error('Add Season API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}