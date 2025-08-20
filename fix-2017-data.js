const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2017Data() {
  try {
    console.log('Processing 2017 Draft Sheet...');
    
    // Read the Excel file
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const sheet = workbook.Sheets['2017 Draft Sheet'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Get all players and managers from database
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name')
      .limit(2000);
    
    const { data: allManagers } = await supabase
      .from('managers')
      .select('id, manager_name');
    
    const { data: season2017 } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', 2017);
    
    if (!season2017 || season2017.length === 0) {
      console.error('2017 season not found');
      return;
    }
    
    const seasonId = season2017[0].id;
    console.log('2017 Season ID:', seasonId);
    
    // Create lookup maps
    const playerMap = new Map();
    allPlayers.forEach(p => {
      playerMap.set(p.name.toLowerCase(), p.id);
      // Add common variations
      if (p.name.includes('.')) {
        const withoutDots = p.name.replace(/\./g, '');
        playerMap.set(withoutDots.toLowerCase(), p.id);
      }
    });
    
    const managerMap = new Map();
    allManagers.forEach(m => managerMap.set(m.manager_name.toLowerCase(), m.id));
    
    // Get existing draft records for 2017
    const { data: existingRecords } = await supabase
      .from('draft_results')
      .select('player_id, manager_id, draft_price')
      .eq('season_id', seasonId);
    
    const existingSet = new Set();
    existingRecords.forEach(r => {
      existingSet.add(`${r.player_id}-${r.manager_id}-${r.draft_price}`);
    });
    
    console.log(`Found ${existingRecords.length} existing 2017 records`);
    
    // Process the draft sheet entries
    let validEntries = [];
    let unmatched = [];
    
    // The draft sheet has player/price/team structure starting from row 2
    for (let row = 2; row < data.length; row++) {
      const playerName = data[row] && data[row][1] ? data[row][1].toString().trim() : '';
      const price = data[row] && data[row][2] ? data[row][2] : null;
      const team = data[row] && data[row][3] ? data[row][3].toString().trim() : '';
      
      if (!playerName || price === null || price === '' || !team) continue;
      if (playerName === 'Player' || team === 'Team') continue; // Skip headers
      
      // Skip non-player entries
      if (['Peskin', 'Phil', 'Gabe', 'Amish', 'Bier', 'Buchs', 'Emmer', 'Haight', 'Horn', 'Jones', 'Luskey', 'MikeMac', 'Mitch', 'Tmac', 'Weeg'].includes(playerName)) {
        continue;
      }
      
      const priceNum = typeof price === 'number' ? price : parseInt(price);
      if (isNaN(priceNum)) continue;
      
      // Find player ID
      let playerId = playerMap.get(playerName.toLowerCase());
      if (!playerId) {
        // Try variations
        const variations = [
          playerName.replace(/\s+/g, ' '),
          playerName.replace('Jr.', 'Jr'),
          playerName.replace('Sr.', 'Sr'),
          playerName.replace('III', ''),
          playerName.replace('II', ''),
        ];
        
        for (const variation of variations) {
          playerId = playerMap.get(variation.toLowerCase());
          if (playerId) break;
        }
      }
      
      // Find manager ID
      let managerId = managerMap.get(team.toLowerCase());
      
      if (!playerId || !managerId) {
        unmatched.push({
          player: playerName,
          team: team,
          price: priceNum,
          hasPlayer: !!playerId,
          hasManager: !!managerId,
          row: row
        });
        continue;
      }
      
      // Check if this record already exists
      const recordKey = `${playerId}-${managerId}-${priceNum}`;
      if (existingSet.has(recordKey)) {
        continue; // Skip duplicates
      }
      
      validEntries.push({
        season_id: seasonId,
        player_id: playerId,
        manager_id: managerId,
        draft_price: priceNum,
        is_keeper: false
      });
    }
    
    console.log(`\nFound ${validEntries.length} new valid entries to add`);
    console.log(`Found ${unmatched.length} unmatched entries`);
    
    if (unmatched.length > 0) {
      console.log('\nUnmatched entries:');
      unmatched.forEach(u => {
        console.log(`- ${u.player} (${u.team}, $${u.price}) - Player: ${u.hasPlayer}, Manager: ${u.hasManager}`);
      });
    }
    
    if (validEntries.length > 0) {
      console.log(`\nAdding ${validEntries.length} new records...`);
      
      const { error } = await supabase
        .from('draft_results')
        .insert(validEntries);
      
      if (error) {
        console.error('Error inserting records:', error);
      } else {
        console.log('Successfully added new records');
        
        // Check final count
        const { count } = await supabase
          .from('draft_results')
          .select('*', { count: 'exact' })
          .eq('season_id', seasonId);
        
        console.log(`2017 now has ${count} total records`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fix2017Data();