const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
const historySheet = workbook.Sheets['Historical Draft Data'];
const data = XLSX.utils.sheet_to_json(historySheet, { header: 1 });

console.log('Historical Draft Data Analysis:');
console.log(`Total rows: ${data.length}`);

// Get headers
const headers = data[0];
console.log('\nHeaders:', headers.slice(0, 10)); // Show first 10 columns

// Look at data structure
console.log('\nSample data rows:');
data.slice(1, 10).forEach((row, index) => {
  if (row[0] && row[1]) { // Only show rows with ID and Name
    console.log(`Row ${index + 1}: ID=${row[0]}, Name=${row[1]}`);
  }
});

// Count players with IDs vs without
let playersWithId = 0;
let playersWithoutId = 0;
let allPlayers = [];

data.slice(1).forEach(row => {
  if (row[1]) { // If there's a name
    const player = {
      id: row[0],
      name: row[1]
    };
    allPlayers.push(player);
    
    if (row[0]) {
      playersWithId++;
    } else {
      playersWithoutId++;
    }
  }
});

console.log(`\nPlayer ID Analysis:`);
console.log(`Players with IDs: ${playersWithId}`);
console.log(`Players without IDs: ${playersWithoutId}`);
console.log(`Total players: ${allPlayers.length}`);

// Show players without IDs
console.log('\nPlayers without IDs (first 20):');
let countWithoutIds = 0;
allPlayers.forEach(player => {
  if (!player.id && countWithoutIds < 20) {
    console.log(`- ${player.name}`);
    countWithoutIds++;
  }
});

// Show unique players without IDs
const playersWithoutIds = allPlayers.filter(p => !p.id);
const uniquePlayersWithoutIds = [...new Set(playersWithoutIds.map(p => p.name))];
console.log(`\nUnique players without IDs: ${uniquePlayersWithoutIds.length}`);

// Save all players to a JSON file for further analysis
const fs = require('fs');
fs.writeFileSync('historical-players.json', JSON.stringify(allPlayers, null, 2));
console.log('\nAll players saved to historical-players.json');