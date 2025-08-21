import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  try {
    // Get ALL players using pagination to bypass Supabase default limits
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

    // Sort by name after collecting all players
    allPlayers.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(allPlayers)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { name } = body
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }
    
    // Check if player already exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', name.trim())
      .single()
    
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player already exists' }, { status: 409 })
    }
    
    // Find the highest used ID under 2000 for new players
    // This follows our process of using IDs < 2000 to avoid conflicts with 
    // future Basketball Monster IDs which will be in the 6000s-7000s range
    const { data: existingLowIds } = await supabase
      .from('players')
      .select('id')
      .lt('id', 2000)
      .order('id', { ascending: false })
      .limit(1)
    
    let newId = 1
    if (existingLowIds && existingLowIds.length > 0) {
      newId = (existingLowIds[0] as { id: number }).id + 1
    }
    
    // Ensure we don't exceed our threshold
    if (newId >= 2000) {
      return NextResponse.json({ error: 'No available low IDs under 2000' }, { status: 500 })
    }
    
    // Create new player with low ID
    const { data, error } = await supabase
      .from('players')
      .insert([{ id: newId, name: name.trim() }])
      .select('id, name')
      .single()
    
    if (error) {
      console.error('Error creating player:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}