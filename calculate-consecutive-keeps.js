const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function calculateConsecutiveKeeps() {
  try {
    console.log('Calculating consecutive keeps for all players...');

    // Get all draft results with keeper status, ordered by season
    const { data: draftResults, error } = await supabase
      .from('draft_results')
      .select(`
        id,
        player_id,
        is_keeper,
        seasons!inner (
          id,
          year,
          name
        ),
        players!inner (
          id,
          name
        )
      `)
      .order('seasons.year', { ascending: true });

    if (error) {
      console.error('Error fetching draft results:', error);
      return;
    }

    console.log(`Found ${draftResults.length} draft records`);

    // Group by player
    const playerHistory = {};
    draftResults.forEach(result => {
      const playerId = result.player_id;
      if (!playerHistory[playerId]) {
        playerHistory[playerId] = {
          name: result.players.name,
          seasons: []
        };
      }
      playerHistory[playerId].seasons.push({
        year: result.seasons.year,
        season_id: result.seasons.id,
        is_keeper: result.is_keeper,
        draft_result_id: result.id
      });
    });

    console.log(`Analyzing ${Object.keys(playerHistory).length} players`);

    // Calculate consecutive keeps for each player in each season
    const updates = [];
    
    for (const [playerId, history] of Object.entries(playerHistory)) {
      // Sort seasons by year
      history.seasons.sort((a, b) => a.year - b.year);
      
      for (let i = 0; i < history.seasons.length; i++) {
        const currentSeason = history.seasons[i];
        
        if (currentSeason.is_keeper) {
          // Count consecutive keeper years leading up to this season
          let consecutiveKeeps = 0;
          
          // Look backwards from current season to count consecutive keeper years
          for (let j = i - 1; j >= 0; j--) {
            const prevSeason = history.seasons[j];
            
            // Check if it's the immediately previous year and was kept
            if (prevSeason.year === currentSeason.year - (i - j) && prevSeason.is_keeper) {
              consecutiveKeeps++;
            } else {
              break; // Break the consecutive chain
            }
          }
          
          updates.push({
            draft_result_id: currentSeason.draft_result_id,
            consecutive_keeps: consecutiveKeeps,
            player_name: history.name,
            season_year: currentSeason.year
          });
          
          console.log(`${history.name} ${currentSeason.year}: ${consecutiveKeeps} consecutive keeps`);
        }
      }
    }

    console.log(`\nPrepared ${updates.length} consecutive_keeps updates`);

    // First, add the consecutive_keeps column if it doesn't exist
    console.log('Adding consecutive_keeps column to draft_results...');
    
    // We'll update the draft_results table directly since that's where keeper history is tracked
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE draft_results ADD COLUMN IF NOT EXISTS consecutive_keeps INTEGER DEFAULT 0'
    });

    if (alterError) {
      console.log('Note: Could not add column via RPC, may already exist:', alterError.message);
    }

    // Update draft_results with consecutive_keeps values
    if (updates.length > 0) {
      console.log('Updating consecutive_keeps in draft_results...');
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('draft_results')
          .update({ consecutive_keeps: update.consecutive_keeps })
          .eq('id', update.draft_result_id);

        if (updateError) {
          console.error(`Error updating ${update.player_name} ${update.season_year}:`, updateError.message);
        }
      }
      
      console.log(`Updated ${updates.length} draft results with consecutive_keeps`);
    }

    // Now update rosters table with consecutive_keeps for current season (2024-25)
    console.log('\nUpdating rosters table for 2024-25 season...');
    
    // Get 2024-25 season ID
    const { data: season2024 } = await supabase
      .from('seasons')
      .select('id')
      .or('name.ilike.%2024-25%,year.eq.2024')
      .single();

    if (season2024) {
      // Get all rosters for 2024-25
      const { data: rosters } = await supabase
        .from('rosters')
        .select('id, player_id')
        .eq('season_id', season2024.id);

      console.log(`Found ${rosters?.length || 0} rosters for 2024-25`);

      // For each roster, find the consecutive_keeps from draft_results
      if (rosters) {
        for (const roster of rosters) {
          const playerData = playerHistory[roster.player_id];
          if (playerData) {
            // Find the 2024 season data
            const season2024Data = playerData.seasons.find(s => s.year === 2024);
            if (season2024Data && season2024Data.is_keeper) {
              // Calculate consecutive keeps for this player in 2024
              let consecutiveKeeps = 0;
              const seasonIndex = playerData.seasons.findIndex(s => s.year === 2024);
              
              for (let j = seasonIndex - 1; j >= 0; j--) {
                const prevSeason = playerData.seasons[j];
                if (prevSeason.year === 2024 - (seasonIndex - j) && prevSeason.is_keeper) {
                  consecutiveKeeps++;
                } else {
                  break;
                }
              }
              
              // Update roster with consecutive_keeps
              const { error: rosterError } = await supabase
                .from('rosters')
                .update({ consecutive_keeps: consecutiveKeeps })
                .eq('id', roster.id);

              if (!rosterError) {
                console.log(`Updated roster for ${playerData.name}: ${consecutiveKeeps} consecutive keeps`);
              }
            }
          }
        }
      }
    }

    console.log('\nConsecutive keeps calculation completed!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

calculateConsecutiveKeeps();