import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get raw stored base values (not calculated ones)
    const { data: assets, error } = await supabase
      .from('managers_assets')
      .select(`
        id,
        manager_id,
        available_cash,
        available_slots,
        managers!inner (manager_name)
      `)

    if (error) {
      console.error('Error fetching manager base assets:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort alphabetically by manager name on the server side
    const sortedAssets = (assets || []).sort((a: any, b: any) => 
      a.managers.manager_name.localeCompare(b.managers.manager_name)
    )

    return NextResponse.json({ assets: sortedAssets })

  } catch (error) {
    console.error('Error in manager base assets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}