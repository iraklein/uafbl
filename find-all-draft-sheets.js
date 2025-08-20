const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllDraftSheets() {
  try {
    console.log('Finding all draft sheets and checking current data...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    
    // Find all sheets that match "20XX Draft Sheet" pattern
    const draftSheets = workbook.SheetNames.filter(name => 
      /^\d{4}\s+Draft\s+Sheet$/.test(name)
    );

    console.log('Found draft sheets:');
    draftSheets.forEach(sheet => console.log(`- ${sheet}`));

    // Load season mapping to get season IDs
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .order('year');

    const seasonYearToId = {};
    seasons.forEach(season => {
      seasonYearToId[season.year] = season.id;
    });

    console.log('\n=== Current Draft Records by Season ===');

    // Check current record counts for each season
    const seasonsWithSheets = [];
    for (const sheetName of draftSheets) {
      const year = parseInt(sheetName.split(' ')[0]);
      const seasonId = seasonYearToId[year];
      
      if (seasonId) {
        // Count current records in database
        const { count: currentCount } = await supabase
          .from('draft_results')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId);

        // Count records in draft sheet
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const sheetRecords = data.length - 1; // Exclude header

        seasonsWithSheets.push({
          year,
          seasonId,
          sheetName,
          currentCount: currentCount || 0,
          sheetRecords,
          needsUpdate: (currentCount || 0) < sheetRecords
        });

        console.log(`${year}: DB has ${currentCount || 0}, Sheet has ${sheetRecords} ${(currentCount || 0) < sheetRecords ? '❌ NEEDS UPDATE' : '✅ OK'}`);
      }
    }

    // Show summary
    const needsUpdates = seasonsWithSheets.filter(s => s.needsUpdate);
    console.log(`\n=== Summary ===`);
    console.log(`Total seasons with draft sheets: ${seasonsWithSheets.length}`);
    console.log(`Seasons needing updates: ${needsUpdates.length}`);

    if (needsUpdates.length > 0) {
      console.log('\nSeasons that need updates:');
      needsUpdates.forEach(season => {
        const missing = season.sheetRecords - season.currentCount;
        console.log(`- ${season.year}: Missing ${missing} records (${season.currentCount}/${season.sheetRecords})`);
      });
    }

    return { seasonsWithSheets, needsUpdates };

  } catch (error) {
    console.error('Error:', error);
  }
}

findAllDraftSheets();