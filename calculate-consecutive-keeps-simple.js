const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function calculateConsecutiveKeepsForRosters() {
  try {
    console.log('Calculating consecutive keeps for 2024-25 rosters...');

    // Get 2024-25 season
    const { data: season2024_25 } = await supabase
      .from('seasons')
      .select('id, name')
      .or('name.ilike.%2024-25%,year.eq.2024')
      .single();

    if (!season2024_25) {
      console.error('2024-25 season not found');
      return;
    }

    console.log(`Using season: ${season2024_25.name} (ID: ${season2024_25.id})`);

    // Get all rosters for 2024-25 season
    const { data: rosters } = await supabase
      .from('rosters')
      .select(`
        id,
        player_id,
        players (
          id,
          name
        )
      `)
      .eq('season_id', season2024_25.id);

    console.log(`Found ${rosters?.length || 0} rosters for 2024-25`);

    // Get draft results for recent years only (sufficient for consecutive keeps)
    const { data: allDraftResults, error: draftError } = await supabase
      .from('draft_results')
      .select(`
        player_id,
        is_keeper,
        seasons!inner (
          year
        )
      `)
      .gte('seasons.year', 2020); // Get records from 2020 onwards

    if (draftError) {
      console.error('Error fetching draft results:', draftError);
      return;
    }

    console.log(`Found ${allDraftResults?.length || 0} historical draft results`);
    
    // Debug: check if we have Wembanyama in draft results
    const wembyDrafts = allDraftResults?.filter(d => d.player_id === 6728);
    console.log('Wembanyama draft results:', wembyDrafts);
    
    // Debug: check first few results to see data structure
    console.log('First 3 draft results:', allDraftResults?.slice(0, 3));

    // Group draft results by player
    const playerHistory = {};
    allDraftResults?.forEach(result => {
      const playerId = result.player_id;
      if (!playerHistory[playerId]) {
        playerHistory[playerId] = [];
      }
      
      // Check if seasons data exists
      if (result.seasons && result.seasons.year) {
        playerHistory[playerId].push({
          year: result.seasons.year,
          is_keeper: result.is_keeper
        });
      }
    });
    
    console.log('Wembanyama history after mapping:', playerHistory[6728]);

    // Calculate consecutive keeps for each roster player
    const updates = [];

    for (const roster of rosters || []) {
      const playerId = roster.player_id;
      const playerName = roster.players.name;
      
      // Debug Wembanyama specifically
      if (playerName.toLowerCase().includes('wembanyama')) {
        console.log(`\nDebugging ${playerName} (ID: ${playerId}):`);
      }
      
      // Get this player's draft history
      const history = playerHistory[playerId] || [];
      
      if (playerName.toLowerCase().includes('wembanyama')) {
        console.log('  History:', history);
      }
      
      // Sort by year
      history.sort((a, b) => a.year - b.year);
      
      // Calculate consecutive keeps leading up to 2024-25 (which would be for 2024 draft results)
      let consecutiveKeeps = null; // Default for non-keepers
      
      // Check if this player was kept in 2024 (meaning they're on 2024-25 roster as a keeper)
      const season2024Draft = history.find(h => h.year === 2024);
      
      if (playerName.toLowerCase().includes('wembanyama')) {
        console.log('  2024 Draft:', season2024Draft);
      }
      
      if (season2024Draft && season2024Draft.is_keeper) {
        // This player was kept in 2024, so for 2024-25 rosters (potential 2025 keep),
        // we need to count how many times they've been kept consecutively INCLUDING 2024
        consecutiveKeeps = 0; // Start with 0 (first time kept)
        
        // Look backwards from 2024 to count consecutive keeper years
        // Sort history by year ascending
        const sortedHistory = history.sort((a, b) => a.year - b.year);
        const index2024 = sortedHistory.findIndex(h => h.year === 2024);
        
        // Count consecutive keeper years before 2024
        for (let i = index2024 - 1; i >= 0; i--) {
          const prevYear = sortedHistory[i];
          const expectedYear = 2024 - (index2024 - i);
          
          // Check if this is the immediately previous consecutive year and was kept
          if (prevYear.year === expectedYear && prevYear.is_keeper) {
            consecutiveKeeps++;
          } else {
            break; // Break the consecutive chain
          }
        }
        
        console.log(`${playerName}: Found 2024 keeper, consecutive_keeps = ${consecutiveKeeps} (years kept before 2024)`);
      }
      
      updates.push({
        roster_id: roster.id,
        player_name: playerName,
        consecutive_keeps: consecutiveKeeps
      });
      
      if (consecutiveKeeps !== null) {
        console.log(`${playerName}: ${consecutiveKeeps} consecutive keeps`);
      }
    }

    // Update rosters with consecutive_keeps
    console.log(`\nUpdating ${updates.length} rosters...`);
    
    for (const update of updates) {
      const { error } = await supabase
        .from('rosters')
        .update({ consecutive_keeps: update.consecutive_keeps })
        .eq('id', update.roster_id);

      if (error) {
        console.error(`Error updating ${update.player_name}:`, error.message);
      }
    }

    console.log('Consecutive keeps calculation completed!');

    // Show summary
    const keeperCounts = updates.filter(u => u.consecutive_keeps !== null);
    console.log(`\nSummary:`);
    console.log(`- Total rosters: ${updates.length}`);
    console.log(`- Keepers: ${keeperCounts.length}`);
    console.log(`- Non-keepers: ${updates.length - keeperCounts.length}`);
    
    const keepersByCount = {};
    keeperCounts.forEach(k => {
      const count = k.consecutive_keeps;
      keepersByCount[count] = (keepersByCount[count] || 0) + 1;
    });
    
    console.log('\nKeepers by consecutive years:');
    Object.entries(keepersByCount)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([count, players]) => {
        console.log(`  ${count} consecutive years: ${players} players`);
      });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

calculateConsecutiveKeepsForRosters();