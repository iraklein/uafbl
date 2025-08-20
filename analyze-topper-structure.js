const fs = require('fs');

function analyzeTopperStructure() {
  console.log('Analyzing Topper History data structure...');
  
  const topperData = JSON.parse(fs.readFileSync('topper-raw-data.json', 'utf8'));
  
  // Get header row (manager names)
  const headers = topperData[0].slice(1); // Skip first empty column
  console.log('Manager columns:', headers);
  
  // Analyze data structure
  const processedToppers = [];
  const years = [];
  
  // Process each year row (skip header)
  for (let i = 1; i < topperData.length; i++) {
    const row = topperData[i];
    const year = row[0];
    years.push(year);
    
    console.log(`\n${year} Toppers:`);
    
    // Process each manager's topper for this year
    for (let j = 1; j < row.length && j <= headers.length; j++) {
      const manager = headers[j - 1];
      const topperValue = row[j];
      
      if (topperValue && topperValue !== '-' && topperValue !== '') {
        console.log(`  ${manager}: ${topperValue}`);
        
        // Parse the topper value to extract player name and notes
        const playerInfo = parseTopperValue(topperValue, manager, year);
        if (playerInfo) {
          processedToppers.push(playerInfo);
        }
      }
    }
  }
  
  console.log(`\nTotal topper records found: ${processedToppers.length}`);
  console.log(`Years: ${years.join(', ')}`);
  
  // Show some examples of parsed data
  console.log('\nSample processed toppers:');
  processedToppers.slice(0, 10).forEach(topper => {
    console.log(topper);
  });
  
  // Analyze special cases
  console.log('\nSpecial cases found:');
  const specialCases = processedToppers.filter(t => 
    t.is_winner || t.is_double || t.is_triple || t.is_unused || t.notes
  );
  specialCases.forEach(sc => {
    console.log(`${sc.year} ${sc.manager}: ${sc.player_name} - ${JSON.stringify({
      winner: sc.is_winner,
      double: sc.is_double, 
      triple: sc.is_triple,
      unused: sc.is_unused,
      notes: sc.notes
    })}`);
  });
  
  // Save processed data
  fs.writeFileSync('topper-processed-data.json', JSON.stringify(processedToppers, null, 2));
  console.log('\nProcessed topper data saved to topper-processed-data.json');
  
  return processedToppers;
}

function parseTopperValue(value, manager, year) {
  if (!value || value === '-' || value === '') return null;
  
  const result = {
    year: year,
    manager: manager,
    player_name: '',
    is_winner: false,
    is_double: false,
    is_triple: false,
    is_unused: false,
    notes: null
  };
  
  let cleanValue = value.toString().trim();
  
  // Check for winner indicator
  if (cleanValue.includes('winner')) {
    result.is_winner = true;
    cleanValue = cleanValue.replace(/\s*-?\s*winner/i, '').trim();
  }
  
  // Check for double/triple topped
  if (cleanValue.includes('triple')) {
    result.is_triple = true;
    cleanValue = cleanValue.replace(/\s*\(triple[^)]*\)/i, '').trim();
  } else if (cleanValue.includes('double')) {
    result.is_double = true;
    cleanValue = cleanValue.replace(/\s*\(double[^)]*\)/i, '').trim();
  }
  
  // Check for unused
  if (cleanValue.includes('unused')) {
    result.is_unused = true;
    cleanValue = cleanValue.replace(/\s*\(unused\)/i, '').trim();
  }
  
  // Check for other parenthetical notes
  const notesMatch = cleanValue.match(/\(([^)]+)\)/);
  if (notesMatch && !result.is_double && !result.is_triple && !result.is_unused) {
    result.notes = notesMatch[1];
    cleanValue = cleanValue.replace(/\s*\([^)]+\)/g, '').trim();
  }
  
  // Clean up any remaining artifacts
  cleanValue = cleanValue.replace(/\s*-\s*$/, '').trim();
  
  result.player_name = cleanValue;
  
  return result;
}

analyzeTopperStructure();