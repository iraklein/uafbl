const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Read the extracted trades data
const tradesData = JSON.parse(fs.readFileSync('2025-trades-data.json', 'utf8'));

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function importTrades() {
  try {
    console.log('🔄 Starting trade import...');
    
    // Use season ID 19 as requested
    const seasonId = 19;
    console.log(`✅ Using season ID: ${seasonId}`);
    
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
    
    // Insert trades (IDs will auto-increment starting from 1)
    const { data: insertedTrades, error: insertError } = await supabase
      .from('trades')
      .insert(tradesToInsert)
      .select('id');
    
    if (insertError) {
      console.error('❌ Error inserting trades:', insertError);
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedTrades.length} trades!`);
    console.log('📝 Trade IDs:', insertedTrades.map(t => t.id));
    
    console.log('\n🎉 Trade import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

importTrades();