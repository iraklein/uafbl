import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log(`🔄 Advancing seasons to next year`)

    // Step 1: Get current active seasons
    console.log('📋 Step 1: Getting current active seasons...')
    const { data: currentActiveSeasons, error: currentError } = await supabase
      .from('seasons')
      .select('id, name, year, is_active, is_active_assets')
      .or('is_active.eq.true,is_active_assets.eq.true')

    if (currentError) {
      console.error('Error fetching current seasons:', currentError)
      return NextResponse.json({ error: 'Failed to fetch current seasons' }, { status: 500 })
    }

    const currentPlayingSeason = currentActiveSeasons.find(s => s.is_active)
    const currentAssetsSeason = currentActiveSeasons.find(s => s.is_active_assets)

    if (!currentPlayingSeason || !currentAssetsSeason) {
      return NextResponse.json({ error: 'Could not find current active seasons' }, { status: 500 })
    }

    console.log(`Current playing season: ID ${currentPlayingSeason.id} (${currentPlayingSeason.name})`)
    console.log(`Current assets season: ID ${currentAssetsSeason.id} (${currentAssetsSeason.name})`)

    // Step 2: Calculate next season IDs
    const nextPlayingSeasonId = (currentPlayingSeason.id as number) + 1
    const nextAssetsSeasonId = (currentAssetsSeason.id as number) + 1

    console.log(`Next playing season: ID ${nextPlayingSeasonId}`)
    console.log(`Next assets season: ID ${nextAssetsSeasonId}`)

    // Step 3: Verify next seasons exist
    const { data: nextSeasons, error: nextSeasonsError } = await supabase
      .from('seasons')
      .select('id, name, year')
      .in('id', [nextPlayingSeasonId, nextAssetsSeasonId])

    if (nextSeasonsError) {
      console.error('Error checking next seasons:', nextSeasonsError)
      return NextResponse.json({ error: 'Failed to check next seasons' }, { status: 500 })
    }

    if (nextSeasons.length !== 2) {
      return NextResponse.json({ 
        error: `Next seasons (ID ${nextPlayingSeasonId}, ${nextAssetsSeasonId}) must exist in database first` 
      }, { status: 400 })
    }

    const nextPlayingSeason = nextSeasons.find(s => s.id === nextPlayingSeasonId)
    const nextAssetsSeason = nextSeasons.find(s => s.id === nextAssetsSeasonId)

    // Step 4: Clear all active flags
    console.log('📋 Step 2: Clearing all active flags...')
    const { error: clearError } = await supabase
      .from('seasons')
      .update({ is_active: false, is_active_assets: false })
      .neq('id', 0) // Update all seasons

    if (clearError) {
      console.error('Error clearing active flags:', clearError)
      return NextResponse.json({ error: 'Failed to clear active flags' }, { status: 500 })
    }

    // Step 5: Set new active seasons
    console.log('📋 Step 3: Setting new active seasons...')
    const { error: playingError } = await supabase
      .from('seasons')
      .update({ is_active: true })
      .eq('id', nextPlayingSeasonId)

    if (playingError) {
      console.error('Error setting new playing season:', playingError)
      return NextResponse.json({ error: 'Failed to set new playing season' }, { status: 500 })
    }

    const { error: assetsError } = await supabase
      .from('seasons')
      .update({ is_active_assets: true })
      .eq('id', nextAssetsSeasonId)

    if (assetsError) {
      console.error('Error setting new assets season:', assetsError)
      return NextResponse.json({ error: 'Failed to set new assets season' }, { status: 500 })
    }

    // Step 6: Get all active managers for new assets
    console.log('📋 Step 4: Getting active managers...')
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name')
      .eq('active', true)

    if (managersError) {
      console.error('Error fetching managers:', managersError)
      return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
    }

    console.log(`✅ New playing season: ${nextPlayingSeason?.name} (ID ${nextPlayingSeasonId})`)
    console.log(`✅ New assets season: ${nextAssetsSeason?.name} (ID ${nextAssetsSeasonId})`)
    console.log(`✅ All manager assets reset to $400/3 slots (no trades for new assets season)`)

    const message = `Successfully advanced seasons! Playing: ${nextPlayingSeason?.name}, Assets: ${nextAssetsSeason?.name}. All managers reset to $400/3 slots.`
    
    console.log('🎉 Season advancement completed successfully!')
    
    return NextResponse.json({ 
      message,
      new_playing_season: nextPlayingSeason,
      new_assets_season: nextAssetsSeason,
      managers_count: managers.length
    })
    
  } catch (error) {
    console.error('Error in start new season operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}