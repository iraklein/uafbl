const XLSX = require('xlsx');
const fs = require('fs');

function extractTopperData() {
  console.log('Extracting Topper History data from Excel file...');
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    
    // Check if Topper History sheet exists
    const topperSheet = workbook.Sheets['Topper History'];
    if (!topperSheet) {
      console.error('Topper History sheet not found');
      console.log('Available sheets:', workbook.SheetNames);
      return;
    }
    
    // Convert sheet to JSON
    const topperData = XLSX.utils.sheet_to_json(topperSheet, { header: 1, defval: '' });
    
    console.log('Topper History sheet structure (first 25 rows):');
    topperData.slice(0, 25).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
    console.log(`\nTotal rows in Topper History sheet: ${topperData.length}`);
    
    // Save raw data for analysis
    fs.writeFileSync('topper-raw-data.json', JSON.stringify(topperData, null, 2));
    console.log('Raw Topper data saved to topper-raw-data.json');
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

extractTopperData();