const fs = require('fs');

function updateDraftData() {
  console.log('Updating draft data to use season_id instead of season year...');
  
  // Load the original draft data
  const draftResults = JSON.parse(fs.readFileSync('draft-results-raw.json', 'utf8'));
  
  // Load season mapping (year -> id)
  const seasonMapping = JSON.parse(fs.readFileSync('season-mapping.json', 'utf8'));
  
  console.log('Season mapping:', seasonMapping);
  
  // Update the draft data
  const updatedDraftResults = draftResults.map(record => {
    const seasonId = seasonMapping[record.season];
    
    if (!seasonId) {
      console.warn(`No season ID found for year ${record.season}`);
      return null;
    }
    
    return {
      ...record,
      season_id: seasonId,
      season_year: record.season, // Keep for reference, will remove before insert
    };
  }).filter(record => record !== null); // Remove any records without valid season mapping
  
  console.log(`Updated ${updatedDraftResults.length} records with season_id`);
  
  // Save updated data
  fs.writeFileSync('draft-results-with-season-id.json', JSON.stringify(updatedDraftResults, null, 2));
  console.log('Updated draft data saved to draft-results-with-season-id.json');
  
  // Show some statistics
  const seasonStats = {};
  updatedDraftResults.forEach(record => {
    if (!seasonStats[record.season_id]) {
      seasonStats[record.season_id] = { count: 0, year: record.season_year };
    }
    seasonStats[record.season_id].count++;
  });
  
  console.log('\nRecords by season_id:');
  Object.keys(seasonStats).sort((a, b) => seasonStats[a].year - seasonStats[b].year).forEach(seasonId => {
    const stats = seasonStats[seasonId];
    console.log(`Season ID ${seasonId} (${stats.year}): ${stats.count} records`);
  });
  
  return updatedDraftResults;
}

updateDraftData();