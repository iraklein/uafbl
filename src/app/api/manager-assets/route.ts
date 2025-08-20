import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET() {
  try {
    // Get the active season
    const { data: seasonData, error: seasonError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active')
      .eq('is_active', true)
      .single()

    if (seasonError) {
      console.error('Active Season Query Error:', seasonError)
    }

    // Get manager assets
    const { data, error } = await supabase
      .from('managers_assets')
      .select(`
        *,
        managers(manager_name)
      `)

    if (error) {
      console.error('Manager Assets API Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      assets: data || [],
      activeSeason: seasonData || null
    })
  } catch (error) {
    console.error('Manager Assets API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}