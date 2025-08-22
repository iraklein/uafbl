const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');

// Get all sheet names
console.log('Available sheets:', workbook.SheetNames);

// Look for 2025 Trades sheet
const tradesSheetNames = ['2025 Trades', '2025 trades', 'Trades 2025', 'trades 2025', 'Trades', 'trades'];
let tradesSheet = null;
let tradesSheetName = null;

for (const name of tradesSheetNames) {
  if (workbook.SheetNames.includes(name)) {
    tradesSheet = workbook.Sheets[name];
    tradesSheetName = name;
    break;
  }
}

if (tradesSheet) {
  console.log(`\nFound trades sheet: ${tradesSheetName}`);
  
  // Convert to JSON to examine structure
  const data = XLSX.utils.sheet_to_json(tradesSheet, { header: 1 });
  
  console.log('\n=== 2025 TRADES DATA ===');
  console.log(`Total rows: ${data.length}`);
  
  if (data.length > 0) {
    console.log('\nHeaders (first row):', data[0]);
    
    console.log('\nAll trade data:');
    data.forEach((row, index) => {
      if (row && row.length > 0) {
        console.log(`Row ${index}:`, row);
      }
    });
  }
  
  // Also save to JSON file for easier parsing
  const jsonData = XLSX.utils.sheet_to_json(tradesSheet);
  require('fs').writeFileSync('2025-trades-data.json', JSON.stringify(jsonData, null, 2));
  console.log('\nData saved to: 2025-trades-data.json');
  
} else {
  console.log('\nNo 2025 Trades sheet found. Available sheets:');
  workbook.SheetNames.forEach(sheetName => {
    console.log(`- ${sheetName}`);
  });
}