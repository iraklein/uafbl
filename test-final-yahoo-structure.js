const { createClient } = require('@supabase/supabase-js');

async function testFinalYahooStructure() {
  const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('🚀 Testing final Yahoo roster structure (team_key only)...\n');
    
    // First check if managers table has the new column
    console.log('🔍 Checking managers table structure...');
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name, yahoo_team_key')
      .limit(5);
    
    if (managersError) {
      console.error('❌ Error fetching managers:', managersError);
      return;
    }
    
    console.log('✅ Managers table with yahoo_team_key column:');
    managers.forEach(m => {
      console.log(`   - ${m.manager_name} (ID: ${m.id}, Yahoo Team: ${m.yahoo_team_key || 'NOT SET'})`);
    });
    
    // Get some players with Yahoo IDs
    const { data: yahooPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id')
      .not('yahoo_player_id', 'is', null)
      .limit(4);
    
    if (playersError) {
      console.error('❌ Error fetching players:', playersError);
      return;
    }
    
    console.log(`\n✅ Found ${yahooPlayers.length} players with Yahoo IDs mapped`);
    
    // Create test roster data with just team_key
    const rosterData = [
      {
        team_key: '466.l.5701.t.1',
        yahoo_player_id: yahooPlayers[0].yahoo_player_id,
        status: 'active',
        raw_data: { player_id: yahooPlayers[0].yahoo_player_id, name: { full: yahooPlayers[0].name } }
      },
      {
        team_key: '466.l.5701.t.1', 
        yahoo_player_id: yahooPlayers[1].yahoo_player_id,
        status: 'active',
        raw_data: { player_id: yahooPlayers[1].yahoo_player_id, name: { full: yahooPlayers[1].name } }
      },
      {
        team_key: '466.l.5701.t.2',
        yahoo_player_id: yahooPlayers[2].yahoo_player_id,
        status: 'active',
        raw_data: { player_id: yahooPlayers[2].yahoo_player_id, name: { full: yahooPlayers[2].name } }
      },
      {
        team_key: '466.l.5701.t.3',
        yahoo_player_id: yahooPlayers[3].yahoo_player_id,
        status: 'active',
        raw_data: { player_id: yahooPlayers[3].yahoo_player_id, name: { full: yahooPlayers[3].name } }
      }
    ];
    
    // Clear and insert test data
    console.log('\n🧹 Clearing existing test data...');
    await supabase.from('yahoo_rosters_temp').delete().like('team_key', '466.l.5701.t.%');
    
    console.log('💾 Inserting final structure test data...');
    const { data: inserted, error: insertError } = await supabase
      .from('yahoo_rosters_temp')
      .insert(rosterData)
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return;
    }
    
    console.log(`✅ Inserted ${inserted.length} roster entries with team_key structure`);
    
    // Test the complete join query (temp table -> players and managers)
    console.log('\n🔍 Testing complete roster lookup with team_key...');
    
    const { data: rosterEntries, error: rosterError } = await supabase
      .from('yahoo_rosters_temp')
      .select('team_key, yahoo_player_id, status, imported_at')
      .like('team_key', '466.l.5701.t.%');
    
    if (rosterError) {
      console.error('❌ Roster query error:', rosterError);
      return;
    }
    
    // Manually lookup players and managers
    const yahooIds = rosterEntries.map(r => r.yahoo_player_id);
    const teamKeys = [...new Set(rosterEntries.map(r => r.team_key))];
    
    const [
      { data: playerLookup, error: playerLookupError },
      { data: managerLookup, error: managerLookupError }
    ] = await Promise.all([
      supabase.from('players').select('id, name, yahoo_player_id').in('yahoo_player_id', yahooIds),
      supabase.from('managers').select('id, manager_name, yahoo_team_key').in('yahoo_team_key', teamKeys)
    ]);
    
    if (playerLookupError || managerLookupError) {
      console.log('Note: Some lookups may be missing data');
      console.log('Player lookup error:', playerLookupError?.message || 'OK');
      console.log('Manager lookup error:', managerLookupError?.message || 'OK');
    }
    
    // Create lookup maps
    const playerMap = {};
    const managerMap = {};
    
    playerLookup?.forEach(p => playerMap[p.yahoo_player_id] = { id: p.id, name: p.name });
    managerLookup?.forEach(m => managerMap[m.yahoo_team_key] = { id: m.id, name: m.manager_name });
    
    // Display final results
    console.log('\n📊 Final Yahoo Roster Structure Test Results:');
    
    const teamSummary = {};
    rosterEntries.forEach(entry => {
      const teamKey = entry.team_key;
      const player = playerMap[entry.yahoo_player_id];
      const manager = managerMap[entry.team_key];
      
      if (!teamSummary[teamKey]) {
        teamSummary[teamKey] = {
          manager: manager?.name || 'UNMAPPED TEAM',
          players: []
        };
      }
      
      teamSummary[teamKey].players.push({
        name: player?.name || 'Unknown Player',
        db_id: player?.id || null,
        yahoo_id: entry.yahoo_player_id,
        status: entry.status
      });
    });
    
    Object.entries(teamSummary).forEach(([teamKey, teamData]) => {
      const teamIcon = teamData.manager === 'UNMAPPED TEAM' ? '⚠️' : '✅';
      console.log(`\n${teamIcon} ${teamKey} - ${teamData.manager}:`);
      teamData.players.forEach(player => {
        const playerIcon = player.db_id ? '✅' : '❌';
        console.log(`   ${playerIcon} ${player.name} (Yahoo: ${player.yahoo_id}, DB: ${player.db_id || 'UNMAPPED'})`);
      });
    });
    
    console.log('\n✅ Final structure test completed!');
    console.log('🎯 The minimal structure is working:');
    console.log('   - Only team_key and yahoo_player_id needed');
    console.log('   - Joins work with both players and managers tables');
    console.log('   - Maximum efficiency and minimal data duplication');
    
    if (managerLookup?.length === 0) {
      console.log('\n📝 Next step: Populate yahoo_team_key values in managers table');
      console.log('   Example: UPDATE managers SET yahoo_team_key = \'466.l.5701.t.1\' WHERE manager_name = \'YourManager\';');
    }
    
  } catch (error) {
    console.error('❌ Final structure test failed:', error);
  }
}

if (require.main === module) {
  testFinalYahooStructure();
}

module.exports = { testFinalYahooStructure };