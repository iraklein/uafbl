import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  try {
    const tradeId = parseInt(params.id)

    if (!tradeId || isNaN(tradeId)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 })
    }

    // Delete the trade
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Trade deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}