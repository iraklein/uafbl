import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  try {
    const { seasonId } = await request.json()

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Get all active managers
    const { data: activeManagers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name')
      .eq('active', true)

    if (managersError) {
      console.error('Error fetching active managers:', managersError)
      return NextResponse.json({ error: 'Failed to fetch active managers' }, { status: 500 })
    }

    if (!activeManagers || activeManagers.length === 0) {
      return NextResponse.json({ error: 'No active managers found' }, { status: 404 })
    }

    // Check if assets already exist for this season
    const { data: existingAssets, error: assetsCheckError } = await supabase
      .from('managers_assets')
      .select('manager_id')
      .eq('season_id', seasonId)

    if (assetsCheckError) {
      console.error('Error checking existing assets:', assetsCheckError)
      return NextResponse.json({ error: 'Failed to check existing assets' }, { status: 500 })
    }

    if (existingAssets && existingAssets.length > 0) {
      return NextResponse.json({ 
        error: `Assets already exist for ${existingAssets.length} managers in this season`,
        existingCount: existingAssets.length 
      }, { status: 409 })
    }

    // Create asset records for all active managers
    const assetRecords = activeManagers.map(manager => ({
      manager_id: manager.id,
      season_id: seasonId,
      available_cash: 400,
      available_slots: 3
    }))

    const { data: insertedAssets, error: insertError } = await supabase
      .from('managers_assets')
      .insert(assetRecords)
      .select()

    if (insertError) {
      console.error('Error inserting manager assets:', insertError)
      return NextResponse.json({ error: 'Failed to initialize manager assets' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully initialized assets for ${activeManagers.length} active managers`,
      managersInitialized: activeManagers.length,
      seasonId: seasonId
    })

  } catch (error) {
    console.error('Initialize Season API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}