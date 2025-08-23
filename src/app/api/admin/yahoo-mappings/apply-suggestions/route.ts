import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { approvedSuggestions } = body
    
    if (!approvedSuggestions || !Array.isArray(approvedSuggestions)) {
      return NextResponse.json({ error: 'approvedSuggestions array is required' }, { status: 400 })
    }
    
    console.log(`Applying ${approvedSuggestions.length} approved mapping suggestions...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const suggestion of approvedSuggestions) {
      try {
        const { error } = await supabase
          .from('yahoo_player_mappings')
          .update({
            uafbl_player_id: suggestion.uafbl_player_id,
            is_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', suggestion.yahoo_mapping_id)
        
        if (error) {
          console.error(`Error applying suggestion for ${suggestion.yahoo_name}:`, error)
          errorCount++
        } else {
          successCount++
          console.log(`✓ Mapped ${suggestion.yahoo_name} → ${suggestion.uafbl_name}`)
        }
        
      } catch (err) {
        console.error(`Error processing suggestion for ${suggestion.yahoo_name}:`, err)
        errorCount++
      }
    }
    
    console.log(`Auto-mapping complete: ${successCount} successful, ${errorCount} errors`)
    
    return NextResponse.json({
      message: `Applied ${successCount} mappings successfully${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
      successCount,
      errorCount
    })
    
  } catch (error) {
    console.error('Error applying suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}