const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read the extracted trades data
const tradesData = JSON.parse(fs.readFileSync('2025-trades-data.json', 'utf8'));

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importTrades() {
  try {
    console.log('🔄 Starting trade import...');
    
    // Get 2025 season ID (season_id = 20 based on the pattern)
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', 2025)
      .single();
    
    if (seasonError) {
      console.error('❌ Error finding 2025 season:', seasonError);
      return;
    }
    
    const seasonId = season.id;
    console.log(`✅ Found season ID: ${seasonId}`);
    
    // Get all managers to map names to IDs
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name');
    
    if (managersError) {
      console.error('❌ Error fetching managers:', managersError);
      return;
    }
    
    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name] = manager.id;
    });
    
    console.log('✅ Manager mapping:', managerMap);
    
    // Filter and process valid trades
    const validTrades = tradesData.filter(trade => 
      trade['Trade From:'] && 
      trade['Trade To'] && 
      trade.Status === 'Accepted'
    );
    
    console.log(`📊 Found ${validTrades.length} valid accepted trades`);
    
    const tradesToInsert = [];
    
    validTrades.forEach((trade, index) => {
      const proposerName = trade['Trade From:'];
      const receiverName = trade['Trade To'];
      
      const proposerId = managerMap[proposerName];
      const receiverId = managerMap[receiverName];
      
      if (!proposerId || !receiverId) {
        console.warn(`⚠️  Skipping trade ${index + 1}: Unknown manager(s) - ${proposerName} -> ${receiverName}`);
        return;
      }
      
      const tradeRecord = {
        season_id: seasonId,
        proposer_manager_id: proposerId,
        receiver_manager_id: receiverId,
        proposer_cash: trade.Cash || 0,
        proposer_slots: trade.Slots || 0,
        proposer_players: [], // Empty array as requested
        receiver_cash: trade.Cash_1 || 0,
        receiver_slots: trade.Slots_1 || 0,
        receiver_players: [], // Empty array as requested
        status: 'accepted',
        message: '',
        created_at: trade['Proposed On'] ? new Date(trade['Proposed On']).toISOString() : new Date().toISOString(),
        responded_at: trade.Date ? new Date(trade.Date).toISOString() : new Date().toISOString()
      };
      
      tradesToInsert.push(tradeRecord);
      
      console.log(`✅ Trade ${index + 1}: ${proposerName} -> ${receiverName} | Cash: ${tradeRecord.proposer_cash}->${tradeRecord.receiver_cash} | Slots: ${tradeRecord.proposer_slots}->${tradeRecord.receiver_slots}`);
    });
    
    console.log(`\n🚀 Inserting ${tradesToInsert.length} trades into database...`);
    
    // Insert trades
    const { data: insertedTrades, error: insertError } = await supabase
      .from('trades')
      .insert(tradesToInsert)
      .select('id');
    
    if (insertError) {
      console.error('❌ Error inserting trades:', insertError);
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedTrades.length} trades!`);
    
    // Now update manager assets with the trade totals
    console.log('\n🔄 Updating manager assets...');
    
    for (const trade of tradesToInsert) {
      // Update proposer (sender)
      if (trade.proposer_cash > 0 || trade.proposer_slots > 0) {
        const { error: proposerError } = await supabase
          .from('managers_assets')
          .update({
            total_cash_sent: supabase.sql`total_cash_sent + ${trade.proposer_cash}`,
            total_slots_sent: supabase.sql`total_slots_sent + ${trade.proposer_slots}`
          })
          .eq('manager_id', trade.proposer_manager_id)
          .eq('season_id', seasonId);
        
        if (proposerError) {
          console.warn(`⚠️  Error updating proposer assets:`, proposerError);
        }
      }
      
      // Update receiver
      if (trade.receiver_cash > 0 || trade.receiver_slots > 0) {
        const { error: receiverError } = await supabase
          .from('managers_assets')
          .update({
            total_cash_sent: supabase.sql`total_cash_sent + ${trade.receiver_cash}`,
            total_slots_sent: supabase.sql`total_slots_sent + ${trade.receiver_slots}`
          })
          .eq('manager_id', trade.receiver_manager_id)
          .eq('season_id', seasonId);
        
        if (receiverError) {
          console.warn(`⚠️  Error updating receiver assets:`, receiverError);
        }
      }
      
      // Update received amounts
      if (trade.proposer_cash > 0 || trade.proposer_slots > 0) {
        const { error: receivedError } = await supabase
          .from('managers_assets')
          .update({
            total_cash_received: supabase.sql`total_cash_received + ${trade.proposer_cash}`,
            total_slots_received: supabase.sql`total_slots_received + ${trade.proposer_slots}`
          })
          .eq('manager_id', trade.receiver_manager_id)
          .eq('season_id', seasonId);
        
        if (receivedError) {
          console.warn(`⚠️  Error updating received assets:`, receivedError);
        }
      }
      
      if (trade.receiver_cash > 0 || trade.receiver_slots > 0) {
        const { error: receivedError2 } = await supabase
          .from('managers_assets')
          .update({
            total_cash_received: supabase.sql`total_cash_received + ${trade.receiver_cash}`,
            total_slots_received: supabase.sql`total_slots_received + ${trade.receiver_slots}`
          })
          .eq('manager_id', trade.proposer_manager_id)
          .eq('season_id', seasonId);
        
        if (receivedError2) {
          console.warn(`⚠️  Error updating received assets:`, receivedError2);
        }
      }
    }
    
    console.log('✅ Manager assets updated!');
    console.log('\n🎉 Trade import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

importTrades();