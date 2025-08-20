import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    
    const { data, error } = await supabase
      .from('lsl')
      .select(`
        *,
        players(name),
        original_managers:managers!original_manager_id(manager_name),
        draft_managers:managers!draft_manager_id(manager_name)
      `)
      .order('year', { ascending: true })
      .order('draft_order', { ascending: true })

    if (error) {
      console.error('LSL API Error:', error)
      return NextResponse.json({ error: 'Failed to fetch LSL data' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('LSL API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}