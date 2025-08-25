const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Yahoo API configuration
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

// Load tokens from file
function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'));
  } catch (error) {
    console.error('Error loading yahoo-tokens.json:', error.message);
    console.log('Please ensure you have a valid yahoo-tokens.json file with access_token');
    process.exit(1);
  }
}

// Make authenticated Yahoo API request
function makeYahooRequest(url) {
  return new Promise((resolve, reject) => {
    const tokens = loadTokens();
    
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      path: url.replace('https://fantasysports.yahooapis.com', ''),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'User-Agent': 'UAFBL-Roster-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Yahoo API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Check if temporary table exists (and create if needed via manual SQL)
async function createTempTable() {
  console.log('🔄 Checking for yahoo_rosters_temp table...');
  
  try {
    // Try to query the table to see if it exists
    const { error } = await supabase
      .from('yahoo_rosters_temp')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST106') {
      // Table doesn't exist
      console.log('❌ Table yahoo_rosters_temp does not exist');
      console.log('\nPlease create the table first by running this SQL in Supabase:');
      console.log('-'.repeat(60));
      console.log(`
CREATE TABLE yahoo_rosters_temp (
  id SERIAL PRIMARY KEY,
  league_id TEXT NOT NULL,
  team_key TEXT NOT NULL,
  team_name TEXT,
  manager_name TEXT,
  yahoo_player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_positions TEXT[],
  status TEXT,
  raw_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  season_year INTEGER
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_league_id ON yahoo_rosters_temp(league_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_yahoo_player_id ON yahoo_rosters_temp(yahoo_player_id);
      `);
      console.log('-'.repeat(60));
      throw new Error('Please create the yahoo_rosters_temp table first');
    }
    
    if (error) {
      console.error('Error checking table:', error);
      throw error;
    }
    
    console.log('✅ Table yahoo_rosters_temp exists and is ready');
    
  } catch (error) {
    if (error.message.includes('create the yahoo_rosters_temp table')) {
      throw error;
    }
    console.error('Error checking temp table:', error);
    throw error;
  }
}

// Get Yahoo leagues for the user
async function getYahooLeagues() {
  try {
    console.log('🔄 Fetching Yahoo leagues...');
    
    const response = await makeYahooRequest(`${YAHOO_API_BASE}/users;use_login=1/games;game_keys=nba/leagues`);
    const data = JSON.parse(response);
    
    // Parse Yahoo's complex XML-like JSON structure
    const leagues = [];
    if (data.fantasy_content?.users?.[0]?.user?.[1]?.games) {
      const games = data.fantasy_content.users[0].user[1].games;
      for (const gameKey in games) {
        if (gameKey !== 'count') {
          const game = games[gameKey].game;
          if (game[1]?.leagues) {
            const leaguesData = game[1].leagues;
            for (const leagueKey in leaguesData) {
              if (leagueKey !== 'count') {
                const league = leaguesData[leagueKey].league;
                leagues.push({
                  league_key: league[0].league_key,
                  league_id: league[0].league_id,
                  name: league[0].name,
                  season: league[0].season,
                  game_code: league[0].game_code
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`Found ${leagues.length} Yahoo leagues:`);
    leagues.forEach(league => {
      console.log(`  - ${league.name} (${league.league_key}) - Season ${league.season}`);
    });
    
    return leagues;
    
  } catch (error) {
    console.error('Error fetching Yahoo leagues:', error);
    throw error;
  }
}

// Get rosters for a specific league
async function getLeagueRosters(leagueKey) {
  try {
    console.log(`🔄 Fetching rosters for league ${leagueKey}...`);
    
    // Get teams in the league
    const teamsResponse = await makeYahooRequest(`${YAHOO_API_BASE}/league/${leagueKey}/teams`);
    const teamsData = JSON.parse(teamsResponse);
    
    const teams = [];
    if (teamsData.fantasy_content?.league?.[1]?.teams) {
      const teamsObj = teamsData.fantasy_content.league[1].teams;
      for (const teamKey in teamsObj) {
        if (teamKey !== 'count') {
          const team = teamsObj[teamKey].team;
          teams.push({
            team_key: team[0].team_key,
            team_id: team[0].team_id,
            name: team[0].name,
            manager_name: team[0].managers?.[0]?.manager?.nickname || 'Unknown'
          });
        }
      }
    }
    
    console.log(`Found ${teams.length} teams in league`);
    
    // Get rosters for each team
    const allRosters = [];
    
    for (const team of teams) {
      console.log(`  📋 Getting roster for ${team.name} (${team.manager_name})...`);
      
      try {
        const rosterResponse = await makeYahooRequest(`${YAHOO_API_BASE}/team/${team.team_key}/roster`);
        const rosterData = JSON.parse(rosterResponse);
        
        if (rosterData.fantasy_content?.team?.[1]?.roster?.[1]?.players) {
          const playersObj = rosterData.fantasy_content.team[1].roster[1].players;
          
          for (const playerKey in playersObj) {
            if (playerKey !== 'count') {
              const player = playersObj[playerKey].player;
              
              const rosterEntry = {
                league_id: leagueKey.split('.').pop(),
                team_key: team.team_key,
                team_name: team.name,
                manager_name: team.manager_name,
                yahoo_player_id: player[0].player_id,
                player_name: player[0].name.full,
                player_positions: player[0].eligible_positions || [],
                status: player[0].status || 'active',
                raw_data: player[0],
                season_year: new Date().getFullYear()
              };
              
              allRosters.push(rosterEntry);
            }
          }
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        console.error(`    ❌ Error getting roster for ${team.name}:`, error.message);
      }
    }
    
    console.log(`✅ Retrieved ${allRosters.length} player roster entries`);
    return allRosters;
    
  } catch (error) {
    console.error('Error fetching league rosters:', error);
    throw error;
  }
}

// Store rosters in temporary table
async function storeRostersInTempTable(rosters) {
  try {
    console.log(`🔄 Storing ${rosters.length} roster entries in temporary table...`);
    
    // Clear existing temp data first
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (deleteError) {
      console.error('Error clearing temp table:', deleteError);
    } else {
      console.log('  🧹 Cleared existing temp data');
    }
    
    // Insert in batches
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < rosters.length; i += batchSize) {
      const batch = rosters.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('yahoo_rosters_temp')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
        console.log(`    ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`);
      }
    }
    
    console.log(`✅ Successfully stored ${insertedCount} roster entries in temp table`);
    return insertedCount;
    
  } catch (error) {
    console.error('Error storing rosters in temp table:', error);
    throw error;
  }
}

// Main function
async function testYahooRosterImport() {
  try {
    console.log('🚀 Starting Yahoo roster import test...\n');
    
    // Create temporary table
    await createTempTable();
    
    // Get Yahoo leagues
    const leagues = await getYahooLeagues();
    
    if (leagues.length === 0) {
      console.log('❌ No Yahoo leagues found');
      return;
    }
    
    // Use the first league for testing (you can modify this)
    const testLeague = leagues[0];
    console.log(`\n📊 Testing with league: ${testLeague.name} (${testLeague.league_key})`);
    
    // Get rosters for the test league
    const rosters = await getLeagueRosters(testLeague.league_key);
    
    if (rosters.length === 0) {
      console.log('❌ No rosters found in the league');
      return;
    }
    
    // Store in temporary table
    const storedCount = await storeRostersInTempTable(rosters);
    
    console.log('\n✅ Yahoo roster import test completed!');
    console.log(`📊 Summary:`);
    console.log(`  - League: ${testLeague.name}`);
    console.log(`  - Players imported: ${storedCount}`);
    console.log(`  - Data stored in: yahoo_rosters_temp table`);
    
    // Show sample data
    console.log('\n📋 Sample roster data:');
    const sampleRosters = rosters.slice(0, 3);
    sampleRosters.forEach(roster => {
      console.log(`  - ${roster.player_name} (${roster.yahoo_player_id}) - ${roster.team_name} (${roster.manager_name})`);
    });
    
  } catch (error) {
    console.error('❌ Yahoo roster import test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testYahooRosterImport();
}

module.exports = {
  testYahooRosterImport,
  getYahooLeagues,
  getLeagueRosters,
  storeRostersInTempTable
};