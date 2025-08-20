import { createServerSupabaseClient } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  try {
    
    const { data, error } = await supabase
      .from('toppers')
      .select(`
        *,
        managers(manager_name),
        players(name),
        seasons(year, name)
      `)
      .order('seasons(year)', { ascending: false })
      .order('managers(manager_name)', { ascending: true })

    if (error) {
      console.error('Toppers API Error:', error)
      return NextResponse.json({ error: 'Failed to fetch toppers data' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Toppers API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}