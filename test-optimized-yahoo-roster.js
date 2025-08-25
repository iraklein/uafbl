const { createClient } = require('@supabase/supabase-js');

// Test the optimized Yahoo roster temp table
async function testOptimizedRosterImport() {
  const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('🚀 Testing optimized Yahoo roster import...\n');
    
    // First, get some manager IDs from your actual managers table
    console.log('🔍 Fetching manager IDs from database...');
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name')
      .limit(5);
    
    if (managersError) {
      console.error('❌ Error fetching managers:', managersError);
      return;
    }
    
    console.log(`✅ Found ${managers.length} managers:`);
    managers.forEach(m => console.log(`   - ${m.manager_name} (ID: ${m.id})`));
    
    // Create optimized mock roster data using actual manager IDs
    const mockRosterData = [
      {
        team_key: '466.l.5701.t.1',
        manager_id: managers[0]?.id,
        yahoo_player_id: '3704',  // LeBron James
        status: 'active',
        raw_data: { 
          player_id: '3704', 
          name: { full: 'LeBron James' },
          eligible_positions: ['SF', 'PF'],
          status: 'active'
        }
      },
      {
        team_key: '466.l.5701.t.1',
        manager_id: managers[0]?.id,
        yahoo_player_id: '5583',  // Stephen Curry
        status: 'active',
        raw_data: { 
          player_id: '5583', 
          name: { full: 'Stephen Curry' },
          eligible_positions: ['PG'],
          status: 'active'
        }
      },
      {
        team_key: '466.l.5701.t.2',
        manager_id: managers[1]?.id || managers[0]?.id,
        yahoo_player_id: '4563',  // Kevin Durant
        status: 'active',
        raw_data: { 
          player_id: '4563', 
          name: { full: 'Kevin Durant' },
          eligible_positions: ['SF', 'PF'],
          status: 'active'
        }
      },
      {
        team_key: '466.l.5701.t.3',
        manager_id: managers[2]?.id || managers[0]?.id,
        yahoo_player_id: '3818',  // Giannis Antetokounmpo
        status: 'active',
        raw_data: { 
          player_id: '3818', 
          name: { full: 'Giannis Antetokounmpo' },
          eligible_positions: ['PF', 'C'],
          status: 'active'
        }
      }
    ];
    
    console.log('\n🧹 Clearing existing test data...');
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .like('team_key', '466.l.5701.t.%');
    
    if (deleteError) {
      console.log('Note: Error clearing test data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing test data');
    }
    
    console.log('💾 Inserting optimized roster data...');
    const { data: insertedData, error: insertError } = await supabase
      .from('yahoo_rosters_temp')
      .insert(mockRosterData)
      .select(`
        id,
        team_key,
        manager_id,
        yahoo_player_id,
        status,
        imported_at,
        managers!inner(manager_name)
      `);
    
    if (insertError) {
      console.error('❌ Error inserting optimized data:', insertError);
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedData.length} roster entries`);
    
    // Now test the lookup functionality - join with players table
    console.log('\n🔍 Testing player lookup with Yahoo IDs...');
    const { data: rosterWithPlayers, error: lookupError } = await supabase
      .from('yahoo_rosters_temp')
      .select(`
        team_key,
        yahoo_player_id,
        status,
        managers!inner(manager_name),
        players!inner(id, name, yahoo_player_id)
      `)
      .like('team_key', '466.l.5701.t.%');
    
    if (lookupError) {
      console.log('Note: Player lookup error (some Yahoo IDs may not be mapped):', lookupError.message);
      
      // Fallback: show what we have in temp table
      const { data: tempData } = await supabase
        .from('yahoo_rosters_temp')
        .select(`
          team_key,
          yahoo_player_id,
          status,
          managers!inner(manager_name)
        `)
        .like('team_key', '466.l.5701.t.%');
      
      console.log('📋 Roster data without player lookup:');
      tempData?.forEach(entry => {
        console.log(`   - Yahoo ID ${entry.yahoo_player_id} on Team ${entry.team_key} (${entry.managers.manager_name})`);
      });
    } else {
      console.log('✅ Player lookup successful!');
      console.log('\n📋 Complete roster data with player names:');
      
      const teamSummary = {};
      rosterWithPlayers.forEach(entry => {
        const teamKey = entry.team_key;
        if (!teamSummary[teamKey]) {
          teamSummary[teamKey] = {
            manager: entry.managers.manager_name,
            players: []
          };
        }
        teamSummary[teamKey].players.push({
          name: entry.players.name,
          yahoo_id: entry.yahoo_player_id,
          player_id: entry.players.id,
          status: entry.status
        });
      });
      
      Object.entries(teamSummary).forEach(([teamKey, teamData]) => {
        console.log(`\n🏀 ${teamKey} (${teamData.manager}):`);
        teamData.players.forEach(player => {
          console.log(`   - ${player.name} (Yahoo: ${player.yahoo_id}, DB: ${player.player_id}) [${player.status}]`);
        });
      });
    }
    
    console.log(`\n✅ Optimized Yahoo roster test completed!`);
    console.log('📊 Benefits of new structure:');
    console.log('   - No redundant data (player names, positions stored in main tables)');
    console.log('   - Foreign key constraints ensure data integrity');
    console.log('   - Smaller table size and faster queries');
    console.log('   - Easy joins with existing managers and players tables');
    
  } catch (error) {
    console.error('❌ Optimized roster test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOptimizedRosterImport();
}

module.exports = { testOptimizedRosterImport };