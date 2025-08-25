const https = require('https');

// Test Yahoo roster pulling via our existing API infrastructure
async function testYahooRosterViaAPI() {
  try {
    console.log('🚀 Testing Yahoo roster import via existing API...\n');
    
    // First, let's test the public API to see if Yahoo is reachable
    console.log('🔍 Testing public Yahoo API connection...');
    
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/yahoo/test-public',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const publicTest = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });

    const result = await publicTest;
    
    if (result.status === 200) {
      console.log('✅ Public Yahoo API connection successful!');
      console.log(`   Current NBA season: ${result.data?.publicData?.fantasy_content?.game?.[0]?.season || 'Unknown'}`);
    } else {
      console.log(`❌ Public API test failed with status ${result.status}`);
      console.log('Response:', result.data);
    }
    
    console.log('\n📋 To test roster import with your Yahoo leagues:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Go to: http://localhost:3006/api/auth/yahoo');
    console.log('3. Complete Yahoo OAuth login');
    console.log('4. Once authenticated, use /api/yahoo/league-details to get your leagues');
    console.log('5. Then we can create a roster import endpoint');
    
    console.log('\n🔧 For now, let\'s create a mock roster structure to test our temp table:');
    
    // Create mock roster data for testing
    const mockRosterData = [
      {
        league_id: 'test_league_123',
        team_key: 'test.l.123.t.1',
        team_name: 'Team Alpha',
        manager_name: 'Manager One',
        yahoo_player_id: '3704',
        player_name: 'LeBron James',
        player_positions: ['SF', 'PF'],
        status: 'active',
        raw_data: { test: true },
        season_year: 2024
      },
      {
        league_id: 'test_league_123', 
        team_key: 'test.l.123.t.1',
        team_name: 'Team Alpha',
        manager_name: 'Manager One',
        yahoo_player_id: '5583',
        player_name: 'Stephen Curry',
        player_positions: ['PG'],
        status: 'active',
        raw_data: { test: true },
        season_year: 2024
      },
      {
        league_id: 'test_league_123',
        team_key: 'test.l.123.t.2', 
        team_name: 'Team Beta',
        manager_name: 'Manager Two',
        yahoo_player_id: '4563',
        player_name: 'Kevin Durant',
        player_positions: ['SF', 'PF'],
        status: 'active',
        raw_data: { test: true },
        season_year: 2024
      }
    ];
    
    console.log('\n💾 Mock roster data created for testing:');
    mockRosterData.forEach(roster => {
      console.log(`   - ${roster.player_name} (${roster.yahoo_player_id}) on ${roster.team_name}`);
    });
    
    return mockRosterData;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test the temp table insertion with mock data
async function testTempTableInsertion() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('\n🔄 Testing temp table insertion with mock data...');
    
    // Get mock data
    const mockData = await testYahooRosterViaAPI();
    
    // Clear existing test data
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .eq('league_id', 'test_league_123');
    
    if (deleteError) {
      console.error('Error clearing test data:', deleteError);
    } else {
      console.log('🧹 Cleared existing test data');
    }
    
    // Insert mock data
    const { data, error } = await supabase
      .from('yahoo_rosters_temp')
      .insert(mockData)
      .select();
    
    if (error) {
      console.error('❌ Error inserting mock data:', error);
      return;
    }
    
    console.log(`✅ Successfully inserted ${data.length} mock roster entries`);
    
    // Query back to verify
    const { data: queryData, error: queryError } = await supabase
      .from('yahoo_rosters_temp')
      .select('*')
      .eq('league_id', 'test_league_123');
    
    if (queryError) {
      console.error('Error querying data:', queryError);
    } else {
      console.log(`🔍 Verified: Found ${queryData.length} entries in temp table`);
      queryData.forEach(entry => {
        console.log(`   - ${entry.player_name} imported at ${entry.imported_at}`);
      });
    }
    
    console.log('\n✅ Temp table test completed successfully!');
    console.log('📊 The yahoo_rosters_temp table is ready for real Yahoo data');
    
  } catch (error) {
    console.error('❌ Temp table test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testTempTableInsertion();
}

module.exports = {
  testYahooRosterViaAPI,
  testTempTableInsertion
};