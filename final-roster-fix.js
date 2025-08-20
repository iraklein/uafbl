const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Additional mappings for remaining legitimate players
const additionalMappings = {
  'michael porter, jr.': 'Michael Porter, Jr.',  // Use the one without extra periods
  'cameron johnson': 'Cameron Johnson',
  'rj barrett': 'RJ Barrett',
  'pj washington': 'PJ Washington',
  'scotty pippen jr.': 'Scotty Pippen Jr.',
  'colin sexton': 'Colin Sexton',
  'jeremiah robinson-earl': 'Jeremiah Robinson-Earl',
  'jabari smith': 'Jabari Smith',
  'alex sarr': 'Alex Sarr',
  'og anunoby': 'OG Anunoby',
  'kai jones': 'Kai Jones',
  'gary trent, jr.': 'Gary Trent, Jr.',
  'karl anthony towns': 'Karl Anthony Towns',
  'cj mccollum': 'CJ McCollum',
  'cameron thomas': 'Cameron Thomas'
};

async function finalFix() {
  try {
    // Get season and managers
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');
    
    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);

    const { data: managers } = await supabase.from('managers').select('id, manager_name');
    const { data: players } = await supabase.from('players').select('id, name');

    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name.toLowerCase()] = manager.id;
    });

    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name.toLowerCase()] = player.id;
    });

    console.log('Checking additional player mappings...');
    let foundMappings = 0;

    for (const [unmatchedName, correctName] of Object.entries(additionalMappings)) {
      const playerId = playerMap[correctName.toLowerCase()];
      if (playerId) {
        console.log(`✓ Found: "${unmatchedName}" -> "${correctName}" (ID: ${playerId})`);
        foundMappings++;
      } else {
        console.log(`✗ Not found: "${correctName}"`);
      }
    }

    console.log(`\nFound ${foundMappings} additional valid player mappings`);
    console.log('Note: The remaining unmatched items appear to be manager names or notes, not player names');

    // Get final roster count
    const { data: totalRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nFinal total rosters for 2024-25 season: ${totalRosters ? totalRosters.length : 0}`);

    // Show breakdown by manager
    console.log('\nRoster breakdown by manager:');
    const { data: rosterBreakdown } = await supabase
      .from('rosters')
      .select(`
        managers!inner(manager_name),
        players!inner(name)
      `)
      .eq('season_id', season2024_25.id);

    if (rosterBreakdown) {
      const managerCounts = {};
      rosterBreakdown.forEach(roster => {
        const managerName = roster.managers.manager_name;
        managerCounts[managerName] = (managerCounts[managerName] || 0) + 1;
      });

      Object.entries(managerCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([manager, count]) => {
          console.log(`  ${manager}: ${count} players`);
        });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

finalFix();