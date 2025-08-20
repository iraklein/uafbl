const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Manual mappings for the remaining legitimate players
const finalMappings = [
  // Manager: Player in Spreadsheet -> Correct Database Name
  { manager: 'Amish', player: 'Cameron Johnson', correctName: 'Cameron Johnson' },
  { manager: 'Amish', player: 'Carlton Carrington', correctName: 'Carlton Carrington' },
  { manager: 'Bier', player: 'PJ Washington', correctName: 'PJ Washington' },
  { manager: 'Buchs', player: 'Gary Trent, Jr.', correctName: 'Gary Trent, Jr.' },
  { manager: 'Emmer', player: 'Scotty Pippen Jr.', correctName: 'Scotty Pippen Jr.' },
  { manager: 'Emmer', player: 'Oscar Tschiebwe', correctName: 'Oscar Tshiebwe' }, // Different spelling
  { manager: 'Gabe', player: 'Jeremiah Robinson-Earl', correctName: 'Jeremiah Robinson-Earl' },
  { manager: 'Gabe', player: 'Colin Castleton', correctName: 'Colin Castleton' },
  { manager: 'Gabe', player: 'OG Anunoby', correctName: 'OG Anunoby' },
  { manager: 'Gabe', player: 'Karl Anthony Towns', correctName: 'Karl Anthony Towns' },
  { manager: 'Haight', player: 'Vince Williams Jr.', correctName: 'Vince Williams, Jr..' },
  { manager: 'Haight', player: 'Reece Beekman', correctName: 'Reece Beekman' },
  { manager: 'Haight', player: 'Jeff Dowtin Jr', correctName: 'Jeff Dowtin Jr.' },
  { manager: 'Haight', player: 'RJ Barrett', correctName: 'RJ Barrett' },
  { manager: 'Haight', player: 'Cameron Thomas', correctName: 'Cameron Thomas' },
  { manager: 'Haight', player: 'Kai Jones', correctName: 'Kai Jones' },
  { manager: 'Haight', player: 'CJ McCollum', correctName: 'CJ McCollum' },
  { manager: 'Horn', player: 'Ron Holland II', correctName: 'Ron Holland II' },
  { manager: 'Horn', player: 'Michael Porter, Jr.', correctName: 'Michael Porter, Jr.' },
  { manager: 'Horn', player: 'Colin Sexton', correctName: 'Colin Sexton' },
  { manager: 'Horn', player: 'Jabari Smith', correctName: 'Jabari Smith' },
  { manager: 'Horn', player: 'Alex Sarr', correctName: 'Alex Sarr' },
  { manager: 'Jones', player: 'Tim Hardaway Jr', correctName: 'Tim Hardaway, Jr.' },
  { manager: 'Jones', player: 'Sandro Mamukelashvii', correctName: 'Sandro Mamukelashvili' }
];

async function addFinalPlayers() {
  try {
    // Get season, managers, and players
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

    const newRosters = [];
    const notFound = [];

    console.log('Processing final player mappings...');

    for (const mapping of finalMappings) {
      const managerId = managerMap[mapping.manager.toLowerCase()];
      const playerId = playerMap[mapping.correctName.toLowerCase()];

      if (!managerId) {
        console.log(`✗ Manager not found: ${mapping.manager}`);
        continue;
      }

      if (!playerId) {
        notFound.push(`${mapping.player} -> ${mapping.correctName}`);
        console.log(`✗ Player not found: ${mapping.correctName}`);
        continue;
      }

      // Check if already exists
      const { data: existingRoster } = await supabase
        .from('rosters')
        .select('id')
        .eq('season_id', season2024_25.id)
        .eq('player_id', playerId)
        .eq('manager_id', managerId)
        .single();

      if (!existingRoster) {
        newRosters.push({
          season_id: season2024_25.id,
          player_id: playerId,
          manager_id: managerId,
          keeper_cost: null
        });
        console.log(`✓ ${mapping.manager}: ${mapping.player} -> ${mapping.correctName}`);
      } else {
        console.log(`- Already exists: ${mapping.manager}: ${mapping.correctName}`);
      }
    }

    console.log(`\nFound ${newRosters.length} new rosters to add`);
    
    if (notFound.length > 0) {
      console.log('Players not found in database:');
      notFound.forEach(nf => console.log(`  ${nf}`));
    }

    if (newRosters.length > 0) {
      console.log('\nInserting final rosters...');
      const { error: insertError } = await supabase
        .from('rosters')
        .insert(newRosters);

      if (insertError) {
        console.error('Error inserting rosters:', insertError.message);
      } else {
        console.log(`Successfully inserted ${newRosters.length} final roster entries`);
      }
    }

    // Get final count
    const { data: totalRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nFinal total rosters: ${totalRosters ? totalRosters.length : 0} / 210 target`);

    if (totalRosters && totalRosters.length < 210) {
      console.log(`Still missing: ${210 - totalRosters.length} players`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

addFinalPlayers();