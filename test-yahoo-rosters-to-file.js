const https = require('https');
const fs = require('fs');
const path = require('path');

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

    console.log(`Making request to: ${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          console.error(`Response body: ${data}`);
          reject(new Error(`Yahoo API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    req.end();
  });
}

// Get Yahoo leagues for the user
async function getYahooLeagues() {
  try {
    console.log('🔄 Fetching Yahoo leagues...');
    
    const response = await makeYahooRequest(`${YAHOO_API_BASE}/users;use_login=1/games;game_keys=nba/leagues`);
    
    // Save raw response for debugging
    fs.writeFileSync('./yahoo-leagues-raw.json', response, 'utf8');
    console.log('💾 Raw leagues response saved to yahoo-leagues-raw.json');
    
    const data = JSON.parse(response);
    
    // Save parsed data
    fs.writeFileSync('./yahoo-leagues-parsed.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('💾 Parsed leagues data saved to yahoo-leagues-parsed.json');
    
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
    
    // Save league list
    fs.writeFileSync('./yahoo-leagues-list.json', JSON.stringify(leagues, null, 2), 'utf8');
    console.log('💾 League list saved to yahoo-leagues-list.json');
    
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
    
    // Get teams in the league first
    console.log('  📋 Getting teams list...');
    const teamsResponse = await makeYahooRequest(`${YAHOO_API_BASE}/league/${leagueKey}/teams`);
    
    // Save teams response for debugging
    fs.writeFileSync(`./yahoo-teams-raw-${leagueKey.replace(/\./g, '_')}.json`, teamsResponse, 'utf8');
    
    const teamsData = JSON.parse(teamsResponse);
    fs.writeFileSync(`./yahoo-teams-parsed-${leagueKey.replace(/\./g, '_')}.json`, JSON.stringify(teamsData, null, 2), 'utf8');
    
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
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      console.log(`  📋 Getting roster for ${team.name} (${team.manager_name}) - ${i + 1}/${teams.length}...`);
      
      try {
        const rosterResponse = await makeYahooRequest(`${YAHOO_API_BASE}/team/${team.team_key}/roster`);
        
        // Save individual roster response
        const filename = `yahoo-roster-raw-${team.team_key.replace(/\./g, '_')}.json`;
        fs.writeFileSync(filename, rosterResponse, 'utf8');
        
        const rosterData = JSON.parse(rosterResponse);
        const parsedFilename = `yahoo-roster-parsed-${team.team_key.replace(/\./g, '_')}.json`;
        fs.writeFileSync(parsedFilename, JSON.stringify(rosterData, null, 2), 'utf8');
        
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
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`    ❌ Error getting roster for ${team.name}:`, error.message);
      }
    }
    
    console.log(`✅ Retrieved ${allRosters.length} player roster entries`);
    
    // Save all rosters to file
    const rostersFilename = `yahoo-all-rosters-${leagueKey.replace(/\./g, '_')}.json`;
    fs.writeFileSync(rostersFilename, JSON.stringify(allRosters, null, 2), 'utf8');
    console.log(`💾 All rosters saved to ${rostersFilename}`);
    
    return allRosters;
    
  } catch (error) {
    console.error('Error fetching league rosters:', error);
    throw error;
  }
}

// Main function
async function testYahooRosterImport() {
  try {
    console.log('🚀 Starting Yahoo roster import test (saving to files)...\n');
    
    // Create output directory if it doesn't exist
    const outputDir = './yahoo-roster-test-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
      console.log(`📁 Created output directory: ${outputDir}`);
    }
    
    // Change to output directory for saving files
    process.chdir(outputDir);
    
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
    
    console.log('\n✅ Yahoo roster import test completed!');
    console.log(`📊 Summary:`);
    console.log(`  - League: ${testLeague.name}`);
    console.log(`  - Players imported: ${rosters.length}`);
    console.log(`  - Output directory: ${process.cwd()}`);
    
    // Show sample data
    console.log('\n📋 Sample roster data:');
    const sampleRosters = rosters.slice(0, 5);
    sampleRosters.forEach(roster => {
      console.log(`  - ${roster.player_name} (ID: ${roster.yahoo_player_id}) - ${roster.team_name} (${roster.manager_name})`);
      console.log(`    Positions: ${roster.player_positions.join(', ')}`);
    });
    
    // Create summary file
    const summary = {
      test_date: new Date().toISOString(),
      league: testLeague,
      total_players: rosters.length,
      teams_count: [...new Set(rosters.map(r => r.team_name))].length,
      managers: [...new Set(rosters.map(r => r.manager_name))],
      sample_players: sampleRosters.map(r => ({
        name: r.player_name,
        yahoo_id: r.yahoo_player_id,
        team: r.team_name,
        manager: r.manager_name,
        positions: r.player_positions
      }))
    };
    
    fs.writeFileSync('test-summary.json', JSON.stringify(summary, null, 2), 'utf8');
    console.log('\n💾 Test summary saved to test-summary.json');
    
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
  getLeagueRosters
};