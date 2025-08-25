const { createClient } = require('@supabase/supabase-js');

// Test the temp table with mock Yahoo roster data
async function testTempTable() {
  const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('🚀 Testing yahoo_rosters_temp table functionality...\n');
    
    // Verify table exists
    console.log('🔍 Checking if yahoo_rosters_temp table exists...');
    const { error: checkError } = await supabase
      .from('yahoo_rosters_temp')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Table check failed:', checkError);
      return;
    }
    
    console.log('✅ Table exists and is accessible');
    
    // Create mock Yahoo roster data
    const mockRosterData = [
      {
        league_id: 'test_league_456',
        team_key: '435.l.456.t.1',
        team_name: 'Test Team Alpha',
        manager_name: 'Test Manager One',
        yahoo_player_id: '3704',
        player_name: 'LeBron James',
        player_positions: ['SF', 'PF'],
        status: 'active',
        raw_data: { 
          player_id: '3704', 
          name: { full: 'LeBron James' },
          eligible_positions: ['SF', 'PF'],
          test_data: true 
        },
        season_year: 2025
      },
      {
        league_id: 'test_league_456',
        team_key: '435.l.456.t.1',
        team_name: 'Test Team Alpha',
        manager_name: 'Test Manager One',
        yahoo_player_id: '5583',
        player_name: 'Stephen Curry',
        player_positions: ['PG'],
        status: 'active',
        raw_data: { 
          player_id: '5583', 
          name: { full: 'Stephen Curry' },
          eligible_positions: ['PG'],
          test_data: true 
        },
        season_year: 2025
      },
      {
        league_id: 'test_league_456',
        team_key: '435.l.456.t.2',
        team_name: 'Test Team Beta',
        manager_name: 'Test Manager Two',
        yahoo_player_id: '4563',
        player_name: 'Kevin Durant',
        player_positions: ['SF', 'PF'],
        status: 'active',
        raw_data: { 
          player_id: '4563', 
          name: { full: 'Kevin Durant' },
          eligible_positions: ['SF', 'PF'],
          test_data: true 
        },
        season_year: 2025
      },
      {
        league_id: 'test_league_456',
        team_key: '435.l.456.t.3',
        team_name: 'Test Team Gamma',
        manager_name: 'Test Manager Three',
        yahoo_player_id: '3818',
        player_name: 'Giannis Antetokounmpo',
        player_positions: ['PF', 'C'],
        status: 'active',
        raw_data: { 
          player_id: '3818', 
          name: { full: 'Giannis Antetokounmpo' },
          eligible_positions: ['PF', 'C'],
          test_data: true 
        },
        season_year: 2025
      }
    ];
    
    console.log('🧹 Clearing any existing test data...');
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .eq('league_id', 'test_league_456');
    
    if (deleteError) {
      console.log('Note: Error clearing test data (may not exist yet):', deleteError.message);
    } else {
      console.log('✅ Cleared existing test data');
    }
    
    console.log('💾 Inserting mock Yahoo roster data...');
    const { data: insertedData, error: insertError } = await supabase
      .from('yahoo_rosters_temp')
      .insert(mockRosterData)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting mock data:', insertError);
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedData.length} mock roster entries`);
    
    // Query back to verify data structure
    console.log('🔍 Verifying inserted data...');
    const { data: queryData, error: queryError } = await supabase
      .from('yahoo_rosters_temp')
      .select('*')
      .eq('league_id', 'test_league_456')
      .order('team_name', { ascending: true });
    
    if (queryError) {
      console.error('❌ Error querying data:', queryError);
      return;
    }
    
    console.log(`✅ Successfully queried ${queryData.length} entries from temp table`);
    
    // Show summary by team
    const teamSummary = {};
    queryData.forEach(entry => {
      if (!teamSummary[entry.team_name]) {
        teamSummary[entry.team_name] = {
          manager: entry.manager_name,
          players: []
        };
      }
      teamSummary[entry.team_name].players.push({
        name: entry.player_name,
        yahoo_id: entry.yahoo_player_id,
        positions: entry.player_positions
      });
    });
    
    console.log('\n📊 Imported Roster Summary:');
    Object.entries(teamSummary).forEach(([teamName, teamData]) => {
      console.log(`\n🏀 ${teamName} (${teamData.manager}):`);
      teamData.players.forEach(player => {
        console.log(`   - ${player.name} (ID: ${player.yahoo_id}) [${player.positions.join(', ')}]`);
      });
    });
    
    console.log(`\n✅ Yahoo roster temp table test completed successfully!`);
    console.log('📋 Summary:');
    console.log(`   - Table: yahoo_rosters_temp is working correctly`);
    console.log(`   - Teams: ${Object.keys(teamSummary).length}`);
    console.log(`   - Players: ${queryData.length}`);
    console.log(`   - League ID: test_league_456`);
    console.log(`   - Data includes: player names, Yahoo IDs, positions, team info, raw JSON`);
    
    console.log('\n🎯 Next steps:');
    console.log('1. Set up Yahoo OAuth to get real access tokens');
    console.log('2. Replace mock data with actual Yahoo API calls');
    console.log('3. Map Yahoo player IDs to your existing players table');
    console.log('4. Create production roster import workflow');
    
  } catch (error) {
    console.error('❌ Temp table test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testTempTable();
}

module.exports = { testTempTable };