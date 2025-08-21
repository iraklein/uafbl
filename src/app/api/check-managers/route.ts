import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get managers table structure and data
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('*')
      .limit(20)
    
    if (managersError) {
      return NextResponse.json({ error: managersError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      managers: managers,
      sampleManager: managers?.[0] || null
    })
    
  } catch (error) {
    console.error('Error checking managers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}