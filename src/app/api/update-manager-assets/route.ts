import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { assetId, availableCash, availableSlots, reason } = body
    
    if (!assetId || availableCash === undefined || availableSlots === undefined) {
      return NextResponse.json({ 
        error: 'assetId, availableCash, and availableSlots are required' 
      }, { status: 400 })
    }
    
    // Validate numeric values
    if (isNaN(availableCash) || isNaN(availableSlots) || availableCash < 0 || availableSlots < 0) {
      return NextResponse.json({ 
        error: 'availableCash and availableSlots must be non-negative numbers' 
      }, { status: 400 })
    }
    
    console.log(`Updating manager asset ${assetId}: cash=${availableCash}, slots=${availableSlots}`)
    
    // Get current values and admin info for audit trail
    const { data: currentAsset, error: fetchError } = await supabase
      .from('managers_assets')
      .select('available_cash, available_slots, change_history, managers(manager_name, email)')
      .eq('id', assetId)
      .single()
    
    if (fetchError || !currentAsset) {
      return NextResponse.json({ error: 'Manager asset not found' }, { status: 404 })
    }
    
    // Get admin user info
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = user?.email || 'unknown'
    
    // Build change record for audit trail
    const changes: any = {}
    const oldCash = currentAsset.available_cash || 0
    const oldSlots = currentAsset.available_slots || 0
    
    if (oldCash !== availableCash) {
      changes.available_cash = { from: oldCash, to: availableCash }
    }
    if (oldSlots !== availableSlots) {
      changes.available_slots = { from: oldSlots, to: availableSlots }
    }
    
    // Create audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      admin_email: adminEmail,
      manager_name: currentAsset.managers?.manager_name || 'Unknown',
      changes: changes,
      reason: reason || 'No reason provided'
    }
    
    // Append to existing change history
    const currentHistory = currentAsset.change_history || []
    const newHistory = [...currentHistory, auditEntry]
    
    // Update the manager asset with new values and history
    const { data: updatedAsset, error: updateError } = await supabase
      .from('managers_assets')
      .update({
        available_cash: availableCash,
        available_slots: availableSlots,
        change_history: newHistory
      })
      .eq('id', assetId)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error updating manager asset:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    if (!updatedAsset) {
      return NextResponse.json({ error: 'Manager asset not found' }, { status: 404 })
    }
    
    console.log('Successfully updated manager asset')
    
    return NextResponse.json({
      success: true,
      message: 'Manager asset updated successfully',
      asset: updatedAsset
    })
    
  } catch (error) {
    console.error('Error in update manager assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}