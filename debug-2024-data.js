const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug2024Data() {
  try {
    console.log('=== Debugging 2024 Draft Data ===\n');

    // Check what season_id corresponds to 2024
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .eq('year', 2024);

    console.log('2024 Season info:', seasons);
    const season2024Id = seasons?.[0]?.id;

    if (!season2024Id) {
      console.log('No 2024 season found!');
      return;
    }

    // Check how many draft records we have for 2024
    const { count: draftCount } = await supabase
      .from('draft_results')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season2024Id);

    console.log(`\nDraft records in Supabase for 2024: ${draftCount}`);

    // Check what's in our raw data files
    const fs = require('fs');
    
    if (fs.existsSync('draft-results-with-season-id.json')) {
      const rawData = JSON.parse(fs.readFileSync('draft-results-with-season-id.json', 'utf8'));
      const raw2024 = rawData.filter(r => r.season_year === 2024);
      console.log(`Raw extracted data for 2024: ${raw2024.length} records`);
      
      // Show some examples
      console.log('\nFirst 5 raw 2024 records:');
      raw2024.slice(0, 5).forEach((record, index) => {
        console.log(`${index + 1}. ${record.player_name} -> ${record.team_name} ($${record.draft_price}) [Season ID: ${record.season_id}]`);
      });
    }

    // Let's also check the original Excel data
    if (fs.existsSync('draft-results-raw.json')) {
      const originalData = JSON.parse(fs.readFileSync('draft-results-raw.json', 'utf8'));
      const original2024 = originalData.filter(r => r.season === 2024);
      console.log(`\nOriginal Excel data for 2024: ${original2024.length} records`);
    }

    // Check for any 2024 records that might have failed insertion
    console.log('\n=== Sample of actual 2024 records in database ===');
    const { data: sample2024 } = await supabase
      .from('draft_results')
      .select(`
        draft_price,
        is_keeper,
        players(name),
        managers(manager_name)
      `)
      .eq('season_id', season2024Id)
      .limit(10);

    if (sample2024) {
      sample2024.forEach((record, index) => {
        console.log(`${index + 1}. ${record.players.name} -> ${record.managers.manager_name} ($${record.draft_price}) ${record.is_keeper ? '[K]' : ''}`);
      });
    }

    // Check if there are any missing players causing foreign key issues
    console.log('\n=== Checking for potential missing players ===');
    
    // Look at the historical data again for 2024
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const historySheet = workbook.Sheets['Historical Draft Data'];
    const data = XLSX.utils.sheet_to_json(historySheet, { header: 1 });
    
    const headers = data[0];
    console.log('\nExcel headers with "2024":', headers.filter(h => h && h.includes('2024')));
    
    // Find 2024 columns
    let draft2024Col = -1;
    let team2024Col = -1;
    let keep2024Col = -1;
    
    headers.forEach((header, index) => {
      if (header === '2024 Draft Price') draft2024Col = index;
      if (header === '2024 Draft Team') team2024Col = index;
      if (header === '2024 Keep') keep2024Col = index;
    });
    
    console.log(`\n2024 columns - Draft Price: ${draft2024Col}, Team: ${team2024Col}, Keep: ${keep2024Col}`);
    
    // Count non-empty 2024 entries in Excel
    let excelCount = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[draft2024Col] || row[team2024Col]) {
        excelCount++;
      }
    }
    
    console.log(`\nTotal 2024 entries in Excel: ${excelCount}`);

  } catch (error) {
    console.error('Error debugging 2024 data:', error);
  }
}

debug2024Data();