const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecentYears() {
  try {
    console.log('Analyzing 2018-2024 Draft Sheets...');
    
    // Read the Excel file
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    
    // Get all players and managers from database
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name')
      .limit(3000);
    
    const { data: allManagers } = await supabase
      .from('managers')
      .select('id, manager_name');
    
    const { data: allSeasons } = await supabase
      .from('seasons')
      .select('id, year')
      .in('year', years);
    
    // Create lookup maps
    const playerMap = new Map();
    allPlayers.forEach(p => {
      playerMap.set(p.name.toLowerCase(), p.id);
      // Add common variations
      if (p.name.includes('.')) {
        const withoutDots = p.name.replace(/\./g, '');
        playerMap.set(withoutDots.toLowerCase(), p.id);
      }
      if (p.name.includes(' Jr')) {
        const withoutJr = p.name.replace(' Jr', '');
        playerMap.set(withoutJr.toLowerCase(), p.id);
      }
    });
    
    const managerMap = new Map();
    allManagers.forEach(m => managerMap.set(m.manager_name.toLowerCase(), m.id));
    
    const seasonMap = new Map();
    allSeasons.forEach(s => seasonMap.set(s.year, s.id));
    
    for (const year of years) {
      console.log(`\n=== Processing ${year} ===`);
      
      const sheetName = `${year} Draft Sheet`;
      const sheet = workbook.Sheets[sheetName];
      
      if (!sheet) {
        console.log(`Sheet "${sheetName}" not found`);
        continue;
      }
      
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const seasonId = seasonMap.get(year);
      
      if (!seasonId) {
        console.log(`Season ${year} not found in database`);
        continue;
      }
      
      // Get existing records for this year
      const { data: existingRecords } = await supabase
        .from('draft_results')
        .select('player_id, manager_id, draft_price')
        .eq('season_id', seasonId);
      
      console.log(`Current database records: ${existingRecords.length}`);
      
      const existingSet = new Set();
      existingRecords.forEach(r => {
        existingSet.add(`${r.player_id}-${r.manager_id}-${r.draft_price}`);
      });
      
      // Process the draft sheet entries
      let validEntries = [];
      let unmatched = [];
      let skippedCount = 0;
      
      // The draft sheet has player/price/team structure starting from row 2
      for (let row = 2; row < data.length; row++) {
        const playerName = data[row] && data[row][1] ? data[row][1].toString().trim() : '';
        const price = data[row] && data[row][2] ? data[row][2] : null;
        const team = data[row] && data[row][3] ? data[row][3].toString().trim() : '';
        
        // Skip based on criteria
        if (!playerName || price === null || price === '' || !team) {
          continue;
        }
        if (playerName === 'Player' || team === 'Team') continue; // Skip headers
        
        const priceNum = typeof price === 'number' ? price : parseFloat(price);
        if (isNaN(priceNum)) continue;
        
        // Ignore $0 draft price or blank team as requested
        if (priceNum === 0 || team === '' || team.toLowerCase() === 'team') {
          skippedCount++;
          continue;
        }
        
        // Skip non-player entries
        const managerNames = ['Peskin', 'Phil', 'Gabe', 'Amish', 'Bier', 'Buchs', 'Emmer', 'Haight', 'Horn', 'Jones', 'Luskey', 'MikeMac', 'Mitch', 'Tmac', 'Weeg', 'Glaspie'];
        if (managerNames.includes(playerName)) {
          continue;
        }
        
        // Find player ID
        let playerId = playerMap.get(playerName.toLowerCase());
        if (!playerId) {
          // Try variations
          const variations = [
            playerName.replace(/\s+/g, ' '),
            playerName.replace('Jr.', 'Jr'),
            playerName.replace('Sr.', 'Sr'),
            playerName.replace('III', '').trim(),
            playerName.replace('II', '').trim(),
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
            year: year,
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
      
      console.log(`Valid entries in Excel: ${validEntries.length + existingRecords.length}`);
      console.log(`New entries to add: ${validEntries.length}`);
      console.log(`Skipped ($0 or blank team): ${skippedCount}`);
      console.log(`Unmatched entries: ${unmatched.length}`);
      
      if (unmatched.length > 0) {
        console.log('\\nUnmatched entries:');
        unmatched.slice(0, 10).forEach(u => {
          console.log(`  - ${u.player} (${u.team}, $${u.price}) - Player: ${u.hasPlayer}, Manager: ${u.hasManager}`);
        });
        if (unmatched.length > 10) {
          console.log(`  ... and ${unmatched.length - 10} more`);
        }
      }
      
      if (validEntries.length > 0) {
        console.log(`\\nAdding ${validEntries.length} new records for ${year}...`);
        
        const { error } = await supabase
          .from('draft_results')
          .insert(validEntries);
        
        if (error) {
          console.error(`Error inserting ${year} records:`, error);
        } else {
          console.log(`Successfully added ${validEntries.length} records for ${year}`);
          
          // Check final count
          const { count } = await supabase
            .from('draft_results')
            .select('*', { count: 'exact' })
            .eq('season_id', seasonId);
          
          console.log(`${year} now has ${count} total records`);
        }
      } else {
        console.log(`No new records to add for ${year}`);
      }
    }
    
    console.log('\\n=== Analysis Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRecentYears();