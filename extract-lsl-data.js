const XLSX = require('xlsx');
const fs = require('fs');

function extractLSLData() {
  console.log('Extracting LSL data from Excel file...');
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    
    // Check available sheet names
    console.log('Available sheets:', workbook.SheetNames);
    
    // Look for LSL sheet
    const lslSheet = workbook.Sheets['LSL'];
    if (!lslSheet) {
      console.error('LSL sheet not found');
      return;
    }
    
    // Convert sheet to JSON
    const lslData = XLSX.utils.sheet_to_json(lslSheet, { header: 1, defval: '' });
    
    console.log('LSL sheet structure (first 20 rows):');
    lslData.slice(0, 20).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
    console.log(`\nTotal rows in LSL sheet: ${lslData.length}`);
    
    // Save raw data for analysis
    fs.writeFileSync('lsl-raw-data.json', JSON.stringify(lslData, null, 2));
    console.log('Raw LSL data saved to lsl-raw-data.json');
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

extractLSLData();