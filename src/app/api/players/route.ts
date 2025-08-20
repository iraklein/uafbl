import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}