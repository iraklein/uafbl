const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');

// Get all sheet names
console.log('Available sheets:', workbook.SheetNames);

// Look for historical data sheet (try different possible names)
const possibleNames = ['Historical Data', 'historical data', 'Historical', 'Data', 'Players'];
let historySheet = null;
let historySheetName = null;

for (const name of possibleNames) {
  if (workbook.SheetNames.includes(name)) {
    historySheet = workbook.Sheets[name];
    historySheetName = name;
    break;
  }
}

if (historySheet) {
  console.log(`\nFound sheet: ${historySheetName}`);
  
  // Convert to JSON to examine structure
  const data = XLSX.utils.sheet_to_json(historySheet, { header: 1 });
  
  console.log('\nFirst 10 rows of data:');
  data.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });
  
  console.log(`\nTotal rows: ${data.length}`);
  
  // Look for headers
  if (data.length > 0) {
    console.log('\nHeaders (first row):', data[0]);
  }
} else {
  console.log('\nNo historical data sheet found. Available sheets:');
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n${sheetName} (${data.length} rows):`);
    console.log('First few rows:', data.slice(0, 3));
  });
}