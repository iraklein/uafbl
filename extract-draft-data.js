const XLSX = require('xlsx');
const fs = require('fs');

function extractDraftData() {
  console.log('Extracting draft data from Historical Draft Data sheet...');
  
  // Load managers data for mapping
  const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
  
  // Create mapping from manager name to manager ID (case-insensitive)
  const managerMap = {};
  managers.forEach(manager => {
    managerMap[manager.manager_name] = manager.id;
    managerMap[manager.manager_name.toLowerCase()] = manager.id;
  });
  
  console.log('Manager mapping:', managerMap);
  
  const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
  const historySheet = workbook.Sheets['Historical Draft Data'];
  const data = XLSX.utils.sheet_to_json(historySheet, { header: 1 });
  
  const headers = data[0];
  console.log('Headers found:', headers.length);
  
  // Map out the column structure
  const columnMap = {};
  headers.forEach((header, index) => {
    if (header) {
      columnMap[header] = index;
    }
  });
  
  // Find all the season-related columns (Draft Price, Draft Team, Keep)
  const seasons = [];
  const seasonPattern = /^(\d{4})\s+(Draft Price|Draft Team|Keep)$/;
  
  Object.keys(columnMap).forEach(header => {
    const match = header.match(seasonPattern);
    if (match) {
      const year = parseInt(match[1]);
      const type = match[2];
      
      if (!seasons.find(s => s.year === year)) {
        seasons.push({ year, columns: {} });
      }
      
      const season = seasons.find(s => s.year === year);
      season.columns[type] = columnMap[header];
    }
  });
  
  seasons.sort((a, b) => a.year - b.year);
  console.log(`Found ${seasons.length} seasons:`, seasons.map(s => s.year));
  
  // Extract draft results
  const draftResults = [];
  const unmappedTeams = new Set();
  let recordsProcessed = 0;
  
  // Skip header row
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const playerId = row[columnMap['ID']];
    const playerName = row[columnMap['Name']];
    
    if (!playerId || !playerName) continue;
    
    recordsProcessed++;
    
    // Process each season for this player
    seasons.forEach(season => {
      const draftPrice = row[season.columns['Draft Price']];
      const draftTeam = row[season.columns['Draft Team']];
      const isKeep = row[season.columns['Keep']];
      
      // Only create record if there's some activity (draft price or team)
      if (draftPrice || draftTeam) {
        let managerId = null;
        
        if (draftTeam) {
          managerId = managerMap[draftTeam];
          if (!managerId) {
            unmappedTeams.add(draftTeam);
          }
        }
        
        draftResults.push({
          player_id: playerId,
          player_name: playerName, // Include for reference, will remove before insert
          season: season.year,
          draft_price: draftPrice || null,
          manager_id: managerId,
          team_name: draftTeam, // Include for reference
          is_keeper: isKeep ? true : false
        });
      }
    });
    
    if (recordsProcessed % 100 === 0) {
      console.log(`Processed ${recordsProcessed} player records...`);
    }
  }
  
  console.log(`\nExtraction complete!`);
  console.log(`Players processed: ${recordsProcessed}`);
  console.log(`Draft records created: ${draftResults.length}`);
  
  if (unmappedTeams.size > 0) {
    console.log('\nUnmapped team names found:');
    [...unmappedTeams].forEach(team => console.log(`- ${team}`));
  }
  
  // Group by season for analysis
  const bySeasonStats = {};
  draftResults.forEach(record => {
    if (!bySeasonStats[record.season]) {
      bySeasonStats[record.season] = { total: 0, keepers: 0, drafts: 0 };
    }
    bySeasonStats[record.season].total++;
    if (record.is_keeper) {
      bySeasonStats[record.season].keepers++;
    } else {
      bySeasonStats[record.season].drafts++;
    }
  });
  
  console.log('\nRecords by season:');
  Object.keys(bySeasonStats).sort().forEach(season => {
    const stats = bySeasonStats[season];
    console.log(`${season}: ${stats.total} total (${stats.drafts} drafts, ${stats.keepers} keepers)`);
  });
  
  // Save the data
  fs.writeFileSync('draft-results-raw.json', JSON.stringify(draftResults, null, 2));
  console.log('\nDraft data saved to draft-results-raw.json');
  
  // Show some sample data
  console.log('\nSample draft records:');
  draftResults.slice(0, 10).forEach((record, index) => {
    console.log(`${index + 1}. ${record.player_name} (${record.season}): $${record.draft_price} to ${record.team_name} (ID: ${record.manager_id})${record.is_keeper ? ' (KEEPER)' : ''}`);
  });
  
  return draftResults;
}

extractDraftData();