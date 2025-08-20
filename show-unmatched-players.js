const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function showUnmatchedPlayers() {
  try {
    console.log('Finding all unmatched player names...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const draftSheet = workbook.Sheets['2024 Draft Sheet'];
    const data = XLSX.utils.sheet_to_json(draftSheet, { header: 1 });

    const headers = data[0];
    const playerCol = headers.indexOf('Player');
    const teamCol = headers.indexOf('Team');

    // Get all players from 2024 draft sheet
    const draftPlayers = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const playerName = row[playerCol];
      const teamName = row[teamCol];
      
      if (playerName && teamName) {
        draftPlayers.push(playerName);
      }
    }

    console.log(`Found ${draftPlayers.length} players in 2024 Draft Sheet`);

    // Get all players from database
    const { data: allPlayers } = await supabase
      .from('players')
      .select('bbm_id, name');

    const playerNamesInDB = new Set(allPlayers.map(p => p.name.toLowerCase()));

    // Find unmatched players
    const unmatchedPlayers = [];
    draftPlayers.forEach(playerName => {
      if (!playerNamesInDB.has(playerName.toLowerCase())) {
        unmatchedPlayers.push(playerName);
      }
    });

    console.log(`\nAll ${unmatchedPlayers.length} unmatched players:`);
    unmatchedPlayers.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });

    // Let's also check for near matches (maybe slight spelling differences)
    console.log('\nChecking for potential near matches...');
    unmatchedPlayers.forEach(unmatchedName => {
      const lowerUnmatched = unmatchedName.toLowerCase();
      
      // Look for players with similar names
      const similarPlayers = allPlayers.filter(p => {
        const lowerDB = p.name.toLowerCase();
        return lowerDB.includes(lowerUnmatched.split(' ')[0]) || 
               lowerUnmatched.includes(lowerDB.split(' ')[0]);
      });

      if (similarPlayers.length > 0) {
        console.log(`"${unmatchedName}" might match:`);
        similarPlayers.forEach(p => console.log(`  - ${p.name} (ID: ${p.bbm_id})`));
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

showUnmatchedPlayers();