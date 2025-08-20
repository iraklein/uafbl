import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const draftPickId = parseInt(id)
    
    if (isNaN(draftPickId)) {
      return NextResponse.json(
        { error: 'Invalid draft pick ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { manager_id, draft_price, is_keeper, is_topper, topper_manager_ids } = body

    // Update the draft result
    const { error: draftError } = await supabase
      .from('draft_results')
      .update({
        manager_id,
        draft_price,
        is_keeper: is_keeper || false
      })
      .eq('id', draftPickId)

    if (draftError) {
      console.error('Error updating draft pick:', draftError)
      return NextResponse.json(
        { error: 'Failed to update draft pick' },
        { status: 500 }
      )
    }

    // Get the season_id and player_id from the draft result for topper management
    const { data: draftResult } = await supabase
      .from('draft_results')
      .select('season_id, player_id')
      .eq('id', draftPickId)
      .single()

    if (draftResult) {
      // First delete existing topper records for this player in this season
      const { error: deleteTopperError } = await supabase
        .from('toppers')
        .delete()
        .eq('player_id', draftResult.player_id)
        .eq('season_id', draftResult.season_id)

      if (deleteTopperError) {
        console.error('Error deleting existing toppers:', deleteTopperError)
      }

      // If this is a topper, create new topper records
      if (is_topper && topper_manager_ids && topper_manager_ids.length > 0) {
        const topperRecords = topper_manager_ids.map((managerId: number) => ({
          manager_id: managerId,
          player_id: draftResult.player_id,
          season_id: draftResult.season_id,
          is_winner: managerId === manager_id, // The winning manager is the one who drafted
          is_unused: false
        }))

        const { error: topperError } = await supabase
          .from('toppers')
          .insert(topperRecords)

        if (topperError) {
          console.error('Error creating topper records:', topperError)
          // Continue even if topper creation fails
        }
      }
    }

    return NextResponse.json(
      { message: 'Draft pick updated successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in PUT /api/draft-picks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const draftPickId = parseInt(id)
    
    if (isNaN(draftPickId)) {
      return NextResponse.json(
        { error: 'Invalid draft pick ID' },
        { status: 400 }
      )
    }

    // Get the draft result info first for topper deletion
    const { data: draftResult } = await supabase
      .from('draft_results')
      .select('season_id, player_id')
      .eq('id', draftPickId)
      .single()

    // Delete any related topper records for this player in this season
    if (draftResult) {
      const { error: topperError } = await supabase
        .from('toppers')
        .delete()
        .eq('player_id', draftResult.player_id)
        .eq('season_id', draftResult.season_id)

      if (topperError) {
        console.error('Error deleting toppers:', topperError)
        // Continue with deletion even if topper deletion fails
      }
    }

    // Delete the draft result
    const { error: draftError } = await supabase
      .from('draft_results')
      .delete()
      .eq('id', draftPickId)

    if (draftError) {
      console.error('Error deleting draft pick:', draftError)
      return NextResponse.json(
        { error: 'Failed to delete draft pick' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Draft pick deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in DELETE /api/draft-picks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}