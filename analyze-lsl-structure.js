const fs = require('fs');

function analyzeLSLStructure() {
  console.log('Analyzing LSL data structure...');
  
  const lslData = JSON.parse(fs.readFileSync('lsl-raw-data.json', 'utf8'));
  
  // Skip header row
  const dataRows = lslData.slice(1);
  
  // Analyze the structure
  const years = new Set();
  const statuses = new Set();
  const originalTeams = new Set();
  const draftTeams = new Set();
  const players = [];
  
  console.log('Column structure:');
  console.log('Column 0: Draft Order (A)');
  console.log('Column 1: Year (B)');
  console.log('Column 2: Original Team (C)');
  console.log('Column 3: Team on UAFBL Draft day (D)');
  console.log('Column 4: Player (E)');
  console.log('Column 5: Price (F)');
  console.log('Column 6: Status (G)');
  
  const validRows = [];
  
  dataRows.forEach((row, index) => {
    const [draftOrder, year, originalTeam, draftTeam, player, price, status] = row;
    
    // Skip empty rows or rows without key data
    if (!draftOrder || !year || !player) {
      return;
    }
    
    years.add(year);
    if (status) statuses.add(status);
    if (originalTeam) originalTeams.add(originalTeam.trim());
    if (draftTeam) draftTeams.add(draftTeam.trim());
    
    validRows.push({
      draft_order: draftOrder,
      year: year,
      original_team: originalTeam ? originalTeam.trim() : '',
      draft_team: draftTeam ? draftTeam.trim() : '',
      player: player.trim(),
      price: price || 0,
      status: status ? status.trim() : 'Unknown'
    });
  });
  
  console.log('\nAnalysis Results:');
  console.log(`Total valid rows: ${validRows.length}`);
  console.log(`Years: ${Array.from(years).sort()}`);
  console.log(`Statuses: ${Array.from(statuses)}`);
  console.log(`Original Teams: ${Array.from(originalTeams).sort()}`);
  console.log(`Draft Teams: ${Array.from(draftTeams).sort()}`);
  
  console.log('\nSample processed data:');
  validRows.slice(0, 10).forEach(row => {
    console.log(row);
  });
  
  console.log(`\nStatus breakdown:`);
  const statusCounts = {};
  validRows.forEach(row => {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  });
  console.log(statusCounts);
  
  console.log(`\nYear breakdown:`);
  const yearCounts = {};
  validRows.forEach(row => {
    yearCounts[row.year] = (yearCounts[row.year] || 0) + 1;
  });
  console.log(yearCounts);
  
  // Save processed data
  fs.writeFileSync('lsl-processed-data.json', JSON.stringify(validRows, null, 2));
  console.log('\nProcessed LSL data saved to lsl-processed-data.json');
  
  return validRows;
}

analyzeLSLStructure();