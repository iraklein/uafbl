require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processLSLData() {
  console.log('Processing LSL data for database insertion...');
  
  try {
    // Load processed LSL data
    const lslData = JSON.parse(fs.readFileSync('lsl-processed-data.json', 'utf8'));
    
    // Load manager mappings
    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => {
      // Create mapping for various name formats
      managerMap[manager.manager_name] = manager.id;
      managerMap[manager.manager_name.toLowerCase()] = manager.id;
    });
    
    // Add some additional mappings for variations found in LSL data
    const additionalMappings = {
      'tmac': 14,
      'peskin': 12,
      'mikemac': 10
    };
    Object.assign(managerMap, additionalMappings);
    
    console.log('Manager mappings:', managerMap);
    
    // Process each LSL record
    const processedRecords = lslData.map(record => {
      // Clean up team names and map to manager IDs
      const originalTeamClean = record.original_team.toLowerCase().trim().replace(/\*$/, '');
      const draftTeamClean = record.draft_team.toLowerCase().trim();
      
      const originalManagerId = managerMap[originalTeamClean];
      const draftManagerId = managerMap[draftTeamClean];
      
      if (!originalManagerId) {
        console.warn(`Could not find manager ID for original team: ${record.original_team}`);
      }
      if (!draftManagerId) {
        console.warn(`Could not find manager ID for draft team: ${record.draft_team}`);
      }
      
      return {
        draft_order: record.draft_order,
        year: record.year,
        original_team_name: record.original_team,
        draft_team_name: record.draft_team,
        player_name: record.player,
        draft_price: record.price,
        status: record.status,
        original_manager_id: originalManagerId || null,
        draft_manager_id: draftManagerId || null
      };
    });
    
    console.log(`Processed ${processedRecords.length} LSL records`);
    
    // Show sample of processed records
    console.log('\nSample processed records:');
    processedRecords.slice(0, 5).forEach(record => {
      console.log(record);
    });
    
    // Check for unmapped managers
    const unmappedOriginal = processedRecords.filter(r => !r.original_manager_id);
    const unmappedDraft = processedRecords.filter(r => !r.draft_manager_id);
    
    if (unmappedOriginal.length > 0) {
      console.log('\nUnmapped original managers:');
      unmappedOriginal.forEach(r => console.log(`${r.original_team_name} (${r.player_name})`));
    }
    
    if (unmappedDraft.length > 0) {
      console.log('\nUnmapped draft managers:');
      unmappedDraft.forEach(r => console.log(`${r.draft_team_name} (${r.player_name})`));
    }
    
    // Save processed data ready for database insertion
    fs.writeFileSync('lsl-ready-for-db.json', JSON.stringify(processedRecords, null, 2));
    console.log('\nLSL data ready for database insertion saved to lsl-ready-for-db.json');
    
    return processedRecords;
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

processLSLData();